// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title ObscuraStealthRotation
/// @notice Wave 3 successor to ObscuraStealthRegistry's mutate-in-place
///         meta-address storage. Where V1 overwrote the meta-address on
///         every `setMetaAddress`, V2 *appends* to a per-user history,
///         emitting a `MetaRotated` event each time.
///
///         Why rotation matters (privacy audit 0.5.8): A long-lived
///         meta-address means every payment ever sent to a recipient links
///         back to the same secp256k1 keypair. If that keypair is ever
///         compromised (lost device, malware exfil), the entire payment
///         history is retroactively deanonymised. Rotation lets users
///         break the linkage at known cadences (monthly, after every job,
///         etc.) — old metas remain readable so the user's wallet can still
///         scan + claim historical payments, but new payments derive from
///         the new meta.
///
///         V1 (ObscuraStealthRegistry) stays deployed for backwards
///         compatibility. Frontends should prefer V2 for new registrations
///         and fall back to V1 only if V2.currentMeta returns the empty
///         record.
contract ObscuraStealthRotation {
    error EmptyKey();
    error BadKeyLength();
    error NoMeta();
    error IndexOutOfRange();

    struct MetaAddress {
        bytes spendingPubKey; // 33 bytes (compressed secp256k1)
        bytes viewingPubKey;  // 33 bytes
        uint64 publishedAt;
        bool active;          // false once rotated past, but still scannable
    }

    mapping(address => MetaAddress[]) private _history;
    address[] private _registered;
    mapping(address => bool) private _hasEverRegistered;

    event MetaRotated(
        address indexed user,
        uint256 indexed newIndex,
        uint256 previousIndex,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    /// @notice Append a new meta-address. The previous active meta (if any)
    ///         is marked inactive but kept readable for scanning history.
    function rotate(bytes calldata spendingPubKey, bytes calldata viewingPubKey) external {
        if (spendingPubKey.length == 0 || viewingPubKey.length == 0) revert EmptyKey();
        if (spendingPubKey.length != 33 || viewingPubKey.length != 33) revert BadKeyLength();

        MetaAddress[] storage h = _history[msg.sender];
        uint256 prev = h.length == 0 ? type(uint256).max : h.length - 1;
        if (h.length > 0) h[h.length - 1].active = false;

        h.push(
            MetaAddress({
                spendingPubKey: spendingPubKey,
                viewingPubKey: viewingPubKey,
                publishedAt: uint64(block.timestamp),
                active: true
            })
        );

        if (!_hasEverRegistered[msg.sender]) {
            _hasEverRegistered[msg.sender] = true;
            _registered.push(msg.sender);
        }

        emit MetaRotated(msg.sender, h.length - 1, prev, spendingPubKey, viewingPubKey);
    }

    /// @notice Return the currently active meta-address (revert if none).
    function currentMeta(address user)
        external
        view
        returns (
            bytes memory spendingPubKey,
            bytes memory viewingPubKey,
            uint64 publishedAt,
            uint256 index
        )
    {
        MetaAddress[] storage h = _history[user];
        if (h.length == 0) revert NoMeta();
        MetaAddress storage m = h[h.length - 1];
        return (m.spendingPubKey, m.viewingPubKey, m.publishedAt, h.length - 1);
    }

    /// @notice Return the meta-address at a specific history index. Useful
    ///         for the recipient's wallet when scanning historical
    ///         announcements that pre-date the latest rotation.
    function metaAt(address user, uint256 index)
        external
        view
        returns (
            bytes memory spendingPubKey,
            bytes memory viewingPubKey,
            uint64 publishedAt,
            bool active
        )
    {
        MetaAddress[] storage h = _history[user];
        if (index >= h.length) revert IndexOutOfRange();
        MetaAddress storage m = h[index];
        return (m.spendingPubKey, m.viewingPubKey, m.publishedAt, m.active);
    }

    function historyLength(address user) external view returns (uint256) {
        return _history[user].length;
    }

    function hasMeta(address user) external view returns (bool) {
        return _history[user].length > 0;
    }

    function registeredCount() external view returns (uint256) {
        return _registered.length;
    }

    function registeredAt(uint256 index) external view returns (address) {
        return _registered[index];
    }
}
