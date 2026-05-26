// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IEntryPointV07.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title ObscuraPaymaster — ERC-4337 v0.7 sponsoring paymaster for Obscura Pay
/// @notice Sponsors gas for whitelisted Obscura contracts on behalf of users.
///
/// @dev 4-layer defense against abuse:
///   1. Target whitelist — only calls to approved Obscura contracts are sponsored.
///   2. Per-user rate limit — max N sponsored ops per user per period.
///   3. Global daily cap — max ETH expenditure per day across all users.
///   4. Optional signature gate — owner can require an ECDSA counter-signature
///      on each UserOp for allowlisted campaigns (toggleable).
///
/// @dev Withdrawal: governance (owner) can withdraw deposited ETH at any time.
///      Governance is initially the deployer; can be transferred via `transferGovernance`.
///
/// @dev Security: `validatePaymasterUserOp` only called by EntryPoint.
///      `postOp` only called by EntryPoint.
///      `withdraw` only callable by governance.
contract ObscuraPaymaster is IPaymaster {
    using ECDSA for bytes32;

    // ─── Constants ────────────────────────────────────────────────────────────
    address public constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    uint256 public constant RATE_LIMIT_PERIOD = 1 days;
    bytes4 private constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,uint256,bytes)"));
    bytes4 private constant EXECUTE_BATCH_SELECTOR = bytes4(keccak256("executeBatch(address[],uint256[],bytes[])"));
    /// @notice Max sponsored ops per user per RATE_LIMIT_PERIOD
    uint256 public constant MAX_OPS_PER_USER_PER_PERIOD = 20;
    /// @notice Max global ETH spend per day (wei)
    uint256 public constant GLOBAL_DAILY_CAP = 0.1 ether;

    // ─── Storage ──────────────────────────────────────────────────────────────
    address public governance;
    address public pendingGovernance;

    /// @notice Whitelisted call targets (Obscura contract addresses)
    mapping(address => bool) public whitelistedTargets;

    /// @notice Signature gate: if true, each UserOp must carry a governance counter-signature.
    bool public sigGateEnabled;
    /// @notice Signer for the optional signature gate
    address public sigGateSigner;

    // Rate limiting per user
    struct UserRateInfo {
        uint128 periodStart;
        uint128 opsConsumed;
    }
    mapping(address => UserRateInfo) private _userRate;

    // Global daily cap
    uint256 public dailyEthSpent;
    uint256 public dailyPeriodStart;

    // ─── Events ───────────────────────────────────────────────────────────────
    event TargetWhitelisted(address indexed target, bool enabled);
    event GovernanceTransferProposed(address indexed proposed);
    event GovernanceTransferred(address indexed newGovernance);
    event SigGateUpdated(bool enabled, address signer);
    event Deposited(uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error NotEntryPoint();
    error NotGovernance();
    error TargetNotWhitelisted(address target);
    error RateLimitExceeded(address user);
    error GlobalCapExceeded();
    error InvalidSigGate();
    error ZeroAddress();

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyEntryPoint() {
        if (msg.sender != ENTRY_POINT) revert NotEntryPoint();
        _;
    }

    modifier onlyGovernance() {
        if (msg.sender != governance) revert NotGovernance();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @param _governance  Initial governance address (deployer typically).
    constructor(address _governance) {
        if (_governance == address(0)) revert ZeroAddress();
        governance = _governance;
        dailyPeriodStart = block.timestamp;
    }

    // ─── Deposit ──────────────────────────────────────────────────────────────
    receive() external payable {
        IEntryPointV07(ENTRY_POINT).depositTo{value: msg.value}(address(this));
        emit Deposited(msg.value);
    }

    // ─── IPaymaster ───────────────────────────────────────────────────────────
    /// @inheritdoc IPaymaster
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        // ── Layer 1: target whitelist ─────────────────────────────────────────
        // Supports both execute(target,value,data) and executeBatch(targets,values,datas).
        _requireWhitelistedTargets(userOp.callData);

        // ── Layer 2: per-user rate limit ──────────────────────────────────────
        address user = userOp.sender;
        UserRateInfo storage rate = _userRate[user];
        if (block.timestamp > uint256(rate.periodStart) + RATE_LIMIT_PERIOD) {
            rate.periodStart = uint128(block.timestamp);
            rate.opsConsumed = 0;
        }
        if (rate.opsConsumed >= MAX_OPS_PER_USER_PER_PERIOD) {
            revert RateLimitExceeded(user);
        }

        // ── Layer 3: global daily cap ─────────────────────────────────────────
        if (block.timestamp > dailyPeriodStart + 1 days) {
            dailyPeriodStart = block.timestamp;
            dailyEthSpent = 0;
        }
        if (dailyEthSpent + maxCost > GLOBAL_DAILY_CAP) {
            revert GlobalCapExceeded();
        }

        // ── Layer 4: optional signature gate ─────────────────────────────────
        if (sigGateEnabled) {
            _validateSigGate(userOpHash, userOp.paymasterAndData);
        }

        // Encode context for postOp accounting
        context = abi.encode(user, maxCost);
        validationData = 0; // success, no time range restriction
    }

    /// @inheritdoc IPaymaster
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /*actualUserOpFeePerGas*/
    ) external override onlyEntryPoint {
        (address user,) = abi.decode(context, (address, uint256));
        // Increment rate counters
        _userRate[user].opsConsumed++;
        dailyEthSpent += actualGasCost;
        // mode opReverted / postOpReverted: still consumed the op slot (rate-limited)
        (mode); // suppress unused warning
    }

    // ─── Governance ───────────────────────────────────────────────────────────
    function whitelistTarget(address target, bool enabled) external onlyGovernance {
        if (target == address(0)) revert ZeroAddress();
        whitelistedTargets[target] = enabled;
        emit TargetWhitelisted(target, enabled);
    }

    function setSigGate(bool enabled, address signer) external onlyGovernance {
        if (enabled && signer == address(0)) revert InvalidSigGate();
        sigGateEnabled = enabled;
        sigGateSigner = signer;
        emit SigGateUpdated(enabled, signer);
    }

    function proposeGovernance(address proposed) external onlyGovernance {
        if (proposed == address(0)) revert ZeroAddress();
        pendingGovernance = proposed;
        emit GovernanceTransferProposed(proposed);
    }

    function acceptGovernance() external {
        if (msg.sender != pendingGovernance) revert NotGovernance();
        governance = pendingGovernance;
        pendingGovernance = address(0);
        emit GovernanceTransferred(governance);
    }

    function withdraw(address payable to, uint256 amount) external onlyGovernance {
        IEntryPointV07(ENTRY_POINT).withdrawTo(to, amount);
        emit Withdrawn(to, amount);
    }

    function paymasterBalance() external view returns (uint256) {
        return IEntryPointV07(ENTRY_POINT).balanceOf(address(this));
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    function userOpsRemaining(address user) external view returns (uint256) {
        UserRateInfo storage rate = _userRate[user];
        if (block.timestamp > uint256(rate.periodStart) + RATE_LIMIT_PERIOD) {
            return MAX_OPS_PER_USER_PER_PERIOD;
        }
        uint256 consumed = rate.opsConsumed;
        return consumed >= MAX_OPS_PER_USER_PER_PERIOD ? 0 : MAX_OPS_PER_USER_PER_PERIOD - consumed;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────
    /// @dev Validates call targets from ObscuraSmartAccount.execute(...) or executeBatch(...).
    function _requireWhitelistedTargets(bytes calldata callData) internal view {
        if (callData.length < 4) revert TargetNotWhitelisted(address(0));
        bytes4 selector = bytes4(callData[:4]);

        if (selector == EXECUTE_SELECTOR) {
            if (callData.length < 36) revert TargetNotWhitelisted(address(0));
            address callTarget = address(uint160(uint256(bytes32(callData[4:36]))));
            if (!whitelistedTargets[callTarget]) revert TargetNotWhitelisted(callTarget);
            return;
        }

        if (selector == EXECUTE_BATCH_SELECTOR) {
            (address[] memory targets,,) = abi.decode(callData[4:], (address[], uint256[], bytes[]));
            if (targets.length == 0) revert TargetNotWhitelisted(address(0));
            for (uint256 i = 0; i < targets.length; i++) {
                if (!whitelistedTargets[targets[i]]) revert TargetNotWhitelisted(targets[i]);
            }
            return;
        }

        revert TargetNotWhitelisted(address(0));
    }

    /// @dev Validates the governance counter-signature embedded in paymasterAndData.
    ///      paymasterAndData layout: [paymaster(20)] + [sigGateSig(65)]
    function _validateSigGate(bytes32 userOpHash, bytes calldata paymasterAndData) internal view {
        if (paymasterAndData.length < 85) revert InvalidSigGate();
        bytes calldata sig = paymasterAndData[20:85];
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address recovered = ethSignedHash.recover(sig);
        if (recovered != sigGateSigner) revert InvalidSigGate();
    }
}
