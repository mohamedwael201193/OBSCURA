// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

abstract contract ObscuraPermissions {
    enum Role { NONE, ADMIN, EMPLOYEE, AUDITOR }

    mapping(address => Role) public roles;
    address public owner;

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role || msg.sender == owner, "Unauthorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function grantRole(address _user, Role _role) external onlyOwner {
        roles[_user] = _role;
    }

    function revokeRole(address _user) external onlyOwner {
        roles[_user] = Role.NONE;
    }

    function _grantDecrypt(euint64 _handle, address _who) internal {
        FHE.allow(_handle, _who);
    }

    function _retainAccess(euint64 _handle) internal {
        FHE.allowThis(_handle);
    }
}
