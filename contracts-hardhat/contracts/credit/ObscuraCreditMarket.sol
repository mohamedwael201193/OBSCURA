// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./IObscuraCreditOracle.sol";
import "./IObscuraCreditIRM.sol";

/// @title ObscuraCreditMarket
/// @notice The IMMUTABLE isolated FHE money-market primitive (Morpho-Blue
///         shaped, but FHE-encrypted positions). Each market is a unique
///         tuple `(loanAsset, collateralAsset, oracle, irm, lltvBps,
///         liqBonusBps, liqThresholdBps)` deployed via the Factory.
///
///         Privacy model:
///           PUBLIC : totalSupplyAssets, totalBorrowAssets, lastAccrualTs
///           ENCRYPTED: per-user supplyShares, borrowShares, collateral
///                      and stealth disburseTo address (eaddress).
///
///         Silent-fail borrow: the LLTV check is encrypted via FHE.select;
///         unauthorized over-LTV requests receive 0 borrowed. Observers
///         cannot tell from the tx whether the borrower attempted a
///         max-debt reach.
///
///         Asset model: collateralAsset and loanAsset MUST be the same
///         confidential cUSDC at MVP (Reineira cUSDC). The contract is
///         written with a single token address per side so future
///         heterogeneous assets are a swap of the immutables.
contract ObscuraCreditMarket {
    error NotFactory();
    error NotAuctionEngine();
    error WrongCaller();

    // ─── Immutable params ────────────────────────────────────────────────

    address public immutable loanAsset;
    address public immutable collateralAsset;
    address public immutable oracle;
    address public immutable irm;
    uint64  public immutable lltvBps;
    uint64  public immutable liqBonusBps;
    uint64  public immutable liqThresholdBps;
    address public immutable factory;

    // ─── Public scalars (utilization is leak-OK) ─────────────────────────

    uint128 public totalSupplyAssets;
    uint128 public totalBorrowAssets;
    uint128 public lastAccrualTs;
    // Public per-borrower outstanding flag; we keep an *enumerable* borrower
    // list so the auction engine can iterate. The amount is encrypted.
    mapping(address => bool) public hasBorrow;
    address[] private _borrowers;

    // Auction engine — settable once by factory after deploy.
    address public auctionEngine;

    // ─── Per-user encrypted position ─────────────────────────────────────

    struct Position {
        euint64 supplyShares;
        euint64 borrowShares;
        euint64 collateral;
        eaddress disburseTo; // stealth address borrower wants funds sent to
    }

    mapping(address => Position) private _pos;

    // ─── Events (NEVER plaintext amounts) ────────────────────────────────

    event Supplied(address indexed user);
    event Withdrew(address indexed user);
    event CollateralSupplied(address indexed user);
    event CollateralWithdrawn(address indexed user);
    event Borrowed(address indexed user);
    event Repaid(address indexed user);
    event Accrued(uint128 newTotalBorrowAssets, uint128 ts);
    event LiquidationOpened(address indexed borrower, uint256 indexed auctionId);
    event AuctionEngineSet(address indexed engine);

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(
        address _loanAsset,
        address _collateralAsset,
        address _oracle,
        address _irm,
        uint64  _lltvBps,
        uint64  _liqBonusBps,
        uint64  _liqThresholdBps
    ) {
        require(_loanAsset != address(0) && _collateralAsset != address(0), "zero");
        require(_lltvBps > 0 && _lltvBps < 10000, "lltv");
        require(_liqThresholdBps >= _lltvBps && _liqThresholdBps <= 10000, "liqT");
        loanAsset = _loanAsset;
        collateralAsset = _collateralAsset;
        oracle = _oracle;
        irm = _irm;
        lltvBps = _lltvBps;
        liqBonusBps = _liqBonusBps;
        liqThresholdBps = _liqThresholdBps;
        factory = msg.sender;
        lastAccrualTs = uint128(block.timestamp);
    }

    function setAuctionEngine(address _engine) external {
        if (msg.sender != factory) revert NotFactory();
        require(auctionEngine == address(0), "set");
        auctionEngine = _engine;
        emit AuctionEngineSet(_engine);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _ensurePos(address u) internal {
        Position storage p = _pos[u];
        if (euint64.unwrap(p.supplyShares) == bytes32(0)) {
            p.supplyShares = FHE.asEuint64(uint64(0)); FHE.allowThis(p.supplyShares);
            p.borrowShares = FHE.asEuint64(uint64(0)); FHE.allowThis(p.borrowShares);
            p.collateral   = FHE.asEuint64(uint64(0)); FHE.allowThis(p.collateral);
        }
    }

    function utilizationBps() public view returns (uint256) {
        if (totalSupplyAssets == 0) return 0;
        uint256 u = (uint256(totalBorrowAssets) * 10000) / uint256(totalSupplyAssets);
        return u > 10000 ? 10000 : u;
    }

    /// @notice Accrue interest using public utilization × elapsed time.
    ///         Borrow APR is applied to totalBorrowAssets; supply APR is
    ///         tracked implicitly because supply shares appreciate as
    ///         totalSupplyAssets stays fixed against a growing borrow side.
    function accrueInterest() public {
        uint256 elapsed = block.timestamp - lastAccrualTs;
        if (elapsed == 0 || totalBorrowAssets == 0) {
            lastAccrualTs = uint128(block.timestamp);
            return;
        }
        // Read PUBLIC bps mirror from IRM directly via low-level call to baseBpsP/etc.
        // To stay decoupled, we instead compute a fixed conservative APR from
        // utilization at the contract level: 5% base + 15% slope at 100% util.
        uint256 u = utilizationBps();
        uint256 aprBps = 500 + (1500 * u) / 10000;
        uint256 interest = (uint256(totalBorrowAssets) * aprBps * elapsed) / (10000 * 365 days);
        if (interest > 0) {
            totalBorrowAssets += uint128(interest);
            totalSupplyAssets += uint128(interest); // suppliers earn the interest
        }
        lastAccrualTs = uint128(block.timestamp);
        emit Accrued(totalBorrowAssets, uint128(block.timestamp));
    }

    // ─── Lender side ─────────────────────────────────────────────────────

    /// @notice Supply loanAsset. Caller must `cUSDC.setOperator(market)` first.
    /// @param amtPlain plaintext mirror used for public-share accounting.
    /// @param encAmt encrypted amount that gets pulled via cUSDC.
    function supply(uint64 amtPlain, InEuint64 calldata encAmt) external {
        accrueInterest();
        _ensurePos(msg.sender);

        // Pull confidential funds.
        IConfidentialUSDCv2(loanAsset).confidentialTransferFrom(msg.sender, address(this), encAmt);

        // Update encrypted shares.
        euint64 add = FHE.asEuint64(amtPlain);
        Position storage p = _pos[msg.sender];
        p.supplyShares = FHE.add(p.supplyShares, add);
        FHE.allowThis(p.supplyShares);
        FHE.allow(p.supplyShares, msg.sender);

        totalSupplyAssets += amtPlain;
        emit Supplied(msg.sender);
    }

    function withdraw(uint64 amtPlain) external {
        accrueInterest();
        Position storage p = _pos[msg.sender];

        // Cap silently against current shares.
        euint64 req = FHE.asEuint64(amtPlain);
        ebool canPull = FHE.gte(p.supplyShares, req);
        euint64 zero = FHE.asEuint64(uint64(0));
        euint64 actual = FHE.select(canPull, req, zero);
        p.supplyShares = FHE.sub(p.supplyShares, actual);
        FHE.allowThis(p.supplyShares);
        FHE.allow(p.supplyShares, msg.sender);
        FHE.allowThis(actual);
        FHE.allow(actual, msg.sender);

        FHE.allowTransient(actual, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(msg.sender, uint256(euint64.unwrap(actual)));

        // Public scalar: trust the requested amount; under-reporting hurts caller only.
        if (amtPlain <= totalSupplyAssets - totalBorrowAssets) {
            totalSupplyAssets -= amtPlain;
        }
        emit Withdrew(msg.sender);
    }

    // ─── Borrower side ───────────────────────────────────────────────────

    function supplyCollateral(uint64 amtPlain, InEuint64 calldata encAmt) external {
        accrueInterest();
        _ensurePos(msg.sender);
        IConfidentialUSDCv2(collateralAsset).confidentialTransferFrom(msg.sender, address(this), encAmt);
        euint64 add = FHE.asEuint64(amtPlain);
        Position storage p = _pos[msg.sender];
        p.collateral = FHE.add(p.collateral, add);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        emit CollateralSupplied(msg.sender);
    }

    /// @notice Hook-only: credit `borrower` collateral after the hook has
    ///         already moved cUSDC into this market. No second transfer.
    function supplyCollateralFromHook(address borrower, uint64 amtPlain) external {
        require(isRepayRouter[msg.sender], "not router");
        accrueInterest();
        _ensurePos(borrower);
        euint64 add = FHE.asEuint64(amtPlain);
        Position storage p = _pos[borrower];
        p.collateral = FHE.add(p.collateral, add);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, borrower);
        emit CollateralSupplied(borrower);
    }

    function withdrawCollateral(uint64 amtPlain) external {
        accrueInterest();
        Position storage p = _pos[msg.sender];

        // After-withdrawal HF gate (silent fail).
        euint64 req = FHE.asEuint64(amtPlain);
        euint64 newColl = FHE.sub(p.collateral, req);
        // Allowed iff newColl * lltv >= borrowShares (encrypted ge).
        euint64 lltv = FHE.asEuint64(uint64(lltvBps));
        euint64 maxBorrow = FHE.div(FHE.mul(newColl, lltv), FHE.asEuint64(uint64(10000)));
        ebool ok = FHE.and(FHE.gte(p.collateral, req), FHE.gte(maxBorrow, p.borrowShares));
        euint64 zero = FHE.asEuint64(uint64(0));
        euint64 actual = FHE.select(ok, req, zero);
        p.collateral = FHE.sub(p.collateral, actual);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        FHE.allowThis(actual);
        FHE.allow(actual, msg.sender);

        FHE.allowTransient(actual, collateralAsset);
        IConfidentialUSDCv2(collateralAsset).confidentialTransfer(msg.sender, uint256(euint64.unwrap(actual)));
        emit CollateralWithdrawn(msg.sender);
    }

    /// @notice Borrow loanAsset against deposited collateral. Silent-fail
    ///         on LLTV breach; observer cannot distinguish max-debt reach
    ///         from a happy borrow.
    /// @param amtPlain  plaintext mirror used to update public scalar
    /// @param encAmt    encrypted amount (must equal amtPlain at user)
    /// @param encDest   stealth disbursement address (eaddress)
    function borrow(uint64 amtPlain, InEuint64 calldata encAmt, InEaddress calldata encDest) external {
        accrueInterest();
        _ensurePos(msg.sender);

        Position storage p = _pos[msg.sender];
        euint64 req = FHE.asEuint64(encAmt);
        eaddress dest = FHE.asEaddress(encDest);

        // newBorrow = borrowShares + req
        euint64 newBorrow = FHE.add(p.borrowShares, req);
        // maxBorrow = collateral * lltv / 10000
        euint64 lltv = FHE.asEuint64(uint64(lltvBps));
        euint64 maxBorrow = FHE.div(FHE.mul(p.collateral, lltv), FHE.asEuint64(uint64(10000)));
        ebool ok = FHE.lte(newBorrow, maxBorrow);
        euint64 zero = FHE.asEuint64(uint64(0));
        euint64 actual = FHE.select(ok, req, zero);
        p.borrowShares = FHE.add(p.borrowShares, actual);
        p.disburseTo = dest;
        FHE.allowThis(p.borrowShares);
        FHE.allow(p.borrowShares, msg.sender);
        FHE.allowThis(p.disburseTo);
        FHE.allow(p.disburseTo, msg.sender);
        FHE.allowThis(actual);
        FHE.allow(actual, msg.sender);

        // Disburse to caller (stealth disbursement is enforced client-side
        // by the borrower using a stealth wallet to call this fn). The
        // eaddress lives on-chain as audit trail only.
        FHE.allowTransient(actual, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(msg.sender, uint256(euint64.unwrap(actual)));

        if (!hasBorrow[msg.sender]) { hasBorrow[msg.sender] = true; _borrowers.push(msg.sender); }
        // Public scalar: assume request honored (silent-fail observers see
        // the same scalar move; under-reporting rotates back through accrue).
        totalBorrowAssets += amtPlain;
        emit Borrowed(msg.sender);
    }

    function repay(uint64 amtPlain, InEuint64 calldata encAmt) external {
        accrueInterest();
        _ensurePos(msg.sender);
        IConfidentialUSDCv2(loanAsset).confidentialTransferFrom(msg.sender, address(this), encAmt);
        euint64 add = FHE.asEuint64(amtPlain);
        Position storage p = _pos[msg.sender];
        // Cap repayment at outstanding (silent).
        ebool full = FHE.gte(add, p.borrowShares);
        euint64 actual = FHE.select(full, p.borrowShares, add);
        p.borrowShares = FHE.sub(p.borrowShares, actual);
        FHE.allowThis(p.borrowShares);
        FHE.allow(p.borrowShares, msg.sender);
        if (amtPlain >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= amtPlain;
        emit Repaid(msg.sender);
    }

    /// @notice Hook-only repay path. Funds are assumed delivered to this
    ///         market via the supplied handle (sender is a known repay
    ///         router contract — the StreamHook or InsuranceHook). No
    ///         second cUSDC pull; we just credit the borrower's position.
    mapping(address => bool) public isRepayRouter;
    function setRepayRouter(address router, bool ok) external {
        if (msg.sender != factory) revert NotFactory();
        isRepayRouter[router] = ok;
    }
    function repayFromHook(address borrower, uint64 amtPlain, euint64 /*handle*/) external {
        require(isRepayRouter[msg.sender], "not router");
        accrueInterest();
        _ensurePos(borrower);
        euint64 add = FHE.asEuint64(amtPlain);
        Position storage p = _pos[borrower];
        ebool full = FHE.gte(add, p.borrowShares);
        euint64 actual = FHE.select(full, p.borrowShares, add);
        p.borrowShares = FHE.sub(p.borrowShares, actual);
        FHE.allowThis(p.borrowShares);
        FHE.allow(p.borrowShares, borrower);
        if (amtPlain >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= amtPlain;
        emit Repaid(borrower);
    }

    // ─── Liquidation handoff ─────────────────────────────────────────────

    /// @notice Anyone can call. Hands the borrower's encrypted collateral
    ///         + outstanding debt to the auction engine, which runs the
    ///         sealed-bid auction. The HF check is done off-chain by the
    ///         caller; if the auction settles to nobody (because HF was
    ///         actually fine), no harm done — collateral returns home.
    function liquidationOpen(address borrower) external returns (uint256 auctionId) {
        require(auctionEngine != address(0), "no engine");
        Position storage p = _pos[borrower];
        // Allow auction engine to consume both handles.
        FHE.allowTransient(p.collateral, auctionEngine);
        FHE.allowTransient(p.borrowShares, auctionEngine);

        auctionId = IObscuraCreditAuction(auctionEngine).openFromMarket(
            borrower, p.collateral, p.borrowShares
        );
        emit LiquidationOpened(borrower, auctionId);
    }

    /// @notice Engine-only callback after settlement.
    function applyLiquidation(address borrower, uint64 seizedColl, uint64 repaidDebt) external {
        if (msg.sender != auctionEngine) revert NotAuctionEngine();
        Position storage p = _pos[borrower];
        euint64 sc = FHE.asEuint64(seizedColl);
        euint64 rd = FHE.asEuint64(repaidDebt);
        p.collateral   = FHE.sub(p.collateral, sc);   FHE.allowThis(p.collateral);
        p.borrowShares = FHE.sub(p.borrowShares, rd); FHE.allowThis(p.borrowShares);
        if (repaidDebt >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= repaidDebt;
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getPosition(address user)
        external view
        returns (euint64 supplyShares, euint64 borrowShares, euint64 collateral, eaddress disburseTo)
    {
        Position storage p = _pos[user];
        return (p.supplyShares, p.borrowShares, p.collateral, p.disburseTo);
    }

    function borrowersLength() external view returns (uint256) { return _borrowers.length; }
    function borrowerAt(uint256 i) external view returns (address) { return _borrowers[i]; }
}

interface IObscuraCreditAuction {
    function openFromMarket(address borrower, euint64 collateral, euint64 debt)
        external returns (uint256 auctionId);
}
