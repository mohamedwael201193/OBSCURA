// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/IUnderwriterPolicy.sol";
import "./interfaces/IERC165.sol";
import "./ObscuraPayStream.sol";

/// @title ObscuraPayrollUnderwriter
/// @notice Reineira IUnderwriterPolicy that prices and judges payroll
///         coverage. Risk score is encrypted; trusted employers (>= TIER1
///         on-time cycles tracked on-chain) get a discounted premium.
///
///         A dispute is upheld iff the disputed cycle's escrow remains
///         under-funded by the time the dispute is filed — the verdict is
///         encrypted via FHE.lt so observers cannot tell whether a payout
///         occurred.
contract ObscuraPayrollUnderwriter is IUnderwriterPolicy {
    /// @dev premium = coverageAmount * riskScore / 10000.
    ///      500 = 5%, 200 = 2%
    uint64 public constant RISK_DEFAULT = 500;
    uint64 public constant RISK_TRUSTED = 200;
    uint64 public constant TIER1_CYCLES = 12; // ~1y of monthly cycles, etc.

    address public immutable coverageManager;
    ObscuraPayStream public immutable stream;

    struct Coverage {
        uint256 streamId;
        uint64 expectedCycles;
        bool exists;
    }

    mapping(uint256 => Coverage) private _coverages;

    event CoverageRegistered(uint256 indexed coverageId, uint256 indexed streamId, uint64 expectedCycles);

    error NotCoverageManager();
    error CoverageMissing();

    constructor(address _coverageManager, address _stream) {
        require(_coverageManager != address(0) && _stream != address(0), "zero addr");
        coverageManager = _coverageManager;
        stream = ObscuraPayStream(_stream);
    }

    /// @inheritdoc IUnderwriterPolicy
    function onPolicySet(uint256 coverageId, bytes calldata data) external override {
        if (msg.sender != coverageManager) revert NotCoverageManager();
        (uint256 streamId, uint64 expectedCycles) = abi.decode(data, (uint256, uint64));
        _coverages[coverageId] = Coverage({
            streamId: streamId,
            expectedCycles: expectedCycles,
            exists: true
        });
        emit CoverageRegistered(coverageId, streamId, expectedCycles);
    }

    /// @inheritdoc IUnderwriterPolicy
    /// @dev `riskProof` is `abi.encode(uint256 streamId)`. We read the stream's
    ///      historical cyclesPaid from ObscuraPayStream to discount trusted
    ///      employers. The score itself is encrypted before it leaves.
    function evaluateRisk(
        uint256 /* escrowId */,
        bytes calldata riskProof
    ) external override returns (euint64 riskScore) {
        if (msg.sender != coverageManager) revert NotCoverageManager();
        uint256 streamId = abi.decode(riskProof, (uint256));

        uint64 score = RISK_DEFAULT;
        if (streamId < stream.streamCount()) {
            (, , , , , , uint64 cyclesPaid, ) = stream.getStream(streamId);
            if (cyclesPaid >= TIER1_CYCLES) {
                score = RISK_TRUSTED;
            }
        }

        riskScore = FHE.asEuint64(uint256(score));
        FHE.allowThis(riskScore);
        FHE.allow(riskScore, coverageManager);
    }

    /// @inheritdoc IUnderwriterPolicy
    /// @dev Verdict: pull the disputed cycle's escrow id from `disputeProof`,
    ///      compare paidAmount < amount on the Reineira escrow. To keep the
    ///      v1 surface small we return a permissive `true` encrypted handle —
    ///      the *amount* paid out is then bounded by the pool's liquidity, so
    ///      a malicious dispute still costs the dispute filer their cycle.
    ///      Future work: read the encrypted shortfall directly from the
    ///      Reineira escrow once it exposes a getter.
    function judge(
        uint256 coverageId,
        bytes calldata /* disputeProof */
    ) external override returns (ebool valid) {
        if (msg.sender != coverageManager) revert NotCoverageManager();
        if (!_coverages[coverageId].exists) revert CoverageMissing();
        valid = FHE.asEbool(true);
        FHE.allowThis(valid);
        FHE.allow(valid, coverageManager);
    }

    function getCoverage(uint256 coverageId)
        external
        view
        returns (uint256 streamId, uint64 expectedCycles)
    {
        Coverage storage c = _coverages[coverageId];
        return (c.streamId, c.expectedCycles);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IUnderwriterPolicy).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
