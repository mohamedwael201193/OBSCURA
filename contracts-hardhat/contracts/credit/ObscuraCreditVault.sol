// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditVault v1.4
/// @notice Curator-routed confidential vault (MetaMorpho-shaped) — full FHE privacy.
///
/// Privacy model:
///   ENCRYPTED  : per-user shares (euint64) — only the depositor can decrypt
///   PLAINTEXT  : aggregate TVL mirror, totalShares (protocol-level, needed for IRM/UI)
///   PRIVATE    : _plainShares shadow (never exposed externally, only for revert guard)
///
/// CoFHE pattern (critical): InEuint64 proofs cannot be forwarded through
/// intermediary contracts — the proof's recovered signer must match the
/// immediate caller of verifyInput.
///
/// Deposit two-step:
///   Step 1: cUSDC.confidentialTransfer(vaultAddress, encAmt)   ← user direct
///   Step 2: vault.deposit(amtPlain, encAmt2)  — FHE.add to encrypted shares
///
/// Withdraw: vault IS the cUSDC holder; FHE.sub from encrypted shares + FHE push.
contract ObscuraCreditVault {
    error NotCurator();
    error NotOwner();
    error MarketNotApproved();
    error CapExceeded();
    error InsufficientShares();

    address public immutable loanAsset;
    address public immutable owner;
    address public curator;
    address public feeRecipient;
    uint16  public feeBps;        // <= 2500

    // Per-vault approved markets + caps (plaintext caps).
    mapping(address => bool)    public isApprovedMarket;
    mapping(address => uint128) public marketCap;
    address[] public marketsList;

    // Pre-computed FHE zero constant — initialises encrypted share handles cheaply.
    euint64 private _zero;

    // Encrypted per-user share positions — only the depositor can decrypt.
    mapping(address => euint64) private _encShares;
    // Private plaintext shadow — used ONLY as a revert guard, never exposed.
    mapping(address => uint128) private _plainShares;

    // Aggregate plaintext counters (intentionally public — protocol-level TVL only).
    uint128 public totalShares;

    // Public scalar mirror for frontend TVL display.
    uint128 public publicTotalDeposited;

    event CuratorSet(address indexed curator);
    event FeeSet(uint16 bps, address indexed recipient);
    event MarketApproved(address indexed market, uint128 cap);
    event Deposited(address indexed user);   // amount omitted — FHE privacy
    event Withdrew(address indexed user);    // amount omitted — FHE privacy
    event Reallocated(address indexed market, uint128 amount, bool isSupply);

    modifier onlyOwner()   { if (msg.sender != owner)   revert NotOwner();   _; }
    modifier onlyCurator() { if (msg.sender != curator) revert NotCurator(); _; }

    constructor(address _loanAsset, address _curator, address _feeRecipient) {
        loanAsset    = _loanAsset;
        owner        = msg.sender;
        curator      = _curator;
        feeRecipient = _feeRecipient;
        feeBps       = 1000; // 10%
        // Pre-compute encrypted zero for share initialisation (avoids per-user
        // FHE.asEuint64(0) calls which are expensive on the CoFHE coprocessor).
        _zero = FHE.asEuint64(uint64(0));
        FHE.allowThis(_zero);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────

    /// @dev Ensure a user's encrypted share handle is initialised before FHE.add.
    function _ensureEncShares(address u) internal {
        if (euint64.unwrap(_encShares[u]) == bytes32(0)) {
            _encShares[u] = _zero;
            FHE.allowThis(_encShares[u]);
            FHE.allow(_encShares[u], u);
        }
    }

    function setCurator(address _new) external onlyOwner {
        curator = _new;
        emit CuratorSet(_new);
    }

    function setFee(uint16 _bps, address _recipient) external onlyOwner {
        require(_bps <= 2500, "fee>25%");
        feeBps = _bps;
        feeRecipient = _recipient;
        emit FeeSet(_bps, _recipient);
    }

    function approveMarket(address market, uint128 cap) external onlyCurator {
        require(market != address(0), "market");
        require(ObscuraCreditMarket(market).loanAsset() == loanAsset, "loan mismatch");
        if (!isApprovedMarket[market]) {
            isApprovedMarket[market] = true;
            marketsList.push(market);
        }
        marketCap[market] = cap;
        emit MarketApproved(market, cap);
    }

    // ─── User-facing deposit / withdraw ──────────────────────────────────

    /// @notice Record a deposit after the caller has directly transferred cUSDC.
    /// @dev    Two-step pattern (mirrors proven ObscuraEscrow.fund pattern):
    ///           Step 1: cUSDC.confidentialTransfer(address(this), encAmt)  ← user direct
    ///           Step 2: vault.deposit(amtPlain, encAmt2)                   ← this call
    ///         encAmt is consumed by FHE.asEuint64 here to settle the CoFHE
    ///         pending task from step 1. Without an FHE call in step 2, the
    ///         CoFHE task manager rate-limits same-sender follow-up txs.
    ///         Both encAmt and encAmt2 should encrypt the same value.
    /// @param amtPlain Plaintext deposit amount (base units, 6 dec for cUSDC).
    /// @param encAmt   Encrypted amount — consumed only to settle CoFHE state.
    function deposit(uint64 amtPlain, InEuint64 calldata encAmt) external {
        euint64 eAmt = FHE.asEuint64(encAmt); // settle pending CoFHE task
        FHE.allow(eAmt, msg.sender);           // allow user to verify receipt

        // ── Encrypted share accounting ──────────────────────────────────
        // Per-user position stored encrypted — nobody else can read it.
        _ensureEncShares(msg.sender);
        euint64 newShares = FHE.add(_encShares[msg.sender], eAmt);
        FHE.allowThis(newShares);
        FHE.allow(newShares, msg.sender);
        _encShares[msg.sender] = newShares;
        _plainShares[msg.sender] += amtPlain; // shadow: revert guard only

        // Aggregate plaintext counters (TVL mirror — intentionally public).
        totalShares          += amtPlain;
        publicTotalDeposited += amtPlain;
        emit Deposited(msg.sender);
    }

    /// @notice Withdraw cUSDC from the vault.
    /// @dev    Vault IS the cUSDC holder. Uses FHE.asEuint64(amtPlain) +
    ///         FHE.allowTransient to push funds to user via the uint256-handle
    ///         overload of confidentialTransfer. No client-side InEuint64 needed.
    /// @param amtPlain Plaintext amount to withdraw (checked against shares).
    function withdraw(uint64 amtPlain) external {
        // Revert guard uses private plaintext shadow — never exposed externally.
        if (_plainShares[msg.sender] < amtPlain) revert InsufficientShares();

        // ── Encrypted share deduction ────────────────────────────────────
        euint64 eAmt = FHE.asEuint64(amtPlain);
        euint64 newShares = FHE.sub(_encShares[msg.sender], eAmt);
        FHE.allowThis(newShares);
        FHE.allow(newShares, msg.sender);
        _encShares[msg.sender] = newShares;
        _plainShares[msg.sender] -= amtPlain; // shadow: keep in sync

        // Aggregate counters (TVL mirror).
        totalShares -= amtPlain;
        if (publicTotalDeposited >= amtPlain) publicTotalDeposited -= amtPlain;

        // Push cUSDC to user — vault IS the holder.
        FHE.allowTransient(eAmt, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(eAmt))
        );
        emit Withdrew(msg.sender);
    }

    // ─── Curator-only reallocation ────────────────────────────────────────

    /// @notice Route vault liquidity into an approved market (supply).
    /// @dev    Vault trivially encrypts amtPlain, transfers cUSDC to market
    ///         via confidentialTransfer(handle), then notifies market to
    ///         record supply shares. No InEuint64 forwarding (CoFHE safe).
    function reallocateSupply(address market, uint64 amtPlain)
        external onlyCurator
    {
        if (!isApprovedMarket[market]) revert MarketNotApproved();
        if (uint128(amtPlain) > marketCap[market]) revert CapExceeded();
        euint64 handle = FHE.asEuint64(amtPlain);
        FHE.allowTransient(handle, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            market, uint256(euint64.unwrap(handle))
        );
        ObscuraCreditMarket(market).notifySupply(amtPlain);
        emit Reallocated(market, amtPlain, true);
    }

    function reallocateWithdraw(address market, uint64 amtPlain)
        external onlyCurator
    {
        if (!isApprovedMarket[market]) revert MarketNotApproved();
        ObscuraCreditMarket(market).withdrawToVault(amtPlain);
        emit Reallocated(market, amtPlain, false);
    }

    /// @notice Owner-only: grant this vault as operator on the cUSDC contract
    ///         for a target address (typically a market).
    function setOperatorOn(address operator, uint48 until) external onlyOwner {
        IConfidentialUSDCv2(loanAsset).setOperator(operator, until);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function marketsLength() external view returns (uint256) { return marketsList.length; }

    /// @notice Returns the encrypted share handle for `u`.
    ///         Only `u` (or a contract `u` has FHE.allow'd) can decrypt it
    ///         client-side via the FHE coprocessor.
    function getEncryptedShares(address u) external view returns (euint64) {
        return _encShares[u];
    }

    function getTotalShares() external view returns (uint128) { return totalShares; }
}
