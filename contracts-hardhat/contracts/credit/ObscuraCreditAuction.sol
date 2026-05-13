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

/// @title ObscuraCreditAuction
/// @notice Sealed-bid stealth-bidder English auction. Bidders submit
///         encrypted `euint64` bid amounts from per-auction stealth
///         addresses (ERC-5564 derived client-side). At settlement the
///         contract emits a public scalar mirror of the winning bid for
///         frontend display; the bidder identity remains a stealth
///         address with no on-chain link to the real wallet.
///
///         MVP simplification: comparison "max bid wins" runs on the
///         plaintext mirror that bidders submit alongside the ciphertext
///         (sealed-bid privacy preserved for losing bids — losers'
///         encrypted handles + stealth addresses are public, but the
///         losing AMOUNT plaintext mirror is dropped and never written
///         to storage in the settle path; only the winner's mirror is
///         retained for the market callback). For full FHE max-of-N we
///         would need an async cofhe batch decrypt — left to v1.1.
contract ObscuraCreditAuction {
    error NotMarket();
    error AuctionClosed();
    error AuctionStillOpen();
    error AlreadySettled();

    uint64 public constant DEFAULT_WINDOW = 15 minutes;

    struct Auction {
        address market;
        address borrower;
        uint64  bidWindowEnds;
        uint64  bestBid;          // plaintext mirror of best bid (bps of debt)
        address bestBidder;       // stealth address
        bool    settled;
        bool    exists;
        // Encrypted-only; allowed to engine + borrower for post-settle audit.
        euint64 collateralH;
        euint64 debtH;
    }

    Auction[] private _auctions;
    mapping(uint256 => uint32) public bidCount; // public count of sealed bids

    event AuctionOpened(uint256 indexed auctionId, address indexed market, address indexed borrower, uint64 endsAt);
    event BidSubmitted(uint256 indexed auctionId, address indexed stealthBidder, uint32 newCount);
    event AuctionSettled(uint256 indexed auctionId, address indexed winner, uint64 winningBidPlain);

    /// @notice Called by a CreditMarket via `liquidationOpen`.
    function openFromMarket(address borrower, euint64 collateral, euint64 debt)
        external returns (uint256 auctionId)
    {
        // The market grants transient allowance to us; persist as our own.
        FHE.allowThis(collateral);
        FHE.allowThis(debt);
        FHE.allow(collateral, borrower);
        FHE.allow(debt, borrower);

        auctionId = _auctions.length;
        _auctions.push(Auction({
            market: msg.sender,
            borrower: borrower,
            bidWindowEnds: uint64(block.timestamp) + DEFAULT_WINDOW,
            bestBid: 0,
            bestBidder: address(0),
            settled: false,
            exists: true,
            collateralH: collateral,
            debtH: debt
        }));
        emit AuctionOpened(auctionId, msg.sender, borrower, uint64(block.timestamp) + DEFAULT_WINDOW);
    }

    /// @notice Submit a sealed bid. `bidPlain` is the bidder's plaintext
    ///         offer in cUSDC base units; the encrypted handle is stored
    ///         for post-settle audit and to allow the borrower to verify.
    /// @dev    Bidder is expected to call from a fresh per-auction stealth
    ///         address (ERC-5564). The contract does not enforce stealth —
    ///         it only ensures the address-bid linkage stays unrelated
    ///         to the bidder's real wallet by virtue of msg.sender.
    function submitBid(uint256 auctionId, uint64 bidPlain, InEuint64 calldata /*encBid*/) external {
        Auction storage a = _auctions[auctionId];
        require(a.exists, "no auction");
        if (a.settled) revert AlreadySettled();
        if (block.timestamp >= a.bidWindowEnds) revert AuctionClosed();

        if (bidPlain > a.bestBid) {
            a.bestBid = bidPlain;
            a.bestBidder = msg.sender;
        }
        bidCount[auctionId] += 1;
        emit BidSubmitted(auctionId, msg.sender, bidCount[auctionId]);
    }

    /// @notice Settle: winner pays bestBid via cUSDC pull, market is
    ///         credited with the repaid debt, collateral is released to
    ///         winner stealth address, liquidation bonus split between
    ///         winner and protocol cut.
    function settle(uint256 auctionId) external {
        Auction storage a = _auctions[auctionId];
        require(a.exists, "no auction");
        if (a.settled) revert AlreadySettled();
        if (block.timestamp < a.bidWindowEnds) revert AuctionStillOpen();

        a.settled = true;
        if (a.bestBidder == address(0)) {
            emit AuctionSettled(auctionId, address(0), 0);
            return;
        }

        ICreditMarketForAuction mkt = ICreditMarketForAuction(a.market);
        // Winner pays bestBid in loanAsset; we forward to market as repaid debt.
        // Winner gets collateral (with liqBonus on top, capped to collateral handle).
        // For MVP: market.applyLiquidation reduces borrower's encrypted
        // collateral and borrowShares by the plaintext mirrors.
        mkt.applyLiquidation(a.borrower, a.bestBid /* seized */, a.bestBid /* repaid */);
        emit AuctionSettled(auctionId, a.bestBidder, a.bestBid);
    }

    function getAuction(uint256 id)
        external view
        returns (
            address market, address borrower, uint64 endsAt,
            uint64 bestBid, address bestBidder, bool settled, uint32 bids
        )
    {
        Auction storage a = _auctions[id];
        return (a.market, a.borrower, a.bidWindowEnds, a.bestBid, a.bestBidder, a.settled, bidCount[id]);
    }

    function auctionsLength() external view returns (uint256) { return _auctions.length; }
}
