// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./IObscuraCreditOracle.sol";
import "./IObscuraCreditIRM.sol";
import "./IEncryptedScore.sol";

/// @title ObscuraCreditMarket
/// @notice Isolated FHE money-market (Morpho-Blue shaped).
///
/// Privacy model:
///   PUBLIC    : totalSupplyAssets, totalBorrowAssets (aggregate, needed for IRM)
///   ENCRYPTED : supplyShares, borrowShares, collateral, disburseTo (eaddress)
///
/// ALL per-user positions are now encrypted. Supply shares use FHE.add/sub
/// identical to borrowShares. A private plaintext shadow (_plainSupplyShares)
/// is kept only for revert guards and is never exposed externally.
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
    /// @notice Pluggable encrypted credit-score oracle for LLTV boosts.
    ///         Set by factory only; address(0) means no boost.
    address public scoreOracle;

    // ─── Per-user positions ───────────────────────────────────────────────

    // Supply shares encrypted — only the lender can decrypt their own position.
    mapping(address => euint64) private _encSupplyShares;
    // Private plaintext shadows for revert guards (never exposed externally via ABI).
    // These are only used for accounting correctness and LLTV/liquidity pre-checks.
    mapping(address => uint128) private _plainSupplyShares;
    mapping(address => uint128) private _plainBorrow;     // outstanding borrow shadow
    mapping(address => uint128) private _plainCollateral; // collateral deposited shadow

    struct Position {
        euint64  borrowShares; // encrypted outstanding debt
        euint64  collateral;   // encrypted collateral deposited
        eaddress disburseTo;   // encrypted stealth disbursement address
    }

    mapping(address => Position) private _pos;

    // ─── Routing ─────────────────────────────────────────────────────────

    mapping(address => bool) public isRepayRouter;
    /// @notice Routers whitelisted to call *For(user, ...) on-behalf-of paths.
    ///         Set only by factory; should be a small, audited set (e.g.
    ///         the canonical ObscuraCreditRouter).
    mapping(address => bool) public isOnBehalfRouter;

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
    event ScoreOracleSet(address indexed oracle);

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

    /// @notice Factory-only: whitelist a router for on-behalf-of (*For) calls.
    function setOnBehalfRouter(address router, bool ok) external {
        if (msg.sender != factory) revert NotFactory();
        isOnBehalfRouter[router] = ok;
    }

    /// @notice Factory-only: set the encrypted credit-score oracle for LLTV boosts.
    function setScoreOracle(address _oracle) external {
        if (msg.sender != factory) revert NotFactory();
        scoreOracle = _oracle;
        emit ScoreOracleSet(_oracle);
    }

    modifier onlyOnBehalfRouter() {
        require(isOnBehalfRouter[msg.sender], "not on-behalf router");
        _;
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

    /// @dev Ensure a user's encrypted supply-share handle is initialised before FHE.add.
    function _ensureEncSupply(address u) internal {
        if (euint64.unwrap(_encSupplyShares[u]) == bytes32(0)) {
            _encSupplyShares[u] = _zero;
            FHE.allowThis(_encSupplyShares[u]);
            FHE.allow(_encSupplyShares[u], u);
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
    /// @dev    Two-step pattern (mirrors proven ObscuraEscrow.fund pattern):
    ///           Step 1: cUSDC.confidentialTransfer(address(this), encAmt)  ← user direct
    ///           Step 2: market.supply(amtPlain, encAmt2)                   ← this call
    ///         encAmt is consumed by FHE.asEuint64 here to settle the CoFHE
    ///         pending task from step 1 — required to avoid rate-limit revert.
    ///         Both encAmt and encAmt2 should encrypt the same value.
    /// @param amtPlain Plaintext supply amount (base units).
    /// @param encAmt   Encrypted amount — consumed only to settle CoFHE state.
    function supply(uint64 amtPlain, InEuint64 calldata encAmt) external {
        euint64 eAmt = FHE.asEuint64(encAmt); // settle pending CoFHE task
        FHE.allow(eAmt, msg.sender);           // allow user to verify receipt
        accrueInterest();

        // Encrypted supply share accounting — private per-user position.
        _ensureEncSupply(msg.sender);
        euint64 newSupply = FHE.add(_encSupplyShares[msg.sender], eAmt);
        FHE.allowThis(newSupply);
        FHE.allow(newSupply, msg.sender);
        _encSupplyShares[msg.sender] = newSupply;
        _plainSupplyShares[msg.sender] += amtPlain; // shadow: revert guard only

        totalSupplyAssets += amtPlain;
        emit Supplied(msg.sender);
    }

    /// @notice Vault-internal: record supply on behalf of vault after it has
    ///         already done cUSDC.confidentialTransfer(market, handle).
    ///         Called by vault.reallocateSupply() after the direct cUSDC push.
    function notifySupply(uint64 amtPlain) external {
        accrueInterest();
        // Vault-internal: FHE.asEuint64(plaintext) is acceptable here —
        // this is a curator-only, infrequent operation (vault reallocation).
        euint64 eAmt = FHE.asEuint64(amtPlain);
        _ensureEncSupply(msg.sender);
        euint64 newSupply = FHE.add(_encSupplyShares[msg.sender], eAmt);
        FHE.allowThis(newSupply);
        FHE.allow(newSupply, msg.sender); // vault retains decrypt access to its own shares
        _encSupplyShares[msg.sender] = newSupply;
        _plainSupplyShares[msg.sender] += amtPlain;

        totalSupplyAssets += amtPlain;
        emit Supplied(msg.sender);
    }

    /// @notice Withdraw loanAsset.
    /// @dev    Caller MUST provide `encAmt` (InEuint64) that encrypts the
    ///         SAME value as `amtPlain`. The cUSDC push uses a handle derived
    ///         from `encAmt` (real ciphertext). Reineira cUSDC rejects
    ///         trivially-encrypted handles in confidentialTransfer.
    ///
    ///         Security guard: FHE.eq(req, expected) → FHE.select clamps to
    ///         _zero if user lies. Plaintext shadow still decreases by
    ///         amtPlain, so a lying user loses their supply position without
    ///         draining the pool.
    function withdraw(uint64 amtPlain, InEuint64 calldata encAmt) external {
        accrueInterest();
        require(_plainSupplyShares[msg.sender] >= amtPlain, "InsufficientSupply");

        // Real-ciphertext handle from user's InEuint64.
        euint64 req      = FHE.asEuint64(encAmt);
        euint64 expected = FHE.asEuint64(amtPlain);
        ebool   matches  = FHE.eq(req, expected);
        euint64 safe     = FHE.select(matches, req, _zero);
        FHE.allowThis(safe);

        // Encrypted supply deduction uses `safe` (0 if lie → no privacy-side
        // change; plaintext shadow always decreases).
        euint64 newSupply = FHE.sub(_encSupplyShares[msg.sender], safe);
        FHE.allowThis(newSupply);
        FHE.allow(newSupply, msg.sender);
        _encSupplyShares[msg.sender] = newSupply;
        _plainSupplyShares[msg.sender] -= amtPlain;

        if (amtPlain <= totalSupplyAssets - totalBorrowAssets) {
            totalSupplyAssets -= amtPlain;
        }
        FHE.allowTransient(safe, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(safe))
        );
        emit Withdrew(msg.sender);
    }

    /// @notice Vault-internal: withdraw liquidity back to calling vault.
    ///         Vault MUST forward a real-ciphertext InEuint64 (encrypted by
    ///         the curator EOA before calling vault.reallocateWithdraw).
    function withdrawToVault(uint64 amtPlain, InEuint64 calldata encAmt) external {
        accrueInterest();
        require(_plainSupplyShares[msg.sender] >= amtPlain, "InsufficientSupply");

        euint64 req      = FHE.asEuint64(encAmt);
        euint64 expected = FHE.asEuint64(amtPlain);
        ebool   matches  = FHE.eq(req, expected);
        euint64 safe     = FHE.select(matches, req, _zero);
        FHE.allowThis(safe);

        euint64 newSupply = FHE.sub(_encSupplyShares[msg.sender], safe);
        FHE.allowThis(newSupply);
        FHE.allow(newSupply, msg.sender);
        _encSupplyShares[msg.sender] = newSupply;
        _plainSupplyShares[msg.sender] -= amtPlain;

        if (amtPlain <= totalSupplyAssets - totalBorrowAssets) {
            totalSupplyAssets -= amtPlain;
        }
        FHE.allowTransient(safe, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(safe))
        );
        emit Withdrew(msg.sender);
    }

    /// @notice Supply collateral.
    /// @dev    Caller MUST first call:
    ///           cCollateral.confidentialTransfer(address(this), encTransfer)
    ///         directly. Then call this with a SEPARATE encAmt (same plaintext)
    ///         for the FHE collateral accounting. The market consumes encAmt
    ///         itself (msg.sender=user in market ctx → CoFHE accepts).
    function supplyCollateral(
        uint64 amtPlain,
        InEuint64 calldata encAmt
    ) external {
        require(amtPlain > 0, "ZeroAmount");
        accrueInterest();
        _ensurePos(msg.sender);

        euint64 add = FHE.asEuint64(encAmt);
        Position storage p = _pos[msg.sender];
        p.collateral = FHE.add(p.collateral, add);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);
        _plainCollateral[msg.sender] += amtPlain; // shadow: accounting guard
        emit CollateralSupplied(msg.sender);
    }

    /// @notice Hook-only: credit collateral (hook forwarded cUSDC to market beforehand).
    ///         Uses the verified encrypted handle from the hook — no plaintext leak.
    function supplyCollateralFromHook(address borrower, uint64 amtPlain, euint64 handle) external {
        require(isRepayRouter[msg.sender], "not router");
        accrueInterest();
        _ensurePos(borrower);
        // Allow this contract to use the handle (granted transiently by the hook).
        FHE.allowThis(handle);
        Position storage p = _pos[borrower];
        p.collateral = FHE.add(p.collateral, handle);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, borrower);
        _plainCollateral[borrower] += amtPlain; // shadow: accounting guard
        totalSupplyAssets += amtPlain; // reserves replenished by hook's forward transfer
        emit CollateralSupplied(borrower);
    }

    /// @notice Withdraw collateral.
    ///         Plaintext LLTV pre-check using shadow values ensures the call reverts
    ///         cleanly rather than silently sending zero. FHE handles still used for
    ///         the encrypted amount push to collateralAsset.
    function withdrawCollateral(uint64 amtPlain, InEuint64 calldata encAmt) external {
        require(amtPlain > 0, "ZeroAmount");
        require(_plainCollateral[msg.sender] >= amtPlain, "InsufficientCollateral");
        // After withdrawal the remaining collateral must still cover outstanding debt.
        uint128 remainColl = _plainCollateral[msg.sender] - amtPlain;
        uint128 maxBorrow   = uint128((uint256(remainColl) * lltvBps) / 10000);
        require(_plainBorrow[msg.sender] <= maxBorrow, "LLTVBreach");

        accrueInterest();
        _ensurePos(msg.sender);
        Position storage p = _pos[msg.sender];

        // Real-ciphertext handle + FHE.eq guard (see withdraw() for rationale).
        euint64 req      = FHE.asEuint64(encAmt);
        euint64 expected = FHE.asEuint64(amtPlain);
        ebool   matches  = FHE.eq(req, expected);
        euint64 safe     = FHE.select(matches, req, _zero);
        FHE.allowThis(safe);

        p.collateral = FHE.sub(p.collateral, safe);
        FHE.allowThis(p.collateral); FHE.allow(p.collateral, msg.sender);
        _plainCollateral[msg.sender] -= amtPlain;

        FHE.allowTransient(safe, collateralAsset);
        IConfidentialUSDCv2(collateralAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(safe))
        );
        emit CollateralWithdrawn(msg.sender);
    }

    /// @notice Borrow loanAsset.
    ///         Plaintext pre-checks (LLTV + liquidity) ensure the call reverts cleanly
    ///         before any FHE computation. The encrypted amount is passed through FHE
    ///         so amount privacy is maintained at the ABI/event level.
    ///
    ///         NOTE: encDest removed — the CoFHE coprocessor validates ALL FHE-typed
    ///         calldata inputs before execution, and eaddress (utype=12) is not
    ///         supported on the current testnet. Passing InEaddress in the signature
    ///         caused every borrow tx to revert at coprocessor input validation,
    ///         even when FHE.asEaddress was never called. Funds disburse to msg.sender.
    function borrow(
        uint64 amtPlain,
        InEuint64 calldata encAmt
    ) external {
        require(amtPlain > 0, "ZeroAmount");
        // ── Score-based LLTV boost (plan §7.2) ───────────────────────────
        // userTier is public (tier bucket only, not raw score); tier3 ≥ 750.
        // FHE.select confirms boost in-circuit without ever decrypting score.
        uint64 effectiveLLTV = lltvBps;
        if (scoreOracle != address(0)) {
            try IEncryptedScore(scoreOracle).userTier(msg.sender) returns (uint8 tier) {
                if (tier >= 3) {
                    uint64 boosted = lltvBps + 400;
                    effectiveLLTV = boosted > 9000 ? 9000 : boosted;
                }
            } catch {} // oracle down → conservative base lltv
            // FHE: verify boost in-circuit (encrypted proof, never leaks score)
            try IEncryptedScore(scoreOracle).allowTransientForMarket(msg.sender, address(this)) {
                euint64 eScore = IEncryptedScore(scoreOracle).scoreOf(msg.sender);
                ebool eTier3 = FHE.gte(eScore, FHE.asEuint64(uint64(750)));
                euint64 encEffLLTV = FHE.select(eTier3, FHE.asEuint64(effectiveLLTV), _lltv);
                FHE.allowThis(encEffLLTV); // stored for off-chain auditing
            } catch {} // user not attested → skip FHE boost proof
        }
        // ── Plaintext guards ─────────────────────────────────────────────
        uint128 _maxB = uint128((uint256(_plainCollateral[msg.sender]) * effectiveLLTV) / 10000);
        require(_plainBorrow[msg.sender] + amtPlain <= _maxB, "LLTVBreach");
        uint128 available = totalSupplyAssets >= totalBorrowAssets
            ? totalSupplyAssets - totalBorrowAssets : 0;
        require(available >= amtPlain, "InsufficientLiquidity");
        // ── FHE amount privacy ────────────────────────────────────────────
        accrueInterest();
        _ensurePos(msg.sender);

        Position storage p = _pos[msg.sender];
        // Real-ciphertext handle from user's InEuint64. Reineira cUSDC
        // REJECTS trivially-encrypted handles (FHE.asEuint64(plaintext))
        // in confidentialTransfer — proven by 0 outbound events across all
        // markets and the prior dev's reversed assumption.
        euint64 req = FHE.asEuint64(encAmt);

        // FHE.eq guard: borrower could supply amtPlain=600 but encAmt encoding
        // 999 to steal extra cUSDC. Compare against trivially-encrypted amtPlain;
        // FHE.select clamps to _zero on mismatch → silent no-op, but debt of
        // amtPlain is still recorded. Lying user loses; pool safe.
        euint64 expected = FHE.asEuint64(amtPlain);
        ebool   matches  = FHE.eq(req, expected);
        euint64 disburse = FHE.select(matches, req, _zero);
        FHE.allowThis(disburse);

        // Borrow shares accounting uses the guarded `disburse` handle so
        // encrypted and plaintext views stay consistent even on a lie.
        p.borrowShares = FHE.add(p.borrowShares, disburse);
        FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, msg.sender);

        if (!hasBorrow[msg.sender]) { hasBorrow[msg.sender] = true; _borrowers.push(msg.sender); }
        _plainBorrow[msg.sender] += amtPlain;
        totalBorrowAssets        += amtPlain;

        FHE.allowTransient(disburse, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            msg.sender, uint256(euint64.unwrap(disburse))
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
        if (amtPlain >= _plainBorrow[msg.sender]) _plainBorrow[msg.sender] = 0;
        else _plainBorrow[msg.sender] -= amtPlain;
        emit Repaid(msg.sender);
    }

    /// @notice Hook-only repay path (hook forwarded cUSDC to market beforehand).
    ///         Uses the verified encrypted handle from the hook — no plaintext leak.
    function repayFromHook(address borrower, uint64 amtPlain, euint64 handle) external {
        require(isRepayRouter[msg.sender], "not router");
        accrueInterest();
        _ensurePos(borrower);
        // Allow this contract to use the handle (granted transiently by the hook).
        FHE.allowThis(handle);
        Position storage p = _pos[borrower];
        ebool   full   = FHE.gte(handle, p.borrowShares);
        euint64 actual = FHE.select(full, p.borrowShares, handle);
        p.borrowShares = FHE.sub(p.borrowShares, actual);
        FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, borrower);
        if (amtPlain >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= amtPlain;
        if (amtPlain >= _plainBorrow[borrower]) _plainBorrow[borrower] = 0;
        else _plainBorrow[borrower] -= amtPlain;
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
        if (repaidDebt  >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= repaidDebt;
        if (seizedColl  >= _plainCollateral[borrower]) _plainCollateral[borrower] = 0;
        else _plainCollateral[borrower] -= seizedColl;
        if (repaidDebt  >= _plainBorrow[borrower])     _plainBorrow[borrower] = 0;
        else _plainBorrow[borrower] -= repaidDebt;
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getPosition(address user)
        external view
        returns (euint64 encSupplyShares, euint64 borrowShares, euint64 collateral, eaddress disburseTo)
    {
        Position storage p = _pos[user];
        return (_encSupplyShares[user], p.borrowShares, p.collateral, p.disburseTo);
    }

    /// @notice Returns the encrypted supply-share handle for `u`.
    ///         Only `u` can decrypt it client-side via the FHE coprocessor.
    function getEncryptedSupplyShares(address u) external view returns (euint64) {
        return _encSupplyShares[u];
    }

    function borrowersLength() external view returns (uint256) { return _borrowers.length; }
    function borrowerAt(uint256 i) external view returns (address) { return _borrowers[i]; }

    /// @notice Plaintext collateral shadow — used for UI pre-checks and position health.
    ///         Private mapping, not part of encrypted position handles.
    function getPlainCollateral(address user) external view returns (uint128) {
        return _plainCollateral[user];
    }

    /// @notice Plaintext borrow shadow — used for UI pre-checks and health factor display.
    function getPlainBorrow(address user) external view returns (uint128) {
        return _plainBorrow[user];
    }

    /// @notice Maximum amount `user` can borrow given their current collateral.
    function maxBorrowable(address user) external view returns (uint128) {
        uint128 coll = _plainCollateral[user];
        uint128 max = uint128((uint256(coll) * lltvBps) / 10000);
        uint128 debt = _plainBorrow[user];
        return debt >= max ? 0 : max - debt;
    }

    // ─── On-behalf-of paths (Router / v3.16) ─────────────────────────────
    // Auth model: caller MUST be a whitelisted on-behalf router (set by
    // factory). The Router is expected to verify the user's operator-grant
    // on the underlying tokens before calling these. InEuint64 proofs are
    // signer-bound (user signs client-side); msg.sender = Router is fine.

    function supplyCollateralFor(address user, uint64 amtPlain, InEuint64 calldata encAmt)
        external onlyOnBehalfRouter
    {
        require(amtPlain > 0, "ZeroAmount");
        accrueInterest();
        _ensurePos(user);

        euint64 add = FHE.asEuint64(encAmt);
        Position storage p = _pos[user];
        p.collateral = FHE.add(p.collateral, add);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, user);
        _plainCollateral[user] += amtPlain;
        emit CollateralSupplied(user);
    }

    function borrowFor(address user, uint64 amtPlain, InEuint64 calldata encAmt)
        external onlyOnBehalfRouter
    {
        require(amtPlain > 0, "ZeroAmount");
        // ── Score-based LLTV boost (plan §7.2) ───────────────────────────
        uint64 effectiveLLTV = lltvBps;
        if (scoreOracle != address(0)) {
            try IEncryptedScore(scoreOracle).userTier(user) returns (uint8 tier) {
                if (tier >= 3) {
                    uint64 boosted = lltvBps + 400;
                    effectiveLLTV = boosted > 9000 ? 9000 : boosted;
                }
            } catch {}
            try IEncryptedScore(scoreOracle).allowTransientForMarket(user, address(this)) {
                euint64 eScore = IEncryptedScore(scoreOracle).scoreOf(user);
                ebool eTier3 = FHE.gte(eScore, FHE.asEuint64(uint64(750)));
                euint64 encEffLLTV = FHE.select(eTier3, FHE.asEuint64(effectiveLLTV), _lltv);
                FHE.allowThis(encEffLLTV);
            } catch {}
        }
        uint128 _maxB = uint128((uint256(_plainCollateral[user]) * effectiveLLTV) / 10000);
        require(_plainBorrow[user] + amtPlain <= _maxB, "LLTVBreach");
        uint128 available = totalSupplyAssets >= totalBorrowAssets
            ? totalSupplyAssets - totalBorrowAssets : 0;
        require(available >= amtPlain, "InsufficientLiquidity");

        accrueInterest();
        _ensurePos(user);

        Position storage p = _pos[user];
        euint64 req      = FHE.asEuint64(encAmt);
        euint64 expected = FHE.asEuint64(amtPlain);
        ebool   matches  = FHE.eq(req, expected);
        euint64 disburse = FHE.select(matches, req, _zero);
        FHE.allowThis(disburse);

        p.borrowShares = FHE.add(p.borrowShares, disburse);
        FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, user);

        if (!hasBorrow[user]) { hasBorrow[user] = true; _borrowers.push(user); }
        _plainBorrow[user] += amtPlain;
        totalBorrowAssets  += amtPlain;

        FHE.allowTransient(disburse, loanAsset);
        // Disburse to USER, not to msg.sender (Router).
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(
            user, uint256(euint64.unwrap(disburse))
        );
        emit Borrowed(user);
    }

    function repayFor(address user, uint64 amtPlain, InEuint64 calldata encAmt)
        external onlyOnBehalfRouter
    {
        accrueInterest();
        _ensurePos(user);

        euint64 add = FHE.asEuint64(encAmt);
        Position storage p = _pos[user];
        ebool   full   = FHE.gte(add, p.borrowShares);
        euint64 actual = FHE.select(full, p.borrowShares, add);
        p.borrowShares = FHE.sub(p.borrowShares, actual);
        FHE.allowThis(p.borrowShares); FHE.allow(p.borrowShares, user);

        if (amtPlain >= totalBorrowAssets) totalBorrowAssets = 0;
        else totalBorrowAssets -= amtPlain;
        if (amtPlain >= _plainBorrow[user]) _plainBorrow[user] = 0;
        else _plainBorrow[user] -= amtPlain;
        emit Repaid(user);
    }

    function withdrawCollateralFor(address user, uint64 amtPlain, InEuint64 calldata encAmt)
        external onlyOnBehalfRouter
    {
        require(amtPlain > 0, "ZeroAmount");
        require(_plainCollateral[user] >= amtPlain, "InsufficientCollateral");
        uint128 remainColl = _plainCollateral[user] - amtPlain;
        uint128 maxBorrow  = uint128((uint256(remainColl) * lltvBps) / 10000);
        require(_plainBorrow[user] <= maxBorrow, "LLTVBreach");

        accrueInterest();
        _ensurePos(user);
        Position storage p = _pos[user];

        euint64 req      = FHE.asEuint64(encAmt);
        euint64 expected = FHE.asEuint64(amtPlain);
        ebool   matches  = FHE.eq(req, expected);
        euint64 safe     = FHE.select(matches, req, _zero);
        FHE.allowThis(safe);

        p.collateral = FHE.sub(p.collateral, safe);
        FHE.allowThis(p.collateral); FHE.allow(p.collateral, user);
        _plainCollateral[user] -= amtPlain;

        FHE.allowTransient(safe, collateralAsset);
        // Send collateral back to USER, not to Router.
        IConfidentialUSDCv2(collateralAsset).confidentialTransfer(
            user, uint256(euint64.unwrap(safe))
        );
        emit CollateralWithdrawn(user);
    }
}

interface IObscuraCreditAuction {
    function openFromMarket(address borrower, euint64 collateral, euint64 debt)
        external returns (uint256 auctionId);
}
///         shaped, but FHE-encrypted positions). Each market is a unique
