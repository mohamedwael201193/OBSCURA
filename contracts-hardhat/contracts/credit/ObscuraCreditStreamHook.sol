// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "../interfaces/IConfidentialUSDCv2.sol";
import "./ObscuraCreditMarket.sol";

/// @title ObscuraCreditStreamHook
/// @notice Auto-repay-from-stream wire. Borrower opts in via `enable` and
///         pre-authorizes this hook on cUSDC via `setOperator`. An off-chain
///         ticker (or anyone) calls `pull` per cycle; we draw `amtPlain`
///         from the borrower's stealth wallet and `repay` it on the market.
contract ObscuraCreditStreamHook {
    error NotEnabled();
    error WrongMarket();

    address public immutable cUSDC;

    struct Hook {
        address market;
        address borrower;
        uint64  perCycle;
        uint64  periodSeconds;
        uint64  lastPullAt;
        bool    active;
        bool    exists;
    }

    Hook[] private _hooks;
    mapping(address => uint256[]) private _byUser;

    event HookEnabled(uint256 indexed hookId, address indexed user, address indexed market);
    event HookDisabled(uint256 indexed hookId);
    event Pulled(uint256 indexed hookId, uint64 amt);

    constructor(address _cUSDC) { cUSDC = _cUSDC; }

    function enable(address market, uint64 perCycle, uint64 periodSeconds) external returns (uint256 hookId) {
        require(market != address(0), "market");
        require(perCycle > 0, "amt");
        require(periodSeconds >= 60, "period");
        hookId = _hooks.length;
        _hooks.push(Hook({
            market: market, borrower: msg.sender,
            perCycle: perCycle, periodSeconds: periodSeconds,
            lastPullAt: 0, active: true, exists: true
        }));
        _byUser[msg.sender].push(hookId);
        emit HookEnabled(hookId, msg.sender, market);
    }

    function disable(uint256 hookId) external {
        Hook storage h = _hooks[hookId];
        require(h.exists && h.borrower == msg.sender, "not yours");
        h.active = false;
        emit HookDisabled(hookId);
    }

    /// @notice Pull one cycle. Anyone (typically the ticker) can call.
    /// @dev Two-step CoFHE pattern:
    ///      - `encPull` is consumed by cUSDC.confidentialTransferFrom (borrower → hook).
    ///      - `encPush` is a SEPARATE encryption of the SAME plaintext amount; used
    ///        by this hook to forward cUSDC (hook → market) and to update encrypted
    ///        borrow accounting via repayFromHook.
    ///      Both proofs must be generated client-side by the ticker/keeper.
    function pull(uint256 hookId, InEuint64 calldata encPull, InEuint64 calldata encPush) external {
        Hook storage h = _hooks[hookId];
        if (!h.exists || !h.active) revert NotEnabled();
        if (h.lastPullAt != 0 && block.timestamp < h.lastPullAt + h.periodSeconds) return;
        h.lastPullAt = uint64(block.timestamp);

        // Step 1: Operator-pull encrypted cUSDC from borrower into this hook.
        // encPull is consumed by cUSDC's internal verifyInput here.
        IConfidentialUSDCv2(cUSDC).confidentialTransferFrom(h.borrower, address(this), encPull);

        // Step 2: Forward cUSDC from hook → market so market reserves are replenished.
        // encPush is a second independent proof for the same amount (CoFHE two-step).
        euint64 handle = FHE.asEuint64(encPush);
        FHE.allowThis(handle);
        FHE.allowTransient(handle, cUSDC);
        IConfidentialUSDCv2(cUSDC).confidentialTransfer(h.market, uint256(euint64.unwrap(handle)));

        // Step 3: Notify market to decrement encrypted borrow shares.
        ObscuraCreditMarket(h.market).repayFromHook(h.borrower, h.perCycle, handle);
        emit Pulled(hookId, h.perCycle);
    }

    function hooksOf(address user) external view returns (uint256[] memory) { return _byUser[user]; }
    function getHook(uint256 id) external view returns (Hook memory) { return _hooks[id]; }
}
