// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IObscuraToken.sol";

/// @title ObscuraPayStreamV3
/// @notice Wave 5 redeploy of ObscuraPayStreamV2 with native ocUSDC support.
///
///         Changes from V2:
///         - Removes ALL Reineira dependencies (IConfidentialUSDC, IReineiraEscrow).
///         - Uses IObscuraToken (ocUSDC wrapper at 0xEFab856b…) via the new
///           `confidentialTransferFromHandle` function, solving the CoFHE
///           forwarding restriction without requiring the InEuint64 proof to
///           be signed for both the stream contract AND the token.
///         - Uses ObscuraConfidentialEscrow.createFromHandles() +
///           fundFromHandle() for the same reason.
///         - Uses ObscuraPayrollResolverV3 (plaintext-commit format, no InEaddress).
///         - `tickStream` requires the EMPLOYER to have previously approved this
///           contract as operator on ocUSDC:
///               cUSDC.setOperator(address(stream), uint48(block.timestamp + 7 days))
///
///         FHE permission flow inside tickStream():
///           1. FHE.asEuint64(encCycleAmount)   → eAmount   (stream has perm)
///           2. FHE.asEaddress(encRecipient)    → eRecipient (stream has perm)
///           3. FHE.allowTransient(eAmount, address(cUSDC))   → token can debit
///           4. cUSDC.confidentialTransferFromHandle(employer, escrow, handle)
///              → tokens move employer → escrow's cUSDC balance
///           5. FHE.allowTransient(eAmount, address(escrow))  → escrow can store
///           6. FHE.allowTransient(eRecipient, address(escrow))
///           7. escrow.createFromHandles(rcpHandle, amtHandle, resolver, data)
///              → escrow record created; resolver.onConditionSet() called
///           8. escrow.fundFromHandle(escrowId, amtHandle)
///              → paidAmount updated (same handle, escrow already has perm)
contract ObscuraPayStreamV3 {
    error NotEmployer();
    error StreamNotFound();
    error StreamPaused();
    error StreamEnded();
    error PeriodNotElapsed();
    error JitterTooLarge();
    error PeriodOutOfRange();
    error StartInPast();
    error EndBeforeStart();

    uint256 public constant MAX_CYCLES_PER_TICK = 4;
    uint64  public constant MAX_JITTER_SECONDS  = 1 days;

    /// @notice Native ocUSDC wrapper (IObscuraToken v3.15+).
    IObscuraToken public immutable cUSDC;
    /// @notice ObscuraConfidentialEscrow (deployed with correct ocUSDC token).
    address public immutable escrow;
    /// @notice IConditionResolver implementation (ObscuraPayrollResolverV3).
    address public immutable payrollResolver;

    struct Stream {
        address employer;
        /// Encrypted recipient hint — eaddress, only employer + recipient can read.
        eaddress recipientHint;
        uint64 periodSeconds;
        uint64 startTime;
        uint64 endTime;       // 0 = open-ended
        uint64 lastTickTime;
        uint64 cyclesPaid;
        uint32 jitterSeconds;
        bool   paused;
        bool   exists;
    }

    Stream[] private _streams;
    mapping(address => uint256[]) private _employerStreams;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed employer,
        uint64 periodSeconds,
        uint64 startTime,
        uint64 endTime,
        uint32 jitterSeconds
    );
    event StreamPausedSet(uint256 indexed streamId, bool paused);
    event StreamCancelled(uint256 indexed streamId);
    event StreamJitterUpdated(uint256 indexed streamId, uint32 jitterSeconds);
    event CycleSettled(
        uint256 indexed streamId,
        uint256 indexed escrowId,
        uint64 cycleIndex,
        uint64 settledAt
    );

    constructor(address _cUSDC, address _escrow, address _resolver) {
        require(
            _cUSDC != address(0) && _escrow != address(0) && _resolver != address(0),
            "zero addr"
        );
        cUSDC          = IObscuraToken(_cUSDC);
        escrow         = _escrow;
        payrollResolver = _resolver;
    }

    // ─── Stream management ──────────────────────────────────────────────────

    function createStream(
        InEaddress calldata encRecipientHint,
        uint64 periodSeconds,
        uint64 startTime,
        uint64 endTime,
        uint32 jitterSeconds
    ) external returns (uint256 streamId) {
        if (periodSeconds < 60 || periodSeconds > 365 days) revert PeriodOutOfRange();
        if (startTime + 1 days < block.timestamp) revert StartInPast();
        if (endTime != 0 && endTime <= startTime) revert EndBeforeStart();
        if (jitterSeconds > MAX_JITTER_SECONDS) revert JitterTooLarge();

        eaddress hint = FHE.asEaddress(encRecipientHint);
        FHE.allowThis(hint);
        FHE.allow(hint, msg.sender);

        streamId = _streams.length;
        _streams.push(Stream({
            employer:      msg.sender,
            recipientHint: hint,
            periodSeconds: periodSeconds,
            startTime:     startTime,
            endTime:       endTime,
            lastTickTime:  startTime,
            cyclesPaid:    0,
            jitterSeconds: jitterSeconds,
            paused:        false,
            exists:        true
        }));
        _employerStreams[msg.sender].push(streamId);

        emit StreamCreated(streamId, msg.sender, periodSeconds, startTime, endTime, jitterSeconds);
    }

    function setPaused(uint256 streamId, bool paused) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        s.paused = paused;
        emit StreamPausedSet(streamId, paused);
    }

    function setJitter(uint256 streamId, uint32 jitterSeconds) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        if (jitterSeconds > MAX_JITTER_SECONDS) revert JitterTooLarge();
        s.jitterSeconds = jitterSeconds;
        emit StreamJitterUpdated(streamId, jitterSeconds);
    }

    function cancelStream(uint256 streamId) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        s.endTime = uint64(block.timestamp);
        s.paused  = true;
        emit StreamCancelled(streamId);
    }

    function shareRecipientHint(uint256 streamId, address reader) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        FHE.allow(s.recipientHint, reader);
    }

    // ─── Tick ───────────────────────────────────────────────────────────────

    /// @notice Release one cycle of the stream.
    ///
    ///         Prerequisites (caller = employer):
    ///           1. Employer has called cUSDC.setOperator(address(this), expiry).
    ///           2. Employer has sufficient shielded ocUSDC balance.
    ///           3. encCycleAmount InEuint64 proof was generated for THIS contract.
    ///           4. encStealthOwner InEaddress proof was generated for THIS contract.
    ///
    /// @param streamId        stream to tick
    /// @param encCycleAmount  InEuint64 signed for this contract — cycle amount
    /// @param encStealthOwner InEaddress signed for this contract — recipient
    /// @param employerSalt    random salt → employerCommit = keccak256(employer, salt)
    /// @param approver        approver address (0x0 = none, immediate approval)
    /// @param approverSalt    random salt for approver commit (ignored if approver==0)
    function tickStream(
        uint256     streamId,
        InEuint64   calldata encCycleAmount,
        InEaddress  calldata encStealthOwner,
        bytes32     employerSalt,
        address     approver,
        bytes32     approverSalt
    ) external returns (uint256 escrowId) {
        Stream storage s = _streams[streamId];
        if (!s.exists)  revert StreamNotFound();
        if (s.paused)   revert StreamPaused();
        if (s.endTime != 0 && block.timestamp >= s.endTime && s.lastTickTime >= s.endTime) {
            revert StreamEnded();
        }
        if (msg.sender != s.employer) revert NotEmployer();

        // ── Timing gate ──────────────────────────────────────────────────
        uint64 jitter = 0;
        if (s.jitterSeconds > 0) {
            jitter = uint64(block.prevrandao % uint256(s.jitterSeconds));
        }
        uint64 nextRelease = s.lastTickTime + s.periodSeconds + jitter;
        if (block.timestamp < nextRelease) revert PeriodNotElapsed();

        // ── FHE: convert InEuint64/InEaddress → handles ──────────────────
        // These proofs are signed for THIS contract (not cUSDC / escrow).
        // We must NOT forward the raw InExx structs to any other contract.
        euint64  eAmount    = FHE.asEuint64(encCycleAmount);
        FHE.allowThis(eAmount);
        eaddress eRecipient = FHE.asEaddress(encStealthOwner);
        FHE.allowThis(eRecipient);
        FHE.allow(eRecipient, msg.sender); // employer can verify recipient

        uint256 amtHandle = uint256(euint64.unwrap(eAmount));
        uint256 rcpHandle = uint256(eaddress.unwrap(eRecipient));

        // ── Step 1: Move tokens employer → escrow ────────────────────────
        // Grant the token contract transient FHE permission on the amount handle
        // so it can call _debit(employer, amt) inside confidentialTransferFromHandle.
        FHE.allowTransient(eAmount, address(cUSDC));
        // Employer must have set stream as operator via cUSDC.setOperator(this, expiry).
        cUSDC.confidentialTransferFromHandle(s.employer, escrow, amtHandle);

        // ── Step 2: Create escrow record ─────────────────────────────────
        // Grant escrow transient FHE permission on both handles.
        FHE.allowTransient(eAmount,    escrow);
        FHE.allowTransient(eRecipient, escrow);

        // Build resolver data in V3 format:
        //   (uint64 releaseTime, bytes32 employerCommit, bytes32 approverCommit)
        // releaseTime = now+1 (immediately eligible, just past current block).
        bytes32 empCommit = keccak256(abi.encode(msg.sender, employerSalt));
        bytes32 appCommit = (approver != address(0))
            ? keccak256(abi.encode(approver, approverSalt))
            : bytes32(0);
        bytes memory resolverData = abi.encode(
            uint64(block.timestamp + 1),
            empCommit,
            appCommit
        );

        // IObscuraConfidentialEscrow.createFromHandles interface (low-level call
        // to avoid a circular import — escrow contract is in parent dir).
        (bool ok1, bytes memory retData) = escrow.call(
            abi.encodeWithSignature(
                "createFromHandles(uint256,uint256,address,bytes)",
                rcpHandle,
                amtHandle,
                payrollResolver,
                resolverData
            )
        );
        require(ok1, "escrow.createFromHandles failed");
        escrowId = abi.decode(retData, (uint256));

        // ── Step 3: Record funding in escrow ─────────────────────────────
        // Tokens are already in escrow's cUSDC balance (from step 1).
        // We now record the paidAmount so redeem() can verify isPaid >= amount.
        // Grant escrow transient FHE permission on amount handle again (previous
        // allowTransient covered createFromHandles; fundFromHandle is a separate call).
        FHE.allowTransient(eAmount, escrow);
        (bool ok2, ) = escrow.call(
            abi.encodeWithSignature("fundFromHandle(uint256,uint256)", escrowId, amtHandle)
        );
        require(ok2, "escrow.fundFromHandle failed");

        // ── Bookkeeping ──────────────────────────────────────────────────
        s.lastTickTime += s.periodSeconds;
        s.cyclesPaid   += 1;

        emit CycleSettled(streamId, escrowId, s.cyclesPaid, uint64(block.timestamp));
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getStream(uint256 streamId)
        external
        view
        returns (
            address employer,
            uint64  periodSeconds,
            uint64  startTime,
            uint64  endTime,
            uint64  lastTickTime,
            uint64  cyclesPaid,
            uint32  jitterSeconds,
            bool    paused
        )
    {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        return (
            s.employer,
            s.periodSeconds,
            s.startTime,
            s.endTime,
            s.lastTickTime,
            s.cyclesPaid,
            s.jitterSeconds,
            s.paused
        );
    }

    function getRecipientHint(uint256 streamId) external view returns (eaddress) {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        return s.recipientHint;
    }

    function streamCount() external view returns (uint256) {
        return _streams.length;
    }

    function streamsByEmployer(address employer) external view returns (uint256[] memory) {
        return _employerStreams[employer];
    }

    function pendingCycles(uint256 streamId) external view returns (uint64) {
        Stream storage s = _streams[streamId];
        if (!s.exists || s.paused) return 0;
        if (block.timestamp < s.lastTickTime + s.periodSeconds) return 0;
        uint64 elapsed = uint64(block.timestamp) - s.lastTickTime;
        uint64 cycles  = elapsed / s.periodSeconds;
        if (s.endTime != 0 && s.lastTickTime + cycles * s.periodSeconds > s.endTime) {
            cycles = (s.endTime - s.lastTickTime) / s.periodSeconds;
        }
        return cycles;
    }
}
