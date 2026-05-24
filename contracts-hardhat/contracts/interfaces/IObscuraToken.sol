// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title IObscuraToken
/// @notice Canonical interface for ObscuraConfidentialToken (v3.15+ ocUSDC wrapper
///         and any future ocXXX tokens).
///
///         Compared to the legacy IConfidentialUSDC / IConfidentialUSDCv2 this
///         interface adds `confidentialTransferFromHandle` which solves the CoFHE
///         "forwarding restriction": intermediary contracts (streams, insurance)
///         convert an InEuint64 proof (signed for themselves) to a euint64 handle
///         via FHE.asEuint64, grant THIS token transient permission on the handle
///         via FHE.allowTransient, then call confidentialTransferFromHandle —
///         no InEuint64 proof forwarding required.
interface IObscuraToken {
    // ── Operator model ───────────────────────────────────────────────────
    function setOperator(address operator, uint48 until) external;
    function isOperator(address holder, address spender) external view returns (bool);
    function operatorExpiry(address holder, address spender) external view returns (uint48);

    // ── View ─────────────────────────────────────────────────────────────
    /// @notice Returns the euint64 balance handle cast to uint256 for off-chain
    ///         unsealing. Use with FHE.allowSender / getOrCreateSelfPermit.
    function confidentialBalanceOf(address account) external view returns (uint256);

    // ── Inbound: proof signed for THIS contract ───────────────────────────
    /// @notice Pull `amount` from `from` to `to`. Caller must be `from` or an
    ///         approved operator of `from`. The `amount` InEuint64 proof MUST
    ///         be signed for THIS token contract (not an intermediary).
    function confidentialTransferFrom(
        address from,
        address to,
        InEuint64 calldata amount
    ) external returns (bool);

    // ── Outbound: handle-based (caller must be the balance holder) ────────
    /// @notice Debit `msg.sender`'s encrypted balance by `handle` and credit
    ///         `to`. `handle` is a euint64 ciphertext handle (bytes32 cast to
    ///         uint256). Caller must have FHE permission on the handle granted
    ///         to THIS token contract via FHE.allowTransient before this call.
    function confidentialTransfer(address to, uint256 handle) external returns (bool);

    /// @notice Caller-as-holder InEuint64 push. Proof must be signed for THIS
    ///         token contract.
    function confidentialTransfer(address to, InEuint64 calldata amount) external returns (bool);

    // ── Operator-backed handle transfer ───────────────────────────────────
    /// @notice Transfer the ciphertext identified by `handle` from `from` to
    ///         `to`. Caller must be `from` or an approved operator of `from`.
    ///         Caller must grant THIS token transient FHE permission on the
    ///         handle via FHE.allowTransient(eAmount, address(token)) BEFORE
    ///         this call so the internal FHE.sub can access the ciphertext.
    ///
    ///         Use case: an intermediary contract (e.g. ObscuraPayStreamV3)
    ///         converts an InEuint64 proof (signed for itself) to a euint64
    ///         handle, grants token transient permission, then calls this —
    ///         bypassing the CoFHE forwarding restriction.
    function confidentialTransferFromHandle(
        address from,
        address to,
        uint256 handle
    ) external returns (bool);
}
