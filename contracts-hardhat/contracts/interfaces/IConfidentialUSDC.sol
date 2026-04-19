// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title IConfidentialUSDC
/// @notice Minimal local interface for ReineiraOS ConfidentialUSDC (cUSDC) — an FHERC20.
/// @dev We only declare what ObscuraPayStream needs. The deployed cUSDC at
///      `0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f` exposes more.
interface IConfidentialUSDC {
    function approve(address spender, euint64 amount) external returns (bool);
    function confidentialTransfer(address to, euint64 amount) external returns (bool);
    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (bool);
    function balanceOf(address holder) external view returns (euint64);
    function wrap(address to, uint256 amount) external;
    function unwrap(address to, euint64 amount) external;
}
