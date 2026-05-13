// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./IObscuraCreditOracle.sol";

interface IPlainFeed {
    function latestAnswer() external view returns (uint256);
}

/// @title ObscuraCreditOracle
/// @notice Bridges public Chainlink-shaped feeds into FHE-encrypted prices
///         consumed by markets. Also supports DAO-set confidential prices
///         for OTC / RWA assets where even the price is private.
///
///         Privacy model: feed-backed assets have public prices that we
///         re-encrypt as `euint64` so the downstream HF math stays FHE
///         (preventing chain observers from joining encrypted positions
///         to a public price feed timestamp). DAO confidential prices
///         are stored as `euint64` and only the DAO can rotate.
contract ObscuraCreditOracle is IObscuraCreditOracle {
    error NotGovernor();
    error NoSource();

    address public governor;

    mapping(address => address) public publicFeed;        // asset -> Chainlink-shaped
    mapping(address => euint64) private confidentialPx;   // asset -> encrypted px
    mapping(address => bool)    public hasConfidential;

    event GovernorSet(address indexed governor);
    event PublicFeedSet(address indexed asset, address indexed feed);
    event ConfidentialPriceSet(address indexed asset);

    modifier onlyGov() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    constructor(address _governor) {
        governor = _governor;
    }

    function setGovernor(address _new) external onlyGov {
        governor = _new;
        emit GovernorSet(_new);
    }

    function setPublicFeed(address asset, address feed) external onlyGov {
        publicFeed[asset] = feed;
        emit PublicFeedSet(asset, feed);
    }

    /// @notice DAO sets a fully encrypted price for assets without public feeds.
    function setConfidentialPrice(address asset, InEuint64 calldata encPx) external onlyGov {
        euint64 px = FHE.asEuint64(encPx);
        FHE.allowThis(px);
        confidentialPx[asset] = px;
        hasConfidential[asset] = true;
        emit ConfidentialPriceSet(asset);
    }

    /// @inheritdoc IObscuraCreditOracle
    function priceOf(address asset) external override returns (euint64) {
        if (hasConfidential[asset]) {
            euint64 conf = confidentialPx[asset];
            FHE.allowTransient(conf, msg.sender);
            return conf;
        }
        address feed = publicFeed[asset];
        if (feed == address(0)) revert NoSource();
        uint256 raw = IPlainFeed(feed).latestAnswer();
        // Compress to fit euint64 (max ~1.8e19): scale 1e18 → 1e6 (USD millionths).
        uint256 micro = raw / 1e12;
        euint64 px = FHE.asEuint64(micro);
        FHE.allowThis(px);
        FHE.allowTransient(px, msg.sender);
        return px;
    }
}
