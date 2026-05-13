// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ObscuraConfidentialToken
/// @notice A self-contained confidential ERC-20-like token with the EXACT
///         interface that ObscuraCreditMarket expects from `loanAsset` and
///         `collateralAsset` (the same shape as Reineira cUSDC):
///           setOperator(operator, until)
///           isOperator(holder, spender)
///           confidentialBalanceOf(account)
///           confidentialTransferFrom(from, to, InEuint64) — inbound
///           confidentialTransfer(to, uint256 handle)      — outbound
///         Plus a permissionless 24h faucet so any user can self-mint test
///         balances on Arbitrum Sepolia (mirrors ObscuraToken's UX).
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

    // ── Public, leak-OK aggregates ───────────────────────────────────────
    /// Sum of all faucet drips and credits — required by curators / UI.
    uint256 public publicSupplyMirror;
    uint256 public totalFaucetClaims;

    // ── Encrypted per-holder state ───────────────────────────────────────
    mapping(address => euint64) private _balances;
    /// operator => holder => unix expiry (0 = not approved). Mirrors cUSDC
    /// (operator-first key) so the market's operator-check semantics work
    /// with both this token and Reineira cUSDC interchangeably.
    mapping(address => mapping(address => uint48)) private _operatorExpiry;

    /// Last faucet claim per address (24h cooldown).
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    // ── Events (NEVER plaintext amounts) ─────────────────────────────────
    event ConfidentialTransfer(address indexed from, address indexed to);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);
    event FaucetClaim(address indexed user);

    error NotAuthorized();
    error InvalidRecipient();
    error CooldownActive(uint256 secondsLeft);

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint64 _faucetAmount) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        faucetAmount = _faucetAmount;
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
    ) external returns (bool) {
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
    function confidentialTransfer(address to, uint256 handle) external returns (bool) {
        if (to == address(0)) revert InvalidRecipient();
        euint64 amt = euint64.wrap(bytes32(handle));
        _debit(msg.sender, amt);
        _credit(to, amt);
        emit ConfidentialTransfer(msg.sender, to);
        return true;
    }

    // ── Faucet ───────────────────────────────────────────────────────────
    function claimFaucet() external {
        uint256 nextOk = lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN;
        if (block.timestamp < nextOk) revert CooldownActive(nextOk - block.timestamp);
        lastFaucetClaim[msg.sender] = block.timestamp;
        totalFaucetClaims++;
        publicSupplyMirror += uint256(faucetAmount);

        euint64 amt = FHE.asEuint64(uint256(faucetAmount));
        _credit(msg.sender, amt);
        emit FaucetClaim(msg.sender);
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
