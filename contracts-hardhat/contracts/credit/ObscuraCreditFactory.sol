// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditFactory
/// @notice Permissionless market creator. Each `(loanAsset, collateralAsset,
///         oracle, irm, lltvBps)` tuple maps to exactly one CREATE2 market.
///         Governance maintains approved sets for `lltv`, `irm`, `oracle`,
///         `liqBonus`, `liqThreshold`. Adding a value to a set is governance;
///         spinning a market from approved values is permissionless.
contract ObscuraCreditFactory {
    error NotGovernor();
    error NotApproved(string what);
    error AlreadyExists();

    address public governor;

    mapping(uint64  => bool) public isApprovedLLTV;
    mapping(uint64  => bool) public isApprovedLiqBonus;
    mapping(uint64  => bool) public isApprovedLiqThreshold;
    mapping(address => bool) public isApprovedIRM;
    mapping(address => bool) public isApprovedOracle;

    address[] public allMarkets;
    mapping(bytes32 => address) public marketOf;

    event GovernorSet(address indexed governor);
    event LLTVApproved(uint64 lltvBps, bool ok);
    event LiqBonusApproved(uint64 bps, bool ok);
    event LiqThresholdApproved(uint64 bps, bool ok);
    event IRMApproved(address indexed irm, bool ok);
    event OracleApproved(address indexed oracle, bool ok);
    event MarketCreated(
        address indexed market,
        address indexed loanAsset,
        address indexed collateralAsset,
        address oracle,
        address irm,
        uint64  lltvBps,
        uint64  liqBonusBps,
        uint64  liqThresholdBps
    );

    modifier onlyGov() { if (msg.sender != governor) revert NotGovernor(); _; }

    constructor(address _governor) {
        governor = _governor;
    }

    function setGovernor(address _new) external onlyGov { governor = _new; emit GovernorSet(_new); }

    function setApprovedLLTV(uint64 v, bool ok) external onlyGov { isApprovedLLTV[v] = ok; emit LLTVApproved(v, ok); }
    function setApprovedLiqBonus(uint64 v, bool ok) external onlyGov { isApprovedLiqBonus[v] = ok; emit LiqBonusApproved(v, ok); }
    function setApprovedLiqThreshold(uint64 v, bool ok) external onlyGov { isApprovedLiqThreshold[v] = ok; emit LiqThresholdApproved(v, ok); }
    function setApprovedIRM(address v, bool ok) external onlyGov { isApprovedIRM[v] = ok; emit IRMApproved(v, ok); }
    function setApprovedOracle(address v, bool ok) external onlyGov { isApprovedOracle[v] = ok; emit OracleApproved(v, ok); }

    function marketKey(
        address loanAsset, address collateralAsset, address oracle, address irm, uint64 lltvBps
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(loanAsset, collateralAsset, oracle, irm, lltvBps));
    }

    function createMarket(
        address loanAsset,
        address collateralAsset,
        address oracle,
        address irm,
        uint64  lltvBps,
        uint64  liqBonusBps,
        uint64  liqThresholdBps
    ) external returns (address market) {
        if (!isApprovedLLTV[lltvBps]) revert NotApproved("lltv");
        if (!isApprovedLiqBonus[liqBonusBps]) revert NotApproved("liqBonus");
        if (!isApprovedLiqThreshold[liqThresholdBps]) revert NotApproved("liqThreshold");
        if (!isApprovedIRM[irm]) revert NotApproved("irm");
        if (!isApprovedOracle[oracle]) revert NotApproved("oracle");

        bytes32 key = marketKey(loanAsset, collateralAsset, oracle, irm, lltvBps);
        if (marketOf[key] != address(0)) revert AlreadyExists();

        bytes memory bytecode = abi.encodePacked(
            type(ObscuraCreditMarket).creationCode,
            abi.encode(loanAsset, collateralAsset, oracle, irm, lltvBps, liqBonusBps, liqThresholdBps)
        );
        bytes32 salt = key;
        assembly { market := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
        require(market != address(0), "create2");

        marketOf[key] = market;
        allMarkets.push(market);
        emit MarketCreated(market, loanAsset, collateralAsset, oracle, irm, lltvBps, liqBonusBps, liqThresholdBps);
    }

    /// @notice Governance-only: attach the auction engine to a freshly-created market.
    function setMarketAuctionEngine(address market, address engine) external onlyGov {
        ObscuraCreditMarket(market).setAuctionEngine(engine);
    }

    /// @notice Governance-only: register a repay router (StreamHook / InsuranceHook).
    function setMarketRepayRouter(address market, address router, bool ok) external onlyGov {
        ObscuraCreditMarket(market).setRepayRouter(router, ok);
    }

    function allMarketsLength() external view returns (uint256) { return allMarkets.length; }
}
