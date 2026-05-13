// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice Minimal oracle surface: returns price of `asset` denominated in
///         a common quote unit (1e18 fixed-point USD), as an euint64
///         re-encryption of the public feed value (or a true confidential
///         price for OTC assets). Markets call this each accrual to derive
///         encrypted health-factor checks.
interface IObscuraCreditOracle {
    function priceOf(address asset) external returns (euint64);
}
