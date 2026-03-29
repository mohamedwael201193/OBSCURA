// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ObscuraToken — $OBS FHERC20 stub for Wave 1
/// @notice Full FHERC20 implementation deferred to Wave 2.
///         This contract reserves the token identity and provides
///         a minimal encrypted balance framework.
contract ObscuraToken {
    string public constant name = "Obscura Token";
    string public constant symbol = "OBS";
    uint8 public constant decimals = 18;

    address public owner;
    uint256 public totalMinted;

    mapping(address => euint64) private encryptedBalances;

    event Mint(address indexed to);
    event ConfidentialTransfer(address indexed from, address indexed to);

    constructor() {
        owner = msg.sender;
    }

    function mint(address _to, InEuint64 calldata _amount) external {
        require(msg.sender == owner, "Only owner");
        euint64 amount = FHE.asEuint64(_amount);

        if (FHE.isInitialized(encryptedBalances[_to])) {
            encryptedBalances[_to] = FHE.add(encryptedBalances[_to], amount);
        } else {
            encryptedBalances[_to] = amount;
        }

        FHE.allow(encryptedBalances[_to], _to);
        FHE.allowThis(encryptedBalances[_to]);

        totalMinted++;
        emit Mint(_to);
    }

    function balanceOf() external view returns (euint64) {
        require(FHE.isInitialized(encryptedBalances[msg.sender]), "No balance");
        return encryptedBalances[msg.sender];
    }

    function confidentialTransfer(address _to, InEuint64 calldata _amount) external {
        require(FHE.isInitialized(encryptedBalances[msg.sender]), "No balance");

        euint64 amount = FHE.asEuint64(_amount);
        encryptedBalances[msg.sender] = FHE.sub(encryptedBalances[msg.sender], amount);

        if (FHE.isInitialized(encryptedBalances[_to])) {
            encryptedBalances[_to] = FHE.add(encryptedBalances[_to], amount);
        } else {
            encryptedBalances[_to] = amount;
        }

        // ACL for sender's new balance
        FHE.allow(encryptedBalances[msg.sender], msg.sender);
        FHE.allowThis(encryptedBalances[msg.sender]);

        // ACL for recipient's new balance
        FHE.allow(encryptedBalances[_to], _to);
        FHE.allowThis(encryptedBalances[_to]);

        emit ConfidentialTransfer(msg.sender, _to);
    }
}
