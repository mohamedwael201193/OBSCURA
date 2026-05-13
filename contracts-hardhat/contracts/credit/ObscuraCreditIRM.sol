// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./IObscuraCreditIRM.sol";

/// @title ObscuraCreditIRM
/// @notice Linear-kink interest rate model. Constants are encrypted as
///         `euint64` so the DAO can A/B test curves and only reveal them
///         on demand via `FHE.allowPublic`. Utilization input is public
///         (it's just `totalBorrow/totalSupply`, both already public on
///         the market).
///
///         Curve (in bps):
///           u <= kink: borrowApr = base + slope1 * u / kink
///           u >  kink: borrowApr = base + slope1 + slope2 * (u-kink)/(10000-kink)
///         supplyApr = borrowApr * u / 10000 * (10000 - reserveBps) / 10000
contract ObscuraCreditIRM is IObscuraCreditIRM {
    error NotGovernor();

    address public governor;

    // All bps; stored encrypted.
    euint64 private _baseBps;
    euint64 private _slope1Bps;
    euint64 private _slope2Bps;
    euint64 private _kinkBps;       // public-equivalent stored encrypted to keep one storage shape
    euint64 private _reserveBps;

    // Plaintext mirror used in math because FHE-on-public-utilization stays cheap.
    uint64 public baseBpsP;
    uint64 public slope1BpsP;
    uint64 public slope2BpsP;
    uint64 public kinkBpsP;
    uint64 public reserveBpsP;

    event GovernorSet(address indexed governor);
    event CurveUpdated();
    event CurveRevealed();

    modifier onlyGov() { if (msg.sender != governor) revert NotGovernor(); _; }

    constructor(
        address _governor,
        uint64 _base,
        uint64 _slope1,
        uint64 _slope2,
        uint64 _kink,
        uint64 _reserve
    ) {
        governor = _governor;
        _setCurve(_base, _slope1, _slope2, _kink, _reserve);
    }

    function setGovernor(address _new) external onlyGov {
        governor = _new;
        emit GovernorSet(_new);
    }

    function setCurve(
        uint64 _base,
        uint64 _slope1,
        uint64 _slope2,
        uint64 _kink,
        uint64 _reserve
    ) external onlyGov {
        _setCurve(_base, _slope1, _slope2, _kink, _reserve);
    }

    function revealCurve() external onlyGov {
        FHE.allowPublic(_baseBps);
        FHE.allowPublic(_slope1Bps);
        FHE.allowPublic(_slope2Bps);
        FHE.allowPublic(_kinkBps);
        FHE.allowPublic(_reserveBps);
        emit CurveRevealed();
    }

    function _setCurve(
        uint64 _base,
        uint64 _slope1,
        uint64 _slope2,
        uint64 _kink,
        uint64 _reserve
    ) internal {
        require(_kink > 0 && _kink < 10000, "kink");
        require(_reserve <= 5000, "reserve");
        baseBpsP = _base; slope1BpsP = _slope1; slope2BpsP = _slope2;
        kinkBpsP = _kink; reserveBpsP = _reserve;
        _baseBps    = FHE.asEuint64(_base);    FHE.allowThis(_baseBps);
        _slope1Bps  = FHE.asEuint64(_slope1);  FHE.allowThis(_slope1Bps);
        _slope2Bps  = FHE.asEuint64(_slope2);  FHE.allowThis(_slope2Bps);
        _kinkBps    = FHE.asEuint64(_kink);    FHE.allowThis(_kinkBps);
        _reserveBps = FHE.asEuint64(_reserve); FHE.allowThis(_reserveBps);
        emit CurveUpdated();
    }

    /// @inheritdoc IObscuraCreditIRM
    function getRates(uint256 utilizationBps)
        external
        override
        returns (euint64 borrowAprBps, euint64 supplyAprBps)
    {
        if (utilizationBps > 10000) utilizationBps = 10000;

        uint256 borrow;
        if (utilizationBps <= kinkBpsP) {
            borrow = baseBpsP + (slope1BpsP * utilizationBps) / (kinkBpsP == 0 ? 1 : kinkBpsP);
        } else {
            uint256 over = utilizationBps - kinkBpsP;
            uint256 span = 10000 - kinkBpsP;
            borrow = baseBpsP + slope1BpsP + (slope2BpsP * over) / (span == 0 ? 1 : span);
        }
        if (borrow > type(uint64).max) borrow = type(uint64).max;

        uint256 supply = (borrow * utilizationBps) / 10000;
        supply = (supply * (10000 - reserveBpsP)) / 10000;

        borrowAprBps = FHE.asEuint64(uint64(borrow));
        supplyAprBps = FHE.asEuint64(uint64(supply));
        FHE.allowThis(borrowAprBps);
        FHE.allowThis(supplyAprBps);
        FHE.allowTransient(borrowAprBps, msg.sender);
        FHE.allowTransient(supplyAprBps, msg.sender);
    }
}
