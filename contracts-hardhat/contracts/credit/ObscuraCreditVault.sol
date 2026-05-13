// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditVault
/// @notice Curator-routed FHE vault (MetaMorpho-shaped). Depositors hold
///         encrypted shares (`euint64`) and the curator routes liquidity
///         across approved CreditMarkets respecting per-market caps. Fee
///         is capped at 25% of yield (Morpho convention) and accrues to
///         `feeRecipient` (defaults to ObscuraTreasury at deploy time).
contract ObscuraCreditVault {
    error NotCurator();
    error NotOwner();
    error MarketNotApproved();
    error CapExceeded();

    address public immutable loanAsset;
    address public immutable owner;
    address public curator;
    address public feeRecipient;
    uint16  public feeBps;        // <= 2500

    // Per-vault approved markets + caps (plaintext caps; encrypted balances).
    mapping(address => bool)    public isApprovedMarket;
    mapping(address => uint128) public marketCap;
    address[] public marketsList;

    // Encrypted total shares + per-user shares.
    euint64 private _totalShares;
    mapping(address => euint64) private _shares;
    bool private _initialized;

    // Public scalar mirror for frontend display (sum of plaintext deposits).
    uint128 public publicTotalDeposited;

    event CuratorSet(address indexed curator);
    event FeeSet(uint16 bps, address indexed recipient);
    event MarketApproved(address indexed market, uint128 cap);
    event Deposited(address indexed user);
    event Withdrew(address indexed user);
    event Reallocated(address indexed market, uint128 amount, bool isSupply);

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyCurator() { if (msg.sender != curator) revert NotCurator(); _; }

    constructor(address _loanAsset, address _curator, address _feeRecipient) {
        loanAsset = _loanAsset;
        owner = msg.sender;
        curator = _curator;
        feeRecipient = _feeRecipient;
        feeBps = 1000; // 10%
    }

    function _initOnce() internal {
        if (_initialized) return;
        _totalShares = FHE.asEuint64(uint64(0));
        FHE.allowThis(_totalShares);
        _initialized = true;
    }

    function setCurator(address _new) external onlyOwner { curator = _new; emit CuratorSet(_new); }
    function setFee(uint16 _bps, address _recipient) external onlyOwner {
        require(_bps <= 2500, "fee>25%");
        feeBps = _bps; feeRecipient = _recipient;
        emit FeeSet(_bps, _recipient);
    }

    function approveMarket(address market, uint128 cap) external onlyCurator {
        require(market != address(0), "market");
        require(ObscuraCreditMarket(market).loanAsset() == loanAsset, "loan mismatch");
        if (!isApprovedMarket[market]) { isApprovedMarket[market] = true; marketsList.push(market); }
        marketCap[market] = cap;
        emit MarketApproved(market, cap);
    }

    function _ensureUserShares(address u) internal {
        if (euint64.unwrap(_shares[u]) == bytes32(0)) {
            _shares[u] = FHE.asEuint64(uint64(0)); FHE.allowThis(_shares[u]);
        }
    }

    /// @notice Deposit `amtPlain` cUSDC. Caller must `cUSDC.setOperator(vault)` first.
    function deposit(uint64 amtPlain, InEuint64 calldata encAmt) external {
        _initOnce();
        _ensureUserShares(msg.sender);
        IConfidentialUSDCv2(loanAsset).confidentialTransferFrom(msg.sender, address(this), encAmt);

        // 1:1 share/asset accounting at MVP (no exchange-rate drift modeling
        // until we wire reallocate-yield-back). Curator yield is realized
        // when reallocate withdraws+resupplies returning more than was put.
        euint64 shr = FHE.asEuint64(amtPlain);
        _shares[msg.sender] = FHE.add(_shares[msg.sender], shr);
        _totalShares = FHE.add(_totalShares, shr);
        FHE.allowThis(_shares[msg.sender]); FHE.allow(_shares[msg.sender], msg.sender);
        FHE.allowThis(_totalShares);

        publicTotalDeposited += amtPlain;
        emit Deposited(msg.sender);
    }

    function withdraw(uint64 amtPlain) external {
        _initOnce();
        _ensureUserShares(msg.sender);
        euint64 req = FHE.asEuint64(amtPlain);
        ebool ok = FHE.gte(_shares[msg.sender], req);
        euint64 zero = FHE.asEuint64(uint64(0));
        euint64 actual = FHE.select(ok, req, zero);
        _shares[msg.sender] = FHE.sub(_shares[msg.sender], actual);
        _totalShares = FHE.sub(_totalShares, actual);
        FHE.allowThis(_shares[msg.sender]); FHE.allow(_shares[msg.sender], msg.sender);
        FHE.allowThis(_totalShares);
        FHE.allowThis(actual); FHE.allow(actual, msg.sender);

        FHE.allowTransient(actual, loanAsset);
        IConfidentialUSDCv2(loanAsset).confidentialTransfer(msg.sender, uint256(euint64.unwrap(actual)));

        if (amtPlain <= publicTotalDeposited) publicTotalDeposited -= amtPlain;
        emit Withdrew(msg.sender);
    }

    /// @notice Curator-only: route vault liquidity into an approved market.
    /// @dev Vault must `cUSDC.setOperator(market)` once; that operator
    ///      grant is set by curator via `setOperatorOn`.
    function reallocateSupply(address market, uint64 amtPlain, InEuint64 calldata encAmt) external onlyCurator {
        if (!isApprovedMarket[market]) revert MarketNotApproved();
        if (uint128(amtPlain) > marketCap[market]) revert CapExceeded();
        ObscuraCreditMarket(market).supply(amtPlain, encAmt);
        emit Reallocated(market, amtPlain, true);
    }

    function reallocateWithdraw(address market, uint64 amtPlain) external onlyCurator {
        if (!isApprovedMarket[market]) revert MarketNotApproved();
        ObscuraCreditMarket(market).withdraw(amtPlain);
        emit Reallocated(market, amtPlain, false);
    }

    /// @notice Owner-only: set this vault as cUSDC operator on a target (market).
    function setOperatorOn(address operator, uint48 until) external onlyOwner {
        IConfidentialUSDCv2(loanAsset).setOperator(operator, until);
    }

    function getShares(address u) external view returns (euint64) { return _shares[u]; }
    function getTotalShares() external view returns (euint64) { return _totalShares; }
    function marketsLength() external view returns (uint256) { return marketsList.length; }
}
