// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IBluff} from "./interfaces/IBluff.sol";
import {IBluffCashier} from "./interfaces/IBluffCashier.sol";

contract BluffCashier is
    IBluffCashier,
    IERC7984Receiver,
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardTransient
{
    struct Payment {
        euint64 paid;
        ebool paidInFull;
    }

    /// @custom:storage-location erc7201:bluff.storage.BluffCashier
    struct BluffCashierStorage {
        IERC7984 chips;
        IBluff bluff;
        mapping(uint256 tableId => euint64) pots;
        mapping(uint256 tableId => mapping(address player => Payment)) payments;
    }

    uint256 private constant _CALLBACK_DATA_LENGTH = 160;

    bytes32 private constant _BLUFF_CASHIER_STORAGE_LOCATION =
        0xf339d2d708221ea7d7471cf53406388dda3e8b1f13ca3cf4121719034efa9200;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, IERC7984 chipToken, IBluff game) external initializer {
        if (address(chipToken) == address(0) || address(game) == address(0)) revert ZeroAddress();
        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        __Pausable_init();
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
        BluffCashierStorage storage $ = _getBluffCashierStorage();
        $.chips = chipToken;
        $.bluff = game;
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external whenNotPaused nonReentrant returns (ebool) {
        BluffCashierStorage storage $ = _getBluffCashierStorage();
        if (msg.sender != address($.chips)) revert UnauthorizedCallback(msg.sender);
        if (data.length != _CALLBACK_DATA_LENGTH) revert InvalidCallbackData();
        IBluff.JoinRequest memory request = abi.decode(data, (IBluff.JoinRequest));
        (uint256 id, uint64 tableBuyIn) = $.bluff.seatPaidPlayer(from, request);
        ebool paidInFull = _recordPayment($, id, from, amount, tableBuyIn);
        $.bluff.startIfFull(id);
        return FHE.allowTransient(paidInFull, msg.sender);
    }

    function publishPayments(uint256 id, address[] calldata players) external {
        BluffCashierStorage storage $ = _getBluffCashierStorage();
        _requireBluff($);
        for (uint256 i = 0; i < players.length; ++i) {
            Payment storage payment = $.payments[id][players[i]];
            payment.paidInFull = FHE.makePubliclyDecryptable(payment.paidInFull);
        }
    }

    function refund(uint256 id, address player) external nonReentrant {
        BluffCashierStorage storage $ = _getBluffCashierStorage();
        _requireBluff($);
        euint64 paid = $.payments[id][player].paid;
        delete $.payments[id][player];
        $.pots[id] = FHE.allowThis(FHE.sub($.pots[id], paid));
        euint64 sent = $.chips.confidentialTransfer(player, FHE.allowTransient(paid, address($.chips)));
        emit Refunded(id, player, sent);
    }

    function payOut(uint256 id, address[] calldata winners) external nonReentrant {
        BluffCashierStorage storage $ = _getBluffCashierStorage();
        _requireBluff($);
        euint64 pot = $.pots[id];
        $.pots[id] = euint64.wrap(0);
        uint64 shares = uint64(winners.length);
        euint64 share = FHE.div(pot, shares);
        euint64 firstShare = FHE.add(share, FHE.rem(pot, shares));
        address token = address($.chips);
        for (uint256 i = 0; i < winners.length; ++i) {
            euint64 amount = FHE.allowTransient(i == 0 ? firstShare : share, token);
            euint64 sent = $.chips.confidentialTransfer(winners[i], amount);
            emit PotPaid(id, winners[i], sent);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function paymentHandles(uint256 id, address[] calldata players) external view returns (bytes32[] memory handles) {
        BluffCashierStorage storage $ = _getBluffCashierStorage();
        handles = new bytes32[](players.length);
        for (uint256 i = 0; i < players.length; ++i) {
            handles[i] = FHE.toBytes32($.payments[id][players[i]].paidInFull);
        }
    }

    function paymentOf(uint256 id, address player) external view returns (euint64) {
        return _getBluffCashierStorage().payments[id][player].paid;
    }

    function chips() external view returns (IERC7984) {
        return _getBluffCashierStorage().chips;
    }

    function bluff() external view returns (IBluff) {
        return _getBluffCashierStorage().bluff;
    }

    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    function _recordPayment(
        BluffCashierStorage storage $,
        uint256 id,
        address player,
        euint64 amount,
        uint64 buyIn
    ) private returns (ebool paidInFull) {
        paidInFull = FHE.allow(FHE.allowThis(FHE.eq(amount, buyIn)), player);
        euint64 paid = FHE.select(paidInFull, amount, FHE.asEuint64(0));
        paid = FHE.allow(FHE.allowThis(paid), player);
        $.payments[id][player] = Payment(paid, paidInFull);
        $.pots[id] = FHE.allowThis(FHE.add($.pots[id], paid));
        emit PaymentRecorded(id, player, paid);
    }

    function _requireBluff(BluffCashierStorage storage $) private view {
        if (msg.sender != address($.bluff)) revert NotBluff(msg.sender);
    }

    function _getBluffCashierStorage() private pure returns (BluffCashierStorage storage $) {
        assembly {
            $.slot := _BLUFF_CASHIER_STORAGE_LOCATION
        }
    }
}
