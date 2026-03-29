// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ObscuraPermissions.sol";

contract ObscuraPay is ObscuraPermissions {
    mapping(address => euint64) private encryptedBalances;
    euint64 private totalPayroll;

    address[] public employees;
    mapping(address => bool) public isEmployee;

    event EmployeePaid(address indexed employee);
    event AuditAccessGranted(address indexed auditor);

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;
    }

    function payEmployee(address _emp, InEuint64 calldata _encSalary) external onlyOwner {
        _payEmployee(_emp, _encSalary);
    }

    function batchPay(address[] calldata _emps, InEuint64[] calldata _salaries) external onlyOwner {
        require(_emps.length == _salaries.length, "Array length mismatch");
        for (uint256 i = 0; i < _emps.length; i++) {
            _payEmployee(_emps[i], _salaries[i]);
        }
    }

    function _payEmployee(address _emp, InEuint64 calldata _encSalary) internal {
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

        // ACL: grant employee decrypt access to their balance
        FHE.allow(encryptedBalances[_emp], _emp);
        // ACL: contract retains access for future operations
        FHE.allowThis(encryptedBalances[_emp]);
        FHE.allowThis(totalPayroll);

        emit EmployeePaid(_emp);
    }

    function getMyBalance() external view returns (euint64) {
        require(FHE.isInitialized(encryptedBalances[msg.sender]), "No balance");
        return encryptedBalances[msg.sender];
    }

    function grantAuditAccess(address _auditor) external onlyOwner {
        roles[_auditor] = Role.AUDITOR;
        FHE.allow(totalPayroll, _auditor);
        emit AuditAccessGranted(_auditor);
    }

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
