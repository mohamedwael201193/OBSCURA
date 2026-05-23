// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

interface IObscuraVoteParticipation {
    function voterParticipation(address voter) external view returns (uint256);
}

/// @title ObscuraGovernor
/// @notice OZ Governor adapter that derives voting power from Obscura Vote V5's
///         `voterParticipation` counter. The counter is a per-user monotone
///         integer (incremented every time the voter casts an encrypted vote
///         in Vote V5) so reusing the current value across proposals is safe:
///         a vote weight cannot be acquired retroactively, and existing
///         participants can never lose weight by anyone else's actions.
///
///         Why this exists:
///         1. Tally listing requires a standards-compliant Governor interface.
///         2. ObscuraVote V5 stores encrypted ballots; it cannot itself expose
///            an OZ-shaped `_getVotes`. The Governor adapter wraps Vote V5 so
///            Tally / Snapshot / etc. can list Obscura proposals without
///            breaking the encrypted-ballot semantics of the underlying app.
///
///         The Governor uses `block.number` as the clock and skips the
///         GovernorVotes extension entirely — voting power is read directly
///         from the Vote V5 participation counter at proposal-vote time
///         (current value, see safety note above).
///
///         Timelock executes only after a passing vote (51% of cast votes
///         with quorum). Proposals can target any contract on Arb Sepolia
///         (e.g. ObscuraTreasury, market params via factory).
contract ObscuraGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorTimelockControl
{
    IObscuraVoteParticipation public immutable voteSrc;
    /// @dev Plaintext quorum threshold in vote-units (voterParticipation sum).
    uint256 public quorumVotes;

    event QuorumVotesSet(uint256 newQuorum);

    constructor(
        IObscuraVoteParticipation _voteSrc,
        TimelockController _timelock,
        uint48  _votingDelayBlocks,    // e.g.   1   (≈ 0.25 s on Arb)
        uint32  _votingPeriodBlocks,   // e.g. 50_400 (≈ 3 days on Arb @ 250ms)
        uint256 _proposalThreshold,    // min voterParticipation to propose
        uint256 _quorumVotes           // min total weight required
    )
        Governor("ObscuraGovernor")
        GovernorSettings(_votingDelayBlocks, _votingPeriodBlocks, _proposalThreshold)
        GovernorTimelockControl(_timelock)
    {
        voteSrc     = _voteSrc;
        quorumVotes = _quorumVotes;
    }

    // ─── Voting power: ObscuraVote V5 participation counter ──────────────

    function _getVotes(address account, uint256 /*timepoint*/, bytes memory /*params*/)
        internal view override returns (uint256)
    {
        return voteSrc.voterParticipation(account);
    }

    function clock() public view override returns (uint48) {
        return uint48(block.number);
    }
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber&from=default";
    }

    function quorum(uint256 /*timepoint*/) public view override returns (uint256) {
        return quorumVotes;
    }

    /// @notice Governor-controlled quorum adjustment via proposal.
    function setQuorumVotes(uint256 newQuorum) external onlyGovernance {
        quorumVotes = newQuorum;
        emit QuorumVotesSet(newQuorum);
    }

    // ─── Required overrides (Solidity inheritance plumbing) ──────────────

    function votingDelay()
        public view override(Governor, GovernorSettings) returns (uint256)
    { return super.votingDelay(); }

    function votingPeriod()
        public view override(Governor, GovernorSettings) returns (uint256)
    { return super.votingPeriod(); }

    function proposalThreshold()
        public view override(Governor, GovernorSettings) returns (uint256)
    { return super.proposalThreshold(); }

    function state(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    { return super.state(proposalId); }

    function proposalNeedsQueuing(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl) returns (bool)
    { return super.proposalNeedsQueuing(proposalId); }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal view override(Governor, GovernorTimelockControl) returns (address)
    { return super._executor(); }
}
