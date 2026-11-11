// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint8} from "@fhevm/solidity/lib/FHE.sol";

interface IBluff {
    enum TableStatus {
        None,
        Waiting,
        Verifying,
        Playing,
        Revealing,
        Finished,
        Cancelled
    }

    enum EndReason {
        LastPlayerStanding,
        ClockExpired,
        OthersLeft,
        StuckReveal
    }

    enum JoinAction {
        Create,
        Join
    }

    struct JoinRequest {
        JoinAction action;
        uint256 tableId;
        uint8 seatCount;
        uint64 buyIn;
        bool isPrivate;
    }

    struct TableView {
        uint256 id;
        address host;
        TableStatus status;
        bool isPrivate;
        uint8 seatCount;
        uint8 playerCount;
        uint8 dicePerPlayer;
        uint8 diceInPlay;
        uint64 buyIn;
        uint64 createdAt;
        uint64 startedAt;
        uint64 deadline;
        uint32 round;
        uint8 turn;
        uint8 roundStarter;
        uint8 bidQuantity;
        uint8 bidFace;
        uint8 bidder;
        uint8 caller;
    }

    struct SeatView {
        address player;
        uint8 dice;
        uint8 missedTurns;
        bool isActive;
    }

    event TableCreated(
        uint256 indexed id,
        address indexed host,
        uint8 seatCount,
        uint8 dicePerPlayer,
        uint64 buyIn,
        bool isPrivate
    );
    event PlayerJoined(uint256 indexed id, address indexed player, uint8 seat);
    event PlayerLeft(uint256 indexed id, address indexed player, bool refunded);
    event HostChanged(uint256 indexed id, address indexed host);
    event TableCancelled(uint256 indexed id);
    event TableListed(uint256 indexed id);
    event TableUnlisted(uint256 indexed id);
    event SeatVerificationStarted(uint256 indexed id, uint64 deadline);
    event SeatRemoved(uint256 indexed id, address indexed player);
    event TableReopened(uint256 indexed id, uint64 deadline);
    event GameStarted(uint256 indexed id, uint64 startedAt, uint64 clockEndsAt);
    event RoundStarted(uint256 indexed id, uint32 round, uint8 starter, uint64 deadline);
    event BidPlaced(
        uint256 indexed id,
        uint32 round,
        address indexed player,
        uint8 quantity,
        uint8 face,
        uint8 nextTurn,
        uint64 deadline
    );
    event BluffCalled(uint256 indexed id, uint32 round, address indexed caller, uint64 deadline);
    event RoundSettled(
        uint256 indexed id,
        uint32 round,
        uint8 face,
        uint8 quantity,
        uint8 count,
        address indexed loser,
        uint8[] revealedFaces
    );
    event PlayerEliminated(uint256 indexed id, address indexed player);
    event TurnTimedOut(uint256 indexed id, address indexed player, uint8 missedTurns);
    event TurnPassed(uint256 indexed id, uint8 turn, uint64 deadline);
    event GameEnded(uint256 indexed id, EndReason reason, address[] winners);
    event CashierSet(address indexed cashier);

    error ZeroAddress();
    error TableNotFound(uint256 id);
    error WrongStatus(uint256 id, TableStatus status);
    error AlreadyAtTable(uint256 tableId);
    error NotAtTable(uint256 id);
    error NotHost(uint256 id);
    error NotEnoughPlayers(uint256 id);
    error InvalidSeatCount(uint8 seatCount);
    error InvalidBuyIn(uint64 buyIn);
    error DeadlineNotPassed(uint64 deadline);
    error NotYourTurn(uint256 id, uint8 turn);
    error InvalidFace(uint8 face);
    error InvalidQuantity(uint8 quantity, uint8 diceInPlay);
    error NoBidToCall(uint256 id);
    error BidNotHigher(uint8 quantity, uint8 face, uint8 currentQuantity, uint8 currentFace);
    error NotCashier(address caller);
    error CashierAlreadySet();

    function createFreeTable(uint8 seatCount, bool isPrivate) external returns (uint256 id);

    function joinFreeTable(uint256 id) external;

    function seatPaidPlayer(
        address player,
        JoinRequest calldata request
    ) external returns (uint256 id, uint64 tableBuyIn);

    function startIfFull(uint256 id) external;

    function startTable(uint256 id) external;

    function leaveTable(uint256 id) external;

    function cancelTable(uint256 id) external;

    function confirmSeats(uint256 id, bytes calldata clearValues, bytes calldata proof) external;

    function cancelVerification(uint256 id) external;

    function placeBid(uint256 id, uint8 quantity, uint8 face) external;

    function callBluff(uint256 id) external;

    function settleReveal(uint256 id, bytes calldata clearValues, bytes calldata proof) external;

    function claimTimeout(uint256 id) external;

    function cancelStuckReveal(uint256 id) external;

    function setCashier(address cashierAddress) external;

    function pause() external;

    function unpause() external;

    function getTable(uint256 id) external view returns (TableView memory table, SeatView[] memory seats);

    function openTables(uint256 offset, uint256 limit) external view returns (TableView[] memory tables);

    function openTableCount() external view returns (uint256);

    function tableOf(address player) external view returns (uint256);

    function diceOf(uint256 id, address player) external view returns (euint8[] memory);

    function revealHandles(uint256 id) external view returns (bytes32[] memory);

    function cashier() external view returns (address);

    function version() external pure returns (string memory);
}
