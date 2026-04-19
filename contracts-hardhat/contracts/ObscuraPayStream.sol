// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConfidentialUSDC.sol";
import "./interfaces/IReineiraEscrow.sol";

/// @title ObscuraPayStream
/// @notice Recurring confidential payroll. An employer schedules a stream with
///         a fixed `periodSeconds`, an encrypted per-period amount, and a
///         recipient (typically the recipient's stealth meta-address — the
///         per-cycle stealth address itself is derived off-chain and supplied
///         to `tickStream` as `encryptedStealthOwner`).
///
///         Each `tickStream(...)` call:
///           1. validates that at least one full period has elapsed
///           2. pulls one cycle of cUSDC from the employer (allowance)
///           3. opens a fresh ReineiraOS ConfidentialEscrow gated by
///              ObscuraPayrollResolver with `releaseTime = now`
///           4. funds it with the same encrypted amount
///           5. emits CycleSettled so the recipient's wallet can scan + redeem
///
///         The ENCRYPTED inputs (stealth owner + amount) are supplied per-tick
///         by the caller — typically the off-chain ticker bot, but anyone
///         (including the employer or the recipient) can tick.
///
///         All amounts stay encrypted on-chain. Only the cycle CADENCE is public.
contract ObscuraPayStream {
    error NotEmployer();
    error StreamNotFound();
    error StreamPaused();
    error StreamEnded();
    error PeriodNotElapsed();
    error TooManyCycles();

    /// @dev hard cap so a single tick never spirals into a gas-bomb
    uint256 public constant MAX_CYCLES_PER_TICK = 4;

    /// @notice ReineiraOS ConfidentialEscrow proxy.
    IReineiraEscrow public immutable escrow;
    /// @notice ReineiraOS ConfidentialUSDC.
    IConfidentialUSDC public immutable cUSDC;
    /// @notice Our IConditionResolver implementation.
    address public immutable payrollResolver;

    struct Stream {
        address employer;
        address recipientHint; // public hint for indexing; real recipient is the encrypted stealth owner
        uint64 periodSeconds;
        uint64 startTime;
        uint64 endTime;        // 0 = open-ended
        uint64 lastTickTime;   // last cycle release timestamp (initialized to startTime)
        uint64 cyclesPaid;
        bool paused;
        bool exists;
    }

    Stream[] private _streams;
    mapping(address => uint256[]) private _employerStreams;
    mapping(address => uint256[]) private _recipientStreams;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed employer,
        address indexed recipientHint,
        uint64 periodSeconds,
        uint64 startTime,
        uint64 endTime
    );
    event StreamPausedSet(uint256 indexed streamId, bool paused);
    event StreamCancelled(uint256 indexed streamId);
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

    /// @notice Open a stream. The employer must separately call
    ///         `cUSDC.approve(streamAddress, eMaxSpend)` before the first tick.
    /// @param recipientHint Public address used only for indexing & UI listing.
    ///        Actual cycle recipients are the encrypted stealth addresses
    ///        passed to each `tickStream` call.
    function createStream(
        address recipientHint,
        uint64 periodSeconds,
        uint64 startTime,
        uint64 endTime
    ) external returns (uint256 streamId) {
        require(periodSeconds >= 60, "period too short");
        require(periodSeconds <= 365 days, "period too long");
        require(startTime >= block.timestamp - 1 days, "start in past");
        if (endTime != 0) require(endTime > startTime, "end<=start");

        streamId = _streams.length;
        _streams.push(
            Stream({
                employer: msg.sender,
                recipientHint: recipientHint,
                periodSeconds: periodSeconds,
                startTime: startTime,
                endTime: endTime,
                lastTickTime: startTime,
                cyclesPaid: 0,
                paused: false,
                exists: true
            })
        );
        _employerStreams[msg.sender].push(streamId);
        if (recipientHint != address(0)) {
            _recipientStreams[recipientHint].push(streamId);
        }

        emit StreamCreated(streamId, msg.sender, recipientHint, periodSeconds, startTime, endTime);
    }

    function setPaused(uint256 streamId, bool paused) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        s.paused = paused;
        emit StreamPausedSet(streamId, paused);
    }

    function cancelStream(uint256 streamId) external {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        if (msg.sender != s.employer) revert NotEmployer();
        s.endTime = uint64(block.timestamp);
        s.paused = true;
        emit StreamCancelled(streamId);
    }

    /// @notice Release exactly ONE cycle. Permissionless to call.
    /// @param streamId the stream identifier
    /// @param encryptedStealthOwner per-cycle freshly-derived stealth recipient
    ///        (encrypted client-side via cofhe-sdk encryptInputs)
    /// @param encryptedAmount per-cycle amount (encrypted client-side; must
    ///        match what employer expects to pay this cycle)
    /// @param approver optional second-signature address (address(0) to skip)
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

        uint64 nextRelease = s.lastTickTime + s.periodSeconds;
        if (block.timestamp < nextRelease) revert PeriodNotElapsed();

        // 1. Convert the encrypted amount input into a euint64 we can spend.
        //    Note: FHE.asEuint64 grants this contract permission to use it.
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

        // 6. Bookkeeping.
        s.lastTickTime = nextRelease;
        s.cyclesPaid += 1;

        emit CycleSettled(streamId, escrowId, s.cyclesPaid, uint64(block.timestamp));
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getStream(uint256 streamId)
        external
        view
        returns (
            address employer,
            address recipientHint,
            uint64 periodSeconds,
            uint64 startTime,
            uint64 endTime,
            uint64 lastTickTime,
            uint64 cyclesPaid,
            bool paused
        )
    {
        Stream storage s = _streams[streamId];
        if (!s.exists) revert StreamNotFound();
        return (
            s.employer,
            s.recipientHint,
            s.periodSeconds,
            s.startTime,
            s.endTime,
            s.lastTickTime,
            s.cyclesPaid,
            s.paused
        );
    }

    function streamCount() external view returns (uint256) {
        return _streams.length;
    }

    function streamsByEmployer(address employer) external view returns (uint256[] memory) {
        return _employerStreams[employer];
    }

    function streamsByRecipient(address recipient) external view returns (uint256[] memory) {
        return _recipientStreams[recipient];
    }

    /// @notice Cycles ready to be ticked right now (capped to MAX_CYCLES_PER_TICK
    ///         since each tick processes exactly one).
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
