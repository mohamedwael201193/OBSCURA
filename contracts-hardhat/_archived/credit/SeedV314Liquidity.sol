// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint64 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IObscuraConfidentialTokenSeed {
    function claimFaucet() external;
    function confidentialTransfer(address to, uint256 handle) external returns (bool);
    function confidentialBalanceOf(address) external view returns (uint256);
}

interface IObscuraCreditMarketSeed {
    function notifySupply(uint64 amtPlain) external;
}

/// @title SeedV314Liquidity
/// @notice One-shot helper that claims an ocUSDC faucet drip and pushes the
///         entire balance into a target market using the proven two-step
///         pattern (token.confidentialTransfer → market.notifySupply).
///         Intended for v3.14 bootstrap so end-users can borrow immediately
///         without first running a lender flow.
contract SeedV314Liquidity {
    IObscuraConfidentialTokenSeed public immutable token;
    IObscuraCreditMarketSeed     public immutable market;

    constructor(address _token, address _market) {
        token  = IObscuraConfidentialTokenSeed(_token);
        market = IObscuraCreditMarketSeed(_market);
    }

    /// @notice Claim faucet + push `amt` units to the market as supply.
    /// @dev    `amt` must be ≤ the faucet drip already credited to this contract.
    function seed(uint64 amt) external {
        token.claimFaucet();
        euint64 e = FHE.asEuint64(amt);
        FHE.allowThis(e);
        FHE.allowTransient(e, address(token));
        token.confidentialTransfer(address(market), uint256(euint64.unwrap(e)));
        market.notifySupply(amt);
    }
}
