// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ObscuraToken — $OBS encrypted token with operator model & daily faucet
/// @notice Any wallet can claim 100 $OBS once every 24 hours for free.
///         Owner can mint arbitrary amounts to any address.
///         Balances are fully encrypted (euint64) — only the holder can decrypt.
///         Operator model (FHERC20): contracts can transfer on behalf of users
///         with time-limited approval via setOperator / confidentialTransferFrom.
contract ObscuraToken {
    string public constant name = "Obscura Token";
    string public constant symbol = "OBS";
    uint8 public constant decimals = 18;

    /// Amount dispensed per daily claim (100 tokens)
    uint64 public constant DAILY_CLAIM_AMOUNT = 100;
    /// Cooldown period: 24 hours
    uint256 public constant CLAIM_COOLDOWN = 24 hours;

    address public owner;
    uint256 public totalMinted;
    uint256 public totalClaims;

    mapping(address => euint64) private encryptedBalances;
    /// Timestamp of last claim per address
    mapping(address => uint256) public lastClaim;

    // ─── Operator Model (FHERC20) ───────────────────────────────────────
    /// @dev operator => holder => expiry timestamp (0 = not approved)
    mapping(address => mapping(address => uint256)) private operatorExpiry;

    event Mint(address indexed to);
    event DailyClaim(address indexed claimant);
    event ConfidentialTransfer(address indexed from, address indexed to);
    event OperatorSet(address indexed holder, address indexed operator, uint256 expiry);

    constructor() {
        owner = msg.sender;
    }

    // ─── Operator Functions ─────────────────────────────────────────────

    /// @notice Approve an operator to transfer on your behalf until `_expiry`.
    /// @param _operator The address to authorize
    /// @param _expiry Unix timestamp when the approval expires (0 to revoke)
    function setOperator(address _operator, uint256 _expiry) external {
        operatorExpiry[_operator][msg.sender] = _expiry;
        emit OperatorSet(msg.sender, _operator, _expiry);
    }

    /// @notice Check if an operator is currently authorized for a holder.
    function isOperator(address _operator, address _holder) external view returns (bool) {
        return operatorExpiry[_operator][_holder] > block.timestamp;
    }

    /// @notice Operator expiry timestamp for a given operator-holder pair.
    function getOperatorExpiry(address _operator, address _holder) external view returns (uint256) {
        return operatorExpiry[_operator][_holder];
    }

    /// @notice Transfer tokens from a holder as an authorized operator.
    /// @param _from The token holder
    /// @param _to The recipient
    /// @param _amount Encrypted transfer amount
    function confidentialTransferFrom(
        address _from,
        address _to,
        InEuint64 calldata _amount
    ) external {
        require(_to != address(0), "Invalid recipient");
        require(
            operatorExpiry[msg.sender][_from] > block.timestamp,
            "Not authorized operator"
        );
        require(FHE.isInitialized(encryptedBalances[_from]), "No balance");

        euint64 amount = FHE.asEuint64(_amount);
        encryptedBalances[_from] = FHE.sub(encryptedBalances[_from], amount);

        FHE.allow(encryptedBalances[_from], _from);
        FHE.allowThis(encryptedBalances[_from]);

        _creditBalance(_to, amount);
        emit ConfidentialTransfer(_from, _to);
    }

    /// @notice Owner mints a custom encrypted amount to any address.
    function mint(address _to, InEuint64 calldata _amount) external {
        require(msg.sender == owner, "Only owner");
        _creditBalance(_to, FHE.asEuint64(_amount));
        totalMinted++;
        emit Mint(_to);
    }

    /// @notice Any wallet claims 100 $OBS — once every 24 hours, no cost.
    function claimDailyTokens() external {
        require(
            block.timestamp >= lastClaim[msg.sender] + CLAIM_COOLDOWN,
            "Already claimed today"
        );
        lastClaim[msg.sender] = block.timestamp;

        euint64 amount = FHE.asEuint64(uint256(DAILY_CLAIM_AMOUNT));
        _creditBalance(msg.sender, amount);

        totalClaims++;
        emit DailyClaim(msg.sender);
    }

    /// @notice Seconds until msg.sender can claim again (0 = can claim now).
    function nextClaimIn() external view returns (uint256) {
        uint256 next = lastClaim[msg.sender] + CLAIM_COOLDOWN;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    /// @notice Read caller's encrypted balance handle for off-chain decryption.
    function balanceOf() external view returns (euint64) {
        require(FHE.isInitialized(encryptedBalances[msg.sender]), "No balance");
        return encryptedBalances[msg.sender];
    }

    /// @notice Encrypted transfer to another address.
    function confidentialTransfer(address _to, InEuint64 calldata _amount) external {
        require(_to != address(0), "Invalid recipient");
        require(FHE.isInitialized(encryptedBalances[msg.sender]), "No balance");

        euint64 amount = FHE.asEuint64(_amount);
        encryptedBalances[msg.sender] = FHE.sub(encryptedBalances[msg.sender], amount);

        FHE.allow(encryptedBalances[msg.sender], msg.sender);
        FHE.allowThis(encryptedBalances[msg.sender]);

        _creditBalance(_to, amount);
        emit ConfidentialTransfer(msg.sender, _to);
    }

    // ─── Internal ───────────────────────────────────────────────────────────

    function _creditBalance(address _to, euint64 _amount) internal {
        if (FHE.isInitialized(encryptedBalances[_to])) {
            encryptedBalances[_to] = FHE.add(encryptedBalances[_to], _amount);
        } else {
            encryptedBalances[_to] = _amount;
        }
        FHE.allow(encryptedBalances[_to], _to);
        FHE.allowThis(encryptedBalances[_to]);
    }
}
