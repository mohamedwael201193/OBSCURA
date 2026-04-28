// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title ObscuraInboxIndex
/// @notice Per-recipient bloom filter of ephemeral pubkey hashes the user
///         wants to ignore in their stealth inbox. Frontends scan
///         `Announcement` events from the stealth registry; without an
///         ignore list the same spam announcement re-appears on every scan.
///
///         A bloom filter is preferred over a set of explicit hashes:
///         constant 256-byte storage cost per user regardless of how many
///         senders are ignored. False-positive risk is acceptable because
///         the worst case is "the user manually un-ignores a missed
///         payment". No correctness or fund safety depends on this filter.
///
///         Filter geometry: 256 bytes (2048 bits) with 3 hash functions
///         derived from a single keccak256 — yields ~1% false-positive rate
///         at ~140 entries, ~5% at ~280 entries.
contract ObscuraInboxIndex {
    /// @dev 2048 bits = 256 bytes per user.
    uint256 private constant FILTER_BITS = 2048;
    uint256 private constant K = 3;

    /// @dev recipient -> bitmap (4 × uint256 = 1024 bits — wait, we need
    ///      2048 bits, so 8 × uint256). We use a fixed-size mapping rather
    ///      than `uint256[8]` to keep storage layout addressable.
    mapping(address => mapping(uint256 => uint256)) private _filter;

    event SenderIgnored(address indexed recipient, bytes32 indexed ephHash);
    event FilterReset(address indexed recipient);

    /// @notice Mark an ephemeral-pubkey hash as ignored for the caller.
    ///         Idempotent (re-ignoring is a no-op gas-wise modulo SSTORE
    ///         warm/cold differences).
    function ignoreSender(bytes32 ephHash) external {
        _setBits(msg.sender, ephHash);
        emit SenderIgnored(msg.sender, ephHash);
    }

    /// @notice Bulk-ignore — useful for the "Mark all spam" UX.
    function ignoreSenders(bytes32[] calldata ephHashes) external {
        for (uint256 i = 0; i < ephHashes.length; i++) {
            _setBits(msg.sender, ephHashes[i]);
            emit SenderIgnored(msg.sender, ephHashes[i]);
        }
    }

    /// @notice Reset the caller's filter (clear all ignored senders).
    function resetFilter() external {
        for (uint256 i = 0; i < FILTER_BITS / 256; i++) {
            delete _filter[msg.sender][i];
        }
        emit FilterReset(msg.sender);
    }

    /// @notice True if `ephHash` is (likely) in `recipient`'s ignore filter.
    ///         May return true when the sender was never explicitly
    ///         ignored (false positive ≤ ~1% under 140 entries).
    function isIgnored(address recipient, bytes32 ephHash) external view returns (bool) {
        bytes32 h = keccak256(abi.encode(ephHash));
        for (uint256 i = 0; i < K; i++) {
            uint256 bit = uint256(keccak256(abi.encode(h, i))) % FILTER_BITS;
            uint256 word = bit / 256;
            uint256 mask = 1 << (bit % 256);
            if (_filter[recipient][word] & mask == 0) return false;
        }
        return true;
    }

    function _setBits(address recipient, bytes32 ephHash) internal {
        bytes32 h = keccak256(abi.encode(ephHash));
        for (uint256 i = 0; i < K; i++) {
            uint256 bit = uint256(keccak256(abi.encode(h, i))) % FILTER_BITS;
            uint256 word = bit / 256;
            uint256 mask = 1 << (bit % 256);
            _filter[recipient][word] |= mask;
        }
    }
}
