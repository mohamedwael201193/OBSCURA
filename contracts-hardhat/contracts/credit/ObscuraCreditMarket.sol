// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./IObscuraCreditOracle.sol";
import "./IObscuraCreditIRM.sol";

/// @title ObscuraCreditMarket
/// @notice Isolated FHE money-market (Morpho-Blue shaped).
///
/// Privacy model:
///   PUBLIC    : supplyShares, totalSupplyAssets, totalBorrowAssets
///   ENCRYPTED : borrowShares, collateral, disburseTo (eaddress)
///
/// Supply shares are PLAINTEXT (same as Morpho) so the supply side works
/// without FHE.asEuint64(plaintext), which is gas-prohibitive on the
/// Fhenix CoFHE testnet. Borrow positions and collateral remain encrypted
/// — those are the sensitive amounts.
///
/// Pre-computed FHE constants (_zero, _lltv, _basis) are created ONCE in
/// the constructor so every borrow/collateral call avoids runtime
/// FHE.asEuint64(plaintext) calls entirely.
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

    // ─── Pre-computed FHE constants (set once in constructor) ────────────
    // These replace runtime FHE.asEuint64(plaintext) calls which are
    // gas-prohibitive on the Fhenix CoFHE testnet coprocessor.
    euint64 private _zero;  // encrypted 0
    euint64 private _lltv;  // encrypted lltvBps
    euint64 private _basis; // encrypted 10000 (BPS denominator)
    euint64 private _liqT;  // encrypted liqThresholdBps

    // ─── Public scalars ───────────────────────────────────────────────────

    uint128 public totalSupplyAssets;
    uint128 public totalBorrowAssets;
    uint128 public lastAccrualTs;
    mapping(address => bool)    public hasBorrow;
    address[] private _borrowers;

    address public auctionEngine;

    // ─── Per-user positions ───────────────────────────────────────────────

    // Supply shares are plaintext (no FHE.asEuint64 needed for supply/withdraw).
    mapping(address => uint128) public supplyShares;

    struct Position {
        euint64  borrowShares; // encrypted outstanding debt
        euint64  collateral;   // encrypted collateral deposited
        eaddress disburseTo;   // encrypted stealth disbursement address
    }

    mapping(address => Position) private _pos;

    // ─── Routing ─────────────────────────────────────────────────────────

    mapping(address => bool) public isRepayRouter;

    // ─── Events ──────────────────────────────────────────────────────────

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

        loanAsset       = _loanAsset;
        collateralAsset = _collateralAsset;
        oracle          = _oracle;
        irm             = _irm;
        lltvBps         = _lltvBps;
        liqBonusBps     = _liqBonusBps;
        liqThresholdBps = _liqThresholdBps;
        factory         = msg.sender;
        lastAccrualTs   = uint128(block.timestamp);

        // Pre-compute FHE constants — happens ONCE at deploy time so user
        // interactions never call FHE.asEuint64(plaintext).
        _zero  = FHE.asEuint64(uint64(0));       FHE.allowThis(_zero);
        _lltv  = FHE.asEuint64(_lltvBps);         FHE.allowThis(_lltv);
        _basis = FHE.asEuint64(uint64(10000));    FHE.allowThis(_basis);
        _liqT  = FHE.asEuint64(_liqThresholdBps); FHE.allowThis(_liqT);
    }

    function setAuctionEngine(address _engine) external {
        if (msg.sender != factory) revert NotFactory();
        require(auctionEngine == address(0), "set");
        auctionEngine = _engine;
        emit AuctionEngineSet(_engine);
    }

    function setRepayRouter(address router, bool ok) external {
        if (msg.sender != factory) revert NotFactory();
        isRepayRouter[router] = ok;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────

    /// @dev Initialize a borrower's encrypted position using the pre-computed
    ///      zero handle.  Supply shares are plaintext and need no init.
    function _ensurePos(address u) internal {
        Position storage p = _pos[u];
        if (euint64.unwrap(p.borrowShares) == bytes32(0)) {
            p.borrowShares = _zero; FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, u);
            p.collateral   = _zero; FHE.allowThis(p.collateral);   FHE.allow(p.collateral,   u);
        }
    }

    function utilizationBps() public view returns (uint256) {
        if (totalSupplyAssets == 0) return 0;
        uint256 u = (uint256(totalBorrowAssets) * 10000) / uint256(totalSupplyAssets);
        return u > 10000 ? 10000 : u;
    }

    function accrueInterest() public {
        uint256 elapsed = block.timestamp - lastAccrualTs;
        if (elapsed == 0 || totalBorrowAssets == 0) {
            lastAccrualTs = uint128(block.timestamp);
            return;
        }
        uint256 u = utilizationBps();
        uint256 aprBps = 500 + (1500 * u) / 10000;
        uint256 interest = (uint256(totalBorrowAssets) * aprBps * elapsed) / (10000 * 365 days);
        if (interest > 0) {
            totalBorrowAssets += uint128(interest);
            totalSupplyAssets += uint128(interest);
        }
        lastAccrualTs = uint128(block.timestamp);
        emit Accrued(totalBorrowAssets, uint128(block.timestamp));
    }

    // ─── Lender side ─────────────────────────────────────────────────────

    /// @notice Supply loanAsset to the market.
    /// @dev    Caller MUST first call:
    ///           cUSDC.confidentialTransfer(address(this), encAmt)
    ///         directly before calling this. CoFHE rejects InEuint64 proofs
    ///         forwarded through intermediaries. Supply shares are plaintext.
    function supply(uint64 amtPlain) external {
        accrueInterest();
        supplyShares[msg.sender] += amtPlain;
        totalSupplyAssets        += amtPlain;
        emit Supplied(msg.sender);
    }

    /// @notice Vault-internal: record supply on behalf of vault after it has
    ///         already done cUSDC.confidentialTransfer(market, handle).
    ///         Called by vault.reallocateSupply() after the direct cUSDC push.
    function notifySupply(uint64 amtPlain) external {
        accrueInterest();
        supplyShares[msg.sender] += amtPlain;
        totalSupplyAssets        += amtPlain;
        emit Supplied(msg.sender);
    }

    /// @notice Withdraw loanAsset. Market IS the holder so no client InEuint64
    ///         needed. Uses FHE.asEuint64(amtPlain) + FHE.allowTransient push.
    function withdraw(uint64 amtPlain) external {
        accrueInterest();
        require(supplyShares[msg.sender] >= amtPlain, "InsufficientSupply");
        supplyShares[msg.sender] -= amtPlain;
        if (amtPlain <= totalSupplyAssets - totalBorrowAssets) {
            totalSupplyAssets -= amtPlain;
        }
        euint64 handle = FHE.asEuint64(amtPlain);
        FHE.allowTransient(handle, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(handle))
        );
        emit Withdrew(msg.sender);
    }

    /// @notice Vault-internal: withdraw liquidity back to calling vault.
    ///         Market IS the holder. Uses FHE push pattern (no client InEuint64).
    ///         Called by vault.reallocateWithdraw().
    function withdrawToVault(uint64 amtPlain) external {
        accrueInterest();
        require(supplyShares[msg.sender] >= amtPlain, "InsufficientSupply");
        supplyShares[msg.sender] -= amtPlain;
        if (amtPlain <= totalSupplyAssets - totalBorrowAssets) {
            totalSupplyAssets -= amtPlain;
        }
        euint64 handle = FHE.asEuint64(amtPlain);
        FHE.allowTransient(handle, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(handle))
        );
        emit Withdrew(msg.sender);
    }

    // ─── Borrower side ───────────────────────────────────────────────────

    /// @notice Supply collateral.
    /// @dev    Caller MUST first call:
    ///           cCollateral.confidentialTransfer(address(this), encTransfer)
    ///         directly. Then call this with a SEPARATE encAmt (same plaintext)
    ///         for the FHE collateral accounting. The market consumes encAmt
    ///         itself (msg.sender=user in market ctx → CoFHE accepts).
    function supplyCollateral(
        uint64 /*amtPlain*/,
        InEuint64 calldata encAmt
    ) external {
        accrueInterest();
        _ensurePos(msg.sender);

        euint64 add = FHE.asEuint64(encAmt);
        Position storage p = _pos[msg.sender];
        p.collateral = FHE.add(p.collateral, add);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        emit CollateralSupplied(msg.sender);
    }

    /// @notice Hook-only: credit collateral without a pull (hook already moved funds).
    ///         NOTE: uses FHE.asEuint64(plaintext) — only valid when called by
    ///         an approved repay-router hook, not by end-users.
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

    /// @notice Withdraw collateral.
    ///         LLTV check is encrypted via FHE.select (silent fail).
    ///         Uses pre-computed _lltv and _basis — no runtime FHE.asEuint64(plaintext).
    ///         Collateral is returned via confidentialTransfer (push from market).
    function withdrawCollateral(uint64 /*amtPlain*/, InEuint64 calldata encAmt) external {
        accrueInterest();
        _ensurePos(msg.sender);
        Position storage p = _pos[msg.sender];

        euint64 req     = FHE.asEuint64(encAmt);
        euint64 newColl = FHE.sub(p.collateral, req);
        // maxBorrow = newColl * lltvBps / 10000
        euint64 maxBorrow = FHE.div(FHE.mul(newColl, _lltv), _basis);
        ebool ok = FHE.and(FHE.gte(p.collateral, req), FHE.gte(maxBorrow, p.borrowShares));
        euint64 actual = FHE.select(ok, req, _zero);

        p.collateral = FHE.sub(p.collateral, actual);
        FHE.allowThis(p.collateral); FHE.allow(p.collateral, msg.sender);
        FHE.allowThis(actual);       FHE.allow(actual, msg.sender);

        FHE.allowTransient(actual, collateralAsset);
        IConfidentialUSDCv2(collateralAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(actual))
        );
        emit CollateralWithdrawn(msg.sender);
    }

    /// @notice Borrow loanAsset. Silent-fail if LLTV would be breached.
    ///         Uses pre-computed _lltv, _basis, _zero constants.
    function borrow(
        uint64 amtPlain,
        InEuint64  calldata encAmt,
        InEaddress calldata encDest
    ) external {
        accrueInterest();
        _ensurePos(msg.sender);

        Position storage p = _pos[msg.sender];
        euint64  req    = FHE.asEuint64(encAmt);
        eaddress dest   = FHE.asEaddress(encDest);

        euint64 newBorrow = FHE.add(p.borrowShares, req);
        euint64 maxBorrow = FHE.div(FHE.mul(p.collateral, _lltv), _basis);
        ebool   ok     = FHE.lte(newBorrow, maxBorrow);
        euint64 actual = FHE.select(ok, req, _zero);

        p.borrowShares = FHE.add(p.borrowShares, actual);
        p.disburseTo   = dest;
        FHE.allowThis(p.borrowShares);   FHE.allow(p.borrowShares, msg.sender);
        FHE.allowThis(p.disburseTo);     FHE.allow(p.disburseTo,   msg.sender);
        FHE.allowThis(actual);           FHE.allow(actual,          msg.sender);

        if (!hasBorrow[msg.sender]) { hasBorrow[msg.sender] = true; _borrowers.push(msg.sender); }
        totalBorrowAssets += amtPlain;

        FHE.allowTransient(actual, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(actual))
        );
        emit Borrowed(msg.sender);
    }

    /// @notice Repay borrowed cUSDC.
    /// @dev    Caller MUST first call:
    ///           cUSDC.confidentialTransfer(address(this), encTransfer)
    ///         directly. Then call this with a SEPARATE encAmt (same plaintext)
    ///         for FHE borrow accounting. Market consumes encAmt directly
    ///         (msg.sender=user in market ctx → CoFHE accepts).
    function repay(
        uint64 amtPlain,
        InEuint64 calldata encAmt
    ) external {
        accrueInterest();
        _ensurePos(msg.sender);

        euint64 add = FHE.asEuint64(encAmt);
        Position storage p = _pos[msg.sender];
        // Cap repayment at outstanding (silent — full repay if add >= borrowShares).
        ebool   full   = FHE.gte(add, p.borrowShares);
        euint64 actual = FHE.select(full, p.borrowShares, add);
        p.borrowShares = FHE.sub(p.borrowShares, actual);
        FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, msg.sender);

        if (amtPlain >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= amtPlain;
        emit Repaid(msg.sender);
    }

    /// @notice Hook-only repay path (funds already in market).
    function repayFromHook(address borrower, uint64 amtPlain, euint64 /*handle*/) external {
        require(isRepayRouter[msg.sender], "not router");
        accrueInterest();
        _ensurePos(borrower);
        euint64 add = FHE.asEuint64(amtPlain); // hook path uses plaintext
        Position storage p = _pos[borrower];
        ebool   full   = FHE.gte(add, p.borrowShares);
        euint64 actual = FHE.select(full, p.borrowShares, add);
        p.borrowShares = FHE.sub(p.borrowShares, actual);
        FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, borrower);
        if (amtPlain >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= amtPlain;
        emit Repaid(borrower);
    }

    // ─── Liquidation ──────────────────────────────────────────────────────

    function liquidationOpen(address borrower) external returns (uint256 auctionId) {
        require(auctionEngine != address(0), "no engine");
        Position storage p = _pos[borrower];
        FHE.allowTransient(p.collateral,   auctionEngine);
        FHE.allowTransient(p.borrowShares, auctionEngine);
        auctionId = IObscuraCreditAuction(auctionEngine).openFromMarket(
            borrower, p.collateral, p.borrowShares
        );
        emit LiquidationOpened(borrower, auctionId);
    }

    function applyLiquidation(address borrower, uint64 seizedColl, uint64 repaidDebt) external {
        if (msg.sender != auctionEngine) revert NotAuctionEngine();
        Position storage p = _pos[borrower];
        euint64 sc = FHE.asEuint64(seizedColl);
        euint64 rd = FHE.asEuint64(repaidDebt);
        p.collateral   = FHE.sub(p.collateral,   sc); FHE.allowThis(p.collateral);
        p.borrowShares = FHE.sub(p.borrowShares, rd); FHE.allowThis(p.borrowShares);
        if (repaidDebt >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= repaidDebt;
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getPosition(address user)
        external view
        returns (uint128 supplyAmt, euint64 borrowShares, euint64 collateral, eaddress disburseTo)
    {
        Position storage p = _pos[user];
        return (supplyShares[user], p.borrowShares, p.collateral, p.disburseTo);
    }

    function borrowersLength() external view returns (uint256) { return _borrowers.length; }
    function borrowerAt(uint256 i) external view returns (address) { return _borrowers[i]; }
}

interface IObscuraCreditAuction {
    function openFromMarket(address borrower, euint64 collateral, euint64 debt)
        external returns (uint256 auctionId);
}
///         shaped, but FHE-encrypted positions). Each market is a unique
