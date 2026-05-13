// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title MockChainlinkFeed — TESTNET ONLY
/// @notice Deterministic price feed for Arbitrum Sepolia rehearsals. Returns
///         a public uint256 1e18-USD price. The CreditOracle re-encrypts
///         this value into euint64 for downstream FHE health-factor math.
///         NEVER deploy to mainnet — uses owner-controlled writes.
contract MockChainlinkFeed {
    address public owner;
    uint256 public price; // 1e18 fixed-point USD per asset

    event PriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(uint256 _initialPrice) {
        owner = msg.sender;
        price = _initialPrice;
    }

    function set(uint256 _newPrice) external {
        require(msg.sender == owner, "not owner");
        emit PriceUpdated(price, _newPrice);
        price = _newPrice;
    }

    function latestAnswer() external view returns (uint256) {
        return price;
    }
}
