// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

// IConfidentialUSDCv2
//
// Correct local interface for the deployed ReineiraOS cUSDC at
// 0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f (Arbitrum Sepolia 421614).
//
// The deployed cUSDC was compiled with `euint64 = uint256` (older SDK), while
// our cofhe-contracts uses `type euint64 is bytes32`. Solidity's ABI encoder
// treats user-defined types by their underlying type, so calling
// `confidentialTransferFrom(address,address,euint64)` from our code generates
// selector 0xeb3155b5 (bytes32 underlying) which does NOT exist on cUSDC.
// The deployed token exposes:
//   - confidentialTransferFrom(address,address,uint256)         0xca49d7cd
//   - confidentialTransferFrom(address,address,InEuint64)       0x7edb0e7d
//   - confidentialTransfer(address,uint256)                     0xfe3f670d
//   - confidentialTransfer(address,(uint256,uint8,uint8,bytes)) 0xa794ee95
// This interface uses `uint256` for handle params so the generated selectors
// match the deployed bytecode.
interface IConfidentialUSDCv2 {
    // ── Operator / view ─────────────────────────────────────────────────
    function setOperator(address operator, uint48 until) external;
    function isOperator(address holder, address spender) external view returns (bool);
    function confidentialBalanceOf(address account) external view returns (uint256);

    // ── Inbound (we use this in escrow.fund) ────────────────────────────
    /// @dev Selector 0x7edb0e7d — InEuint64 overload. The deployed cUSDC
    ///      DOES NOT expose the (address,address,uint256) handle overload
    ///      (selector 0xca49d7cd) — only this InEuint64 overload exists.
    ///      The escrow forwards the raw user-supplied InEuint64 directly.
    function confidentialTransferFrom(
        address from,
        address to,
        InEuint64 calldata amount
    ) external returns (bool);

    // ── Outbound (we use this in escrow.redeem / cancel) ────────────────
    /// @dev Selector 0xfe3f670d — handle overload.
    function confidentialTransfer(address to, uint256 amount) external returns (bool);
}
