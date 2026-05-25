// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IEntryPointV07.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title ObscuraSmartAccount — ERC-4337 v0.7 account for Obscura Pay
/// @notice Supports two signer modes, discriminated by signature length:
///   - EOA (ECDSA): 65-byte signature → ecrecover against userOpHash
///   - Passkey (P-256): 64-byte r‖s + 1-byte flag (0x01) = 65 bytes total,
///     but prefixed with 0x00 flag in some modes. We discriminate by flag byte:
///     sig[0] == 0x00 → EOA fallback, sig[0] == 0x01 → P-256 via RIP-7212 precompile.
///     This allows future signature type extensibility.
/// @dev Security notes:
///   - The P-256 precompile (0x100) returns (1) on success, (0) on failure.
///   - We pass `prehash: false` — the userOpHash is used directly, NOT re-hashed.
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
            // P-256 passkey path — r‖s, 64 bytes (0x01 + r[32] + s[32])
            if (sig.length != 65) return SIG_VALIDATION_FAILURE;
            if (!passkeyEnabled) return SIG_VALIDATION_FAILURE;
            return _validateP256(userOpHash, sig[1:65]) ? SIG_VALIDATION_SUCCESS : SIG_VALIDATION_FAILURE;
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
        } else if (sigType == 0x01 && signature.length == 65 && passkeyEnabled) {
            if (_validateP256(hash, signature[1:65])) return 0x1626ba7e;
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

    /// @dev Validate a P-256 signature via RIP-7212 precompile.
    ///      sig must be 64 bytes: r[32] ‖ s[32].
    ///      The precompile input: hash(32) ‖ r(32) ‖ s(32) ‖ x(32) ‖ y(32)
    ///      Returns 32 bytes: 0x...01 on success.
    function _validateP256(bytes32 hash, bytes calldata sig) internal view returns (bool) {
        if (!passkeyEnabled) return false;
        if (sig.length != 64) return false;

        bytes32 r = bytes32(sig[:32]);
        bytes32 s = bytes32(sig[32:64]);

        bytes memory input = abi.encodePacked(hash, r, s, passkeyX, passkeyY);
        (bool ok, bytes memory result) = P256_VERIFIER.staticcall(input);
        if (!ok || result.length == 0) return false;
        return abi.decode(result, (uint256)) == 1;
    }
}
