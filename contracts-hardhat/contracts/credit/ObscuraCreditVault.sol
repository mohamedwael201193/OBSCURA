// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IConfidentialUSDCv2.sol";
import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditVault
/// @notice Curator-routed confidential vault (MetaMorpho-shaped).
///
/// Share accounting is plaintext uint128 (same as Morpho ERC4626 shares).
/// The privacy guarantee comes from the underlying cUSDC token: balances
/// and transfer amounts are fully FHE-encrypted inside cUSDC — the vault
/// only records WHO deposited and HOW MANY SHARES they hold, not the
/// corresponding encrypted handle.
///
/// When FHE.asEuint64(plaintext) becomes available on mainnet (trivial
/// encryption), shares can be upgraded to euint64 for full privacy.
///
/// Withdraw: user provides an InEuint64 (same client-side encryption as
/// deposit). The vault calls confidentialTransferFrom(vault → user) where
/// vault == msg.sender == from, so no operator approval is needed.
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

    /// @notice Deposit cUSDC into the vault.
    /// @dev    Caller must call `cUSDC.setOperator(vaultAddress, until)` first.
    ///         The InEuint64 is signed by the user's wallet and validated by the
    ///         FHE coprocessor against the vault (as the immediate call target).
    /// @param amtPlain Plaintext deposit amount (base units, 6 dec for cUSDC).
    /// @param encAmt   Client-side encrypted amount for the confidential pull.
    function deposit(uint64 amtPlain, InEuint64 calldata encAmt) external {
        IConfidentialUSDCv2(loanAsset).confidentialTransferFrom(msg.sender, address(this), encAmt);

        shares[msg.sender]    += amtPlain;
        totalShares           += amtPlain;
        publicTotalDeposited  += amtPlain;
        emit Deposited(msg.sender, amtPlain);
    }

    /// @notice Withdraw cUSDC from the vault.
    /// @dev    No operator setup needed: vault calls
    ///         `cUSDC.confidentialTransferFrom(vault, user, encAmt)` where
    ///         from == msg.sender == vault, so cUSDC's self-transfer rule
    ///         grants permission.
    /// @param amtPlain Plaintext amount to withdraw (checked against shares).
    /// @param encAmt   Client-side encrypted amount — vault pushes it to user.
    function withdraw(uint64 amtPlain, InEuint64 calldata encAmt) external {
        if (shares[msg.sender] < amtPlain) revert InsufficientShares();

        shares[msg.sender]   -= amtPlain;
        totalShares          -= amtPlain;
        if (publicTotalDeposited >= amtPlain) publicTotalDeposited -= amtPlain;

        // vault == msg.sender == from → cUSDC operator check passes (self-transfer).
        IConfidentialUSDCv2(loanAsset).confidentialTransferFrom(address(this), msg.sender, encAmt);
        emit Withdrew(msg.sender, amtPlain);
    }

    // ─── Curator-only reallocation ────────────────────────────────────────

    /// @notice Route vault liquidity into an approved market (supply).
    ///         Vault must already be operator on cUSDC for the market:
    ///         call `setOperatorOn(market, until)` once after deploy.
    function reallocateSupply(address market, uint64 amtPlain, InEuint64 calldata encAmt)
        external onlyCurator
    {
        if (!isApprovedMarket[market]) revert MarketNotApproved();
        if (uint128(amtPlain) > marketCap[market]) revert CapExceeded();
        ObscuraCreditMarket(market).supply(amtPlain, encAmt);
        emit Reallocated(market, amtPlain, true);
    }

    function reallocateWithdraw(address market, uint64 amtPlain, InEuint64 calldata encAmt)
        external onlyCurator
    {
        if (!isApprovedMarket[market]) revert MarketNotApproved();
        ObscuraCreditMarket(market).withdraw(amtPlain, encAmt);
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
