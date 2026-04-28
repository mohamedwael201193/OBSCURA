// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConfidentialUSDC.sol";

/// @title ObscuraInsuranceSubscription
/// @notice Pre-approved recurring insurance budget. Users (typically the
///         employer or the recipient of a payroll stream) call
///         `subscribe(streamId, durationCycles, encMaxPremiumPerCycle)` once;
///         the contract pulls cUSDC from them every time the subscription
///         is consumed by the underwriter on a per-cycle basis.
///
///         Why this exists: Wave 2 required a manual `BuyCoverageForm`
///         submission per cycle, which is hostile UX for recurring payroll
///         and breaks the moment a user is offline. This contract gives a
///         "subscribe and forget" path while keeping all amounts encrypted.
///
///         Trust model: the consumer (CoverageManager / off-chain ticker)
///         must be authorized via `setConsumer`. We do not gate on
///         `msg.sender == streamEmployer` because this contract should be
///         usable by either side of the stream.
contract ObscuraInsuranceSubscription {
    error NotConsumer();
    error NotOwner();
    error SubscriptionInactive();
    error AlreadyConsumedThisCycle();
    error MaxCyclesReached();
    error CycleNotElapsed();
    error PeriodTooShort();

    /// @dev Hard floor on the cycle period — same value as PayStream so
    ///      sub-minute "rapid-drain" attacks are impossible.
    uint64 public constant MIN_PERIOD_SECONDS = 60;

    IConfidentialUSDC public immutable cUSDC;
    /// @notice Authorized to call `consume` (typically the off-chain ticker
    ///         service, or the CoverageManager itself).
    address public consumer;
    address public immutable owner;

    struct Subscription {
        address subscriber;
        uint256 streamId;
        uint64 maxCycles;
        uint64 cyclesConsumed;
        uint64 periodSeconds;
        uint64 lastConsumedAt;
        euint64 maxPremiumPerCycle; // upper bound the subscriber accepts
        bool active;
        bool exists;
    }

    Subscription[] private _subs;
    mapping(address => uint256[]) private _subsBySubscriber;

    event Subscribed(
        uint256 indexed subId,
        address indexed subscriber,
        uint256 indexed streamId,
        uint64 maxCycles,
        uint64 periodSeconds
    );
    event Consumed(uint256 indexed subId, uint64 cycleIndex, uint64 consumedAt);
    event Cancelled(uint256 indexed subId);
    event ConsumerSet(address indexed consumer);

    constructor(address _cUSDC, address initialConsumer) {
        require(_cUSDC != address(0), "cUSDC=0");
        cUSDC = IConfidentialUSDC(_cUSDC);
        owner = msg.sender;
        consumer = initialConsumer; // may be address(0); set later via setConsumer
    }

    function setConsumer(address newConsumer) external {
        if (msg.sender != owner) revert NotOwner();
        consumer = newConsumer;
        emit ConsumerSet(newConsumer);
    }

    /// @notice Open a new subscription. The subscriber must separately call
    ///         `cUSDC.setOperator(thisContract, expiry)` so we can pull
    ///         premiums per cycle.
    function subscribe(
        uint256 streamId,
        uint64 maxCycles,
        uint64 periodSeconds,
        InEuint64 calldata encMaxPremiumPerCycle
    ) external returns (uint256 subId) {
        if (periodSeconds < MIN_PERIOD_SECONDS) revert PeriodTooShort();
        require(maxCycles > 0, "maxCycles=0");

        euint64 maxP = FHE.asEuint64(encMaxPremiumPerCycle);
        FHE.allowThis(maxP);
        FHE.allow(maxP, msg.sender);

        subId = _subs.length;
        _subs.push(
            Subscription({
                subscriber: msg.sender,
                streamId: streamId,
                maxCycles: maxCycles,
                cyclesConsumed: 0,
                periodSeconds: periodSeconds,
                lastConsumedAt: 0,
                maxPremiumPerCycle: maxP,
                active: true,
                exists: true
            })
        );
        _subsBySubscriber[msg.sender].push(subId);

        emit Subscribed(subId, msg.sender, streamId, maxCycles, periodSeconds);
    }

    function cancel(uint256 subId) external {
        Subscription storage s = _subs[subId];
        require(s.exists, "no sub");
        if (msg.sender != s.subscriber) revert NotOwner();
        s.active = false;
        emit Cancelled(subId);
    }

    /// @notice Consume one cycle's premium. Permissioned to `consumer`.
    /// @param subId subscription id
    /// @param dest address that receives the cUSDC premium (typically the
    ///        Reineira CoverageManager or the underwriter's collateral pool).
    /// @param encPremium encrypted premium amount the consumer charges this
    ///        cycle (must be ≤ subscriber's `maxPremiumPerCycle` — the
    ///        consumer is responsible for honouring this bound; we cannot
    ///        enforce it cheaply on-chain because both values are encrypted).
    function consume(
        uint256 subId,
        address dest,
        InEuint64 calldata encPremium
    ) external {
        if (msg.sender != consumer) revert NotConsumer();

        Subscription storage s = _subs[subId];
        require(s.exists, "no sub");
        if (!s.active) revert SubscriptionInactive();
        if (s.cyclesConsumed >= s.maxCycles) revert MaxCyclesReached();
        if (s.lastConsumedAt != 0 && block.timestamp < s.lastConsumedAt + s.periodSeconds) {
            revert CycleNotElapsed();
        }

        euint64 premium = FHE.asEuint64(encPremium);
        FHE.allowThis(premium);
        FHE.allow(premium, address(cUSDC));

        // Pull from subscriber, send to dest. cUSDC enforces the operator
        // approval the subscriber granted via setOperator at subscription time.
        cUSDC.confidentialTransferFrom(s.subscriber, dest, premium);

        s.cyclesConsumed += 1;
        s.lastConsumedAt = uint64(block.timestamp);

        emit Consumed(subId, s.cyclesConsumed, uint64(block.timestamp));

        if (s.cyclesConsumed >= s.maxCycles) {
            s.active = false;
        }
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getSubscription(uint256 subId)
        external
        view
        returns (
            address subscriber,
            uint256 streamId,
            uint64 maxCycles,
            uint64 cyclesConsumed,
            uint64 periodSeconds,
            uint64 lastConsumedAt,
            bool active
        )
    {
        Subscription storage s = _subs[subId];
        require(s.exists, "no sub");
        return (
            s.subscriber,
            s.streamId,
            s.maxCycles,
            s.cyclesConsumed,
            s.periodSeconds,
            s.lastConsumedAt,
            s.active
        );
    }

    function subCount() external view returns (uint256) {
        return _subs.length;
    }

    function subsBySubscriber(address subscriber) external view returns (uint256[] memory) {
        return _subsBySubscriber[subscriber];
    }
}
