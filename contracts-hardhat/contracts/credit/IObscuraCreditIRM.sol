// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice Interest rate model. Inputs are public (utilization is just
///         totalBorrow/totalSupply, both public scalars on the market).
///         Returns are encrypted so the DAO can A/B test curves without
///         leaking the strategy. Frontend reveals via permit when DAO
///         allows.
interface IObscuraCreditIRM {
    /// @return borrowAprBps encrypted borrow APR in bps (0-65535)
    /// @return supplyAprBps encrypted supply APR in bps (0-65535)
    function getRates(uint256 utilizationBps)
        external
        returns (euint64 borrowAprBps, euint64 supplyAprBps);
}
