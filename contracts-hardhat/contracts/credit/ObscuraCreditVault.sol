// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditVault v1.2
/// @notice Curator-routed confidential vault (MetaMorpho-shaped).
///
/// Share accounting is plaintext uint128. Privacy comes from cUSDC.
///
/// CoFHE pattern (critical): InEuint64 proofs cannot be forwarded through
/// intermediary contracts — the proof's recovered signer must match the
/// immediate caller of verifyInput (msg.sender in FHE.sol = the contract
/// calling FHE functions, which equals the tx sender for direct calls).
///
/// Incoming transfers (deposit): caller must pre-call
///   cUSDC.confidentialTransfer(vaultAddress, encAmt)   ← direct, no proxy
/// then call vault.deposit(amtPlain) to record shares.
///
/// Outgoing transfers (withdraw): vault IS the holder. Uses
///   FHE.asEuint64(amtPlain) + FHE.allowTransient + confidentialTransfer(handle)
/// so no client-provided InEuint64 is needed.
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

    // Plaintext share accounting (1 share = 1 cUSDC base unit at MVP 1:1 rate).
    mapping(address => uint128) public shares;
    uint128 public totalShares;

    // Public scalar mirror for frontend TVL display.
    uint128 public publicTotalDeposited;

    event CuratorSet(address indexed curator);
    event FeeSet(uint16 bps, address indexed recipient);
    event MarketApproved(address indexed market, uint128 cap);
    event Deposited(address indexed user, uint128 amount);
    event Withdrew(address indexed user, uint128 amount);
    event Reallocated(address indexed market, uint128 amount, bool isSupply);

    modifier onlyOwner()   { if (msg.sender != owner)   revert NotOwner();   _; }
    modifier onlyCurator() { if (msg.sender != curator) revert NotCurator(); _; }

    constructor(address _loanAsset, address _curator, address _feeRecipient) {
        loanAsset    = _loanAsset;
        owner        = msg.sender;
        curator      = _curator;
        feeRecipient = _feeRecipient;
        feeBps       = 1000; // 10%
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
        shares[msg.sender]    += amtPlain;
        totalShares           += amtPlain;
        publicTotalDeposited  += amtPlain;
        emit Deposited(msg.sender, amtPlain);
    }

    /// @notice Withdraw cUSDC from the vault.
    /// @dev    Vault IS the cUSDC holder. Uses FHE.asEuint64(amtPlain) +
    ///         FHE.allowTransient to push funds to user via the uint256-handle
    ///         overload of confidentialTransfer. No client-side InEuint64 needed.
    /// @param amtPlain Plaintext amount to withdraw (checked against shares).
    function withdraw(uint64 amtPlain) external {
        if (shares[msg.sender] < amtPlain) revert InsufficientShares();

        shares[msg.sender]   -= amtPlain;
        totalShares          -= amtPlain;
        if (publicTotalDeposited >= amtPlain) publicTotalDeposited -= amtPlain;

        euint64 handle = FHE.asEuint64(amtPlain);
        FHE.allowTransient(handle, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(handle))
        );
        emit Withdrew(msg.sender, amtPlain);
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
    function getShares(address u) external view returns (uint128) { return shares[u]; }
    function getTotalShares() external view returns (uint128) { return totalShares; }
}
