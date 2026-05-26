// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IEntryPointV07.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title ObscuraSmartAccount — ERC-4337 v0.7 account for Obscura Pay
/// @notice Supports two signer modes, discriminated by the first signature byte:
///   - sig[0] == 0x00 → EOA fallback via ecrecover against userOpHash
///   - sig[0] == 0x01 → WebAuthn/P-256 via RIP-7212 precompile
///     This allows future signature type extensibility.
/// @dev Security notes:
///   - The P-256 precompile (0x100) returns (1) on success, (0) on failure.
///   - Browser WebAuthn assertions sign sha256(authenticatorData || sha256(clientDataJSON)).
///     The userOpHash is carried as the WebAuthn challenge and checked on-chain.
///   - ERC-1271 has a length guard so EOA / P-256 cannot be confused.
///   - Only the EntryPoint can call validateUserOp.
///   - Re-entrancy guard on `execute` and `executeBatch`.
contract ObscuraSmartAccount is IAccount {
    // ─── Constants ────────────────────────────────────────────────────────────
    address public constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    /// @dev RIP-7212 P-256 precompile (live on Arbitrum Sepolia + other chains)
    address public constant P256_VERIFIER = 0x0000000000000000000000000000000000000100;

    // ─── Validation constants (ERC-4337) ──────────────────────────────────────
    uint256 internal constant SIG_VALIDATION_SUCCESS = 0;
    uint256 internal constant SIG_VALIDATION_FAILURE = 1;

    // ─── Storage ──────────────────────────────────────────────────────────────
    /// @notice EOA owner address (zero if passkey-only account)
    address public owner;
    /// @notice Passkey public key X coordinate (zero if EOA-only account)
    uint256 public passkeyX;
    /// @notice Passkey public key Y coordinate (zero if EOA-only account)
    uint256 public passkeyY;
    /// @notice Whether the passkey signer is enabled
    bool public passkeyEnabled;

    /// @dev Re-entrancy guard
    bool private _entered;

    // ─── Events ───────────────────────────────────────────────────────────────
    event PasskeyUpdated(uint256 indexed x, uint256 indexed y);
    event OwnerUpdated(address indexed newOwner);
    event Executed(address indexed target, uint256 value, bytes data);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NotEntryPoint();
    error NotOwnerOrEntryPoint();
    error InvalidSignature();
    error ExecutionFailed(bytes returnData);
    error Reentrant();
    error ZeroAddress();
    error AlreadyInitialized();

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyEntryPoint() {
        if (msg.sender != ENTRY_POINT) revert NotEntryPoint();
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != ENTRY_POINT && msg.sender != address(this)) {
            revert NotOwnerOrEntryPoint();
        }
        _;
    }

    modifier nonReentrant() {
        if (_entered) revert Reentrant();
        _entered = true;
        _;
        _entered = false;
    }

    // ─── Init guard (shared by constructor and initialize) ──────────────────────
    /// @dev Prevents double-initialization. Set to true by both constructor and initialize().
    bool private _initialized;

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @param _owner        EOA owner. May be address(0) only when used as clone implementation.
    /// @param _passkeyX     P-256 public key X coordinate.
    /// @param _passkeyY     P-256 public key Y coordinate.
    /// @dev  Passing (address(0), 0, 0) is valid and sets _initialized=true without configuring
    ///       an owner. This is used by ObscuraSmartAccountFactory to deploy the implementation
    ///       contract for EIP-1167 clones — the clone's own storage starts at 0 (false), so
    ///       initialize() can still be called on the clone.
    constructor(address _owner, uint256 _passkeyX, uint256 _passkeyY) {
        if (_owner != address(0) || _passkeyX != 0) {
            _setUp(_owner, _passkeyX, _passkeyY);
        }
        // Prevent further initialize() calls on directly-deployed accounts.
        _initialized = true;
    }

    /// @notice For EIP-1167 clone deployment: initializes the cloned proxy.
    ///         Can only be called once and only if the account was not directly constructed.
    function initialize(address _owner, uint256 _passkeyX, uint256 _passkeyY) external {
        if (_initialized) revert AlreadyInitialized();
        if (_owner == address(0) && _passkeyX == 0) revert ZeroAddress();
        _setUp(_owner, _passkeyX, _passkeyY);
        _initialized = true;
    }

    function _setUp(address _owner, uint256 _passkeyX, uint256 _passkeyY) private {
        owner = _owner;
        if (_passkeyX != 0) {
            passkeyX = _passkeyX;
            passkeyY = _passkeyY;
            passkeyEnabled = true;
        }
    }

    // ─── Receive ──────────────────────────────────────────────────────────────
    receive() external payable {}

    // ─── ERC-4337 validateUserOp ──────────────────────────────────────────────
    /// @inheritdoc IAccount
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        if (missingAccountFunds > 0) {
            // Transfer prefund to EntryPoint. Reverts on insufficient balance.
            (bool ok,) = payable(ENTRY_POINT).call{value: missingAccountFunds}("");
            (ok); // silence warning; EntryPoint will revert if not covered
        }

        bytes calldata sig = userOp.signature;
        if (sig.length < 1) return SIG_VALIDATION_FAILURE;

        uint8 sigType = uint8(sig[0]);

        if (sigType == 0x00) {
            // EOA path — ECDSA, 65 bytes total (0x00 + r + s + v)
            if (sig.length != 65) return SIG_VALIDATION_FAILURE;
            return _validateEOA(userOpHash, sig[1:65]) ? SIG_VALIDATION_SUCCESS : SIG_VALIDATION_FAILURE;
        } else if (sigType == 0x01) {
            // WebAuthn P-256 passkey path.
            if (!passkeyEnabled) return SIG_VALIDATION_FAILURE;
            return _validateWebAuthn(userOpHash, sig[1:]) ? SIG_VALIDATION_SUCCESS : SIG_VALIDATION_FAILURE;
        }

        return SIG_VALIDATION_FAILURE;
    }

    // ─── ERC-1271 isValidSignature ─────────────────────────────────────────────
    /// @notice Supports ERC-1271 signature verification with type guards.
    ///         Length guard prevents EOA/P-256 confusion attacks.
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        if (signature.length < 1) return bytes4(0xffffffff);
        uint8 sigType = uint8(signature[0]);

        if (sigType == 0x00 && signature.length == 65) {
            if (_validateEOA(hash, signature[1:65])) return 0x1626ba7e;
        } else if (sigType == 0x01 && passkeyEnabled) {
            if (_validateWebAuthn(hash, signature[1:])) return 0x1626ba7e;
        }
        return bytes4(0xffffffff);
    }

    // ─── Execution ────────────────────────────────────────────────────────────
    /// @notice Execute a single call. Called by EntryPoint after validation.
    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyOwnerOrEntryPoint
        nonReentrant
    {
        _call(target, value, data);
    }

    /// @notice Execute a batch of calls atomically. Reverts if any call fails.
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwnerOrEntryPoint nonReentrant {
        require(targets.length == values.length && values.length == datas.length, "Array mismatch");
        require(targets.length <= 16, "Batch too large");
        for (uint256 i = 0; i < targets.length; i++) {
            _call(targets[i], values[i], datas[i]);
        }
    }

    // ─── Owner management ─────────────────────────────────────────────────────
    function updateOwner(address _newOwner) external onlyOwnerOrEntryPoint {
        if (_newOwner == address(0)) revert ZeroAddress();
        owner = _newOwner;
        emit OwnerUpdated(_newOwner);
    }

    function updatePasskey(uint256 _x, uint256 _y) external onlyOwnerOrEntryPoint {
        passkeyX = _x;
        passkeyY = _y;
        passkeyEnabled = (_x != 0);
        emit PasskeyUpdated(_x, _y);
    }

    // ─── EntryPoint deposit helpers ───────────────────────────────────────────
    function entryPointDeposit() public payable {
        IEntryPointV07(ENTRY_POINT).depositTo{value: msg.value}(address(this));
    }

    function entryPointBalance() external view returns (uint256) {
        return IEntryPointV07(ENTRY_POINT).balanceOf(address(this));
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────
    function _call(address target, uint256 value, bytes calldata data) internal {
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        if (!ok) revert ExecutionFailed(ret);
        emit Executed(target, value, data);
    }

    /// @dev Validate an ECDSA signature against msg hash (Ethereum-prefixed, compatible with eth_sign / signMessage).
    ///      sig must be 64 bytes (r‖s, no v). We try both v=27 and v=28.
    function _validateEOA(bytes32 hash, bytes calldata sig) internal view returns (bool) {
        if (owner == address(0)) return false;
        if (sig.length != 64) return false;

        bytes32 r = bytes32(sig[:32]);
        bytes32 s = bytes32(sig[32:64]);

        // Apply Ethereum personal_sign prefix (matches MetaMask/wagmi signMessage)
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);

        // Try v=27
        address recovered = ecrecover(ethHash, 27, r, s);
        if (recovered == owner) return true;
        // Try v=28
        recovered = ecrecover(ethHash, 28, r, s);
        return recovered == owner;
    }

    /// @dev Validate a browser WebAuthn assertion via RIP-7212.
    ///      Encoded signature payload after the 0x01 type byte:
    ///      abi.encode(bytes authenticatorData, bytes clientDataJSON, uint256 challengeOffset, bytes32 r, bytes32 s)
    function _validateWebAuthn(bytes32 expectedChallenge, bytes calldata encodedSig) internal view returns (bool) {
        if (!passkeyEnabled) return false;
        if (encodedSig.length < 160) return false;

        (
            bytes memory authenticatorData,
            bytes memory clientDataJSON,
            uint256 challengeOffset,
            bytes32 r,
            bytes32 s
        ) = abi.decode(encodedSig, (bytes, bytes, uint256, bytes32, bytes32));

        if (!_validateClientDataChallenge(clientDataJSON, expectedChallenge, challengeOffset)) return false;
        if (authenticatorData.length < 37) return false;
        // Require User Present (UP) bit. UV can remain browser/user-config dependent.
        if ((uint8(authenticatorData[32]) & 0x01) != 0x01) return false;

        bytes32 clientDataHash = sha256(clientDataJSON);
        bytes32 webAuthnDigest = sha256(bytes.concat(authenticatorData, abi.encodePacked(clientDataHash)));

        return _verifyP256Digest(webAuthnDigest, r, s);
    }

    function _verifyP256Digest(bytes32 digest, bytes32 r, bytes32 s) internal view returns (bool) {
        bytes memory input = abi.encodePacked(digest, r, s, passkeyX, passkeyY);
        (bool ok, bytes memory result) = P256_VERIFIER.staticcall(input);
        if (!ok || result.length == 0) return false;
        return abi.decode(result, (uint256)) == 1;
    }

    function _validateClientDataChallenge(
        bytes memory clientDataJSON,
        bytes32 expectedChallenge,
        uint256 challengeOffset
    ) internal pure returns (bool) {
        bytes memory typePrefix = bytes('{"type":"webauthn.get"');
        if (!_startsWith(clientDataJSON, typePrefix)) return false;

        bytes memory challengeKey = bytes('"challenge":"');
        if (challengeOffset < challengeKey.length) return false;
        if (!_bytesEqualAt(clientDataJSON, challengeOffset - challengeKey.length, challengeKey)) return false;

        bytes memory expected = _base64UrlEncode32(expectedChallenge);
        if (!_bytesEqualAt(clientDataJSON, challengeOffset, expected)) return false;
        if (challengeOffset + expected.length >= clientDataJSON.length) return false;
        if (clientDataJSON[challengeOffset + expected.length] != bytes1('"')) return false;

        return true;
    }

    function _startsWith(bytes memory data, bytes memory prefix) internal pure returns (bool) {
        if (data.length < prefix.length) return false;
        return _bytesEqualAt(data, 0, prefix);
    }

    function _bytesEqualAt(bytes memory data, uint256 offset, bytes memory expected) internal pure returns (bool) {
        if (offset + expected.length > data.length) return false;
        for (uint256 i = 0; i < expected.length; i++) {
            if (data[offset + i] != expected[i]) return false;
        }
        return true;
    }

    function _base64UrlEncode32(bytes32 value) internal pure returns (bytes memory out) {
        bytes memory table = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_");
        bytes memory input = abi.encodePacked(value);
        out = new bytes(43);
        uint256 j = 0;

        for (uint256 i = 0; i < 30; i += 3) {
            uint24 triple = (uint24(uint8(input[i])) << 16)
                | (uint24(uint8(input[i + 1])) << 8)
                | uint24(uint8(input[i + 2]));
            out[j++] = table[uint256(triple >> 18) & 0x3f];
            out[j++] = table[uint256(triple >> 12) & 0x3f];
            out[j++] = table[uint256(triple >> 6) & 0x3f];
            out[j++] = table[uint256(triple) & 0x3f];
        }

        uint24 last = (uint24(uint8(input[30])) << 16) | (uint24(uint8(input[31])) << 8);
        out[j++] = table[uint256(last >> 18) & 0x3f];
        out[j++] = table[uint256(last >> 12) & 0x3f];
        out[j++] = table[uint256(last >> 6) & 0x3f];
    }
}
