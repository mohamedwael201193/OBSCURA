// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Mock contract for tests — receives calls and returns true.
contract MockCallTarget {
    event Called(address caller, uint256 value, bytes data);

    function doSomething() external payable returns (bool) {
        emit Called(msg.sender, msg.value, msg.data);
        return true;
    }

    receive() external payable {}
}

/// @dev Attempts to re-enter ObscuraSmartAccount.execute during a call.
contract ReentrantAttacker {
    address public target;

    constructor(address _target) {
        target = _target;
    }

    function attack() external {
        // Try to call execute on the smart account (will hit Reentrant guard)
        (bool ok, bytes memory ret) = target.call(
            abi.encodeWithSignature(
                "execute(address,uint256,bytes)",
                address(this),
                0,
                abi.encodeWithSignature("attack()")
            )
        );
        if (!ok) {
            assembly { revert(add(ret, 32), mload(ret)) }
        }
    }

    receive() external payable {}
}
