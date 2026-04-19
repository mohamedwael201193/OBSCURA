// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title IReineiraEscrow
/// @notice Local interface mirror of `@reineira-os/escrow` ConfidentialEscrow.
///         Encrypted owner/amount come from cofhejs/cofhe-sdk encryptInputs as
///         InEaddress / InEuint64 calldata structs.
interface IReineiraEscrow {
    function create(
        InEaddress calldata encryptedOwner,
        InEuint64 calldata encryptedAmount,
        address resolver,
        bytes calldata resolverData
    ) external returns (uint256 escrowId);

    function fund(uint256 escrowId, InEuint64 calldata encryptedPayment) external;
    function redeem(uint256 escrowId) external;
    function exists(uint256 escrowId) external view returns (bool);
}
