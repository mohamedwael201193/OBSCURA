// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConfidentialUSDC.sol";
import "./interfaces/IReineiraEscrow.sol";

/// @title ObscuraPayStreamV2
/// @notice Wave 3 redeploy of ObscuraPayStream with three privacy + correctness
///         fixes layered on top of the V1 contract:
///
///         FIX #1 (Wave 2 bug #54): the deployed V1 reverted because it relied
///         on an outdated `bytes32 -> euint64` ABI surface; the live Reineira
///         cUSDC + escrow expect the cofhe v0.5+ `InEuint64` struct directly.
///         V2 is written against the same ABI we use everywhere else in the
///         frontend, so `tickStream` no longer reverts and we can stop
///         routing the cycle through `useTickStream`'s manual fallback.
///
///         FIX #2 (Privacy audit 0.5.4): `recipientHint` becomes `eaddress`
///         (encrypted), so chain observers cannot link `employer -> recipient`
///         from the `StreamCreated` event alone. Both the employer and the
///         recipient (via stealth derivation off-chain) hold the FHE permit
///         needed to read the field. Index discovery moves to client-side
///         event scan + permit decrypt; the public `_recipientStreams`
///         mapping is removed.
///
///         FIX #3 (Privacy audit 0.5.6): each stream carries an employer-
///         configurable `jitterSeconds`; the next eligible release timestamp
///         is offset by `block.prevrandao % jitterSeconds`, so settlement
///         times no longer fingerprint a fixed cadence ("salary clock"
///         attack). Default jitter is 1 hour for new streams.
contract ObscuraPayStreamV2 {
    error NotEmployer();
    error StreamNotFound();
    error StreamPaused();
    error StreamEnded();
    error PeriodNotElapsed();
    error JitterTooLarge();
    error PeriodOutOfRange();
    error StartInPast();
    error EndBeforeStart();

    /// @dev Hard cap so a single tick never spirals into a gas bomb (kept
    ///      identical to V1 for symmetry, even though V2 only releases one
    ///      cycle per call).
    uint256 public constant MAX_CYCLES_PER_TICK = 4;

    /// @dev Upper bound on jitter so a malicious employer cannot delay
    ///      payments indefinitely under the guise of "privacy".
    uint64 public constant MAX_JITTER_SECONDS = 1 days;

    /// @notice ReineiraOS ConfidentialEscrow proxy.
    IReineiraEscrow public immutable escrow;
    /// @notice ReineiraOS ConfidentialUSDC.
    IConfidentialUSDC public immutable cUSDC;
    /// @notice IConditionResolver implementation.
    address public immutable payrollResolver;

    struct Stream {
        address employer;
        // Encrypted recipient hint — derived client-side from the recipient's
        // stealth meta-address. Only `employer` and the recipient (after
        // permit decrypt) can read it.
        eaddress recipientHint;
        uint64 periodSeconds;
        uint64 startTime;
        uint64 endTime;        // 0 = open-ended
        uint64 lastTickTime;   // last cycle release timestamp
        uint64 cyclesPaid;
        uint32 jitterSeconds;  // 0 = no jitter
        bool paused;
        bool exists;
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

    constructor(address _escrow, address _cUSDC, address _resolver) {
        require(_escrow != address(0) && _cUSDC != address(0) && _resolver != address(0), "zero addr");
        escrow = IReineiraEscrow(_escrow);
        cUSDC = IConfidentialUSDC(_cUSDC);
        payrollResolver = _resolver;
    }

    /// @notice Open a stream with an encrypted recipient hint and optional jitter.
    /// @param encRecipientHint encrypted recipient address (cofhe-sdk
    ///        encryptInputs); only employer + recipient can decrypt.
    /// @param periodSeconds cycle period (60s … 365d).
    /// @param startTime when the first cycle becomes eligible (>= now-1d).
    /// @param endTime 0 for open-ended, otherwise > startTime.
    /// @param jitterSeconds 0…86400; random delay added to each cycle release.
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

        // Convert encrypted input + grant ACL: employer can decrypt their own
        // hint (e.g. for "show recipient" UI); the contract holds it for
        // future re-allows.
        eaddress hint = FHE.asEaddress(encRecipientHint);
        FHE.allowThis(hint);
        FHE.allow(hint, msg.sender);

        streamId = _streams.length;
        _streams.push(
            Stream({
                employer: msg.sender,
                recipientHint: hint,
                periodSeconds: periodSeconds,
                startTime: startTime,
                endTime: endTime,
                lastTickTime: startTime,
                cyclesPaid: 0,
                jitterSeconds: jitterSeconds,
                paused: false,
                exists: true
            })
        );
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
        s.paused = true;
        emit StreamCancelled(streamId);
    }

    /// @notice Re-grant the encrypted recipient hint to a specific reader.
    ///         Only the employer can do this. Used when the recipient first
    ///         claims a payment from the stream — the employer signs a
    ///         re-allow so the recipient's frontend can decrypt the hint.
    function shareRecipientHint(uint256 streamId, address reader) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        FHE.allow(s.recipientHint, reader);
    }

    /// @notice Release exactly ONE cycle. Permissionless to call.
    /// @param streamId the stream identifier.
    /// @param encryptedStealthOwner per-cycle freshly-derived stealth recipient.
    /// @param encryptedAmount per-cycle amount (must match what the employer
    ///        approved the contract to spend via cUSDC.setOperator).
    /// @param approver optional second-signature address (address(0) to skip).
    function tickStream(
        uint256 streamId,
        InEaddress calldata encryptedStealthOwner,
        InEuint64 calldata encryptedAmount,
        address approver
    ) external returns (uint256 escrowId) {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (s.paused) revert StreamPaused();
        if (s.endTime != 0 && block.timestamp >= s.endTime && s.lastTickTime >= s.endTime) {
            revert StreamEnded();
        }

        // Compute next eligible release with optional jitter. We add jitter
        // to the elapsed window check, NOT to the recorded `lastTickTime` —
        // otherwise jitter would compound across cycles.
        uint64 jitter = 0;
        if (s.jitterSeconds > 0) {
            jitter = uint64(block.prevrandao % uint256(s.jitterSeconds));
        }
        uint64 nextRelease = s.lastTickTime + s.periodSeconds + jitter;
        if (block.timestamp < nextRelease) revert PeriodNotElapsed();

        // 1. Convert the encrypted amount input. FHE.asEuint64 grants this
        //    contract permission to use it; we re-allow to cUSDC + escrow.
        euint64 eAmount = FHE.asEuint64(encryptedAmount);
        FHE.allowThis(eAmount);
        FHE.allow(eAmount, address(cUSDC));
        FHE.allow(eAmount, address(escrow));

        // 2. Pull this cycle's funding from the employer.
        cUSDC.confidentialTransferFrom(s.employer, address(this), eAmount);

        // 3. Approve the Reineira escrow to consume the same amount from us.
        cUSDC.approve(address(escrow), eAmount);

        // 4. Open a fresh escrow gated by our resolver, releasing immediately.
        bytes memory resolverData = abi.encode(uint64(block.timestamp), s.employer, approver);
        escrowId = escrow.create(
            encryptedStealthOwner,
            encryptedAmount,
            payrollResolver,
            resolverData
        );

        // 5. Fund it (escrow pulls cUSDC from us via the approval above).
        escrow.fund(escrowId, encryptedAmount);

        // 6. Bookkeeping. We advance `lastTickTime` by one nominal period
        //    (NOT by `periodSeconds + jitter`) so cycle drift can't accumulate.
        s.lastTickTime += s.periodSeconds;
        s.cyclesPaid += 1;

        emit CycleSettled(streamId, escrowId, s.cyclesPaid, uint64(block.timestamp));
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    /// @notice Public stream view (no encrypted fields).
    function getStream(uint256 streamId)
        external
        view
        returns (
            address employer,
            uint64 periodSeconds,
            uint64 startTime,
            uint64 endTime,
            uint64 lastTickTime,
            uint64 cyclesPaid,
            uint32 jitterSeconds,
            bool paused
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

    /// @notice Returns the encrypted recipient hint handle. Caller must have
    ///         been granted FHE permission (employer + reader).
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

    /// @notice Number of cycles currently due (jitter ignored for the preview
    ///         since `block.prevrandao` of the eventual tick block is unknown).
    function pendingCycles(uint256 streamId) external view returns (uint64) {
        Stream storage s = _streams[streamId];
        if (!s.exists || s.paused) return 0;
        if (block.timestamp < s.lastTickTime + s.periodSeconds) return 0;
        uint64 elapsed = uint64(block.timestamp) - s.lastTickTime;
        uint64 cycles = elapsed / s.periodSeconds;
        if (s.endTime != 0 && s.lastTickTime + cycles * s.periodSeconds > s.endTime) {
            cycles = (s.endTime - s.lastTickTime) / s.periodSeconds;
        }
        return cycles;
    }
}
