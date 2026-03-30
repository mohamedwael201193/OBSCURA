// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title ObscuraConditionResolver — pluggable escrow release conditions
/// @notice Implements two condition types:
///         1. TimeCondition — release after a deadline timestamp
///         2. ApprovalCondition — release when creator calls approve()
///         Follows ReineiraOS IConditionResolver pattern.
contract ObscuraConditionResolver {
    enum ConditionType { NONE, TIME_LOCK, APPROVAL }

    struct Condition {
        ConditionType cType;
        uint256 deadline;       // used by TIME_LOCK
        address approver;       // used by APPROVAL
        bool approved;          // used by APPROVAL
    }

    mapping(uint256 => Condition) public conditions;
    address public escrowContract;

    event ConditionSet(uint256 indexed escrowId, ConditionType cType);
    event EscrowApproved(uint256 indexed escrowId, address indexed approver);

    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "Only escrow contract");
        _;
    }

    constructor(address _escrowContract) {
        require(_escrowContract != address(0), "Invalid escrow address");
        escrowContract = _escrowContract;
    }

    /// @notice Called by escrow contract during escrow creation.
    /// @param escrowId The escrow identifier
    /// @param data ABI-encoded (uint8 conditionType, uint256 deadlineOrZero)
    function onConditionSet(uint256 escrowId, bytes calldata data) external onlyEscrow {
        (uint8 cType, uint256 param) = abi.decode(data, (uint8, uint256));
        require(cType == 1 || cType == 2, "Invalid condition type");

        if (cType == 1) {
            // TIME_LOCK: param = deadline timestamp
            require(param > block.timestamp, "Deadline must be in the future");
            conditions[escrowId] = Condition({
                cType: ConditionType.TIME_LOCK,
                deadline: param,
                approver: address(0),
                approved: false
            });
        } else {
            // APPROVAL: param is ignored, approver = tx.origin (the creator)
            conditions[escrowId] = Condition({
                cType: ConditionType.APPROVAL,
                deadline: 0,
                approver: tx.origin,
                approved: false
            });
        }

        emit ConditionSet(escrowId, ConditionType(cType));
    }

    /// @notice Check if the condition for an escrow is satisfied.
    function isConditionMet(uint256 escrowId) external view returns (bool) {
        Condition storage c = conditions[escrowId];
        if (c.cType == ConditionType.NONE) return true;
        if (c.cType == ConditionType.TIME_LOCK) return block.timestamp >= c.deadline;
        if (c.cType == ConditionType.APPROVAL) return c.approved;
        return false;
    }

    /// @notice Approver releases the escrow (APPROVAL condition only).
    function approve(uint256 escrowId) external {
        Condition storage c = conditions[escrowId];
        require(c.cType == ConditionType.APPROVAL, "Not an approval condition");
        require(msg.sender == c.approver, "Only approver");
        require(!c.approved, "Already approved");
        c.approved = true;
        emit EscrowApproved(escrowId, msg.sender);
    }

    /// @notice Get condition details for UI display.
    function getCondition(uint256 escrowId) external view returns (
        uint8 cType,
        uint256 deadline,
        address approver,
        bool approved
    ) {
        Condition storage c = conditions[escrowId];
        return (uint8(c.cType), c.deadline, c.approver, c.approved);
    }
}
