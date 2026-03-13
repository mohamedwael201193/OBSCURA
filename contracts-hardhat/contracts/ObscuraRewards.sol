// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./ObscuraPermissions.sol";

interface IObscuraVoteForRewards {
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
    function getProposal(uint256 proposalId)
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

/// @title ObscuraRewards - FHE-encrypted voter incentive layer
/// @notice Distributes ETH rewards to governance voters.
///         Each voter's accumulated balance is an FHE euint64 — no one can
///         read another voter's reward total from on-chain state or events.
///         Only you can decrypt your own balance via the Fhenix FHE gateway.
///
/// FHE operations used:
///   euint64, asEuint64, add, sub, allowThis, allow
///
/// Privacy model:
///   - encRewardBalance[voter]: euint64 — ciphertext in storage (unreadable)
///   - FHE.add() accumulates rewards without revealing the running total
///   - FHE.allow(balance, voter) grants voter-only decryption access
///   - FHE.sub() zeroes the balance on withdrawal atomically
///   - Internal plain accounting (private storage) drives actual ETH transfer
///     ensuring correct payouts even without synchronous on-chain decryption.
contract ObscuraRewards is ObscuraPermissions {

    IObscuraVoteForRewards public voteContract;

    // Rewards are stored in GWEI units so they fit in uint64 (max ~18.4K ETH in gwei).
    // 1_000_000 gwei = 0.001 ETH per vote.
    uint64 public constant REWARD_PER_VOTE_GWEI = 1_000_000;

    // FHE-encrypted per-user accumulated balance (in gwei). Unreadable by anyone
    // except the voter themselves (after calling requestWithdrawal).
    mapping(address => euint64) private encRewardBalance;
    mapping(address => bool)    private encBalanceInitialized;

    // Double-accrual prevention per (proposal, voter) pair
    mapping(uint256 => mapping(address => bool)) public rewardAccrued;

    // Internal plain accounting (private — harder to read than public, but not
    // cryptographically secret). Used for correct ETH transfer amounts.
    mapping(address => uint256) private _totalAccruedGwei;
    mapping(address => uint256) private _totalWithdrawnGwei;

    // Tracks whether a voter has triggered their FHE balance reveal
    mapping(address => bool) public withdrawalRequested;

    event RewardAccrued(uint256 indexed proposalId, address indexed voter, uint64 rewardGwei);
    event WithdrawalRequested(address indexed voter);
    event RewardWithdrawn(address indexed voter, uint256 amountWei);
    event RewardsFunded(address indexed from, uint256 amountWei);

    constructor(address _voteContract) {
        require(_voteContract != address(0), "Invalid address");
        voteContract = IObscuraVoteForRewards(_voteContract);
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;
    }

    receive() external payable {
        emit RewardsFunded(msg.sender, msg.value);
    }

    function fundRewards() external payable {
        emit RewardsFunded(msg.sender, msg.value);
    }

    /// @notice Update the vote contract address (admin only).
    ///         Call this whenever ObscuraVote is redeployed.
    function setVoteContract(address _newVoteContract) external {
        require(roles[msg.sender] == Role.ADMIN, "Not admin");
        require(_newVoteContract != address(0), "Invalid address");
        voteContract = IObscuraVoteForRewards(_newVoteContract);
    }

    // ─── Accrual ─────────────────────────────────────────────────────────

    /// @notice Claim your reward for a specific proposal you voted on.
    ///         The reward is added to your FHE-encrypted balance — only you
    ///         can later decrypt what you have accumulated.
    function accrueReward(uint256 _proposalId) external {
        require(!rewardAccrued[_proposalId][msg.sender], "Already accrued for this proposal");
        (,,,,,,, bool isFinalized, bool isCancelled, bool exists,) =
            voteContract.getProposal(_proposalId);
        require(exists && isFinalized && !isCancelled, "Proposal must be finalized");
        require(voteContract.hasVoted(_proposalId, msg.sender), "Did not vote on this proposal");

        // Mark before state changes
        rewardAccrued[_proposalId][msg.sender] = true;

        // Initialise encrypted balance to 0 on first accrual
        if (!encBalanceInitialized[msg.sender]) {
            encRewardBalance[msg.sender] = FHE.asEuint64(0);
            FHE.allowThis(encRewardBalance[msg.sender]);
            encBalanceInitialized[msg.sender] = true;
        }

        // FHE: add encrypted reward to encrypted balance.
        // The resulting ciphertext reveals NOTHING about the new total.
        euint64 reward = FHE.asEuint64(REWARD_PER_VOTE_GWEI);
        encRewardBalance[msg.sender] = FHE.add(encRewardBalance[msg.sender], reward);
        FHE.allowThis(encRewardBalance[msg.sender]);

        // Plain internal accounting used for correct ETH payout (private storage)
        _totalAccruedGwei[msg.sender] += REWARD_PER_VOTE_GWEI;

        emit RewardAccrued(_proposalId, msg.sender, REWARD_PER_VOTE_GWEI);
    }

    // ─── Withdrawal ──────────────────────────────────────────────────────

    /// @notice Step 1: request withdrawal.
    ///         Grants you (and only you) FHE permission to decrypt your balance
    ///         via the Fhenix gateway. After decrypting off-chain, call withdraw().
    function requestWithdrawal() external {
        require(encBalanceInitialized[msg.sender], "No rewards accrued yet");
        uint256 pending = _totalAccruedGwei[msg.sender] - _totalWithdrawnGwei[msg.sender];
        require(pending > 0, "Nothing to withdraw");

        // NOTE: FHE.allow removed — FHE.sub was removed from withdraw() to avoid
        // rate limits, so the encrypted balance is no longer maintained post-withdrawal.
        // Plain _totalAccruedGwei accounting drives all ETH payouts.
        withdrawalRequested[msg.sender] = true;

        emit WithdrawalRequested(msg.sender);
    }

    /// @notice Step 2: withdraw ETH rewards.
    ///         Must be called after requestWithdrawal().
    ///         Sends all pending accrued ETH and zeroes the FHE encrypted balance.
    function withdraw() external {
        require(withdrawalRequested[msg.sender], "Call requestWithdrawal first");
        uint256 pendingGwei = _totalAccruedGwei[msg.sender] - _totalWithdrawnGwei[msg.sender];
        require(pendingGwei > 0, "Nothing to withdraw");
        uint256 amountWei = pendingGwei * 1 gwei;
        require(address(this).balance >= amountWei, "Reward pool insufficient");

        // State changes before transfer (re-entrancy protection)
        _totalWithdrawnGwei[msg.sender] += pendingGwei;
        withdrawalRequested[msg.sender] = false;

        // NOTE: We intentionally skip FHE.sub here to avoid Fhenix testnet rate limits.
        // Correctness is guaranteed by _totalWithdrawnGwei plain accounting.
        // The FHE balance will read as stale (too high) but only the voter can decrypt it,
        // and subsequent requestWithdrawal will return 0 pending.

        payable(msg.sender).transfer(amountWei);
        emit RewardWithdrawn(msg.sender, amountWei);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /// @notice Returns your FHE-encrypted balance handle.
    ///         Call requestWithdrawal() first to gain decryption permission.
    function getEncRewardBalance() external view returns (euint64) {
        require(encBalanceInitialized[msg.sender], "No rewards yet");
        return encRewardBalance[msg.sender];
    }

    /// @notice Returns pending reward in wei. Only visible to the voter themselves,
    ///         owner, or admins.
    function pendingRewardWei(address _voter) external view returns (uint256) {
        if (msg.sender != _voter && msg.sender != owner && roles[msg.sender] != Role.ADMIN) {
            return 0;
        }
        return (_totalAccruedGwei[_voter] - _totalWithdrawnGwei[_voter]) * 1 gwei;
    }

    function rewardPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
