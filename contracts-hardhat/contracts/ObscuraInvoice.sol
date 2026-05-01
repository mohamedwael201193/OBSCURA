// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConfidentialUSDCv2.sol";

/// @title ObscuraInvoice
/// @notice Confidential payment-request primitive — the inverse of
///         ObscuraConfidentialEscrow. The CREATOR (recipient of funds)
///         publishes an invoice with an encrypted billed amount and a
///         shareable id. Anyone with the link can pay it. Funds settle
///         directly to the creator's encrypted cUSDC balance.
///
/// Why this is needed in addition to escrow:
/// - Escrow: sender locks funds; recipient claims later.
/// - Invoice: recipient declares an amount owed; sender pays directly.
///   This is the canonical Stripe / Request Network model and is the
///   missing piece that makes Obscura usable for B2B billing.
///
/// Two-tx payment model (same constraint as escrow):
///   CoFHE rejects InEuint64 proofs that are forwarded through an
///   intermediary contract (`InvalidSigner` 0x7ba5ffb5). The payer
///   therefore runs:
///     1. cUSDC.confidentialTransfer(creator, encAmount)   — direct
///     2. invoice.recordPayment(invoiceId, encAmount)      — receipt
///   The contract verifies homomorphically that paidAmount >= amount
///   (encrypted comparison) and exposes that ebool to both creator and
///   payer so each can decrypt locally and confirm settlement.
contract ObscuraInvoice {

    // ─── Types ──────────────────────────────────────────────────────────

    struct Invoice {
        address  creator;       // plaintext recipient of funds
        euint64  amount;        // encrypted billed amount
        euint64  paidAmount;    // encrypted cumulative inbound
        ebool    isPaid;        // encrypted (paidAmount >= amount)
        bool     exists;
        bool     cancelled;
        uint256  expiryBlock;   // 0 = no expiry; otherwise block at/after which recordPayment is rejected
        bytes32  memoHash;      // keccak256 of off-chain memo (optional, 0x0 if unused)
    }

    // ─── State ──────────────────────────────────────────────────────────

    IConfidentialUSDCv2 public immutable cUSDC;
    mapping(uint256 => Invoice) private invoices;
    uint256 public nextInvoiceId;

    // ─── Events ─────────────────────────────────────────────────────────

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed creator,
        bytes32 memoHash,
        uint256 expiryBlock
    );
    event InvoicePaid(uint256 indexed invoiceId, address indexed payer);
    event InvoiceCancelled(uint256 indexed invoiceId);
    /// @notice Phase B3 — selective disclosure. Creator grants an
    ///         auditor (e.g. accountant, regulator) decrypt access to
    ///         the encrypted billed and paid amounts of one invoice.
    event AuditorGranted(uint256 indexed invoiceId, address indexed auditor);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _cUSDC) {
        require(_cUSDC != address(0), "cUSDC=0");
        cUSDC = IConfidentialUSDCv2(_cUSDC);
    }

    // ─── Core ───────────────────────────────────────────────────────────

    /// @notice Create a new confidential invoice payable to msg.sender.
    /// @param _encAmount   Encrypted billed amount (cUSDC base units, 6 dp).
    /// @param _memoHash    Optional keccak256 of an off-chain memo.
    /// @param _expiryBlock 0 = no expiry; otherwise reject payments at/after this block.
    function create(
        InEuint64 calldata _encAmount,
        bytes32 _memoHash,
        uint256 _expiryBlock
    ) external returns (uint256 invoiceId) {
        invoiceId = nextInvoiceId++;

        euint64 amt = FHE.asEuint64(_encAmount);
        euint64 zero = FHE.asEuint64(uint256(0));
        ebool unpaid = FHE.asEbool(false);

        invoices[invoiceId] = Invoice({
            creator: msg.sender,
            amount: amt,
            paidAmount: zero,
            isPaid: unpaid,
            exists: true,
            cancelled: false,
            expiryBlock: _expiryBlock,
            memoHash: _memoHash
        });

        FHE.allowThis(amt);
        FHE.allowThis(zero);
        FHE.allowThis(unpaid);
        // Creator can decrypt their own billed/paid figures.
        FHE.allow(amt, msg.sender);
        FHE.allow(zero, msg.sender);
        FHE.allow(unpaid, msg.sender);

        emit InvoiceCreated(invoiceId, msg.sender, _memoHash, _expiryBlock);
    }

    /// @notice Record that the caller paid `_encPayment` against this
    ///         invoice. The cUSDC must have been transferred in a prior
    ///         tx (see contract-level docs).
    /// @dev    Trust model: payer asserts the amount. If they assert
    ///         less than they paid, isPaid may not flip — they overpaid.
    ///         If they assert more than they paid, the creator's
    ///         confidential balance still only grew by the actually
    ///         transferred amount; isPaid will incorrectly flip true,
    ///         but the creator can independently decrypt their balance
    ///         to verify settlement. Real settlement is the cUSDC
    ///         transfer; this function is a public receipt + status flag.
    function recordPayment(uint256 _invoiceId, InEuint64 calldata _encPayment) external {
        Invoice storage inv = invoices[_invoiceId];
        require(inv.exists, "no invoice");
        require(!inv.cancelled, "cancelled");
        require(inv.expiryBlock == 0 || block.number < inv.expiryBlock, "expired");

        euint64 payment = FHE.asEuint64(_encPayment);
        inv.paidAmount = FHE.add(inv.paidAmount, payment);
        inv.isPaid = FHE.gte(inv.paidAmount, inv.amount);

        FHE.allowThis(inv.paidAmount);
        FHE.allowThis(inv.isPaid);
        // Both parties can decrypt the receipt.
        FHE.allow(inv.paidAmount, inv.creator);
        FHE.allow(inv.isPaid, inv.creator);
        FHE.allow(inv.isPaid, msg.sender);

        emit InvoicePaid(_invoiceId, msg.sender);
    }

    /// @notice Creator cancels an outstanding invoice. Does not refund
    ///         any partial payment (those went directly to creator's cUSDC
    ///         balance). Just flips the public status flag.
    function cancel(uint256 _invoiceId) external {
        Invoice storage inv = invoices[_invoiceId];
        require(inv.exists, "no invoice");
        require(!inv.cancelled, "already cancelled");
        require(inv.creator == msg.sender, "only creator");
        inv.cancelled = true;
        emit InvoiceCancelled(_invoiceId);
    }

    // ─── Views ──────────────────────────────────────────────────────────

    function exists(uint256 _invoiceId) external view returns (bool) {
        return invoices[_invoiceId].exists;
    }

    function getCreator(uint256 _invoiceId) external view returns (address) {
        return invoices[_invoiceId].creator;
    }

    function isCancelled(uint256 _invoiceId) external view returns (bool) {
        return invoices[_invoiceId].cancelled;
    }

    function getExpiryBlock(uint256 _invoiceId) external view returns (uint256) {
        return invoices[_invoiceId].expiryBlock;
    }

    function getMemoHash(uint256 _invoiceId) external view returns (bytes32) {
        return invoices[_invoiceId].memoHash;
    }

    function getAmount(uint256 _invoiceId) external view returns (euint64) {
        return invoices[_invoiceId].amount;
    }

    function getPaidAmount(uint256 _invoiceId) external view returns (euint64) {
        return invoices[_invoiceId].paidAmount;
    }

    function getIsPaid(uint256 _invoiceId) external view returns (ebool) {
        return invoices[_invoiceId].isPaid;
    }

    // ─── Phase B3: Selective disclosure ────────────────────────────────

    /// @notice Public registry of granted auditors per invoice. Off-chain
    ///         clients use this to render audit-share UI; on-chain access
    ///         is conferred by the FHE.allow calls inside grantAuditor.
    mapping(uint256 => address[]) private _auditors;

    /// @notice Creator grants `_auditor` the right to decrypt this
    ///         invoice's encrypted billed amount, cumulative paid amount,
    ///         and the isPaid flag. Used for accountant / regulator
    ///         audits without revealing balances on-chain.
    /// @dev    CoFHE FHE.allow grants are permanent — once granted they
    ///         cannot be revoked. The creator should treat this as
    ///         publishing a one-way decrypt key for that single invoice.
    function grantAuditor(uint256 _invoiceId, address _auditor) external {
        Invoice storage inv = invoices[_invoiceId];
        require(inv.exists, "no invoice");
        require(inv.creator == msg.sender, "only creator");
        require(_auditor != address(0), "auditor=0");

        FHE.allow(inv.amount,     _auditor);
        FHE.allow(inv.paidAmount, _auditor);
        FHE.allow(inv.isPaid,     _auditor);

        _auditors[_invoiceId].push(_auditor);
        emit AuditorGranted(_invoiceId, _auditor);
    }

    /// @notice List the auditors who have been granted decrypt access
    ///         to this invoice. Plain address array — auditors are
    ///         intentionally public so observers can verify which
    ///         third parties were given visibility.
    function getAuditors(uint256 _invoiceId) external view returns (address[] memory) {
        return _auditors[_invoiceId];
    }
}
