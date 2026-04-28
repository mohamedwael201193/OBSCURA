// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title ObscuraSocialResolver
/// @notice Maps a human-readable handle (e.g. `"sarah.eth"`, `"alice"`) to
///         a stealth meta-address. Anyone can `register(handle, ownership)`
///         the first time it's claimed; subsequent updates require the
///         registered owner to call `updateMeta(handle, ...)`.
///
///         For Wave 3 we accept two ownership proofs:
///         (a) a valid ENS reverse-resolution to the caller (verified by
///             the trusted `ensVerifier`), or
///         (b) a self-claim of an unowned bare-name handle (no oracle proof
///             required). Bare-name claims get a `selfClaimed = true` flag
///             so the UI can distinguish them from ENS-backed ones.
///
///         No FHE — handles are intentionally public (their entire purpose
///         is discovery). The recipient privacy is preserved because the
///         resolved value is a *stealth meta-address*, from which a fresh
///         payment address is derived per-tx.
contract ObscuraSocialResolver {
    error HandleEmpty();
    error HandleTooLong();
    error AlreadyRegistered();
    error NotOwner();
    error NotEnsVerifier();
    error InvalidEnsProof();

    /// @notice Max handle length in bytes (matches ENS soft cap).
    uint256 public constant MAX_HANDLE_LEN = 63;

    struct Record {
        address owner;
        bytes32 metaSpendingPubKey; // 32-byte secp256k1 X coord (compressed key bottom 32B)
        bytes32 metaViewingPubKey;
        uint8 metaSpendingPrefix;   // 0x02 / 0x03 sign byte
        uint8 metaViewingPrefix;
        uint64 registeredAt;
        bool selfClaimed; // true if registered without ENS proof
        bool exists;
    }

    /// @notice Trusted oracle that signs ENS-ownership proofs. Set at deploy.
    ///         Use address(0) to disable ENS-backed registrations entirely.
    address public immutable ensVerifier;

    mapping(bytes32 => Record) private _records; // keyed by keccak256(handle)
    mapping(address => bytes32[]) private _handlesByOwner;

    event HandleRegistered(bytes32 indexed handleHash, address indexed owner, bool selfClaimed);
    event MetaUpdated(bytes32 indexed handleHash, address indexed owner);
    event HandleTransferred(bytes32 indexed handleHash, address indexed from, address indexed to);

    constructor(address _ensVerifier) {
        ensVerifier = _ensVerifier;
    }

    /// @notice Register a handle with no ENS proof (self-claim of an
    ///         unowned bare name). First-come-first-served.
    function selfRegister(
        string calldata handle,
        bytes32 metaSpendingPubKey,
        bytes32 metaViewingPubKey,
        uint8 metaSpendingPrefix,
        uint8 metaViewingPrefix
    ) external {
        bytes32 hh = _validateAndHash(handle);
        if (_records[hh].exists) revert AlreadyRegistered();

        _records[hh] = Record({
            owner: msg.sender,
            metaSpendingPubKey: metaSpendingPubKey,
            metaViewingPubKey: metaViewingPubKey,
            metaSpendingPrefix: metaSpendingPrefix,
            metaViewingPrefix: metaViewingPrefix,
            registeredAt: uint64(block.timestamp),
            selfClaimed: true,
            exists: true
        });
        _handlesByOwner[msg.sender].push(hh);

        emit HandleRegistered(hh, msg.sender, true);
    }

    /// @notice Register a handle backed by an ENS-ownership signature from
    ///         the trusted `ensVerifier`. Verifier signs:
    ///           keccak256(abi.encode("OBSCURA_ENS_PROOF_V1", handleHash, owner))
    ///         This lets the verifier prove "owner controls the ENS name
    ///         that maps to handle" without needing a reverse-resolver
    ///         on Arb Sepolia.
    function registerWithEnsProof(
        string calldata handle,
        bytes32 metaSpendingPubKey,
        bytes32 metaViewingPubKey,
        uint8 metaSpendingPrefix,
        uint8 metaViewingPrefix,
        bytes calldata ensSignature
    ) external {
        if (ensVerifier == address(0)) revert NotEnsVerifier();
        bytes32 hh = _validateAndHash(handle);
        if (_records[hh].exists) revert AlreadyRegistered();

        bytes32 digest = keccak256(
            abi.encode("OBSCURA_ENS_PROOF_V1", hh, msg.sender)
        );
        if (!_verifySig(digest, ensSignature, ensVerifier)) revert InvalidEnsProof();

        _records[hh] = Record({
            owner: msg.sender,
            metaSpendingPubKey: metaSpendingPubKey,
            metaViewingPubKey: metaViewingPubKey,
            metaSpendingPrefix: metaSpendingPrefix,
            metaViewingPrefix: metaViewingPrefix,
            registeredAt: uint64(block.timestamp),
            selfClaimed: false,
            exists: true
        });
        _handlesByOwner[msg.sender].push(hh);

        emit HandleRegistered(hh, msg.sender, false);
    }

    /// @notice Owner rotates the meta-address attached to a handle.
    function updateMeta(
        string calldata handle,
        bytes32 metaSpendingPubKey,
        bytes32 metaViewingPubKey,
        uint8 metaSpendingPrefix,
        uint8 metaViewingPrefix
    ) external {
        bytes32 hh = keccak256(bytes(handle));
        Record storage r = _records[hh];
        if (!r.exists) revert HandleEmpty();
        if (r.owner != msg.sender) revert NotOwner();
        r.metaSpendingPubKey = metaSpendingPubKey;
        r.metaViewingPubKey = metaViewingPubKey;
        r.metaSpendingPrefix = metaSpendingPrefix;
        r.metaViewingPrefix = metaViewingPrefix;
        emit MetaUpdated(hh, msg.sender);
    }

    /// @notice Owner transfers a handle to a new owner.
    function transferHandle(string calldata handle, address newOwner) external {
        bytes32 hh = keccak256(bytes(handle));
        Record storage r = _records[hh];
        if (!r.exists) revert HandleEmpty();
        if (r.owner != msg.sender) revert NotOwner();
        require(newOwner != address(0), "new=0");
        address old = r.owner;
        r.owner = newOwner;
        _handlesByOwner[newOwner].push(hh);
        emit HandleTransferred(hh, old, newOwner);
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function resolve(string calldata handle)
        external
        view
        returns (
            address owner,
            bytes32 metaSpendingPubKey,
            bytes32 metaViewingPubKey,
            uint8 metaSpendingPrefix,
            uint8 metaViewingPrefix,
            bool selfClaimed
        )
    {
        bytes32 hh = keccak256(bytes(handle));
        Record storage r = _records[hh];
        if (!r.exists) revert HandleEmpty();
        return (
            r.owner,
            r.metaSpendingPubKey,
            r.metaViewingPubKey,
            r.metaSpendingPrefix,
            r.metaViewingPrefix,
            r.selfClaimed
        );
    }

    function handlesByOwner(address owner) external view returns (bytes32[] memory) {
        return _handlesByOwner[owner];
    }

    // ─── Internal ───────────────────────────────────────────────────────────

    function _validateAndHash(string calldata handle) internal pure returns (bytes32) {
        bytes memory b = bytes(handle);
        if (b.length == 0) revert HandleEmpty();
        if (b.length > MAX_HANDLE_LEN) revert HandleTooLong();
        return keccak256(b);
    }

    /// @dev Recover an EIP-191 personal_sign signature and compare to expected signer.
    function _verifySig(bytes32 digest, bytes calldata sig, address expected)
        internal
        pure
        returns (bool)
    {
        if (sig.length != 65) return false;
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 0x20))
            v := byte(0, calldataload(add(sig.offset, 0x40)))
        }
        if (v < 27) v += 27;
        bytes32 ethDigest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)
        );
        address recovered = ecrecover(ethDigest, v, r, s);
        return recovered != address(0) && recovered == expected;
    }
}
