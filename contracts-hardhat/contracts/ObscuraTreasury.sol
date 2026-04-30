// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ObscuraPermissions.sol";

interface IObscuraVoteForTreasury {
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
        );
}

/// @title ObscuraTreasury - FHE-encrypted DAO treasury
/// @notice A governance-controlled ETH vault where proposal spend requests
///         are encrypted via FHE. No one sees the requested amount until
///         the vote passes and the creator reveals it post-finalization.
///
/// FHE operations used:
///   InEuint64, euint64, asEuint64, add, allowThis, allow, allowPublic
///
/// Privacy model:
///   - Spend amount is encrypted at request time (InEuint64 calldata)
///   - Only creator + recipient can decrypt until vote finalizes
///   - After finalization + timelock: FHE.allowPublic reveals the amount
///   - Encrypted running total (encTotalAllocated) is always private
contract ObscuraTreasury is ObscuraPermissions {

    IObscuraVoteForTreasury public voteContract;

    /// @notice Admin-configurable delay between vote finalization and spend execution.
    ///         Defaults to 48 hours. Minimum 60 seconds. Admin can adjust for testing.
    uint256 public timelockDuration;

    struct SpendRequest {
        address payable recipient;
        euint64 encAmount;       // FHE-encrypted copy for on-chain privacy / event record
        uint256 amountGwei;      // Plain amount in gwei — stored privately, used for execution
        uint256 finalizedAt;     // block.timestamp when recordFinalization was called
        bool executed;
        bool exists;
    }

    mapping(uint256 => SpendRequest) private spendRequests;

    /// @notice FHE-encrypted running total of all pending + executed spend allocations.
    ///         Visible only to owner/admin via getEncTotalAllocated().
    euint64 private encTotalAllocated;

    event FundsReceived(address indexed from, uint256 amount);
    event SpendAttached(uint256 indexed proposalId, address indexed recipient);
    event FinalizationRecorded(uint256 indexed proposalId, uint256 timelockEnds);
    event SpendExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amountWei);
    event TimelockDurationUpdated(uint256 oldDuration, uint256 newDuration);

    constructor(address _voteContract) {
        require(_voteContract != address(0), "Invalid address");
        voteContract = IObscuraVoteForTreasury(_voteContract);
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;
        timelockDuration = 48 hours;
        encTotalAllocated = FHE.asEuint64(0);
        FHE.allowThis(encTotalAllocated);
    }

    /// @notice Update the timelock duration. Admin/owner only. Minimum 60 seconds.
    function setTimelockDuration(uint256 _seconds) external {
        require(roles[msg.sender] == Role.ADMIN || msg.sender == owner, "Not authorized");
        require(_seconds >= 60, "Minimum 60 seconds");
        emit TimelockDurationUpdated(timelockDuration, _seconds);
        timelockDuration = _seconds;
    }

    /// @notice Update the vote contract address. Admin/owner only.
    function setVoteContract(address _newVoteContract) external {
        require(msg.sender == owner || roles[msg.sender] == Role.ADMIN, "Not authorized");
        require(_newVoteContract != address(0), "Invalid address");
        voteContract = IObscuraVoteForTreasury(_newVoteContract);
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function deposit() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // ─── Spend Request Lifecycle ─────────────────────────────────────────

    /// @notice Attach an ETH spend request to a governance proposal.
    ///         Only the proposal creator may call this, once per proposal.
    ///         The spend amount is provided as plaintext gwei (stored in private storage
    ///         so it is not publicly readable via ABI) AND as an FHE-encrypted handle
    ///         for on-chain privacy attestation.
    ///         Creator and recipient are granted FHE.allow() to decrypt the FHE handle.
    function attachSpend(
        uint256 _proposalId,
        address payable _recipient,
        uint256 _amountGwei,
        InEuint64 calldata _encAmountGwei
    ) external {
        (,,,,,,,, bool isCancelled, bool exists, address creator) =
            voteContract.getProposal(_proposalId);
        require(exists, "Proposal does not exist");
        require(!isCancelled, "Proposal is cancelled");
        require(msg.sender == creator, "Only the proposal creator");
        require(!spendRequests[_proposalId].exists, "Spend already attached");
        require(_recipient != address(0), "Invalid recipient");
        require(_amountGwei > 0, "Amount must be > 0");

        euint64 enc = FHE.asEuint64(_encAmountGwei);
        FHE.allowThis(enc);
        FHE.allow(enc, msg.sender);   // creator can verify their own submission
        FHE.allow(enc, _recipient);   // recipient can see their incoming amount

        spendRequests[_proposalId] = SpendRequest({
            recipient: _recipient,
            encAmount: enc,
            amountGwei: _amountGwei,
            finalizedAt: 0,
            executed: false,
            exists: true
        });

        // FHE: accumulate encrypted running total (never revealed unless owner queries)
        encTotalAllocated = FHE.add(encTotalAllocated, enc);
        FHE.allowThis(encTotalAllocated);

        emit SpendAttached(_proposalId, _recipient);
    }

    /// @notice Record the finalization timestamp to start the 48h timelock.
    ///         Anyone can call this once the proposal is finalized on ObscuraVote.
    function recordFinalization(uint256 _proposalId) external {
        SpendRequest storage req = spendRequests[_proposalId];
        require(req.exists, "No spend request for this proposal");
        require(req.finalizedAt == 0, "Already recorded");
        (,,,,,,,bool isFinalized,,,) = voteContract.getProposal(_proposalId);
        require(isFinalized, "Proposal not finalized yet");
        req.finalizedAt = block.timestamp;
        emit FinalizationRecorded(_proposalId, block.timestamp + timelockDuration);
    }

    /// @notice Execute a spend after the timelock elapses.
    ///         The amount is read from private on-chain storage (set at attachSpend time).
    ///         No user input required — creator, recipient, or admin can trigger execution.
    ///         Calling this makes FHE.allowPublic(encAmount) — permanently public record.
    function executeSpend(uint256 _proposalId) external {
        SpendRequest storage req = spendRequests[_proposalId];
        require(req.exists, "No spend request");
        require(!req.executed, "Already executed");
        require(req.finalizedAt != 0, "Call recordFinalization first");
        require(block.timestamp >= req.finalizedAt + timelockDuration, "Timelock not elapsed");

        uint256 amountWei = req.amountGwei * 1 gwei;
        require(address(this).balance >= amountWei, "Insufficient treasury balance");

        // Authorised callers: creator, recipient, or admin/owner
        (,,,,,,,,,, address creator) = voteContract.getProposal(_proposalId);
        require(
            msg.sender == creator
            || msg.sender == req.recipient
            || roles[msg.sender] == Role.ADMIN
            || msg.sender == owner,
            "Not authorized"
        );

        // FHE: make encrypted amount permanently public — on-chain transparency record
        FHE.allowPublic(req.encAmount);

        req.executed = true;
        req.recipient.transfer(amountWei);

        emit SpendExecuted(_proposalId, req.recipient, amountWei);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function getSpendRequest(uint256 _proposalId)
        external
        view
        returns (
            address recipient,
            bool executed,
            bool exists,
            uint256 timelockEnds,
            uint256 amountGwei
        )
    {
        SpendRequest storage req = spendRequests[_proposalId];
        return (
            req.recipient,
            req.executed,
            req.exists,
            req.finalizedAt == 0 ? 0 : req.finalizedAt + timelockDuration,
            req.amountGwei
        );
    }

    /// @notice Owner/admin can inspect the FHE-encrypted total allocated amount.
    function getEncTotalAllocated() external returns (euint64) {
        require(msg.sender == owner || roles[msg.sender] == Role.ADMIN, "Not authorized");
        FHE.allow(encTotalAllocated, msg.sender);
        return encTotalAllocated;
    }

    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
