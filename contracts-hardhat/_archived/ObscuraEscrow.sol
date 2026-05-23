// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IConditionResolver {
    function isConditionMet(uint256 escrowId) external view returns (bool);
    function onConditionSet(uint256 escrowId, bytes calldata data) external;
}

/// @title ObscuraEscrow — encrypted escrow engine with silent failure pattern
/// @notice Creates encrypted escrows where owner, amount, and payment status are all
///         FHE ciphertexts. Unauthorized redemption returns zero tokens (no revert),
///         making failed attempts indistinguishable from successful ones.
///         Follows ReineiraOS ConfidentialEscrow patterns.
///
/// FHE Operations used:
///   asEuint64, asEaddress, asEbool, add, gte, eq, select, and, not,
///   allow, allowThis, isInitialized
contract ObscuraEscrow {

    // ─── Types ──────────────────────────────────────────────────────────

    struct Escrow {
        eaddress owner;       // Encrypted address entitled to redeem
        eaddress creator;     // Encrypted address that created the escrow
        euint64  amount;      // Encrypted target escrow value
        euint64  paidAmount;  // Encrypted cumulative payments received
        ebool    isRedeemed;  // Encrypted redemption flag
        bool     exists;      // Public existence flag (only public field)
        address  creatorPlain;// Plaintext creator for cancel authorization
    }

    // ─── State ──────────────────────────────────────────────────────────

    mapping(uint256 => Escrow) private escrows;
    mapping(uint256 => address) public conditionResolvers;
    uint256 public nextEscrowId;

    // Reference to ObscuraToken for balance transfers
    address public tokenContract;
    address public owner;

    // ─── Events ─────────────────────────────────────────────────────────

    event EscrowCreated(uint256 indexed escrowId, address indexed creator);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer);
    event EscrowRedeemed(uint256 indexed escrowId);
    event EscrowCancelled(uint256 indexed escrowId);
    event ConditionSet(uint256 indexed escrowId, address indexed resolver);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _tokenContract) {
        require(_tokenContract != address(0), "Invalid token address");
        tokenContract = _tokenContract;
        owner = msg.sender;
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /// @notice Create an encrypted escrow.
    /// @param _encOwner Encrypted address of the recipient (who can redeem)
    /// @param _encAmount Encrypted escrow target amount
    /// @param _resolver Condition resolver contract (address(0) for unconditional)
    /// @param _resolverData ABI-encoded data passed to resolver.onConditionSet()
    /// @return escrowId The unique identifier for this escrow
    function createEscrow(
        InEaddress calldata _encOwner,
        InEuint64 calldata _encAmount,
        address _resolver,
        bytes calldata _resolverData
    ) external returns (uint256 escrowId) {
        escrowId = nextEscrowId++;

        // Convert encrypted inputs
        eaddress eOwner = FHE.asEaddress(_encOwner);
        euint64 eAmount = FHE.asEuint64(_encAmount);
        eaddress eCreator = FHE.asEaddress(msg.sender);
        euint64 zeroPaid = FHE.asEuint64(uint256(0));
        ebool notRedeemed = FHE.asEbool(false);

        // Store escrow
        escrows[escrowId] = Escrow({
            owner: eOwner,
            creator: eCreator,
            amount: eAmount,
            paidAmount: zeroPaid,
            isRedeemed: notRedeemed,
            exists: true,
            creatorPlain: msg.sender
        });

        // Set up FHE access control
        // Contract needs access to all fields for computation
        FHE.allowThis(eOwner);
        FHE.allowThis(eCreator);
        FHE.allowThis(eAmount);
        FHE.allowThis(zeroPaid);
        FHE.allowThis(notRedeemed);
        // Creator can view amount and paid status
        FHE.allow(eAmount, msg.sender);
        FHE.allow(zeroPaid, msg.sender);

        // Set condition resolver if provided
        if (_resolver != address(0)) {
            conditionResolvers[escrowId] = _resolver;
            IConditionResolver(_resolver).onConditionSet(escrowId, _resolverData);
            emit ConditionSet(escrowId, _resolver);
        }

        emit EscrowCreated(escrowId, msg.sender);
    }

    /// @notice Fund an escrow with encrypted payment. Anyone can fund.
    /// @param _escrowId The escrow to fund
    /// @param _encPayment Encrypted payment amount
    function fundEscrow(uint256 _escrowId, InEuint64 calldata _encPayment) external {
        require(escrows[_escrowId].exists, "Escrow does not exist");
        Escrow storage esc = escrows[_escrowId];

        euint64 payment = FHE.asEuint64(_encPayment);

        // Accumulate payment via homomorphic addition
        esc.paidAmount = FHE.add(esc.paidAmount, payment);

        // Update ACL for the new paidAmount handle
        FHE.allowThis(esc.paidAmount);
        FHE.allow(esc.paidAmount, esc.creatorPlain);

        emit EscrowFunded(_escrowId, msg.sender);
    }

    /// @notice Redeem an escrow. Uses SILENT FAILURE pattern:
    ///         If caller != encrypted owner OR amount not fully paid OR already redeemed,
    ///         the transfer amount is FHE.select'd to zero. No revert, no information leak.
    /// @param _escrowId The escrow to redeem
    function redeemEscrow(uint256 _escrowId) external {
        require(escrows[_escrowId].exists, "Escrow does not exist");
        Escrow storage esc = escrows[_escrowId];

        // Check condition resolver (plaintext boolean — this is public)
        address resolver = conditionResolvers[_escrowId];
        if (resolver != address(0)) {
            require(
                IConditionResolver(resolver).isConditionMet(_escrowId),
                "Condition not met"
            );
        }

        // ── Silent failure: all checks on encrypted data ──
        // 1. Is caller the encrypted owner?
        eaddress eCaller = FHE.asEaddress(msg.sender);
        ebool isOwner = FHE.eq(eCaller, esc.owner);

        // 2. Is paidAmount >= amount? (fully funded)
        ebool isPaid = FHE.gte(esc.paidAmount, esc.amount);

        // 3. Is not already redeemed?
        ebool notRedeemed = FHE.not(esc.isRedeemed);

        // 4. Combine all conditions
        ebool valid = FHE.and(isOwner, FHE.and(isPaid, notRedeemed));

        // 5. Select transfer amount: valid ? paidAmount : 0
        euint64 zero = FHE.asEuint64(uint256(0));
        euint64 transferAmount = FHE.select(valid, esc.paidAmount, zero);

        // 6. Update redeemed flag: valid ? true : existing
        ebool trueVal = FHE.asEbool(true);
        esc.isRedeemed = FHE.select(valid, trueVal, esc.isRedeemed);
        FHE.allowThis(esc.isRedeemed);

        // 7. Grant the transfer amount to the caller so they can decrypt it
        FHE.allow(transferAmount, msg.sender);
        FHE.allowThis(transferAmount);

        // Store the redeemable amount for the caller to claim/view
        // The caller can decrypt transferAmount — if unauthorized it will be 0
        escrowRedeemAmounts[_escrowId] = transferAmount;

        emit EscrowRedeemed(_escrowId);
    }

    /// @notice Cancel an escrow (creator only, before redemption).
    function cancelEscrow(uint256 _escrowId) external {
        require(escrows[_escrowId].exists, "Escrow does not exist");
        require(escrows[_escrowId].creatorPlain == msg.sender, "Only creator");
        escrows[_escrowId].exists = false;
        emit EscrowCancelled(_escrowId);
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /// @notice Mapping to store redeemable amounts after redemption attempt.
    mapping(uint256 => euint64) public escrowRedeemAmounts;

    /// @notice Check if an escrow exists (public).
    function exists(uint256 _escrowId) external view returns (bool) {
        return escrows[_escrowId].exists;
    }

    /// @notice Get the encrypted escrow amount (creator can decrypt).
    function getEscrowAmount(uint256 _escrowId) external view returns (euint64) {
        require(escrows[_escrowId].exists, "Escrow does not exist");
        return escrows[_escrowId].amount;
    }

    /// @notice Get the encrypted paid amount (creator can decrypt).
    function getEscrowPaidAmount(uint256 _escrowId) external view returns (euint64) {
        require(escrows[_escrowId].exists, "Escrow does not exist");
        return escrows[_escrowId].paidAmount;
    }

    /// @notice Get the encrypted redeemed status.
    function getEscrowRedeemed(uint256 _escrowId) external view returns (ebool) {
        require(escrows[_escrowId].exists, "Escrow does not exist");
        return escrows[_escrowId].isRedeemed;
    }

    /// @notice Get plaintext creator address.
    function getEscrowCreator(uint256 _escrowId) external view returns (address) {
        return escrows[_escrowId].creatorPlain;
    }

    /// @notice Get the condition resolver address for an escrow.
    function getConditionResolver(uint256 _escrowId) external view returns (address) {
        return conditionResolvers[_escrowId];
    }

    /// @notice Get total number of escrows created.
    function getEscrowCount() external view returns (uint256) {
        return nextEscrowId;
    }

    /// @notice Get the redeemable amount after a redeem attempt (caller decrypts).
    function getRedeemAmount(uint256 _escrowId) external view returns (euint64) {
        return escrowRedeemAmounts[_escrowId];
    }
}
