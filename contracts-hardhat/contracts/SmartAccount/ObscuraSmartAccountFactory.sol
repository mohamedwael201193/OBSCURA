// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ObscuraSmartAccount.sol";

/// @title  ObscuraSmartAccountFactory
/// @notice CREATE2-deterministic factory for ObscuraSmartAccount using EIP-1167 minimal proxies.
///
/// @dev    Architecture:
///           • One `IMPLEMENTATION` contract is deployed in the constructor.  It is fully
///             set up with _initialized=true and zero owner (cannot be used directly).
///           • `createAccount` clones the implementation via `Clones.cloneDeterministic`,
///             then calls `initialize(owner, passkeyX, passkeyY)` on the fresh clone.
///           • `getAddress` calls `Clones.predictDeterministicAddress` — always consistent
///             with `createAccount`, and unaffected by the viaIR optimizer because the clone
///             proxy bytecode is a compile-time constant embedded in the Clones library.
///
/// @dev    Salt derivation: `keccak256(abi.encodePacked(owner, passkeyX, passkeyY, userSalt))`
///         ensures distinct CREATE2 salts for every unique (owner, passkey, salt) triple.
contract ObscuraSmartAccountFactory {
    using Clones for address;

    // ─── State ────────────────────────────────────────────────────────────────
    /// @notice The ObscuraSmartAccount logic contract all clones delegate to.
    address public IMPLEMENTATION;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AccountCreated(
        address indexed account,
        address indexed owner,
        uint256         passkeyX,
        uint256         passkeyY,
        uint256         salt
    );

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        // Deploy the implementation with zero owner (zero-init is allowed by the
        // constructor change in ObscuraSmartAccount).  _initialized=true in the
        // implementation prevents anyone from calling initialize() on it directly.
        IMPLEMENTATION = address(new ObscuraSmartAccount(address(0), 0, 0));
    }

    // ─── External ─────────────────────────────────────────────────────────────

    /// @notice Deploy (or return the existing) smart account for `_owner` / passkey.
    /// @param  _owner    EOA owner address.  Use address(0) for passkey-only.
    /// @param  _passkeyX P-256 public-key x-coordinate (0 if EOA-only).
    /// @param  _passkeyY P-256 public-key y-coordinate (0 if EOA-only).
    /// @param  _salt     Caller-chosen entropy to produce unique addresses.
    function createAccount(
        address _owner,
        uint256 _passkeyX,
        uint256 _passkeyY,
        uint256 _salt
    ) external returns (address account) {
        require(
            _owner != address(0) || _passkeyX != 0,
            "ObscuraSmartAccountFactory: zero owner and passkey"
        );

        bytes32 salt = _deriveSalt(_owner, _passkeyX, _passkeyY, _salt);
        account = IMPLEMENTATION.predictDeterministicAddress(salt, address(this));

        // Idempotent: if already deployed just return the address.
        if (account.code.length > 0) return account;

        // Deploy the clone and initialize it.
        IMPLEMENTATION.cloneDeterministic(salt);
        ObscuraSmartAccount(payable(account)).initialize(_owner, _passkeyX, _passkeyY);
        emit AccountCreated(account, _owner, _passkeyX, _passkeyY, _salt);
    }

    /// @notice Compute the counterfactual address — consistent with `createAccount`.
    function getAccountAddress(
        address _owner,
        uint256 _passkeyX,
        uint256 _passkeyY,
        uint256 _salt
    ) public view returns (address) {
        return IMPLEMENTATION.predictDeterministicAddress(
            _deriveSalt(_owner, _passkeyX, _passkeyY, _salt),
            address(this)
        );
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Derives a unique salt from the account parameters.
    function _deriveSalt(
        address _owner,
        uint256 _passkeyX,
        uint256 _passkeyY,
        uint256 _userSalt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_owner, _passkeyX, _passkeyY, _userSalt));
    }
}
