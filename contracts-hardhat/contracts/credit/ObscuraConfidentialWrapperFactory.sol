// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./ObscuraConfidentialToken.sol";

/// @title ObscuraConfidentialWrapperFactory
/// @notice Deploys new ObscuraConfidentialToken wrappers for any ERC-20.
///         - One wrapper per underlying asset (enforced via wrapperOf mapping).
///         - Factory owner calls `deploy()`; guardianship is transferred to
///           the caller so they control setUnderlying / pause / lock.
///         - Faucet mode (underlying == address(0)) is also supported for
///           new test tokens.
contract ObscuraConfidentialWrapperFactory {
    error AlreadyExists();
    error OnlyOwner();

    address public owner;
    /// @notice underlying ERC-20 → wrapper ObscuraConfidentialToken address.
    mapping(address => address) public wrapperOf;
    address[] public allWrappers;

    event WrapperDeployed(
        address indexed underlying,
        address indexed wrapper,
        string  symbol
    );
    event OwnershipTransferred(address indexed prevOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @notice Deploy a new confidential wrapper.
    /// @param underlying  ERC-20 to wrap, or address(0) for faucet-only mode.
    /// @param name        Token name (e.g. "Obscura Confidential WETH").
    /// @param symbol      Token symbol (e.g. "ocWETH").
    /// @param decimals    Decimal places matching the underlying.
    /// @param faucetAmt   Amount given by claimFaucet() in raw units (6 dec → 10_000_000 = 10 USDC).
    /// @return wrapper    Address of the newly deployed ObscuraConfidentialToken.
    function deploy(
        address underlying,
        string calldata name,
        string calldata symbol,
        uint8  decimals,
        uint64 faucetAmt
    ) external onlyOwner returns (address wrapper) {
        if (wrapperOf[underlying] != address(0)) revert AlreadyExists();

        ObscuraConfidentialToken token = new ObscuraConfidentialToken(name, symbol, decimals, faucetAmt);
        wrapper = address(token);

        // Activate wrapper mode if an underlying is provided.
        if (underlying != address(0)) {
            token.setUnderlying(underlying);
        }

        // Transfer guardianship to the factory owner so they control the token.
        token.setGuardian(msg.sender);

        wrapperOf[underlying] = wrapper;
        allWrappers.push(wrapper);
        emit WrapperDeployed(underlying, wrapper, symbol);
    }

    function wrappersCount() external view returns (uint256) {
        return allWrappers.length;
    }

    /// @notice Transfer factory ownership to a new admin.
    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
