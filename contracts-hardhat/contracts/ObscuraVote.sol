// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ObscuraPermissions.sol";

interface IObscuraToken {
    function balanceOf() external view returns (euint64);
    function lastClaim(address) external view returns (uint256);
}

/// @title ObscuraVote — coercion-resistant encrypted governance (v2)
/// @notice Multi-option proposals with FHE-encrypted voting. No one sees
///         individual choices. After deadline + quorum, aggregate tallies
///         are publicly decryptable. Voters can change their vote (anti-coercion).
///
/// FHE Operations used:
///   asEuint64, eq, select, add, sub, allowThis, allowPublic, allow
contract ObscuraVote is ObscuraPermissions {

    // ─── Constants ──────────────────────────────────────────────────────

    uint8 public constant MAX_OPTIONS = 10;

    // ─── Types ──────────────────────────────────────────────────────────

    enum Category { GENERAL, TREASURY, PROTOCOL, GRANTS, SOCIAL, TECHNICAL }

    struct Proposal {
        string title;
        string description;
        uint8 numOptions;
        uint256 deadline;
        uint256 quorum;
        Category category;
        uint256 totalVoters;
        bool isFinalized;
        bool isCancelled;
        bool exists;
        address creator;
    }

    // ─── State ──────────────────────────────────────────────────────────

    IObscuraToken public obsToken;

    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => string[]) private proposalOptions;
    mapping(uint256 => mapping(uint8 => euint64)) private tallies;
    mapping(uint256 => mapping(address => euint64)) private voterEncryptedVote;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public nextProposalId;

    // Voter participation tracking
    mapping(address => uint256) public voterParticipation;

    // ─── Events ─────────────────────────────────────────────────────────

    event ProposalCreated(uint256 indexed proposalId, string title, uint8 numOptions, uint256 deadline, Category category);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event VoteChanged(uint256 indexed proposalId, address indexed voter);
    event VoteFinalized(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event DeadlineExtended(uint256 indexed proposalId, uint256 newDeadline);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _obsToken) {
        require(_obsToken != address(0), "Invalid token address");
        obsToken = IObscuraToken(_obsToken);
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;
    }

    // ─── Proposal Creation ────────────────────────────────────────────────

    /// @notice Create a multi-option governance proposal.
    ///         Any user who has claimed $OBS at least once can create proposals.
    function createProposal(
        string calldata _title,
        string calldata _description,
        string[] calldata _options,
        uint256 _deadline,
        uint256 _quorum,
        Category _category
    ) external returns (uint256 proposalId) {
        require(
            obsToken.lastClaim(msg.sender) > 0,
            "Must hold $OBS (claim daily tokens first)"
        );
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_options.length >= 2 && _options.length <= MAX_OPTIONS, "2-10 options required");

        proposalId = nextProposalId++;
        uint8 numOpts = uint8(_options.length);

        proposals[proposalId] = Proposal({
            title: _title,
            description: _description,
            numOptions: numOpts,
            deadline: _deadline,
            quorum: _quorum,
            category: _category,
            totalVoters: 0,
            isFinalized: false,
            isCancelled: false,
            exists: true,
            creator: msg.sender
        });

        for (uint8 i = 0; i < numOpts; i++) {
            proposalOptions[proposalId].push(_options[i]);
        }

        // Initialize encrypted tallies to zero per option
        for (uint8 i = 0; i < numOpts; i++) {
            tallies[proposalId][i] = FHE.asEuint64(0);
            FHE.allowThis(tallies[proposalId][i]);
        }

        emit ProposalCreated(proposalId, _title, numOpts, _deadline, _category);
    }

    /// @notice Cancel a proposal. Creator or ADMIN.
    ///         Allowed if: no votes cast, OR deadline passed and quorum not met.
    function cancelProposal(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        require(p.exists, "Proposal does not exist");
        require(
            p.creator == msg.sender || roles[msg.sender] == Role.ADMIN || msg.sender == owner,
            "Only creator or admin"
        );
        require(!p.isFinalized, "Already finalized");
        require(!p.isCancelled, "Already cancelled");

        // Allow cancel if no votes, OR if deadline passed and quorum not met
        bool noVotes = p.totalVoters == 0;
        bool expiredNoQuorum = block.timestamp >= p.deadline
            && p.quorum > 0
            && p.totalVoters < p.quorum;
        require(noVotes || expiredNoQuorum, "Cannot cancel: votes cast and quorum reachable");

        p.isCancelled = true;
        emit ProposalCancelled(_proposalId);
    }

    /// @notice Extend a proposal deadline. Creator or ADMIN, forward only.
    function extendDeadline(uint256 _proposalId, uint256 _newDeadline) external {
        Proposal storage p = proposals[_proposalId];
        require(p.exists, "Proposal does not exist");
        require(
            p.creator == msg.sender || roles[msg.sender] == Role.ADMIN || msg.sender == owner,
            "Only creator or admin"
        );
        require(!p.isFinalized, "Already finalized");
        require(!p.isCancelled, "Proposal cancelled");
        require(_newDeadline > p.deadline, "New deadline must be after current");

        p.deadline = _newDeadline;
        emit DeadlineExtended(_proposalId, _newDeadline);
    }

    // ─── Voting Functions ───────────────────────────────────────────────

    /// @notice Cast or change your encrypted vote.
    /// @dev encVote encrypts the option index (0-based). The contract uses
    ///      eq + select + add per option to tally without seeing the choice.
    function castVote(
        uint256 _proposalId,
        InEuint64 calldata _encVote
    ) external {
        Proposal storage p = proposals[_proposalId];
        require(p.exists, "Proposal does not exist");
        require(!p.isCancelled, "Proposal cancelled");
        require(block.timestamp < p.deadline, "Voting period has ended");
        require(
            obsToken.lastClaim(msg.sender) > 0,
            "Must hold $OBS (claim daily tokens first)"
        );

        euint64 newVote = FHE.asEuint64(_encVote);
        uint8 numOpts = p.numOptions;

        // Pre-compute constants to save FHE ops
        euint64 one = FHE.asEuint64(1);
        euint64 zero = FHE.asEuint64(0);

        if (hasVoted[_proposalId][msg.sender]) {
            // Revote: subtract old vote from tallies
            euint64 oldVote = voterEncryptedVote[_proposalId][msg.sender];
            for (uint8 i = 0; i < numOpts; i++) {
                ebool wasMatch = FHE.eq(oldVote, FHE.asEuint64(uint256(i)));
                euint64 dec = FHE.select(wasMatch, one, zero);
                tallies[_proposalId][i] = FHE.sub(tallies[_proposalId][i], dec);
            }
            // Add new vote to tallies
            for (uint8 i = 0; i < numOpts; i++) {
                ebool isMatch = FHE.eq(newVote, FHE.asEuint64(uint256(i)));
                euint64 inc = FHE.select(isMatch, one, zero);
                tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], inc);
                FHE.allowThis(tallies[_proposalId][i]);
            }
            emit VoteChanged(_proposalId, msg.sender);
        } else {
            // First vote: add to tallies
            for (uint8 i = 0; i < numOpts; i++) {
                ebool isMatch = FHE.eq(newVote, FHE.asEuint64(uint256(i)));
                euint64 inc = FHE.select(isMatch, one, zero);
                tallies[_proposalId][i] = FHE.add(tallies[_proposalId][i], inc);
                FHE.allowThis(tallies[_proposalId][i]);
            }
            hasVoted[_proposalId][msg.sender] = true;
            p.totalVoters++;
            voterParticipation[msg.sender]++;
            emit VoteCast(_proposalId, msg.sender);
        }

        // Store encrypted vote for revote subtraction + self-verification
        voterEncryptedVote[_proposalId][msg.sender] = newVote;
        FHE.allowThis(newVote);
        FHE.allow(newVote, msg.sender); // Verify My Vote: voter can decrypt own ballot
    }

    // ─── Finalization ───────────────────────────────────────────────────

    /// @notice Finalize after deadline. Quorum must be met (0 = no quorum).
    function finalizeVote(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        require(p.exists, "Proposal does not exist");
        require(!p.isCancelled, "Proposal cancelled");
        require(block.timestamp >= p.deadline, "Voting period not ended");
        require(!p.isFinalized, "Already finalized");
        require(p.quorum == 0 || p.totalVoters >= p.quorum, "Quorum not reached");

        p.isFinalized = true;

        for (uint8 i = 0; i < p.numOptions; i++) {
            FHE.allowPublic(tallies[_proposalId][i]);
        }

        emit VoteFinalized(_proposalId);
    }

    // ─── View Functions ─────────────────────────────────────────────────

    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            string memory title,
            string memory description,
            uint8 numOptions,
            uint256 deadline,
            uint256 quorum,
            uint8 category,
            uint256 totalVoters,
            bool isFinalized,
            bool isCancelled,
            bool exists,
            address creator
        )
    {
        Proposal storage p = proposals[_proposalId];
        return (
            p.title,
            p.description,
            p.numOptions,
            p.deadline,
            p.quorum,
            uint8(p.category),
            p.totalVoters,
            p.isFinalized,
            p.isCancelled,
            p.exists,
            p.creator
        );
    }

    function getProposalOptions(uint256 _proposalId) external view returns (string[] memory) {
        return proposalOptions[_proposalId];
    }

    function getTally(uint256 _proposalId, uint8 _optionIndex) external view returns (euint64) {
        require(_optionIndex < proposals[_proposalId].numOptions, "Invalid option");
        return tallies[_proposalId][_optionIndex];
    }

    function getProposalCount() external view returns (uint256) {
        return nextProposalId;
    }

    /// @notice Voter self-verification: get your own encrypted vote handle.
    ///         Only the voter has FHE permission to decrypt it.
    function getMyVote(uint256 _proposalId) external view returns (euint64) {
        require(hasVoted[_proposalId][msg.sender], "Have not voted");
        return voterEncryptedVote[_proposalId][msg.sender];
    }
}
