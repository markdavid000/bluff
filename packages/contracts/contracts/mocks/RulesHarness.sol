// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BidRules} from "../libraries/BidRules.sol";
import {NicknameRules} from "../libraries/NicknameRules.sol";
import {TableRules} from "../libraries/TableRules.sol";

contract RulesHarness {
    function isValidSeatCount(uint8 seatCount) external pure returns (bool) {
        return TableRules.isValidSeatCount(seatCount);
    }

    function dicePerPlayer(uint8 players) external pure returns (uint8) {
        return TableRules.dicePerPlayer(players);
    }

    function isValidBuyIn(uint64 buyIn) external pure returns (bool) {
        return TableRules.isValidBuyIn(buyIn);
    }

    function isValidFace(uint8 face) external pure returns (bool) {
        return BidRules.isValidFace(face);
    }

    function isValidQuantity(uint8 quantity, uint8 diceInPlay) external pure returns (bool) {
        return BidRules.isValidQuantity(quantity, diceInPlay);
    }

    function isHigher(
        uint8 quantity,
        uint8 face,
        uint8 currentQuantity,
        uint8 currentFace
    ) external pure returns (bool) {
        return BidRules.isHigher(quantity, face, currentQuantity, currentFace);
    }

    function isMaximal(uint8 quantity, uint8 face, uint8 diceInPlay) external pure returns (bool) {
        return BidRules.isMaximal(quantity, face, diceInPlay);
    }

    function faceOf(uint8 dieValue) external pure returns (uint8) {
        return BidRules.faceOf(dieValue);
    }

    function countMatching(uint8[] calldata dieValues, uint8 bidFace) external pure returns (uint8) {
        return BidRules.countMatching(dieValues, bidFace);
    }

    function isValidNickname(string calldata nickname) external pure returns (bool) {
        return NicknameRules.isValid(nickname);
    }
}
