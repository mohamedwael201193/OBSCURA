// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditInsuranceHook
/// @notice Anti-liquidation top-up. Borrower subscribes with encrypted
///         max-premium per cycle; an off-chain monitor (or anyone)
///         calls `topUp` when health is low. Hook draws cUSDC from
///         borrower (operator approval) and supplies as collateral.
contract ObscuraCreditInsuranceHook {
    error NotOwner();
    error NotActive();

    address public immutable cUSDC;

    struct Sub {
        address borrower;
        address market;
        uint64  perCycle;
        uint64  periodSeconds;
        uint64  lastTopUpAt;
        bool    active;
        bool    exists;
    }
    Sub[] private _subs;
    mapping(address => uint256[]) private _byUser;

    event Subscribed(uint256 indexed subId, address indexed borrower, address indexed market);
    event Cancelled(uint256 indexed subId);
    event ToppedUp(uint256 indexed subId, uint64 amt);

    constructor(address _cUSDC) { cUSDC = _cUSDC; }

    function subscribe(address market, uint64 perCycle, uint64 periodSeconds) external returns (uint256 subId) {
        require(market != address(0) && perCycle > 0 && periodSeconds >= 60, "args");
        subId = _subs.length;
        _subs.push(Sub({
            borrower: msg.sender, market: market, perCycle: perCycle,
            periodSeconds: periodSeconds, lastTopUpAt: 0, active: true, exists: true
        }));
        _byUser[msg.sender].push(subId);
        emit Subscribed(subId, msg.sender, market);
    }

    function cancel(uint256 subId) external {
        Sub storage s = _subs[subId];
        if (!s.exists || s.borrower != msg.sender) revert NotOwner();
        s.active = false;
        emit Cancelled(subId);
    }

    /// @notice Anyone can call to top-up. Operator approval grants auth.
    function topUp(uint256 subId, InEuint64 calldata encAmt) external {
        Sub storage s = _subs[subId];
        if (!s.exists || !s.active) revert NotActive();
        if (s.lastTopUpAt != 0 && block.timestamp < s.lastTopUpAt + s.periodSeconds) return;
        s.lastTopUpAt = uint64(block.timestamp);

        // Pull from borrower into hook, then supplyCollateral to market on borrower's behalf.
        IConfidentialUSDCv2(cUSDC).confidentialTransferFrom(s.borrower, address(this), encAmt);
        ObscuraCreditMarket(s.market).supplyCollateralFromHook(s.borrower, s.perCycle);
        emit ToppedUp(subId, s.perCycle);
    }

    function subsOf(address u) external view returns (uint256[] memory) { return _byUser[u]; }
    function getSub(uint256 id) external view returns (Sub memory) { return _subs[id]; }
}
