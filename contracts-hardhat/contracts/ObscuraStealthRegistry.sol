// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title ObscuraStealthRegistry
/// @notice ERC-5564-style stealth-address registry. Recipients publish a one-time
///         (spending pubkey, viewing pubkey) pair. Senders derive a fresh stealth
///         address per payment off-chain and call `announce(...)` so the
///         recipient's wallet can scan and claim using the view-tag prefilter.
///
///         This contract holds zero value — it is a discovery layer only.
///         Stealth address derivation runs in `frontend/src/lib/stealth.ts`.
contract ObscuraStealthRegistry {
    struct MetaAddress {
        bytes spendingPubKey; // 33 bytes (compressed secp256k1)
        bytes viewingPubKey;  // 33 bytes (compressed secp256k1)
        uint256 publishedAt;
    }

    mapping(address => MetaAddress) private _meta;
    address[] private _registered;

    event MetaAddressSet(
        address indexed user,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    /// @notice Emitted on every stealth payment so wallets can scan with a
    ///         cheap viewTag pre-filter before doing the full ECDH derivation.
    event Announcement(
        uint256 indexed schemeId,           // 1 = secp256k1 view-tag
        address indexed stealthAddress,     // freshly derived recipient
        address indexed caller,             // sender / orchestrator
        bytes ephemeralPubKey,              // sender's ephemeral pubkey
        bytes1 viewTag,                     // 1-byte hint of shared secret
        bytes metadata                      // app-specific blob (escrowId, streamId)
    );

    function setMetaAddress(bytes calldata spendingPubKey, bytes calldata viewingPubKey) external {
        require(spendingPubKey.length == 33, "bad spending key");
        require(viewingPubKey.length == 33, "bad viewing key");
        bool first = _meta[msg.sender].publishedAt == 0;
        _meta[msg.sender] = MetaAddress({
            spendingPubKey: spendingPubKey,
            viewingPubKey: viewingPubKey,
            publishedAt: block.timestamp
        });
        if (first) _registered.push(msg.sender);
        emit MetaAddressSet(msg.sender, spendingPubKey, viewingPubKey);
    }

    function getMetaAddress(address user)
        external
        view
        returns (bytes memory spendingPubKey, bytes memory viewingPubKey, uint256 publishedAt)
    {
        MetaAddress storage m = _meta[user];
        return (m.spendingPubKey, m.viewingPubKey, m.publishedAt);
    }

    function hasMetaAddress(address user) external view returns (bool) {
        return _meta[user].publishedAt != 0;
    }

    function registeredCount() external view returns (uint256) {
        return _registered.length;
    }

    function registeredAt(uint256 index) external view returns (address) {
        return _registered[index];
    }

    /// @notice Anyone may announce a stealth payment they just sent. Off-chain
    ///         wallets watch this event and decrypt only entries whose
    ///         `viewTag` matches their derived shared secret.
    function announce(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes calldata metadata
    ) external {
        require(ephemeralPubKey.length == 33, "bad ephemeral key");
        emit Announcement(1, stealthAddress, msg.sender, ephemeralPubKey, viewTag, metadata);
    }
}
