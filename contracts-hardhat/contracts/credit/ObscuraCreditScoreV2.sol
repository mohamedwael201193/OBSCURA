// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./IEncryptedScore.sol";

/// @title ObscuraCreditScoreV2
/// @notice Wave-5 fix: cross-app encrypted reputation oracle with CORRECT
///         per-user adapter interfaces. v1 (deployed at 0xA83a...) silently
///         fell through `try/catch` on AddressBook + Vote because the
///         interface signatures did not exist on the live contracts.
///
///         v2 reads:
///           Pay   : PayStreamV2.streamsByEmployer(user).length     (per-user)
///           Book  : AddressBook.listContactIds(user).length        (per-user)
///           Vote  : Vote.voterParticipation(user)                  (per-user)
///
///         All three exist on the live Arbitrum-Sepolia contracts. Score
///         is recomputed lazily on demand (anyone can call `updateScore`).
///
///         Privacy model identical to v1:
///           - raw score: `euint64` 100-1000, only user can decrypt, market
///             gets transient ACL on attest.
///           - tier: plaintext bucket 0-3 (gates LLTV boost step), not raw.
interface IPayStreamV2Score {
    function streamsByEmployer(address employer) external view returns (uint256[] memory);
}
interface IAddressBookV2Score {
    function listContactIds(address owner) external view returns (uint256[] memory);
}
interface IVoteV2Score {
    function voterParticipation(address user) external view returns (uint256);
}

contract ObscuraCreditScoreV2 is IEncryptedScore {
    error NotOwner();
    error NotMarket();

    address public immutable owner;
    address public payStream;
    address public addressBook;
    address public voteContract;

    /// @dev Markets allowed to call `bumpFromMarket` for lazy refresh on
    ///      first-touch (supply/borrow). Set by owner.
    mapping(address => bool) public isAuthorizedMarket;

    mapping(address => euint64) private _score;
    mapping(address => mapping(address => bool)) public attestedFor; // user => market => bool
    /// @notice Plaintext tier bucket (0-3) derived from raw score at update.
    mapping(address => uint8) public override userTier;
    /// @notice Last update block timestamp (public, anti-spam meta).
    mapping(address => uint64) public lastUpdate;

    event ScoreUpdated(address indexed user, uint8 tier);
    event AttestedForMarket(address indexed user, address indexed market);
    event SourcesSet(address payStream, address addressBook, address voteContract);
    event MarketAuthorized(address indexed market, bool ok);

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    constructor(address _payStream, address _addressBook, address _vote) {
        owner        = msg.sender;
        payStream    = _payStream;
        addressBook  = _addressBook;
        voteContract = _vote;
    }

    function setSources(address _payStream, address _addressBook, address _vote) external onlyOwner {
        payStream    = _payStream;
        addressBook  = _addressBook;
        voteContract = _vote;
        emit SourcesSet(_payStream, _addressBook, _vote);
    }

    function setAuthorizedMarket(address market, bool ok) external onlyOwner {
        isAuthorizedMarket[market] = ok;
        emit MarketAuthorized(market, ok);
    }

    /// @notice Permissionless: refresh `user`'s score from public per-user counters.
    function updateScore(address user) public {
        uint256 streams  = 0;
        uint256 contacts = 0;
        uint256 votes    = 0;

        if (payStream != address(0)) {
            try IPayStreamV2Score(payStream).streamsByEmployer(user) returns (uint256[] memory arr) {
                streams = arr.length;
            } catch {}
        }
        if (addressBook != address(0)) {
            try IAddressBookV2Score(addressBook).listContactIds(user) returns (uint256[] memory arr) {
                contacts = arr.length;
            } catch {}
        }
        if (voteContract != address(0)) {
            try IVoteV2Score(voteContract).voterParticipation(user) returns (uint256 v) {
                votes = v;
            } catch {}
        }

        // Per-user clamps (anti-grind): contacts capped lower because adding
        // contacts costs ~1 calldata-tx; votes capped at 30 because casting
        // a vote requires holding $OBS + a live proposal.
        uint64 sStreams  = uint64(streams  > 50 ? 50 : streams);     // *5  -> max 250
        uint64 sContacts = uint64(contacts > 20 ? 20 : contacts);    // *3  -> max  60
        uint64 sVotes    = uint64(votes    > 30 ? 30 : votes);       // *8  -> max 240

        uint64 base = 100;                                           // floor
        uint64 raw  = base + sStreams * 5 + sContacts * 3 + sVotes * 8; // <= 650
        if (raw > 1000) raw = 1000;

        euint64 e = FHE.asEuint64(raw);
        FHE.allowThis(e);
        FHE.allow(e, user);
        _score[user] = e;

        uint8 tier;
        if      (raw >= 750) tier = 3;
        else if (raw >= 600) tier = 2;
        else if (raw >= 300) tier = 1;
        else                 tier = 0;
        userTier[user]   = tier;
        lastUpdate[user] = uint64(block.timestamp);

        emit ScoreUpdated(user, tier);
    }

    /// @notice Authorized market lazy-pings score refresh on first touch.
    function bumpFromMarket(address user) external {
        if (!isAuthorizedMarket[msg.sender]) revert NotMarket();
        updateScore(user);
    }

    /// @notice User opts-in to disclose their score to a specific market.
    function attestForMarket(address market) external {
        attestedFor[msg.sender][market] = true;
        // Permanent allow so the market can read the handle in any future tx.
        FHE.allow(_score[msg.sender], market);
        emit AttestedForMarket(msg.sender, market);
    }

    // ─── IEncryptedScore ──────────────────────────────────────────────────

    function scoreOf(address user) external view override returns (euint64) {
        return _score[user];
    }

    /// @dev Markets call this each borrow/liquidation to refresh transient
    ///      ACL. Reverts if user has not attested for this market.
    function allowTransientForMarket(address user, address market) external override {
        require(attestedFor[user][market], "no attest");
        FHE.allowTransient(_score[user], market);
    }
}
