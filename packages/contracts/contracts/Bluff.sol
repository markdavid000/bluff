// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IBluff} from "./interfaces/IBluff.sol";
import {IBluffCashier} from "./interfaces/IBluffCashier.sol";
import {IBluffInvites} from "./interfaces/IBluffInvites.sol";
import {BidRules} from "./libraries/BidRules.sol";
import {TableRules} from "./libraries/TableRules.sol";

contract Bluff is
    IBluff,
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardTransient
{
    using EnumerableSet for EnumerableSet.UintSet;

    struct Table {
        address host;
        TableStatus status;
        bool isPrivate;
        uint8 seatCount;
        uint8 playerCount;
        uint8 dicePerPlayer;
        uint8 diceInPlay;
        uint8 turn;
        uint8 roundStarter;
        uint8 bidQuantity;
        uint8 bidFace;
        uint8 bidder;
        uint8 caller;
        uint32 round;
        uint64 buyIn;
        uint64 createdAt;
        uint64 startedAt;
        uint64 deadline;
    }

    struct Seat {
        address player;
        uint8 dice;
        uint8 missedTurns;
        bool isActive;
        euint8[] currentDice;
    }

    /// @custom:storage-location erc7201:bluff.storage.Bluff
    struct BluffStorage {
        IBluffCashier cashier;
        uint256 nextTableId;
        mapping(uint256 tableId => Table) tables;
        mapping(uint256 tableId => Seat[]) seats;
        mapping(address player => uint256 tableId) tableOf;
        EnumerableSet.UintSet openTables;
        mapping(uint256 tableId => mapping(address player => bool)) ready;
        IBluffInvites invites;
        mapping(uint256 tableId => mapping(address player => bool)) barred;
    }

    bytes32 private constant _BLUFF_STORAGE_LOCATION =
        0x23b5f92c78153b667665d35bef9c2d58f327709d7637cfd5b4e5892e2333f700;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        __Pausable_init();
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
    }

    function createFreeTable(uint8 seatCount, bool isPrivate) external whenNotPaused returns (uint256 id) {
        id = _createTable(_getBluffStorage(), msg.sender, seatCount, 0, isPrivate);
    }

    function joinFreeTable(uint256 id) external whenNotPaused {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireJoinable($, id, msg.sender);
        if (table.buyIn != 0) revert InvalidBuyIn(table.buyIn);
        _seatPlayer($, id, msg.sender);
    }

    function seatPaidPlayer(
        address player,
        JoinRequest calldata request
    ) external whenNotPaused returns (uint256 id, uint64 tableBuyIn) {
        BluffStorage storage $ = _getBluffStorage();
        _requireCashier($);
        id =
            request.action == JoinAction.Create
                ? _createPaidTable($, player, request.seatCount, request.buyIn, request.isPrivate)
                : _joinPaidTable($, player, request.tableId);
        tableBuyIn = $.tables[id].buyIn;
    }

    function setReady(uint256 id, bool isReady) external {
        BluffStorage storage $ = _getBluffStorage();
        _requireSeated($, id, msg.sender);
        _requireStatus($, id, TableStatus.Waiting);
        $.ready[id][msg.sender] = isReady;
        emit PlayerReady(id, msg.sender, isReady);
    }

    function startTable(uint256 id) external {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Waiting);
        if (table.host != msg.sender) revert NotHost(id);
        if (table.playerCount < TableRules.MIN_SEATS) revert NotEnoughPlayers(id);
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) {
            address player = seats[i].player;
            if (player != table.host && !$.ready[id][player]) revert NotEveryoneReady(id);
        }
        _startGame($, id);
    }

    function removeUnready(uint256 id, address player) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Waiting);
        if (table.host != msg.sender) revert NotHost(id);
        if ($.tableOf[player] != id) revert NotAtTable(id);
        if (player == table.host) revert CannotRemoveHost(id);
        if ($.ready[id][player]) revert PlayerIsReady(id, player);
        $.barred[id][player] = true;
        _leaveBeforeGame($, id, player, true);
    }

    function leaveTable(uint256 id) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        _requireSeated($, id, msg.sender);
        TableStatus status = $.tables[id].status;
        if (status == TableStatus.Waiting || status == TableStatus.Verifying) {
            _leaveBeforeGame($, id, msg.sender, false);
        } else {
            _leaveGame($, id, msg.sender);
        }
    }

    function cancelTable(uint256 id) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Waiting);
        if (block.timestamp <= table.deadline) revert DeadlineNotPassed(table.deadline);
        _cancel($, id);
        _refundAll($, id);
    }

    function confirmSeats(uint256 id, bytes calldata clearValues, bytes calldata proof) external {
        BluffStorage storage $ = _getBluffStorage();
        _requireStatus($, id, TableStatus.Verifying);
        Seat[] storage seats = $.seats[id];
        bytes32[] memory handles = $.cashier.paymentHandles(id, _players($, id));
        FHE.checkSignatures(handles, clearValues, proof);
        bool removed = false;
        for (uint256 i = handles.length; i > 0; --i) {
            if (uint256(bytes32(clearValues[(i - 1) * 32:i * 32])) == 0) {
                address player = seats[i - 1].player;
                _removeSeat($, id, player);
                emit SeatRemoved(id, player);
                removed = true;
            }
        }
        if (removed) {
            _reopen($, id);
        } else {
            _beginPlay($, id);
        }
    }

    function cancelVerification(uint256 id) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Verifying);
        if (block.timestamp <= table.deadline) revert DeadlineNotPassed(table.deadline);
        _cancel($, id);
        _refundAll($, id);
    }

    function placeBid(uint256 id, uint8 quantity, uint8 face) external {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Playing);
        if ($.seats[id][table.turn].player != msg.sender) revert NotYourTurn(id, table.turn);
        if (!BidRules.isValidFace(face)) revert InvalidFace(face);
        if (!BidRules.isValidQuantity(quantity, table.diceInPlay)) revert InvalidQuantity(quantity, table.diceInPlay);
        if (!BidRules.isHigher(quantity, face, table.bidQuantity, table.bidFace)) {
            revert BidNotHigher(quantity, face, table.bidQuantity, table.bidFace);
        }
        table.bidQuantity = quantity;
        table.bidFace = face;
        table.bidder = table.turn;
        table.turn = _nextActiveSeat($, id, table.turn);
        table.deadline = uint64(block.timestamp) + TableRules.TURN_LIMIT;
        emit BidPlaced(id, table.round, msg.sender, quantity, face, table.turn, table.deadline);
    }

    function callBluff(uint256 id) external {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Playing);
        if ($.seats[id][table.turn].player != msg.sender) revert NotYourTurn(id, table.turn);
        if (table.bidQuantity == 0) revert NoBidToCall(id);
        table.caller = table.turn;
        table.status = TableStatus.Revealing;
        table.deadline = uint64(block.timestamp) + TableRules.STUCK_REVEAL_LIMIT;
        emit BluffCalled(id, table.round, msg.sender, table.deadline);
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) {
            euint8[] storage dice = seats[i].currentDice;
            for (uint256 j = 0; j < dice.length; ++j) {
                dice[j] = FHE.makePubliclyDecryptable(dice[j]);
            }
        }
    }

    function settleReveal(uint256 id, bytes calldata clearValues, bytes calldata proof) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Revealing);
        bytes32[] memory handles = _diceHandles($, id);
        FHE.checkSignatures(handles, clearValues, proof);
        uint8[] memory values = _decodeDice(clearValues, handles.length);
        uint8 count = BidRules.countMatching(values, table.bidFace);
        uint8 loser = count >= table.bidQuantity ? table.caller : table.bidder;
        emit RoundSettled(
            id,
            table.round,
            table.bidFace,
            table.bidQuantity,
            count,
            $.seats[id][loser].player,
            _faces(values)
        );
        table.status = TableStatus.Playing;
        _loseDie($, id, loser);
        _continueOrEnd($, id, loser, true);
    }

    function claimTimeout(uint256 id) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Playing);
        if (block.timestamp <= table.deadline) revert DeadlineNotPassed(table.deadline);
        uint8 idle = table.turn;
        Seat storage seat = $.seats[id][idle];
        ++seat.missedTurns;
        emit TurnTimedOut(id, seat.player, seat.missedTurns);
        if (seat.missedTurns >= TableRules.MAX_MISSED_TURNS) {
            _remove($, id, idle);
        } else {
            _loseDie($, id, idle);
        }
        _continueOrEnd($, id, idle, false);
    }

    function cancelStuckReveal(uint256 id) external nonReentrant {
        BluffStorage storage $ = _getBluffStorage();
        Table storage table = _requireStatus($, id, TableStatus.Revealing);
        if (block.timestamp <= table.deadline) revert DeadlineNotPassed(table.deadline);
        _endGame($, id, EndReason.StuckReveal);
    }

    function setCashier(address cashierAddress) external onlyOwner {
        BluffStorage storage $ = _getBluffStorage();
        if (address($.cashier) != address(0)) revert CashierAlreadySet();
        if (cashierAddress == address(0)) revert ZeroAddress();
        $.cashier = IBluffCashier(cashierAddress);
        emit CashierSet(cashierAddress);
    }

    function setInvites(address invitesAddress) external onlyOwner {
        BluffStorage storage $ = _getBluffStorage();
        if (address($.invites) != address(0)) revert InvitesAlreadySet();
        if (invitesAddress == address(0)) revert ZeroAddress();
        $.invites = IBluffInvites(invitesAddress);
        emit InvitesSet(invitesAddress);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getTable(uint256 id) external view returns (TableView memory table, SeatView[] memory seats) {
        BluffStorage storage $ = _getBluffStorage();
        if ($.tables[id].status == TableStatus.None) revert TableNotFound(id);
        table = _tableView($, id);
        Seat[] storage stored = $.seats[id];
        seats = new SeatView[](stored.length);
        for (uint256 i = 0; i < stored.length; ++i) {
            seats[i] = SeatView(
                stored[i].player,
                stored[i].dice,
                stored[i].missedTurns,
                stored[i].isActive,
                $.ready[id][stored[i].player]
            );
        }
    }

    function openTables(uint256 offset, uint256 limit) external view returns (TableView[] memory tables) {
        BluffStorage storage $ = _getBluffStorage();
        uint256 total = $.openTables.length();
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 count = offset < end ? end - offset : 0;
        tables = new TableView[](count);
        for (uint256 i = 0; i < count; ++i) {
            tables[i] = _tableView($, $.openTables.at(offset + i));
        }
    }

    function openTableCount() external view returns (uint256) {
        return _getBluffStorage().openTables.length();
    }

    function tableOf(address player) external view returns (uint256) {
        return _getBluffStorage().tableOf[player];
    }

    function diceOf(uint256 id, address player) external view returns (euint8[] memory) {
        BluffStorage storage $ = _getBluffStorage();
        _requireSeated($, id, player);
        return $.seats[id][_seatIndex($, id, player)].currentDice;
    }

    function revealHandles(uint256 id) external view returns (bytes32[] memory) {
        BluffStorage storage $ = _getBluffStorage();
        TableStatus status = $.tables[id].status;
        if (status == TableStatus.Verifying) return $.cashier.paymentHandles(id, _players($, id));
        _requireStatus($, id, TableStatus.Revealing);
        return _diceHandles($, id);
    }

    function cashier() external view returns (address) {
        return address(_getBluffStorage().cashier);
    }

    function invites() external view returns (address) {
        return address(_getBluffStorage().invites);
    }

    function version() external pure virtual returns (string memory) {
        return "1.5.0";
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    function _createTable(
        BluffStorage storage $,
        address host,
        uint8 seatCount,
        uint64 buyIn,
        bool isPrivate
    ) private returns (uint256 id) {
        if (!TableRules.isValidSeatCount(seatCount)) revert InvalidSeatCount(seatCount);
        _requireNotAtTable($, host);
        do {
            id = uint48(uint256(keccak256(abi.encode(block.prevrandao, host, ++$.nextTableId))));
        } while (id == 0 || $.tables[id].status != TableStatus.None);
        Table storage table = $.tables[id];
        table.host = host;
        table.status = TableStatus.Waiting;
        table.isPrivate = isPrivate;
        table.seatCount = seatCount;
        table.dicePerPlayer = TableRules.dicePerPlayer(seatCount);
        table.buyIn = buyIn;
        table.createdAt = uint64(block.timestamp);
        table.deadline = uint64(block.timestamp) + TableRules.LOBBY_LIMIT;
        if (!isPrivate) _list($, id);
        emit TableCreated(id, host, seatCount, table.dicePerPlayer, buyIn, isPrivate);
        if (isPrivate) $.invites.newCode(id, host);
        _seatPlayer($, id, host);
    }

    function _createPaidTable(
        BluffStorage storage $,
        address host,
        uint8 seatCount,
        uint64 buyIn,
        bool isPrivate
    ) private returns (uint256) {
        if (buyIn == 0 || !TableRules.isValidBuyIn(buyIn)) revert InvalidBuyIn(buyIn);
        return _createTable($, host, seatCount, buyIn, isPrivate);
    }

    function _joinPaidTable(BluffStorage storage $, address player, uint256 id) private returns (uint256) {
        Table storage table = _requireJoinable($, id, player);
        if (table.buyIn == 0) revert InvalidBuyIn(0);
        _seatPlayer($, id, player);
        return id;
    }

    function _seatPlayer(BluffStorage storage $, uint256 id, address player) private {
        Table storage table = $.tables[id];
        Seat storage seat = $.seats[id].push();
        seat.player = player;
        seat.isActive = true;
        ++table.playerCount;
        $.tableOf[player] = id;
        emit PlayerJoined(id, player, table.playerCount - 1);
        if (table.playerCount == table.seatCount) _unlist($, id);
    }

    function _removeSeat(BluffStorage storage $, uint256 id, address player) private {
        Seat[] storage seats = $.seats[id];
        uint256 last = seats.length - 1;
        uint256 index = 0;
        while (seats[index].player != player) ++index;
        for (uint256 i = index; i < last; ++i) {
            seats[i] = seats[i + 1];
        }
        seats.pop();
        --$.tables[id].playerCount;
        delete $.tableOf[player];
        delete $.ready[id][player];
    }

    function _startGame(BluffStorage storage $, uint256 id) private {
        _unlist($, id);
        if ($.tables[id].buyIn == 0) {
            _beginPlay($, id);
        } else {
            _startVerification($, id);
        }
    }

    function _startVerification(BluffStorage storage $, uint256 id) private {
        Table storage table = $.tables[id];
        table.status = TableStatus.Verifying;
        table.deadline = uint64(block.timestamp) + TableRules.VERIFICATION_LIMIT;
        emit SeatVerificationStarted(id, table.deadline);
        $.cashier.publishPayments(id, _players($, id));
    }

    function _reopen(BluffStorage storage $, uint256 id) private {
        Table storage table = $.tables[id];
        if (table.playerCount == 0) {
            _cancel($, id);
            return;
        }
        table.status = TableStatus.Waiting;
        table.deadline = uint64(block.timestamp) + TableRules.LOBBY_LIMIT;
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) delete $.ready[id][seats[i].player];
        _ensureHost($, id);
        if (!table.isPrivate) _list($, id);
        emit TableReopened(id, table.deadline);
    }

    function _beginPlay(BluffStorage storage $, uint256 id) private {
        Table storage table = $.tables[id];
        table.status = TableStatus.Playing;
        table.startedAt = uint64(block.timestamp);
        emit GameStarted(id, table.startedAt, table.startedAt + TableRules.GAME_CLOCK);
        Seat[] storage seats = $.seats[id];
        table.dicePerPlayer = TableRules.dicePerPlayer(uint8(seats.length));
        for (uint256 i = 0; i < seats.length; ++i) {
            seats[i].dice = table.dicePerPlayer;
        }
        _startRound($, id, 0);
    }

    function _startRound(BluffStorage storage $, uint256 id, uint8 starter) private {
        Table storage table = $.tables[id];
        Seat[] storage seats = $.seats[id];
        uint8 diceInPlay = 0;
        for (uint256 i = 0; i < seats.length; ++i) {
            diceInPlay += _rollSeat(seats[i]);
        }
        ++table.round;
        table.diceInPlay = diceInPlay;
        table.roundStarter = starter;
        table.turn = starter;
        table.bidQuantity = 0;
        table.bidFace = 0;
        table.deadline = uint64(block.timestamp) + TableRules.TURN_LIMIT;
        emit RoundStarted(id, table.round, starter, table.deadline);
    }

    function _rollSeat(Seat storage seat) private returns (uint8) {
        delete seat.currentDice;
        if (!seat.isActive) return 0;
        for (uint256 i = 0; i < seat.dice; ++i) {
            euint8 die = FHE.asEuint8(FHE.rem(FHE.randEuint16(), BidRules.FACES));
            seat.currentDice.push(FHE.allow(FHE.allowThis(die), seat.player));
        }
        return seat.dice;
    }

    function _leaveBeforeGame(BluffStorage storage $, uint256 id, address player, bool removed) private {
        Table storage table = $.tables[id];
        bool refunded = table.buyIn != 0;
        _removeSeat($, id, player);
        if (removed) emit PlayerRemoved(id, player);
        else emit PlayerLeft(id, player, refunded);
        if (table.status == TableStatus.Verifying) {
            _reopen($, id);
        } else if (table.playerCount == 0) {
            _cancel($, id);
        } else {
            _ensureHost($, id);
            if (!table.isPrivate) _list($, id);
        }
        if (refunded) $.cashier.refund(id, player);
    }

    function _leaveGame(BluffStorage storage $, uint256 id, address player) private {
        uint8 index = _seatIndex($, id, player);
        Seat storage seat = $.seats[id][index];
        delete $.tableOf[player];
        emit PlayerLeft(id, player, false);
        if (!seat.isActive) return;
        seat.isActive = false;
        if (_activeCount($, id) == 1) {
            _endGame($, id, EndReason.OthersLeft);
            return;
        }
        Table storage table = $.tables[id];
        if (table.status == TableStatus.Playing && table.turn == index) {
            table.turn = _nextActiveSeat($, id, index);
            table.deadline = uint64(block.timestamp) + TableRules.TURN_LIMIT;
            emit TurnPassed(id, table.turn, table.deadline);
        }
    }

    function _remove(BluffStorage storage $, uint256 id, uint8 seatIndex) private {
        Seat storage seat = $.seats[id][seatIndex];
        seat.isActive = false;
        seat.dice = 0;
        delete $.tableOf[seat.player];
        emit PlayerEliminated(id, seat.player);
    }

    function _loseDie(BluffStorage storage $, uint256 id, uint8 seatIndex) private {
        Seat storage seat = $.seats[id][seatIndex];
        if (!seat.isActive) return;
        --seat.dice;
        if (seat.dice == 0) {
            seat.isActive = false;
            emit PlayerEliminated(id, seat.player);
        }
    }

    function _continueOrEnd(BluffStorage storage $, uint256 id, uint8 from, bool fromStarts) private {
        if (_activeCount($, id) == 1) {
            _endGame($, id, EndReason.LastPlayerStanding);
            return;
        }
        if (block.timestamp >= $.tables[id].startedAt + TableRules.GAME_CLOCK) {
            _endGame($, id, EndReason.ClockExpired);
            return;
        }
        uint8 starter = fromStarts && $.seats[id][from].isActive ? from : _nextActiveSeat($, id, from);
        _startRound($, id, starter);
    }

    function _endGame(BluffStorage storage $, uint256 id, EndReason reason) private {
        Table storage table = $.tables[id];
        Seat[] storage seats = $.seats[id];
        address[] memory winners = _winners($, id, reason);
        for (uint256 i = 0; i < seats.length; ++i) {
            _freeSeat($, id, seats[i].player);
        }
        table.status = TableStatus.Finished;
        table.deadline = 0;
        emit GameEnded(id, reason, winners);
        if (table.buyIn != 0) $.cashier.payOut(id, winners);
    }

    function _freeSeat(BluffStorage storage $, uint256 id, address player) private {
        if ($.tableOf[player] == id) delete $.tableOf[player];
    }

    function _refundAll(BluffStorage storage $, uint256 id) private {
        if ($.tables[id].buyIn == 0) return;
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) {
            $.cashier.refund(id, seats[i].player);
        }
    }

    function _cancel(BluffStorage storage $, uint256 id) private {
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) {
            _freeSeat($, id, seats[i].player);
        }
        $.tables[id].status = TableStatus.Cancelled;
        _unlist($, id);
        emit TableCancelled(id);
    }

    function _list(BluffStorage storage $, uint256 id) private {
        if ($.openTables.add(id)) emit TableListed(id);
    }

    function _unlist(BluffStorage storage $, uint256 id) private {
        if ($.openTables.remove(id)) emit TableUnlisted(id);
    }

    function _ensureHost(BluffStorage storage $, uint256 id) private {
        Table storage table = $.tables[id];
        if ($.tableOf[table.host] == id) return;
        table.host = $.seats[id][0].player;
        emit HostChanged(id, table.host);
    }

    function _winners(
        BluffStorage storage $,
        uint256 id,
        EndReason reason
    ) private view returns (address[] memory winners) {
        Seat[] storage seats = $.seats[id];
        uint8 minimum = reason == EndReason.ClockExpired ? _mostDice($, id) : 0;
        uint256 count = 0;
        for (uint256 i = 0; i < seats.length; ++i) {
            if (seats[i].isActive && seats[i].dice >= minimum) ++count;
        }
        winners = new address[](count);
        uint256 found = 0;
        for (uint256 i = 0; i < seats.length; ++i) {
            if (seats[i].isActive && seats[i].dice >= minimum) {
                winners[found] = seats[i].player;
                ++found;
            }
        }
    }

    function _mostDice(BluffStorage storage $, uint256 id) private view returns (uint8 most) {
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) {
            if (seats[i].isActive && seats[i].dice > most) most = seats[i].dice;
        }
    }

    function _seatIndex(BluffStorage storage $, uint256 id, address player) private view returns (uint8 index) {
        Seat[] storage seats = $.seats[id];
        while (seats[index].player != player) ++index;
    }

    function _activeCount(BluffStorage storage $, uint256 id) private view returns (uint256 count) {
        Seat[] storage seats = $.seats[id];
        for (uint256 i = 0; i < seats.length; ++i) {
            if (seats[i].isActive) ++count;
        }
    }

    function _players(BluffStorage storage $, uint256 id) private view returns (address[] memory players) {
        Seat[] storage seats = $.seats[id];
        players = new address[](seats.length);
        for (uint256 i = 0; i < seats.length; ++i) {
            players[i] = seats[i].player;
        }
    }

    function _requireCashier(BluffStorage storage $) private view {
        if (msg.sender != address($.cashier)) revert NotCashier(msg.sender);
    }

    function _diceHandles(BluffStorage storage $, uint256 id) private view returns (bytes32[] memory handles) {
        Seat[] storage seats = $.seats[id];
        uint256 total = 0;
        for (uint256 i = 0; i < seats.length; ++i) {
            total += seats[i].currentDice.length;
        }
        handles = new bytes32[](total);
        uint256 next = 0;
        for (uint256 i = 0; i < seats.length; ++i) {
            euint8[] storage dice = seats[i].currentDice;
            for (uint256 j = 0; j < dice.length; ++j) {
                handles[next] = FHE.toBytes32(dice[j]);
                ++next;
            }
        }
    }

    function _nextActiveSeat(BluffStorage storage $, uint256 id, uint8 from) private view returns (uint8) {
        Seat[] storage seats = $.seats[id];
        uint256 count = seats.length;
        uint256 index = from;
        do {
            index = (index + 1) % count;
        } while (!seats[index].isActive);
        return uint8(index);
    }

    function _requireStatus(
        BluffStorage storage $,
        uint256 id,
        TableStatus expected
    ) private view returns (Table storage table) {
        table = $.tables[id];
        if (table.status == TableStatus.None) revert TableNotFound(id);
        if (table.status != expected) revert WrongStatus(id, table.status);
    }

    function _requireJoinable(
        BluffStorage storage $,
        uint256 id,
        address player
    ) private view returns (Table storage table) {
        table = _requireStatus($, id, TableStatus.Waiting);
        if (table.playerCount == table.seatCount) revert TableFull(id);
        if ($.barred[id][player]) revert RemovedFromTable(id);
        if (table.isPrivate && !$.invites.isInvited(id, player)) revert NotInvited(id);
        _requireNotAtTable($, player);
    }

    function _requireSeated(BluffStorage storage $, uint256 id, address player) private view {
        if ($.tables[id].status == TableStatus.None) revert TableNotFound(id);
        if ($.tableOf[player] != id) revert NotAtTable(id);
    }

    function _requireNotAtTable(BluffStorage storage $, address player) private view {
        uint256 current = $.tableOf[player];
        if (current != 0) revert AlreadyAtTable(current);
    }

    function _tableView(BluffStorage storage $, uint256 id) private view returns (TableView memory) {
        Table storage t = $.tables[id];
        return
            TableView({
                id: id,
                host: t.host,
                status: t.status,
                isPrivate: t.isPrivate,
                seatCount: t.seatCount,
                playerCount: t.playerCount,
                dicePerPlayer: t.dicePerPlayer,
                diceInPlay: t.diceInPlay,
                buyIn: t.buyIn,
                createdAt: t.createdAt,
                startedAt: t.startedAt,
                deadline: t.deadline,
                round: t.round,
                turn: t.turn,
                roundStarter: t.roundStarter,
                bidQuantity: t.bidQuantity,
                bidFace: t.bidFace,
                bidder: t.bidder,
                caller: t.caller
            });
    }

    function _decodeDice(bytes calldata clearValues, uint256 count) private pure returns (uint8[] memory values) {
        values = new uint8[](count);
        for (uint256 i = 0; i < count; ++i) {
            values[i] = uint8(uint256(bytes32(clearValues[i * 32:(i + 1) * 32])));
        }
    }

    function _faces(uint8[] memory values) private pure returns (uint8[] memory faces) {
        faces = new uint8[](values.length);
        for (uint256 i = 0; i < values.length; ++i) {
            faces[i] = BidRules.faceOf(values[i]);
        }
    }

    function _getBluffStorage() private pure returns (BluffStorage storage $) {
        assembly {
            $.slot := _BLUFF_STORAGE_LOCATION
        }
    }
}
