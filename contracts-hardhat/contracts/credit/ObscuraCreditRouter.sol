// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";

interface IObscuraConfidentialWrapper {
    function shield(uint256 amount) external;
    function unshield(uint64 amtPlain, InEuint64 calldata encAmt, address to) external;
    function setOperator(address operator, uint48 until) external;
    function underlying() external view returns (address);
    function claimFaucet() external;
    function nextFaucetIn(address user) external view returns (uint256);
}

interface IObscuraStealthRegistryAnnounce {
    function announce(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes calldata metadata
    ) external;
}

interface IObscuraCreditMarketRouterAPI {
    function supplyCollateralFor(address user, uint64 amtPlain, InEuint64 calldata encAmt) external;
    function borrowFor(address user, uint64 amtPlain, InEuint64 calldata encAmt) external;
    function repayFor(address user, uint64 amtPlain, InEuint64 calldata encAmt) external;
    function withdrawCollateralFor(address user, uint64 amtPlain, InEuint64 calldata encAmt) external;
    function loanAsset() external view returns (address);
    function collateralAsset() external view returns (address);
}

/// @title ObscuraCreditRouter v3.16
/// @notice Wallet-native multicall router. Collapses the multi-step credit
///         flow into ONE EOA transaction. Designed for standard wallets
///         (MetaMask / Rabby / Coinbase Wallet) — no smart-account dependency.
///
/// Authorization:
///   - Router must be whitelisted on the market via setOnBehalfRouter().
///   - User grants operator on tokens once:
///         wrapper.setOperator(router, expiry)
///         loanAsset.setOperator(router, expiry)
///
/// InEuint64 forwarding:
///   The CoFHE input proof is bound to the encryption signer (the user),
///   NOT to msg.sender. The Router can therefore forward InEuint64 calldata
///   into the market — same verified pattern used by
///   ObscuraConfidentialToken.confidentialTransferFrom.
contract ObscuraCreditRouter {
    error ZeroAddress();
    error ShieldStageFirst();

    address public immutable stealthRegistry; // may be address(0)

    event SetupAndBorrow(address indexed user, address indexed market);
    event RepayAndWithdraw(address indexed user, address indexed market);
    event SetupAndBorrowStealth(
        address indexed user,
        address indexed market,
        address indexed stealthAddress
    );

    constructor(address _stealthRegistry) {
        stealthRegistry = _stealthRegistry;
    }

    /// @notice Setup-and-borrow in ONE transaction.
    /// @dev Flow (single user signature on the outer tx):
    ///   1. (optional) shield underlying ERC20 into wrapper — pass 0 for
    ///      tokens that are faucet-mode or already shielded.
    ///   2. confidentialTransferFrom user => market with encCollPush.
    ///   3. market.supplyCollateralFor(user, collateralPlain, encCollMarket).
    ///   4. market.borrowFor(user, borrowPlain, encBorrow) — disburses to user.
    function setupAndBorrow(
        address market,
        uint256 shieldAmt,
        uint64  collateralPlain,
        InEuint64 calldata encCollPush,
        InEuint64 calldata encCollMarket,
        uint64  borrowPlain,
        InEuint64 calldata encBorrow
    ) external {
        if (market == address(0)) revert ZeroAddress();
        IObscuraCreditMarketRouterAPI m = IObscuraCreditMarketRouterAPI(market);
        address collateralAsset = m.collateralAsset();

        // Router-side shield would require the router to be allowed to pull
        // the underlying ERC20 from the user. To keep the surface minimal
        // and avoid extra approve ceremony, callers stage the shield in a
        // prior tx; the router rejects shieldAmt > 0 so the requirement is
        // explicit rather than silently lossy.
        if (shieldAmt > 0) revert ShieldStageFirst();

        IConfidentialUSDCv2(collateralAsset).confidentialTransferFrom(
            msg.sender, market, encCollPush
        );
        m.supplyCollateralFor(msg.sender, collateralPlain, encCollMarket);
        m.borrowFor(msg.sender, borrowPlain, encBorrow);

        emit SetupAndBorrow(msg.sender, market);
    }

    /// @notice Setup-and-borrow with stealth-address announcement.
    /// @dev    Loan disbursement goes to msg.sender (the user's primary EOA);
    ///         the stealth address is announced via ObscuraStealthRegistry so
    ///         the user's stealth wallet can claim via a subsequent shielded
    ///         transfer. True on-chain stealth disbursement requires eaddress
    ///         which is not available on CoFHE testnet.
    function setupAndBorrowStealth(
        address market,
        uint64  collateralPlain,
        InEuint64 calldata encCollPush,
        InEuint64 calldata encCollMarket,
        uint64  borrowPlain,
        InEuint64 calldata encBorrow,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes calldata metadata
    ) external {
        if (market == address(0) || stealthAddress == address(0)) revert ZeroAddress();
        IObscuraCreditMarketRouterAPI m = IObscuraCreditMarketRouterAPI(market);
        address collateralAsset = m.collateralAsset();

        IConfidentialUSDCv2(collateralAsset).confidentialTransferFrom(
            msg.sender, market, encCollPush
        );
        m.supplyCollateralFor(msg.sender, collateralPlain, encCollMarket);
        m.borrowFor(msg.sender, borrowPlain, encBorrow);

        if (stealthRegistry != address(0)) {
            IObscuraStealthRegistryAnnounce(stealthRegistry).announce(
                stealthAddress, ephemeralPubKey, viewTag, metadata
            );
        }

        emit SetupAndBorrowStealth(msg.sender, market, stealthAddress);
    }

    /// @notice Repay-and-withdraw collateral in ONE transaction.
    function repayAndWithdraw(
        address market,
        uint64  repayPlain,
        InEuint64 calldata encRepayPush,
        InEuint64 calldata encRepayMarket,
        uint64  withdrawCollPlain,
        InEuint64 calldata encWithdraw
    ) external {
        if (market == address(0)) revert ZeroAddress();
        IObscuraCreditMarketRouterAPI m = IObscuraCreditMarketRouterAPI(market);
        address loan = m.loanAsset();

        IConfidentialUSDCv2(loan).confidentialTransferFrom(
            msg.sender, market, encRepayPush
        );
        m.repayFor(msg.sender, repayPlain, encRepayMarket);

        if (withdrawCollPlain > 0) {
            m.withdrawCollateralFor(msg.sender, withdrawCollPlain, encWithdraw);
        }

        emit RepayAndWithdraw(msg.sender, market);
    }
}
