// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint64, InEuint64 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface ICUSDC {
    function confidentialTransfer(address to, uint256 handle) external returns (bool);
    function confidentialTransferFrom(address from, address to, InEuint64 calldata enc) external returns (bool);
    function confidentialBalanceOf(address) external view returns (uint256);
    function setOperator(address operator, uint48 expiry) external returns (bool);
    function isOperator(address holder, address operator) external view returns (bool);
}

/// Test harness for ObscuraCreditMarket.borrow root-cause investigation.
contract TestPushcUSDC {
    ICUSDC public immutable cUSDC;
    constructor(address _c) { cUSDC = ICUSDC(_c); }

    /// Self-authorize this contract as operator of its own balance.
    function selfAuthOperator(uint48 expiry) external {
        cUSDC.setOperator(address(this), expiry);
    }

    function isSelfOperator() external view returns (bool) {
        return cUSDC.isOperator(address(this), address(this));
    }

    /// Receive a deposit (caller is EOA holder, harness is recipient).
    /// Caller must do cUSDC.confidentialTransferFrom(caller, harness, enc) DIRECTLY before calling pushOut.

    /// Push `amt` cUSDC to `to` using FHE.asEuint64(plaintext) handle.
    function pushOut(address to, uint64 amt) external returns (bool) {
        euint64 h = FHE.asEuint64(amt);
        FHE.allowThis(h);
        FHE.allowTransient(h, address(cUSDC));
        bool ok = cUSDC.confidentialTransfer(to, uint256(euint64.unwrap(h)));
        return ok;
    }

    function balHandle() external view returns (uint256) {
        return cUSDC.confidentialBalanceOf(address(this));
    }
}
