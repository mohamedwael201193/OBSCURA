// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ObscuraPermissions.sol";

/// @title ObscuraPay — encrypted payroll, open to any employer
/// @notice Any wallet can act as an employer and pay employees.
///         Each employee accumulates encrypted salary from any employer.
///         Aggregate total is owner-auditable; any address can request audit access.
contract ObscuraPay is ObscuraPermissions {
    // Per-employee encrypted running balance (accumulates across all employers)
    mapping(address => euint64) private encryptedBalances;
    // Global aggregate of all salaries paid
    euint64 private totalPayroll;

    address[] public employees;
    mapping(address => bool) public isEmployee;

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
}
