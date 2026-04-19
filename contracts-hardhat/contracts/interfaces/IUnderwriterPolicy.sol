// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./IERC165.sol";

/// @title IUnderwriterPolicy
/// @notice Mirror of `@reineira-os/shared` IUnderwriterPolicy.
///         Implementations decide premium (evaluateRisk) and dispute outcome (judge).
interface IUnderwriterPolicy is IERC165 {
    function onPolicySet(uint256 coverageId, bytes calldata data) external;

    function evaluateRisk(
        uint256 escrowId,
        bytes calldata riskProof
    ) external returns (euint64 riskScore);

    function judge(
        uint256 coverageId,
        bytes calldata disputeProof
    ) external returns (ebool valid);
}
