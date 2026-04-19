// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IConditionResolver
/// @notice Mirror of `@reineira-os/shared` IConditionResolver. Implement this
///         in any contract that gates an escrow release on custom logic.
interface IConditionResolver {
    function isConditionMet(uint256 escrowId) external view returns (bool);
    function onConditionSet(uint256 escrowId, bytes calldata data) external;
}
