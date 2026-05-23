// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IConditionResolver.sol";
import "./interfaces/IERC165.sol";

/// @title ObscuraPayrollResolver
/// @notice IConditionResolver plugin for ReineiraOS ConfidentialEscrow that gates
///         a payroll cycle release on three plaintext checks:
///           1. `block.timestamp >= releaseTime`
///           2. escrow not cancelled by employer (employer-only kill switch
///              available *until* `releaseTime`)
///           3. optional approver has signed off (set `approver = address(0)`
///              to skip the second-signature gate)
///
///         Encrypted amount + encrypted owner stay inside ConfidentialEscrow.
///         This resolver only stores plaintext gating data — it never touches
///         FHE state, so isConditionMet() is cheap.
contract ObscuraPayrollResolver is IConditionResolver, IERC165 {
    error DeadlineInPast();
    error DeadlineTooFar();
    error NotEmployer();
    error NotApprover();
    error AlreadySet();
    error AlreadyApproved();
    error NotCancellable();

    uint256 public constant MAX_LOCK_DURATION = 365 days;

    struct Cycle {
        uint64 releaseTime;
        bool cancelled;
        bool approved; // implicitly true at storage time when approver == address(0)
        address employer;
        address approver;
        bool exists;
    }

    /// @notice Address of the ReineiraOS ConfidentialEscrow proxy that calls
    ///         `onConditionSet`. Locked at deploy to prevent foreign escrow
    ///         contracts from registering rogue cycles.
    address public immutable escrow;

    mapping(uint256 => Cycle) private _cycles;

    event CycleRegistered(
        uint256 indexed escrowId,
        address indexed employer,
        address indexed approver,
        uint64 releaseTime
    );
    event CycleCancelled(uint256 indexed escrowId, address indexed by);
    event CycleApproved(uint256 indexed escrowId, address indexed approver);

    constructor(address _escrow) {
        require(_escrow != address(0), "escrow=0");
        escrow = _escrow;
    }

    /// @inheritdoc IConditionResolver
    function onConditionSet(uint256 escrowId, bytes calldata data) external override {
        require(msg.sender == escrow, "only escrow");
        if (_cycles[escrowId].exists) revert AlreadySet();

        (uint64 releaseTime, address employer, address approver) = abi.decode(
            data,
            (uint64, address, address)
        );

        if (releaseTime <= block.timestamp) revert DeadlineInPast();
        if (releaseTime > block.timestamp + MAX_LOCK_DURATION) revert DeadlineTooFar();
        require(employer != address(0), "employer=0");

        _cycles[escrowId] = Cycle({
            releaseTime: releaseTime,
            cancelled: false,
            approved: approver == address(0),
            employer: employer,
            approver: approver,
            exists: true
        });

        emit CycleRegistered(escrowId, employer, approver, releaseTime);
    }

    /// @inheritdoc IConditionResolver
    function isConditionMet(uint256 escrowId) external view override returns (bool) {
        Cycle storage c = _cycles[escrowId];
        if (!c.exists || c.cancelled) return false;
        if (block.timestamp < c.releaseTime) return false;
        return c.approved;
    }

    /// @notice Employer kills an unaccepted cycle before its releaseTime.
    function cancel(uint256 escrowId) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (msg.sender != c.employer) revert NotEmployer();
        if (block.timestamp >= c.releaseTime) revert NotCancellable();
        c.cancelled = true;
        emit CycleCancelled(escrowId, msg.sender);
    }

    /// @notice Approver signs off on the cycle (no-op if approver == address(0)).
    function approve(uint256 escrowId) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (msg.sender != c.approver) revert NotApprover();
        if (c.approved) revert AlreadyApproved();
        c.approved = true;
        emit CycleApproved(escrowId, msg.sender);
    }

    function getCycle(uint256 escrowId)
        external
        view
        returns (
            uint64 releaseTime,
            bool cancelled,
            bool approved,
            address employer,
            address approver
        )
    {
        Cycle storage c = _cycles[escrowId];
        return (c.releaseTime, c.cancelled, c.approved, c.employer, c.approver);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IConditionResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
