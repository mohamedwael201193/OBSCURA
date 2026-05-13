// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ObscuraCreditScore
/// @notice Cross-app encrypted reputation oracle. Reads public counters
///         from PayStreamV2, AddressBook, Vote, and Escrow contracts and
///         folds them into a single `euint64` score (0-1000). User must
///         permit-decrypt to view; user can `attestForMarket` to disclose
///         the score to a single market for an LLTV boost.
interface IPayStreamScore { function streamCount() external view returns (uint256); }
interface IAddressBookScore { function getContacts(address u) external view returns (uint256[] memory); }
interface IVoteScore { function totalVotesByUser(address u) external view returns (uint256); }

contract ObscuraCreditScore {
    error NotOwner();

    address public immutable owner;
    address public payStream;
    address public addressBook;
    address public voteContract;

    mapping(address => euint64) private _score;
    mapping(address => mapping(address => bool)) public attestedFor; // user => market => bool

    event ScoreUpdated(address indexed user);
    event AttestedForMarket(address indexed user, address indexed market);
    event SourcesSet();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    constructor(address _payStream, address _addressBook, address _vote) {
        owner = msg.sender;
        payStream = _payStream;
        addressBook = _addressBook;
        voteContract = _vote;
    }

    function setSources(address _payStream, address _addressBook, address _vote) external onlyOwner {
        payStream = _payStream; addressBook = _addressBook; voteContract = _vote;
        emit SourcesSet();
    }

    /// @notice Anyone can ping a user's score refresh; reads public scalars
    ///         from source contracts and folds into encrypted score.
    function updateScore(address user) external {
        uint256 streams = 0;
        uint256 contacts = 0;
        uint256 votes = 0;
        if (payStream != address(0)) {
            try IPayStreamScore(payStream).streamCount() returns (uint256 s) { streams = s; } catch {}
        }
        if (addressBook != address(0)) {
            try IAddressBookScore(addressBook).getContacts(user) returns (uint256[] memory cs) { contacts = cs.length; } catch {}
        }
        if (voteContract != address(0)) {
            try IVoteScore(voteContract).totalVotesByUser(user) returns (uint256 v) { votes = v; } catch {}
        }

        // Naive weighted score: bounded contributions.
        uint64 sStreams  = uint64(streams  > 50 ? 50 : streams);   // *5  -> max 250
        uint64 sContacts = uint64(contacts > 50 ? 50 : contacts);  // *3  -> max 150
        uint64 sVotes    = uint64(votes    > 50 ? 50 : votes);     // *4  -> max 200
        uint64 base = 100;                                         // floor
        uint64 raw = base + sStreams * 5 + sContacts * 3 + sVotes * 4; // <= 700
        if (raw > 1000) raw = 1000;

        euint64 e = FHE.asEuint64(raw);
        FHE.allowThis(e);
        FHE.allow(e, user);
        _score[user] = e;
        emit ScoreUpdated(user);
    }

    /// @notice User opts to disclose their score to a specific market for an
    ///         LLTV boost. The market reads `getScoreFor(market, user)` which
    ///         returns the encrypted score iff this attestation exists.
    function attestForMarket(address market) external {
        attestedFor[msg.sender][market] = true;
        FHE.allow(_score[msg.sender], market);
        emit AttestedForMarket(msg.sender, market);
    }

    function getScore(address user) external view returns (euint64) { return _score[user]; }

    function getScoreFor(address market, address user) external view returns (euint64) {
        require(attestedFor[user][market], "no attest");
        return _score[user];
    }
}
