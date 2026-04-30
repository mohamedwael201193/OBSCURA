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
        address  creatorPlain; // For cancel auth + refund destination
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
            creatorPlain: msg.sender
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
    }

    /// @notice Fund an escrow by pulling encrypted cUSDC from the caller.
    /// @dev Caller MUST have called `cUSDC.setOperator(address(this), until)`
    ///      with `until > block.timestamp`. We forward the raw InEuint64 to
    ///      cUSDC's InEuint64 overload (selector 0x7edb0e7d) — the deployed
    ///      cUSDC does NOT expose the uint256-handle overload, so we cannot
    ///      convert client-side. We additionally store the same proof as a
    ///      euint64 handle locally for paidAmount accumulation.
    function fund(uint256 _escrowId, InEuint64 calldata _encPayment) external {
        Escrow storage esc = escrows[_escrowId];
        require(esc.exists, "no escrow");
        require(!esc.cancelled, "cancelled");
        require(cUSDC.isOperator(msg.sender, address(this)), "not operator");

        // Forward the user's InEuint64 directly to cUSDC. cUSDC verifies
        // the proof internally, decrypts, and moves the encrypted balance.
        bool ok = cUSDC.confidentialTransferFrom(
            msg.sender,
            address(this),
            _encPayment
        );
        require(ok, "cUSDC pull failed");

        // Also bind the same encrypted input as a local handle so we can
        // accumulate paidAmount homomorphically. CoFHE allows the same
        // InEuint64 to be cast to a euint64 handle in the same tx as the
        // cUSDC consumed it (proof was just verified above).
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
        FHE.allowTransient(transferAmount, address(cUSDC));
        bool ok = cUSDC.confidentialTransfer(
            msg.sender,
            uint256(euint64.unwrap(transferAmount))
        );
        require(ok, "cUSDC push failed");

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

    function getRedeemAmount(uint256 _escrowId) external view returns (euint64) {
        return redeemAmounts[_escrowId];
    }

    function getEscrowCount() external view returns (uint256) {
        return nextEscrowId;
    }
}
