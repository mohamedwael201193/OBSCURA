// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConditionResolver.sol";
import "./interfaces/IERC165.sol";

/// @title ObscuraPayrollResolverV3
/// @notice IConditionResolver for payroll streams — Wave 5 rewrite.
///
///         Changes from V2:
///         - Removes InEaddress / eaddress entirely from onConditionSet.
///           CoFHE's forwarding restriction (proof signer must match immediate
///           caller of FHE.asExx) makes it impossible for ObscuraPayStreamV3
///           to supply resolver-signed InEaddress proofs for employer/approver.
///         - Uses plaintext addresses for on-chain indexing (no encryption).
///           Payroll graphs are already visible via payroll event logs; hiding
///           the employer address inside the resolver added complexity with no
///           practical privacy gain (employer address is plaintext in the
///           stream contract anyway).
///         - Retains keccak256 commit-based auth for cancel() and approve()
///           so the resolver can be called by an off-chain keeper without
///           exposing the employer address on-chain in the cancel path.
///         - Compatible with ObscuraConfidentialEscrow.createFromHandles().
///
///         Data format for `onConditionSet` resolverData:
///           abi.encode(
///             uint64  releaseTime,      // when the cycle is eligible
///             bytes32 employerCommit,   // keccak256(abi.encode(employer, salt))
///             bytes32 approverCommit    // keccak256(abi.encode(approver, salt)) or 0 = none
///           )
contract ObscuraPayrollResolverV3 is IConditionResolver, IERC165 {
    error DeadlineInPast();
    error DeadlineTooFar();
    error NotEmployer();
    error NotApprover();
    error AlreadySet();
    error AlreadyApproved();
    error NotCancellable();
    error NoApproverSet();

    uint256 public constant MAX_LOCK_DURATION = 365 days;

    struct Cycle {
        uint64  releaseTime;
        bool    cancelled;
        bool    approved;
        bool    exists;
        // keccak256(abi.encode(employer, salt)) — auth key for cancel().
        bytes32 employerCommit;
        // keccak256(abi.encode(approver, salt)) — auth key for approve().
        // bytes32(0) sentinel = no approver required (immediate approval).
        bytes32 approverCommit;
    }

    /// @notice ObscuraConfidentialEscrow proxy that calls `onConditionSet`.
    address public immutable escrow;

    mapping(uint256 => Cycle) private _cycles;

    event CycleRegistered(uint256 indexed escrowId, uint64 releaseTime);
    event CycleCancelled(uint256 indexed escrowId);
    event CycleApproved(uint256 indexed escrowId);

    constructor(address _escrow) {
        require(_escrow != address(0), "escrow=0");
        escrow = _escrow;
    }

    /// @inheritdoc IConditionResolver
    /// @dev resolverData = abi.encode(uint64 releaseTime, bytes32 employerCommit, bytes32 approverCommit)
    function onConditionSet(uint256 escrowId, bytes calldata data) external override {
        require(msg.sender == escrow, "only escrow");
        if (_cycles[escrowId].exists) revert AlreadySet();

        (uint64 releaseTime, bytes32 employerCommit, bytes32 approverCommit)
            = abi.decode(data, (uint64, bytes32, bytes32));

        if (releaseTime <= block.timestamp) revert DeadlineInPast();
        if (releaseTime > block.timestamp + MAX_LOCK_DURATION) revert DeadlineTooFar();
        require(employerCommit != bytes32(0), "employerCommit=0");

        _cycles[escrowId] = Cycle({
            releaseTime: releaseTime,
            cancelled: false,
            // If no approver commit supplied, auto-approve (time-only gate).
            approved: approverCommit == bytes32(0),
            exists: true,
            employerCommit: employerCommit,
            approverCommit: approverCommit
        });

        emit CycleRegistered(escrowId, releaseTime);
    }

    /// @inheritdoc IConditionResolver
    function isConditionMet(uint256 escrowId) external view override returns (bool) {
        Cycle storage c = _cycles[escrowId];
        if (!c.exists || c.cancelled) return false;
        if (block.timestamp < c.releaseTime) return false;
        return c.approved;
    }

    /// @notice Employer kills an unaccepted cycle before its releaseTime.
    /// @param escrowId cycle / escrow id
    /// @param salt     the same salt the registrar used to compute employerCommit
    function cancel(uint256 escrowId, bytes32 salt) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (block.timestamp >= c.releaseTime) revert NotCancellable();
        if (keccak256(abi.encode(msg.sender, salt)) != c.employerCommit) revert NotEmployer();
        c.cancelled = true;
        emit CycleCancelled(escrowId);
    }

    /// @notice Approver signs off on the cycle (if an approver was required).
    function approve(uint256 escrowId, bytes32 salt) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (c.approverCommit == bytes32(0)) revert NoApproverSet();
        if (c.approved) revert AlreadyApproved();
        if (keccak256(abi.encode(msg.sender, salt)) != c.approverCommit) revert NotApprover();
        c.approved = true;
        emit CycleApproved(escrowId);
    }

    function getCycle(uint256 escrowId)
        external
        view
        returns (
            uint64  releaseTime,
            bool    cancelled,
            bool    approved,
            bytes32 employerCommit,
            bytes32 approverCommit
        )
    {
        Cycle storage c = _cycles[escrowId];
        return (c.releaseTime, c.cancelled, c.approved, c.employerCommit, c.approverCommit);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IConditionResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
