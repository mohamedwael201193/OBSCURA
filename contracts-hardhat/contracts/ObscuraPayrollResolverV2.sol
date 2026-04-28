// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IConditionResolver.sol";
import "./interfaces/IERC165.sol";

/// @title ObscuraPayrollResolverV2
/// @notice IConditionResolver plugin (Wave 3 redeploy) addressing privacy
///         audit 0.5.5. The V1 resolver stored `Cycle.employer` and
///         `Cycle.approver` as plaintext addresses; combined with
///         `CycleApproved`/`CycleRegistered` event timestamps that gave
///         observers a cleartext payroll graph (who pays whom + when).
///
///         V2 keeps the same gating semantics (release after `releaseTime`,
///         optional approver, employer kill-switch before release) but:
///
///           * Stores the employer + approver as `eaddress` (encrypted),
///             readable only by parties the registrar grants via FHE ACL.
///           * Uses keccak256 commitments (`employerCommit`, `approverCommit`)
///             as the on-chain auth key for `cancel` / `approve`. The caller
///             passes `salt` so a signed-call contract can reveal-and-prove
///             without ever exposing the address publicly. This keeps the
///             plaintext-address-comparison out of `msg.sender` checks.
///
///         Trade-off: a `salt` per cycle has to be persisted off-chain by
///         the employer-side service that creates the stream cycle (the
///         PayStreamV2 ticker bot, typically). This adds ~32 bytes of
///         off-chain state per cycle but removes the public address graph.
contract ObscuraPayrollResolverV2 is IConditionResolver, IERC165 {
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
        uint64 releaseTime;
        bool cancelled;
        bool approved;
        bool exists;
        // Encrypted parties — for indexing UIs (employer can see all their
        // cycles, approver can see their queue) without leaking on-chain.
        eaddress employer;
        eaddress approver;
        // keccak256(abi.encode(employer, salt)) — auth key for cancel().
        bytes32 employerCommit;
        // keccak256(abi.encode(approver, salt)) — auth key for approve().
        // bytes32(0) sentinel = no approver required.
        bytes32 approverCommit;
    }

    /// @notice ConfidentialEscrow proxy that calls `onConditionSet`.
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
    /// @dev Decoded `data` payload (V2):
    ///        (uint64 releaseTime,
    ///         InEaddress encEmployer,
    ///         InEaddress encApprover,    // empty handle if no approver
    ///         bytes32 employerCommit,
    ///         bytes32 approverCommit)    // 0 if no approver
    function onConditionSet(uint256 escrowId, bytes calldata data) external override {
        require(msg.sender == escrow, "only escrow");
        if (_cycles[escrowId].exists) revert AlreadySet();

        (
            uint64 releaseTime,
            InEaddress memory encEmployer,
            InEaddress memory encApprover,
            bytes32 employerCommit,
            bytes32 approverCommit
        ) = abi.decode(data, (uint64, InEaddress, InEaddress, bytes32, bytes32));

        if (releaseTime <= block.timestamp) revert DeadlineInPast();
        if (releaseTime > block.timestamp + MAX_LOCK_DURATION) revert DeadlineTooFar();
        require(employerCommit != bytes32(0), "employerCommit=0");

        eaddress empE = FHE.asEaddress(encEmployer);
        FHE.allowThis(empE);
        eaddress appE;
        if (approverCommit != bytes32(0)) {
            appE = FHE.asEaddress(encApprover);
            FHE.allowThis(appE);
        }

        _cycles[escrowId] = Cycle({
            releaseTime: releaseTime,
            cancelled: false,
            approved: approverCommit == bytes32(0), // implicit approval if no approver required
            exists: true,
            employer: empE,
            approver: appE,
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
    /// @param escrowId cycle id
    /// @param salt the same salt the registrar used to compute employerCommit
    function cancel(uint256 escrowId, bytes32 salt) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (block.timestamp >= c.releaseTime) revert NotCancellable();
        if (keccak256(abi.encode(msg.sender, salt)) != c.employerCommit) revert NotEmployer();
        c.cancelled = true;
        emit CycleCancelled(escrowId);
    }

    /// @notice Approver signs off on the cycle.
    function approve(uint256 escrowId, bytes32 salt) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (c.approverCommit == bytes32(0)) revert NoApproverSet();
        if (c.approved) revert AlreadyApproved();
        if (keccak256(abi.encode(msg.sender, salt)) != c.approverCommit) revert NotApprover();
        c.approved = true;
        emit CycleApproved(escrowId);
    }

    /// @notice Re-grant the encrypted employer field to a specific reader
    ///         (e.g. the recipient who needs to verify employer identity).
    function shareEmployer(uint256 escrowId, address reader, bytes32 salt) external {
        Cycle storage c = _cycles[escrowId];
        require(c.exists, "no cycle");
        if (keccak256(abi.encode(msg.sender, salt)) != c.employerCommit) revert NotEmployer();
        FHE.allow(c.employer, reader);
    }

    function getCycle(uint256 escrowId)
        external
        view
        returns (
            uint64 releaseTime,
            bool cancelled,
            bool approved,
            bytes32 employerCommit,
            bytes32 approverCommit
        )
    {
        Cycle storage c = _cycles[escrowId];
        return (c.releaseTime, c.cancelled, c.approved, c.employerCommit, c.approverCommit);
    }

    /// @notice Encrypted-employer handle. Caller must have been granted FHE permission.
    function getEncryptedEmployer(uint256 escrowId) external view returns (eaddress) {
        return _cycles[escrowId].employer;
    }

    function getEncryptedApprover(uint256 escrowId) external view returns (eaddress) {
        return _cycles[escrowId].approver;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IConditionResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
