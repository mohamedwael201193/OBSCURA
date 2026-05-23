// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IERC20Min {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// @title ObscuraConfidentialToken (v3.15 — Shielded Wrapper)
/// @notice Confidential FHERC20 with the EXACT v3.14 interface plus a real
///         shielded-wrapper layer (shield/unshield + proof-of-reserves).
///
///         Dual-mode:
///           - Faucet mode (underlying == address(0)): claimFaucet() mints
///             encrypted balance directly; shield/unshield revert.
///           - Wrapper mode (underlying != address(0)): shield() pulls real
///             ERC20 in and mints encrypted; unshield() burns encrypted (via
///             v3.13 FHE.eq guard) and releases real ERC20.
///
///         The mode is selected once, after deploy, by the guardian calling
///         setUnderlying(addr). This keeps the 4-arg constructor intact for
///         all existing scripts/tests/deployments.
///
///         Why we ship this instead of wrapping ObscuraToken (OBS):
///         OBS exposes only the *InEuint64* outbound overload; the market
///         needs the *uint256-handle* outbound overload (because once a
///         debt amount is computed inside the market it lives as a euint64
///         handle, never as an InEuint64). Adding a fresh confidential
///         token with the right ABI is the cleanest path and unlocks
///         heterogeneous markets (cUSDC ⇄ cOBS, cUSDC ⇄ cWETH, …).
contract ObscuraConfidentialToken {
    // ── Metadata ─────────────────────────────────────────────────────────
    string public name;
    string public symbol;
    uint8  public immutable decimals;
    /// Faucet drip in token base units (e.g. 100 * 10^decimals).
    uint64 public immutable faucetAmount;

    /// Underlying ERC20 token (only used in wrapper mode). Address(0) = faucet mode.
    /// Settable once by the guardian post-deploy; immutable after that.
    address public underlying;
    bool    public underlyingLocked;

    // ── Public, leak-OK aggregates ───────────────────────────────────────
    /// Sum of all minted encrypted balances. In wrapper mode this MUST
    /// equal IERC20(underlying).balanceOf(this) (proof-of-reserves).
    uint256 public publicSupplyMirror;
    uint256 public totalFaucetClaims;
    /// Per-block unshield cap (anti-drain safety). 0 = unlimited.
    uint256 public unshieldPerBlockCap;
    mapping(uint256 => uint256) public unshieldedInBlock;

    // ── Encrypted per-holder state ───────────────────────────────────────
    mapping(address => euint64) private _balances;
    /// operator => holder => unix expiry (0 = not approved). Mirrors cUSDC
    /// (operator-first key) so the market's operator-check semantics work
    /// with both this token and Reineira cUSDC interchangeably.
    mapping(address => mapping(address => uint48)) private _operatorExpiry;

    /// Last faucet claim per address (24h cooldown).
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    // ── Guardian (emergency pause + setUnderlying gate) ──────────────────
    address public guardian;
    uint256 public pausedUntil;     // 0 = not paused
    uint256 public constant MAX_PAUSE = 7 days;

    // ── Events (NEVER plaintext amounts) ─────────────────────────────────
    event ConfidentialTransfer(address indexed from, address indexed to);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);
    event FaucetClaim(address indexed user);
    event Shielded(address indexed user, uint256 amount);
    event Unshielded(address indexed user, address indexed to, uint256 amount);
    event UnderlyingSet(address indexed underlying);
    event UnderlyingLocked();
    event GuardianSet(address indexed guardian);
    event Paused(uint256 until);
    event UnshieldCapSet(uint256 capPerBlock);

    error NotAuthorized();
    error InvalidRecipient();
    error CooldownActive(uint256 secondsLeft);
    error WrapperOnly();
    error FaucetModeOnly();
    error PausedNow();
    error PerBlockCapExceeded();
    error InvariantBroken();
    error AlreadyLocked();

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint64 _faucetAmount) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        faucetAmount = _faucetAmount;
        guardian = msg.sender;
        emit GuardianSet(msg.sender);
    }

    // ── Modifiers ────────────────────────────────────────────────────────
    modifier whenNotPaused() {
        if (block.timestamp < pausedUntil) revert PausedNow();
        _;
    }
    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotAuthorized();
        _;
    }

    // ── Guardian admin ───────────────────────────────────────────────────
    function setGuardian(address g) external onlyGuardian {
        guardian = g;
        emit GuardianSet(g);
    }
    function pause(uint256 duration) external onlyGuardian {
        require(duration <= MAX_PAUSE, "pause-too-long");
        pausedUntil = block.timestamp + duration;
        emit Paused(pausedUntil);
    }
    function setUnshieldPerBlockCap(uint256 cap) external onlyGuardian {
        unshieldPerBlockCap = cap;
        emit UnshieldCapSet(cap);
    }
    /// @notice Set underlying ERC20 once, switching this token from faucet
    ///         mode to wrapper mode. Guardian can lock it permanently with
    ///         lockUnderlying() for trust-minimisation.
    function setUnderlying(address u) external onlyGuardian {
        if (underlyingLocked) revert AlreadyLocked();
        underlying = u;
        emit UnderlyingSet(u);
    }
    function lockUnderlying() external onlyGuardian {
        underlyingLocked = true;
        emit UnderlyingLocked();
    }

    // ── Operator model (cUSDC-shaped) ────────────────────────────────────
    function setOperator(address operator, uint48 until) external {
        _operatorExpiry[operator][msg.sender] = until;
        emit OperatorSet(msg.sender, operator, until);
    }

    function isOperator(address holder, address spender) external view returns (bool) {
        return _operatorExpiry[spender][holder] > block.timestamp;
    }

    function operatorExpiry(address holder, address spender) external view returns (uint48) {
        return _operatorExpiry[spender][holder];
    }

    // ── View ─────────────────────────────────────────────────────────────
    /// @notice Returns the *handle* (cast to uint256) for off-chain unsealing.
    function confidentialBalanceOf(address account) external view returns (uint256) {
        return uint256(euint64.unwrap(_balances[account]));
    }

    // ── Inbound: InEuint64 — caller is operator (or self) ────────────────
    function confidentialTransferFrom(
        address from,
        address to,
        InEuint64 calldata amount
    ) external whenNotPaused returns (bool) {
        if (to == address(0)) revert InvalidRecipient();
        if (msg.sender != from && _operatorExpiry[msg.sender][from] <= block.timestamp) {
            revert NotAuthorized();
        }
        euint64 amt = FHE.asEuint64(amount);
        _debit(from, amt);
        _credit(to, amt);
        emit ConfidentialTransfer(from, to);
        return true;
    }

    // ── Outbound: uint256-handle (the market path) ───────────────────────
    /// @dev `handle` is a euint64 ciphertext handle (the underlying bytes32
    ///      cast to uint256, exactly as ObscuraCreditMarket forwards it).
    ///      The market grants this contract transient FHE permission on
    ///      the handle just before calling, mirroring cUSDC.
    function confidentialTransfer(address to, uint256 handle) external whenNotPaused returns (bool) {
        if (to == address(0)) revert InvalidRecipient();
        euint64 amt = euint64.wrap(bytes32(handle));
        _debit(msg.sender, amt);
        _credit(to, amt);
        emit ConfidentialTransfer(msg.sender, to);
        return true;
    }

    /// @notice Caller-as-holder InEuint64 push (frontend convenience).
    /// @dev    Matches the call-shape the existing Obscura frontend uses for
    ///         Reineira cUSDC: `confidentialTransfer(to, encryptedInput)`.
    ///         Internally identical to confidentialTransferFrom(msg.sender,to,amount).
    function confidentialTransfer(address to, InEuint64 calldata amount) external whenNotPaused returns (bool) {
        if (to == address(0)) revert InvalidRecipient();
        euint64 amt = FHE.asEuint64(amount);
        _debit(msg.sender, amt);
        _credit(to, amt);
        emit ConfidentialTransfer(msg.sender, to);
        return true;
    }

    // ── Faucet (faucet mode only; reverts in wrapper mode) ───────────────
    function claimFaucet() external whenNotPaused {
        if (underlying != address(0)) revert WrapperOnly();
        uint256 nextOk = lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN;
        if (block.timestamp < nextOk) revert CooldownActive(nextOk - block.timestamp);
        lastFaucetClaim[msg.sender] = block.timestamp;
        totalFaucetClaims++;
        publicSupplyMirror += uint256(faucetAmount);

        euint64 amt = FHE.asEuint64(uint256(faucetAmount));
        _credit(msg.sender, amt);
        emit FaucetClaim(msg.sender);
    }

    // ── Shield: pull underlying, mint encrypted (wrapper mode only) ──────
    /// @notice Transfer `amount` underlying ERC20 from caller into the
    ///         wrapper, mint matching encrypted balance. Amount is plaintext
    ///         at entry (the underlying transfer is public anyway) but the
    ///         resulting encrypted balance is indistinguishable from any
    ///         other credit/debit op thereafter.
    function shield(uint256 amount) external whenNotPaused {
        if (underlying == address(0)) revert FaucetModeOnly();
        require(amount > 0 && amount <= type(uint64).max, "amount");
        require(
            IERC20Min(underlying).transferFrom(msg.sender, address(this), amount),
            "transferFrom"
        );
        publicSupplyMirror += amount;

        euint64 amt = FHE.asEuint64(uint256(uint64(amount)));
        _credit(msg.sender, amt);

        if (IERC20Min(underlying).balanceOf(address(this)) < publicSupplyMirror) {
            revert InvariantBroken();
        }
        emit Shielded(msg.sender, amount);
    }

    /// @notice Burn encrypted balance (via FHE.eq guard against amtPlain) and
    ///         release `amtPlain` underlying ERC20 to `to`. msg.sender must
    ///         hold the encrypted balance — operator-on-self short-circuit
    ///         applies. If encAmt != amtPlain, the FHE.select returns zero,
    ///         the debit is a no-op, and the underlying still transfers —
    ///         which would break the invariant; therefore the post-transfer
    ///         invariant check reverts the whole tx. This is the v3.13
    ///         outbound-safety pattern.
    function unshield(uint64 amtPlain, InEuint64 calldata encAmt, address to) external whenNotPaused {
        if (underlying == address(0)) revert FaucetModeOnly();
        if (to == address(0)) revert InvalidRecipient();
        require(amtPlain > 0, "amount");

        if (unshieldPerBlockCap != 0) {
            uint256 already = unshieldedInBlock[block.number];
            if (already + amtPlain > unshieldPerBlockCap) revert PerBlockCapExceeded();
            unshieldedInBlock[block.number] = already + amtPlain;
        }

        // FHE.eq guard — only the matching real-derived handle gets debited.
        euint64 req      = FHE.asEuint64(encAmt);
        euint64 expected = FHE.asEuint64(uint256(amtPlain));
        ebool   matches  = FHE.eq(req, expected);
        euint64 safe     = FHE.select(matches, req, FHE.asEuint64(uint256(0)));
        FHE.allowThis(safe);
        _debit(msg.sender, safe);

        require(publicSupplyMirror >= amtPlain, "supply");
        publicSupplyMirror -= amtPlain;
        require(IERC20Min(underlying).transfer(to, amtPlain), "transfer");

        if (IERC20Min(underlying).balanceOf(address(this)) < publicSupplyMirror) {
            revert InvariantBroken();
        }
        emit Unshielded(msg.sender, to, amtPlain);
    }

    function nextFaucetIn(address user) external view returns (uint256) {
        uint256 nextOk = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextOk) return 0;
        return nextOk - block.timestamp;
    }

    // ── Internal credit / debit ──────────────────────────────────────────
    function _credit(address to, euint64 amt) internal {
        euint64 cur = _balances[to];
        if (euint64.unwrap(cur) == bytes32(0)) {
            _balances[to] = amt;
        } else {
            _balances[to] = FHE.add(cur, amt);
        }
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
    }

    function _debit(address from, euint64 amt) internal {
        euint64 cur = _balances[from];
        // If `from` has no balance yet, treat as zero (silent fail via FHE.sub
        // on a freshly-initialised handle).
        if (euint64.unwrap(cur) == bytes32(0)) {
            cur = FHE.asEuint64(uint64(0));
        }
        _balances[from] = FHE.sub(cur, amt);
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);
    }
}
