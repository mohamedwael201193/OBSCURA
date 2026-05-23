// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IPayStreamV2Streamer {
    function createStream(
        InEaddress calldata encRecipientHint,
        uint64 periodSeconds,
        uint64 startTime,
        uint64 endTime,
        uint32 jitterSeconds
    ) external returns (uint256);

    function setPaused(uint256 streamId, bool paused) external;
}

/// @title ObscuraTreasuryStreamer
/// @notice Governance-controlled adapter that opens encrypted PayStreamV2
///         streams on behalf of the Obscura Treasury. The Governor (or its
///         timelock) is the only account that may create streams. Recipient
///         hints are encrypted via the cofhe-sdk and forwarded as-is, so the
///         chain never sees plaintext recipients.
///
///         This contract is intentionally minimal: it does not custody funds
///         (funding is done via cUSDC deposits to the underlying escrow). It
///         exists only so a governance proposal can produce a single tx that
///         materialises a recurring payroll / grant stream from the DAO.
contract ObscuraTreasuryStreamer {
    IPayStreamV2Streamer public immutable payStream;
    /// @notice Account authorised to open streams. Set once at deploy and
    ///         expected to be the ObscuraGovernor TimelockController.
    address public immutable controller;

    /// @notice History of streams the DAO has opened, for off-chain dashboards.
    uint256[] public streamsOpened;

    event StreamOpened(uint256 indexed streamId, address indexed by);
    event StreamPaused(uint256 indexed streamId, bool paused);

    error NotController();

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    constructor(address _payStream, address _controller) {
        require(_payStream != address(0) && _controller != address(0), "zero");
        payStream  = IPayStreamV2Streamer(_payStream);
        controller = _controller;
    }

    /// @notice Open a new payroll / grant stream under DAO control.
    function openStream(
        InEaddress calldata encRecipientHint,
        uint64 periodSeconds,
        uint64 startTime,
        uint64 endTime,
        uint32 jitterSeconds
    ) external onlyController returns (uint256 streamId) {
        streamId = payStream.createStream(
            encRecipientHint, periodSeconds, startTime, endTime, jitterSeconds
        );
        streamsOpened.push(streamId);
        emit StreamOpened(streamId, msg.sender);
    }

    /// @notice Pause / unpause a DAO-owned stream.
    function setPaused(uint256 streamId, bool paused) external onlyController {
        payStream.setPaused(streamId, paused);
        emit StreamPaused(streamId, paused);
    }

    function streamsLength() external view returns (uint256) {
        return streamsOpened.length;
    }
}
