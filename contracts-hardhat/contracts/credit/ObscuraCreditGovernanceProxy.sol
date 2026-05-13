// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./ObscuraCreditFactory.sol";

/// @title ObscuraCreditGovernanceProxy
/// @notice Bridges ObscuraVote V5 → CreditFactory.governor calls. Treasury
///         timelock executes proxy. Proxy is the only address whitelisted
///         as factory.governor in the deploy script.
contract ObscuraCreditGovernanceProxy {
    error NotTreasury();

    address public immutable treasury;
    ObscuraCreditFactory public immutable factory;

    event Forwarded(bytes4 indexed selector);

    modifier onlyTreasury() { if (msg.sender != treasury) revert NotTreasury(); _; }

    constructor(address _treasury, address _factory) {
        treasury = _treasury;
        factory = ObscuraCreditFactory(_factory);
    }

    function approveLLTV(uint64 v, bool ok) external onlyTreasury { factory.setApprovedLLTV(v, ok); emit Forwarded(this.approveLLTV.selector); }
    function approveLiqBonus(uint64 v, bool ok) external onlyTreasury { factory.setApprovedLiqBonus(v, ok); emit Forwarded(this.approveLiqBonus.selector); }
    function approveLiqThreshold(uint64 v, bool ok) external onlyTreasury { factory.setApprovedLiqThreshold(v, ok); emit Forwarded(this.approveLiqThreshold.selector); }
    function approveIRM(address v, bool ok) external onlyTreasury { factory.setApprovedIRM(v, ok); emit Forwarded(this.approveIRM.selector); }
    function approveOracle(address v, bool ok) external onlyTreasury { factory.setApprovedOracle(v, ok); emit Forwarded(this.approveOracle.selector); }
    function setMarketAuctionEngine(address market, address engine) external onlyTreasury {
        factory.setMarketAuctionEngine(market, engine);
        emit Forwarded(this.setMarketAuctionEngine.selector);
    }
    function setMarketRepayRouter(address market, address router, bool ok) external onlyTreasury {
        factory.setMarketRepayRouter(market, router, ok);
        emit Forwarded(this.setMarketRepayRouter.selector);
    }
}
