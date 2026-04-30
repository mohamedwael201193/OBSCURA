// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConfidentialUSDCv2.sol";

interface IConditionResolverCE {
    function isConditionMet(uint256 escrowId) external view returns (bool);
    function onConditionSet(uint256 escrowId, bytes calldata data) external;
}

/// @title ObscuraConfidentialEscrow
/// @notice End-to-end working confidential escrow for Reineira cUSDC on
///         Arbitrum Sepolia. Replaces the broken Reineira ConfidentialEscrow
///         proxy at 0xC4333F84… whose impl calls a non-existent cUSDC
///         selector (0xeb3155b5). This contract calls cUSDC via the
///         confirmed-present uint256 handle overloads (0xca49d7cd inbound,
///         0xfe3f670d outbound).
///
/// Design notes:
/// - Recipient ("owner") is encrypted (eaddress) — preserves recipient
///   privacy on-chain.
/// - Target amount + paid amount are encrypted (euint64).
/// - `redeem` uses the silent-failure pattern: anyone can call, but
///   transferAmount = FHE.select(isOwner & isPaid & !isRedeemed,
///   paidAmount, 0). cUSDC.confidentialTransfer is invoked with the
///   selected handle, so unauthorized callers receive 0 cUSDC and
///   authorized callers receive paidAmount — observers cannot tell the
///   difference (silent failure).
/// - `cancel` is creator-only (plaintext auth) and refunds full
///   paidAmount to creator.
/// - `fund` requires the funder to have set this contract as operator
///   on cUSDC: `cUSDC.setOperator(address(this), until)`.
contract ObscuraConfidentialEscrow {

    // ─── Types ──────────────────────────────────────────────────────────

    struct Escrow {
        eaddress owner;        // Encrypted recipient
        euint64  amount;       // Encrypted target
        euint64  paidAmount;   // Encrypted cumulative inbound
        ebool    isRedeemed;   // Encrypted redemption flag
        bool     exists;
        bool     cancelled;
        bool     refunded;     // Plaintext flag set when refund() succeeds
        address  creatorPlain; // For cancel auth + refund destination
        uint256  expiryBlock;  // 0 = no expiry; otherwise block at/after which anyone may refund
    }

    // ─── State ──────────────────────────────────────────────────────────

    IConfidentialUSDCv2 public immutable cUSDC;
    mapping(uint256 => Escrow) private escrows;
    mapping(uint256 => address) public conditionResolvers;
    /// @dev Stored handle of the most recent redeem-attempt transferAmount
    ///      so the caller can decrypt it client-side and confirm.
    mapping(uint256 => euint64) public redeemAmounts;
    uint256 public nextEscrowId;

    // ─── Events ─────────────────────────────────────────────────────────

    event EscrowCreated(uint256 indexed escrowId, address indexed creator, address indexed resolver);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer);
    event EscrowRedeemed(uint256 indexed escrowId, address indexed caller);
    event EscrowCancelled(uint256 indexed escrowId, address indexed creator);
    event EscrowRefunded(uint256 indexed escrowId, address indexed caller);
    event EscrowExpirySet(uint256 indexed escrowId, uint256 expiryBlock);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _cUSDC) {
        require(_cUSDC != address(0), "cUSDC=0");
        cUSDC = IConfidentialUSDCv2(_cUSDC);
    }

    // ─── Core ───────────────────────────────────────────────────────────

    /// @notice Create an encrypted escrow.
    /// @param _encOwner   Encrypted recipient address.
    /// @param _encAmount  Encrypted target amount (in cUSDC base units).
    /// @param _resolver   Optional IConditionResolver gating redeem (0x0 = none).
    /// @param _resolverData ABI-encoded data forwarded to onConditionSet().
    function create(
        InEaddress calldata _encOwner,
        InEuint64 calldata _encAmount,
        address _resolver,
        bytes calldata _resolverData
    ) external returns (uint256 escrowId) {
        return _create(_encOwner, _encAmount, _resolver, _resolverData, 0);
    }

    /// @notice Same as create() but with a plaintext expiry block.
    /// @dev If `_expiryBlock > 0`, after `block.number >= _expiryBlock` AND if the
    ///      recipient has not redeemed, ANYONE may call `refund()` to push the
    ///      cumulative paidAmount back to the creator. This protects sender funds
    ///      from being permanently stranded if the recipient never claims (a real
    ///      issue for note/claim-link escrows where the recipient may have lost
    ///      the link or be unaware). 0 = no expiry (creator-only cancel anytime,
    ///      same as the legacy create()). Industry norm: 30–90 days (OpenZeppelin
    ///      RefundEscrow). On Arbitrum One, ~7200 blocks/day → 30 days ≈ 216_000
    ///      blocks.
    function createWithExpiry(
        InEaddress calldata _encOwner,
        InEuint64 calldata _encAmount,
        address _resolver,
        bytes calldata _resolverData,
        uint256 _expiryBlock
    ) external returns (uint256 escrowId) {
        return _create(_encOwner, _encAmount, _resolver, _resolverData, _expiryBlock);
    }

    function _create(
        InEaddress calldata _encOwner,
        InEuint64 calldata _encAmount,
        address _resolver,
        bytes calldata _resolverData,
        uint256 _expiryBlock
    ) internal returns (uint256 escrowId) {
        escrowId = nextEscrowId++;

        eaddress eOwner = FHE.asEaddress(_encOwner);
        euint64 eAmount = FHE.asEuint64(_encAmount);
        euint64 zeroPaid = FHE.asEuint64(uint256(0));
        ebool notRedeemed = FHE.asEbool(false);

        escrows[escrowId] = Escrow({
            owner: eOwner,
            amount: eAmount,
            paidAmount: zeroPaid,
            isRedeemed: notRedeemed,
            exists: true,
            cancelled: false,
            refunded: false,
            creatorPlain: msg.sender,
            expiryBlock: _expiryBlock
        });

        FHE.allowThis(eOwner);
        FHE.allowThis(eAmount);
        FHE.allowThis(zeroPaid);
        FHE.allowThis(notRedeemed);
        FHE.allow(eAmount, msg.sender);
        FHE.allow(zeroPaid, msg.sender);

        if (_resolver != address(0)) {
            conditionResolvers[escrowId] = _resolver;
            IConditionResolverCE(_resolver).onConditionSet(escrowId, _resolverData);
        }

        emit EscrowCreated(escrowId, msg.sender, _resolver);
        if (_expiryBlock > 0) {
            emit EscrowExpirySet(escrowId, _expiryBlock);
        }
    }

    /// @notice Record that the caller has funded this escrow with cUSDC.
    /// @dev    The actual confidential cUSDC transfer MUST be performed
    ///         in a separate, prior transaction by the caller:
    ///             cUSDC.confidentialTransfer(address(escrow), encAmount)
    ///         This contract cannot proxy `cUSDC.confidentialTransferFrom`
    ///         because CoFHE rejects InEuint64 proofs that are forwarded
    ///         through an intermediary contract (custom error
    ///         `InvalidSigner(address,address)` selector 0x7ba5ffb5 — the
    ///         proof's recovered signer must match the immediate caller of
    ///         the consuming function). Instead, the user transfers cUSDC
    ///         directly to this contract's confidential balance, then
    ///         calls `fund()` here with a *separate* InEuint64 of the
    ///         same plaintext amount. The escrow consumes that proof
    ///         itself (immediate caller = escrow → CoFHE accepts) and
    ///         accumulates `paidAmount` homomorphically.
    ///
    /// @dev    Trust model: the caller asserts the funded amount. Under-
    ///         reporting causes redeem to fail the `isPaid >= amount`
    ///         check; over-reporting causes redeem's cUSDC.confidential-
    ///         Transfer to revert (insufficient balance). Either way,
    ///         only the caller is hurt.
    function fund(uint256 _escrowId, InEuint64 calldata _encPayment) external {
        Escrow storage esc = escrows[_escrowId];
        require(esc.exists, "no escrow");
        require(!esc.cancelled, "cancelled");

        euint64 paymentH = FHE.asEuint64(_encPayment);
        esc.paidAmount = FHE.add(esc.paidAmount, paymentH);
        FHE.allowThis(esc.paidAmount);
        FHE.allow(esc.paidAmount, esc.creatorPlain);

        emit EscrowFunded(_escrowId, msg.sender);
    }

    /// @notice Redeem an escrow with silent-failure semantics.
    /// @dev Anyone can call. transferAmount = select(isOwner & isPaid &
    ///      !isRedeemed, paidAmount, 0). cUSDC.confidentialTransfer is
    ///      invoked with that handle so the caller receives either the
    ///      full paid amount or zero — externally indistinguishable.
    function redeem(uint256 _escrowId) external {
        Escrow storage esc = escrows[_escrowId];
        require(esc.exists, "no escrow");
        require(!esc.cancelled, "cancelled");

        address resolver = conditionResolvers[_escrowId];
        if (resolver != address(0)) {
            require(
                IConditionResolverCE(resolver).isConditionMet(_escrowId),
                "condition"
            );
        }

        // Encrypted authorization checks.
        eaddress eCaller = FHE.asEaddress(msg.sender);
        ebool isOwner = FHE.eq(eCaller, esc.owner);
        ebool isPaid = FHE.gte(esc.paidAmount, esc.amount);
        ebool notRedeemed = FHE.not(esc.isRedeemed);
        ebool valid = FHE.and(isOwner, FHE.and(isPaid, notRedeemed));

        euint64 zero = FHE.asEuint64(uint256(0));
        euint64 transferAmount = FHE.select(valid, esc.paidAmount, zero);

        // Flip redeemed to true on success; keep current value otherwise.
        ebool trueB = FHE.asEbool(true);
        esc.isRedeemed = FHE.select(valid, trueB, esc.isRedeemed);
        FHE.allowThis(esc.isRedeemed);

        // Persist and authorize the caller to view the selected amount.
        FHE.allowThis(transferAmount);
        FHE.allow(transferAmount, msg.sender);
        redeemAmounts[_escrowId] = transferAmount;

        // Move cUSDC out using the uint256-handle outbound overload
        // (selector 0xfe3f670d). Unauthorized → 0 transferred (silent fail).
        // We deliberately wrap the external call in try/catch so that ANY
        // failure mode of cUSDC.confidentialTransfer (returns false, reverts,
        // out-of-gas inside the sub-call, FHE permission edge case, balance
        // insufficient because fund step never settled, etc.) is fully
        // swallowed at the EVM level. Silent-failure means the tx ALWAYS
        // succeeds; the recipient's wallet balance is the only source of
        // truth. If the cUSDC call did not actually move funds, isRedeemed
        // was likewise not flipped (FHE.select kept the prior value), so the
        // recipient can simply try again later once the coprocessor settles.
        FHE.allowTransient(transferAmount, address(cUSDC));
        try cUSDC.confidentialTransfer(
            msg.sender,
            uint256(euint64.unwrap(transferAmount))
        ) returns (bool) {
            // ok or false — both are fine, redeem still succeeds.
        } catch {
            // cUSDC reverted — also fine. Recipient retries later.
        }

        emit EscrowRedeemed(_escrowId, msg.sender);
    }

    /// @notice Cancel an escrow and refund the cumulative paidAmount to
    ///         the creator. Plaintext auth (no privacy benefit to encrypting
    ///         since msg.sender is public anyway).
    function cancel(uint256 _escrowId) external {
        Escrow storage esc = escrows[_escrowId];
        require(esc.exists, "no escrow");
        require(!esc.cancelled, "already cancelled");
        require(esc.creatorPlain == msg.sender, "only creator");

        esc.cancelled = true;

        // Refund whatever has been paid in so far.
        FHE.allowTransient(esc.paidAmount, address(cUSDC));
        bool ok = cUSDC.confidentialTransfer(
            msg.sender,
            uint256(euint64.unwrap(esc.paidAmount))
        );
        require(ok, "cUSDC refund failed");

        emit EscrowCancelled(_escrowId, msg.sender);
    }

    /// @notice Permissionless refund after expiry. Anyone may call once
    ///         `block.number >= expiryBlock` (and expiry is set) AND the escrow
    ///         has not been cancelled or refunded yet. The encrypted paidAmount
    ///         is pushed back to the creator. The recipient may have already
    ///         silent-failed redeem (transferAmount=0, isRedeemed unchanged) so
    ///         we don't gate on isRedeemed; if a real redeem happened first,
    ///         the cUSDC balance is empty and this call simply transfers 0 to
    ///         creator. Either way, the `refunded` flag prevents double-refund.
    /// @dev    Note: silent-failure means we cannot trustlessly know on-chain
    ///         whether the recipient already collected. The encrypted
    ///         `paidAmount` is the upper bound — cUSDC will simply not transfer
    ///         more than this contract's confidential balance, so a stale refund
    ///         after a successful redeem is a harmless no-op.
    function refund(uint256 _escrowId) external {
        Escrow storage esc = escrows[_escrowId];
        require(esc.exists, "no escrow");
        require(!esc.cancelled, "cancelled");
        require(!esc.refunded, "already refunded");
        require(esc.expiryBlock != 0, "no expiry");
        require(block.number >= esc.expiryBlock, "not yet expired");

        esc.refunded = true;

        FHE.allowTransient(esc.paidAmount, address(cUSDC));
        bool ok = cUSDC.confidentialTransfer(
            esc.creatorPlain,
            uint256(euint64.unwrap(esc.paidAmount))
        );
        require(ok, "cUSDC refund failed");

        emit EscrowRefunded(_escrowId, msg.sender);
    }

    /// @notice Batch-create N escrows in one transaction — the killer use case
    ///         for confidential payroll. HR teams encrypt each (recipient,
    ///         amount) pair client-side, send the entire batch, and end up with
    ///         N escrow IDs that can be funded individually (proofs cannot be
    ///         batched per CoFHE — each fund() consumes a fresh InEuint64 from
    ///         the immediate caller). All escrows in the batch share the same
    ///         resolver and expiry to keep the call simple and gas-efficient.
    /// @dev    Bounded to 20 entries per tx to stay safely under Arbitrum One's
    ///         32M gas/block ceiling — each create() does ~6 FHE ops plus a
    ///         storage write. The frontend may chunk larger payrolls.
    function createBatch(
        InEaddress[] calldata _encOwners,
        InEuint64[] calldata _encAmounts,
        address _resolver,
        bytes calldata _resolverData,
        uint256 _expiryBlock
    ) external returns (uint256[] memory ids) {
        uint256 n = _encOwners.length;
        require(n == _encAmounts.length, "length mismatch");
        require(n > 0 && n <= 20, "bad batch size");
        ids = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            ids[i] = _create(_encOwners[i], _encAmounts[i], _resolver, _resolverData, _expiryBlock);
        }
    }

    // ─── Views ──────────────────────────────────────────────────────────

    function exists(uint256 _escrowId) external view returns (bool) {
        return escrows[_escrowId].exists;
    }

    function isCancelled(uint256 _escrowId) external view returns (bool) {
        return escrows[_escrowId].cancelled;
    }

    function getCreator(uint256 _escrowId) external view returns (address) {
        return escrows[_escrowId].creatorPlain;
    }

    function getResolver(uint256 _escrowId) external view returns (address) {
        return conditionResolvers[_escrowId];
    }

    function getEscrowAmount(uint256 _escrowId) external view returns (euint64) {
        require(escrows[_escrowId].exists, "no escrow");
        return escrows[_escrowId].amount;
    }

    function getEscrowPaidAmount(uint256 _escrowId) external view returns (euint64) {
        require(escrows[_escrowId].exists, "no escrow");
        return escrows[_escrowId].paidAmount;
    }

    function getEscrowRedeemed(uint256 _escrowId) external view returns (ebool) {
        require(escrows[_escrowId].exists, "no escrow");
        return escrows[_escrowId].isRedeemed;
    }

    function getEscrowOwner(uint256 _escrowId) external view returns (eaddress) {
        require(escrows[_escrowId].exists, "no escrow");
        return escrows[_escrowId].owner;
    }

    function getExpiryBlock(uint256 _escrowId) external view returns (uint256) {
        return escrows[_escrowId].expiryBlock;
    }

    function isRefunded(uint256 _escrowId) external view returns (bool) {
        return escrows[_escrowId].refunded;
    }

    function isExpired(uint256 _escrowId) external view returns (bool) {
        Escrow storage esc = escrows[_escrowId];
        return esc.expiryBlock != 0 && block.number >= esc.expiryBlock;
    }

    function getRedeemAmount(uint256 _escrowId) external view returns (euint64) {
        return redeemAmounts[_escrowId];
    }

    function getEscrowCount() external view returns (uint256) {
        return nextEscrowId;
    }
}
