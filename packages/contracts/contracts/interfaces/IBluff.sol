// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

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
    event GameStarted(uint256 indexed id, uint64 startedAt, uint64 clockEndsAt);

    error ZeroAddress();
    error TableNotFound(uint256 id);
    error WrongStatus(uint256 id, TableStatus status);
    error AlreadyAtTable(uint256 tableId);
    error NotAtTable(uint256 id);
    error NotHost(uint256 id);
    error NotEnoughPlayers(uint256 id);
    error InvalidSeatCount(uint8 seatCount);
    error DeadlineNotPassed(uint64 deadline);

    function createFreeTable(uint8 seatCount, bool isPrivate) external returns (uint256 id);

    function joinFreeTable(uint256 id) external;

    function startTable(uint256 id) external;

    function leaveTable(uint256 id) external;

    function cancelTable(uint256 id) external;

    function pause() external;

    function unpause() external;

    function getTable(uint256 id) external view returns (TableView memory table, SeatView[] memory seats);

    function openTables(uint256 offset, uint256 limit) external view returns (TableView[] memory tables);

    function openTableCount() external view returns (uint256);

    function tableOf(address player) external view returns (uint256);

    function chips() external view returns (IERC7984);

    function version() external pure returns (string memory);
}
