// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @notice Minimal Chainlink AggregatorV3 surface — `latestRoundData` only.
interface IChainlinkAggregator {
    function latestRoundData() external view returns (
        uint80  roundId,
        int256  answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80  answeredInRound
    );
    function decimals() external view returns (uint8);
}

/// @title ChainlinkPriceAdapter
/// @notice 8-decimal Chainlink feed → 18-decimal `latestAnswer()` adapter.
///
///         Why this exists:
///         ObscuraCreditOracle (deployed at 0x5F0091...) is wired into the
///         3 live markets via `address public immutable oracle;` and reads
///         `IPlainFeed.latestAnswer()` then divides by `1e12` to get
///         micro-USD (1e6) for the encrypted HF math. That `/1e12` assumes
///         18-decimal Pyth-style feeds. Arbitrum-Sepolia Chainlink feeds
///         are 8-decimal — divide-by-1e12 underflows to 0 → market math
///         breaks.
///
///         Rather than redeploy oracle + all 3 markets (oracle is immutable
///         in market storage), this adapter:
///           1. Reads Chainlink `latestRoundData()`.
///           2. Asserts positive answer + freshness (staleness window).
///           3. Re-scales 8-decimal → 18-decimal by multiplying by `1e10`.
///           4. Exposes `latestAnswer() returns(uint256)` matching the
///              existing oracle's expected interface.
///
///         Then governor calls `ObscuraCreditOracle.setPublicFeed(asset, adapter)`
///         per asset (ocUSDC, ocWETH) and the existing oracle's math works
///         correctly with zero redeploys downstream.
contract ChainlinkPriceAdapter {
    error StalePrice();
    error NonPositivePrice();
    error AdapterMisconfigured();

    address public immutable chainlinkFeed;
    /// @dev Maximum age of a feed answer accepted as fresh. Chainlink USD
    ///      feeds on Arbitrum Sepolia heartbeat ~3600s; we set 24h to
    ///      tolerate testnet flakiness while remaining safe for HF reads
    ///      (HF refresh is per-tx, not per-block).
    uint256 public immutable maxStaleness;
    /// @dev Pre-computed scale factor: 10 ** (18 - feedDecimals). For
    ///      Chainlink 8-decimal feeds this is 1e10.
    uint256 public immutable scale;

    constructor(address _feed, uint256 _maxStaleness) {
        chainlinkFeed = _feed;
        maxStaleness  = _maxStaleness == 0 ? 86_400 : _maxStaleness;

        uint8 dec = IChainlinkAggregator(_feed).decimals();
        if (dec > 18) revert AdapterMisconfigured();
        scale = 10 ** (18 - dec);
    }

    /// @notice Returns the latest Chainlink answer re-scaled to 18 decimals
    ///         so the existing `ObscuraCreditOracle` micro-USD math works
    ///         unchanged. Reverts on stale or non-positive answer.
    function latestAnswer() external view returns (uint256) {
        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,

        ) = IChainlinkAggregator(chainlinkFeed).latestRoundData();

        if (answer <= 0) revert NonPositivePrice();
        if (block.timestamp - updatedAt > maxStaleness) revert StalePrice();

        return uint256(answer) * scale;
    }

    /// @notice Raw Chainlink decimals — diagnostic only.
    function feedDecimals() external view returns (uint8) {
        return IChainlinkAggregator(chainlinkFeed).decimals();
    }
}
