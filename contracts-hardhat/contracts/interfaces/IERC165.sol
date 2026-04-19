// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IERC165 (minimal local copy to avoid an OpenZeppelin dependency)
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
