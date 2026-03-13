// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ObscuraAddressBook
/// @notice Per-owner encrypted contact list. Stores `(labelHash, encMeta)`
///         entries where `encMeta` is the recipient's stealth meta-address
///         (or any 20-byte recipient address) encrypted with the owner's
///         FHE key. Only the owner can decrypt their own contacts.
///
///         Why on-chain instead of localStorage:
///         contacts must follow the user across devices/wallets. Storing
///         them in localStorage breaks the moment the user clears site data
///         or switches browsers. On-chain + encrypted gives durability
///         without exposing the social graph publicly.
///
///         Why labelHash instead of plaintext label:
///         labels can themselves be PII ("CEO Personal Wallet" reveals a
///         lot). The frontend stores the plaintext label in encrypted local
///         backup; on-chain we keep only `keccak256(plaintext)` so a contact
///         can be looked up by name without revealing the name.
contract ObscuraAddressBook {
    error ContactNotFound();
    error EmptyLabel();

    struct Contact {
        bytes32 labelHash;
        eaddress encMeta;   // encrypted recipient address / meta-address
        uint64 createdAt;
        bool exists;
    }

    /// @dev Owner -> contactId -> Contact. contactId is a per-owner counter.
    mapping(address => mapping(uint256 => Contact)) private _contacts;
    /// @dev Per-owner contact id list (sparse — deleted entries leave gaps
    ///      so existing ids stay stable for the UI).
    mapping(address => uint256[]) private _contactIds;
    /// @dev Per-owner next contactId to assign.
    mapping(address => uint256) private _nextId;

    event ContactAdded(address indexed owner, uint256 indexed contactId, bytes32 labelHash);
    event ContactRemoved(address indexed owner, uint256 indexed contactId);
    event ContactRelabelled(address indexed owner, uint256 indexed contactId, bytes32 newLabelHash);

    /// @notice Add a contact. Returns its per-owner contactId.
    /// @param labelHash keccak256 of the plaintext display label.
    /// @param encMeta encrypted recipient address (cofhe-sdk encryptInputs).
    function addContact(bytes32 labelHash, InEaddress calldata encMeta)
        external
        returns (uint256 contactId)
    {
        if (labelHash == bytes32(0)) revert EmptyLabel();

        eaddress meta = FHE.asEaddress(encMeta);
        FHE.allowThis(meta);
        FHE.allow(meta, msg.sender);

        contactId = _nextId[msg.sender]++;
        _contacts[msg.sender][contactId] = Contact({
            labelHash: labelHash,
            encMeta: meta,
            createdAt: uint64(block.timestamp),
            exists: true
        });
        _contactIds[msg.sender].push(contactId);

        emit ContactAdded(msg.sender, contactId, labelHash);
    }

    /// @notice Update the label hash on an existing contact (encrypted meta
    ///         is immutable — to change the recipient, remove and re-add).
    function relabel(uint256 contactId, bytes32 newLabelHash) external {
        Contact storage c = _contacts[msg.sender][contactId];
        if (!c.exists) revert ContactNotFound();
        if (newLabelHash == bytes32(0)) revert EmptyLabel();
        c.labelHash = newLabelHash;
        emit ContactRelabelled(msg.sender, contactId, newLabelHash);
    }

    /// @notice Remove a contact. Subsequent reads return ContactNotFound;
    ///         the id is NOT reused.
    function removeContact(uint256 contactId) external {
        Contact storage c = _contacts[msg.sender][contactId];
        if (!c.exists) revert ContactNotFound();
        delete _contacts[msg.sender][contactId];
        emit ContactRemoved(msg.sender, contactId);
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getContact(address owner, uint256 contactId)
        external
        view
        returns (bytes32 labelHash, eaddress encMeta, uint64 createdAt)
    {
        Contact storage c = _contacts[owner][contactId];
        if (!c.exists) revert ContactNotFound();
        return (c.labelHash, c.encMeta, c.createdAt);
    }

    /// @notice All contactIds ever assigned to `owner`. Iterate + skip the
    ///         deleted ones (where `getContact` reverts).
    function listContactIds(address owner) external view returns (uint256[] memory) {
        return _contactIds[owner];
    }

    function nextContactId(address owner) external view returns (uint256) {
        return _nextId[owner];
    }
}
