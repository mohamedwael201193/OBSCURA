// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ObscuraPermissions.sol";

/// @title ObscuraPay — encrypted payroll with payment history
/// @notice Any wallet can act as an employer and pay employees.
///         Each employee accumulates encrypted salary from any employer.
///         Aggregate total is owner-auditable; any address can request audit access.
///         Payment history is tracked per-address for the frontend dashboard.
contract ObscuraPay is ObscuraPermissions {
    // Per-employee encrypted running balance (accumulates across all employers)
    mapping(address => euint64) private encryptedBalances;
    // Global aggregate of all salaries paid
    euint64 private totalPayroll;

    address[] public employees;
    mapping(address => bool) public isEmployee;

    // ─── Payment History ────────────────────────────────────────────────
    struct PaymentRecord {
        address from;
        address to;
        uint256 timestamp;
        // Amount is encrypted — caller uses their permit to decrypt their own records
    }

    PaymentRecord[] public paymentLog;
    // Index of payment records per address (as sender or receiver)
    mapping(address => uint256[]) private paymentIndicesByAddress;

    event EmployeePaid(address indexed employer, address indexed employee);
    event AuditAccessGranted(address indexed auditor);

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;
    }

    /// @notice Any connected wallet can pay an employee an encrypted salary.
    function payEmployee(address _emp, InEuint64 calldata _encSalary) external {
        require(msg.sender != address(0), "Invalid sender");
        _payEmployee(_emp, _encSalary);
    }

    /// @notice Batch pay multiple employees in a single transaction.
    function batchPay(address[] calldata _emps, InEuint64[] calldata _salaries) external {
        require(msg.sender != address(0), "Invalid sender");
        require(_emps.length == _salaries.length, "Array length mismatch");
        require(_emps.length <= 50, "Batch too large");
        for (uint256 i = 0; i < _emps.length; i++) {
            _payEmployee(_emps[i], _salaries[i]);
        }
    }

    function _payEmployee(address _emp, InEuint64 calldata _encSalary) internal {
        require(_emp != address(0), "Invalid employee address");
        euint64 salary = FHE.asEuint64(_encSalary);

        if (!isEmployee[_emp]) {
            employees.push(_emp);
            isEmployee[_emp] = true;
            roles[_emp] = Role.EMPLOYEE;
        }

        if (FHE.isInitialized(encryptedBalances[_emp])) {
            encryptedBalances[_emp] = FHE.add(encryptedBalances[_emp], salary);
        } else {
            encryptedBalances[_emp] = salary;
        }

        if (FHE.isInitialized(totalPayroll)) {
            totalPayroll = FHE.add(totalPayroll, salary);
        } else {
            totalPayroll = salary;
        }

        FHE.allow(encryptedBalances[_emp], _emp);
        FHE.allowThis(encryptedBalances[_emp]);
        FHE.allowThis(totalPayroll);

        // Record payment in history log
        uint256 idx = paymentLog.length;
        paymentLog.push(PaymentRecord({
            from: msg.sender,
            to: _emp,
            timestamp: block.timestamp
        }));
        paymentIndicesByAddress[msg.sender].push(idx);
        paymentIndicesByAddress[_emp].push(idx);

        emit EmployeePaid(msg.sender, _emp);
    }

    /// @notice Employee reads their own encrypted balance handle.
    function getMyBalance() external view returns (euint64) {
        require(FHE.isInitialized(encryptedBalances[msg.sender]), "No balance");
        return encryptedBalances[msg.sender];
    }

    /// @notice Owner grants audit access to an address.
    function grantAuditAccess(address _auditor) external onlyOwner {
        roles[_auditor] = Role.AUDITOR;
        FHE.allow(totalPayroll, _auditor);
        emit AuditAccessGranted(_auditor);
    }

    /// @notice Auditor or owner reads the global aggregate total.
    function getAggregateTotal() external view onlyRole(Role.AUDITOR) returns (euint64) {
        return totalPayroll;
    }

    function getEmployees() external view returns (address[] memory) {
        return employees;
    }

    function getEmployeeCount() external view returns (uint256) {
        return employees.length;
    }

    // ─── Payment History Views ──────────────────────────────────────────

    /// @notice Total number of payment records.
    function getPaymentCount() external view returns (uint256) {
        return paymentLog.length;
    }

    /// @notice Number of payments involving a specific address (as sender or receiver).
    function getMyPaymentCount() external view returns (uint256) {
        return paymentIndicesByAddress[msg.sender].length;
    }

    /// @notice Get payment indices for the caller. Frontend can paginate and fetch details.
    function getMyPaymentIndices(uint256 _offset, uint256 _limit) external view returns (uint256[] memory) {
        uint256[] storage indices = paymentIndicesByAddress[msg.sender];
        uint256 total = indices.length;
        if (_offset >= total) {
            return new uint256[](0);
        }
        uint256 end = _offset + _limit;
        if (end > total) end = total;
        uint256[] memory result = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = indices[i];
        }
        return result;
    }

    /// @notice Get payment record by index.
    function getPaymentRecord(uint256 _index) external view returns (address from_, address to_, uint256 timestamp_) {
        require(_index < paymentLog.length, "Index out of bounds");
        PaymentRecord storage rec = paymentLog[_index];
        return (rec.from, rec.to, rec.timestamp);
    }
}
