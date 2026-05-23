// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title IEncryptedScore
/// @notice Pluggable encrypted credit-score oracle interface.
///         The credit market reads a per-user `scoreOf(user)` euint64 in the
///         range [0, 10_000] and uses it to grant an LLTV boost without
///         leaking the score itself.
///
///         Day-1 implementation is `ObscuraCreditScore` (returns a constant
///         5_000 for everyone). Future implementations can plug in:
///           - on-chain repayment history
///           - off-chain attestations (revealed via ZK)
///           - cross-protocol reputation
///         …all while keeping the score itself encrypted.
interface IEncryptedScore {
    /// @notice Encrypted score in range [0, 1_000].
    function scoreOf(address user) external view returns (euint64);

    /// @notice Grant the calling market transient ACL on `user`'s score so
    ///         the market can compute LLTV boost in the same tx. Reverts if
    ///         user has not attested for the market.
    function allowTransientForMarket(address user, address market) external;

    /// @notice Plaintext tier: 0 = <300, 1 = 300-599, 2 = 600-749, 3 = >=750.
    ///         Tier is set at updateScore time from public on-chain inputs;
    ///         it reveals the tier bucket, NOT the raw score.
    function userTier(address user) external view returns (uint8);
}
