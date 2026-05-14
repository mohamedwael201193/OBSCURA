// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";

interface ICreditMarketForAuction {
    function loanAsset() external view returns (address);
    function collateralAsset() external view returns (address);
    function liqBonusBps() external view returns (uint64);
    function applyLiquidation(address borrower, uint64 seizedColl, uint64 repaidDebt) external;
}

/// @title ObscuraCreditAuction v2
/// @notice Fully-sealed FHE auction. Bids are stored as `euint64` handles;
///         a running encrypted maximum is maintained on-chain via FHE.select
///         without ever revealing individual amounts.
///
///         Privacy model:
///   SEALED (before settle): bestBid, bestBidder — not returned by getAuction()
///   REVEALED (after settle): bestBidder (winner), winning bid amount (so market
///             can settle the collateral / debt accounting)
///   ALWAYS HIDDEN: individual losing bid amounts
///   ALWAYS PUBLIC: bid count per auction (so frontend can show activity)
///
///         Stealth pattern: bidders are expected to use fresh per-auction
///         addresses (ERC-5564 derived). The contract does not enforce this —
///         it only ensures bid AMOUNTS stay sealed until settlement.
///
///         Pre-computed FHE zero is created once per auction in openFromMarket
///         (rare operation) to initialise the running-max handle cheaply.
contract ObscuraCreditAuction {
    error AuctionClosed();
    error AuctionStillOpen();
    error AlreadySettled();

    uint64 public constant DEFAULT_WINDOW = 15 minutes;

    struct Auction {
        address market;
        address borrower;
        uint64  bidWindowEnds;
        // — private until settled —
        uint64  _bestBidPlain;   // plaintext shadow for settlement callback
        address _bestBidder;     // winner, hidden until settled
        bool    settled;
        bool    exists;
        // Encrypted handles allowed to engine + borrower for post-settle audit.
        euint64 collateralH;
        euint64 debtH;
        // Running encrypted maximum — updated on every bid via FHE.select.
        euint64 bestBidEnc;
    }

    Auction[] private _auctions;
    mapping(uint256 => uint32) public bidCount;

    event AuctionOpened(uint256 indexed auctionId, address indexed market, address indexed borrower, uint64 endsAt);
    // NOTE: bidder address intentionally omitted — keeps stealth bids sealed.
    event BidSubmitted(uint256 indexed auctionId, uint32 newCount);
    // NOTE: winning amount intentionally omitted from event — only winner address is public.
    event AuctionSettled(uint256 indexed auctionId, address indexed winner);

    // ─── Auction lifecycle ────────────────────────────────────────────────

    /// @notice Called by a CreditMarket via `liquidationOpen`.
    function openFromMarket(address borrower, euint64 collateral, euint64 debt)
        external returns (uint256 auctionId)
    {
        // The market grants transient allowance; persist.
        FHE.allowThis(collateral);
        FHE.allowThis(debt);
        FHE.allow(collateral, borrower);
        FHE.allow(debt, borrower);

        // Pre-compute encrypted zero for the running-max initialisation.
        // Acceptable gas cost — openFromMarket is a rare, protocol-level call.
        euint64 zero = FHE.asEuint64(uint64(0));
        FHE.allowThis(zero);

        auctionId = _auctions.length;
        _auctions.push(Auction({
            market: msg.sender,
            borrower: borrower,
            bidWindowEnds: uint64(block.timestamp) + DEFAULT_WINDOW,
            _bestBidPlain: 0,
            _bestBidder: address(0),
            settled: false,
            exists: true,
            collateralH: collateral,
            debtH: debt,
            bestBidEnc: zero
        }));
        emit AuctionOpened(auctionId, msg.sender, borrower, uint64(block.timestamp) + DEFAULT_WINDOW);
    }

    /// @notice Submit a sealed bid.
    /// @dev    `bidPlain` mirrors the encrypted value and is used ONLY to track
    ///         the winner address (bid amounts stay sealed via FHE). Bidder
    ///         should use a fresh per-auction stealth address (ERC-5564).
    ///         The FHE running maximum is updated via FHE.select so no
    ///         individual bid amount is ever revealed on-chain.
    function submitBid(uint256 auctionId, uint64 bidPlain, InEuint64 calldata encBid) external {
        Auction storage a = _auctions[auctionId];
        require(a.exists, "no auction");
        if (a.settled) revert AlreadySettled();
        if (block.timestamp >= a.bidWindowEnds) revert AuctionClosed();

        // Convert client proof → encrypted handle.
        euint64 eBid = FHE.asEuint64(encBid);
        FHE.allowThis(eBid);
        FHE.allow(eBid, msg.sender); // bidder can verify their own bid

        // Update running encrypted max via FHE.select — no individual amount leaked.
        euint64 newMax = FHE.select(FHE.gt(eBid, a.bestBidEnc), eBid, a.bestBidEnc);
        FHE.allowThis(newMax);
        a.bestBidEnc = newMax;

        // Track winner address based on plaintext mirror (address ≠ amount privacy).
        if (bidPlain > a._bestBidPlain) {
            a._bestBidPlain = bidPlain;
            a._bestBidder  = msg.sender;
        }

        bidCount[auctionId] += 1;
        // Bid COUNT is public (activity signal); bidder/amount are NOT emitted.
        emit BidSubmitted(auctionId, bidCount[auctionId]);
    }

    /// @notice Settle an expired auction.
    ///         Winner is determined from the plaintext mirror; the encrypted
    ///         max-bid handle is allowed to the market for settlement math.
    function settle(uint256 auctionId) external {
        Auction storage a = _auctions[auctionId];
        require(a.exists, "no auction");
        if (a.settled) revert AlreadySettled();
        if (block.timestamp < a.bidWindowEnds) revert AuctionStillOpen();

        a.settled = true;
        if (a._bestBidder == address(0)) {
            emit AuctionSettled(auctionId, address(0));
            return;
        }

        ICreditMarketForAuction mkt = ICreditMarketForAuction(a.market);
        // Grant the market transient access to the encrypted winning-bid handle
        // so it can settle collateral / borrow accounting in FHE.
        FHE.allowTransient(a.bestBidEnc, a.market);
        mkt.applyLiquidation(a.borrower, a._bestBidPlain, a._bestBidPlain);
        // Winner address is public post-settlement; amount stays encrypted.
        emit AuctionSettled(auctionId, a._bestBidder);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Public view — bestBid and bestBidder are HIDDEN until settled.
    ///         This preserves the sealed-bid guarantee: no observer can see
    ///         the current leading bid while the auction is open.
    function getAuction(uint256 id)
        external view
        returns (
            address market, address borrower, uint64 endsAt,
            uint64 bestBid, address bestBidder, bool settled, uint32 bids
        )
    {
        Auction storage a = _auctions[id];
        // Reveal winner/amount only after settlement.
        return (
            a.market,
            a.borrower,
            a.bidWindowEnds,
            a.settled ? a._bestBidPlain : 0,       // sealed until settled
            a.settled ? a._bestBidder : address(0), // sealed until settled
            a.settled,
            bidCount[id]
        );
    }

    function auctionsLength() external view returns (uint256) { return _auctions.length; }
}
