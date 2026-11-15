// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library TableRules {
    uint8 internal constant MIN_SEATS = 2;
    uint8 internal constant MAX_SEATS = 4;
    uint8 internal constant DICE_BUDGET = 6;
    uint8 internal constant MAX_MISSED_TURNS = 2;

    uint64 internal constant CHIP_UNIT = 1e6;
    uint64 internal constant LOBBY_LIMIT = 10 minutes;
    uint64 internal constant TURN_LIMIT = 75 seconds;
    uint64 internal constant VERIFICATION_LIMIT = 10 minutes;
    uint64 internal constant STUCK_REVEAL_LIMIT = 10 minutes;
    uint64 internal constant GAME_CLOCK = 15 minutes;

    function isValidSeatCount(uint8 seatCount) internal pure returns (bool) {
        return seatCount >= MIN_SEATS && seatCount <= MAX_SEATS;
    }

    function dicePerPlayer(uint8 players) internal pure returns (uint8) {
        return DICE_BUDGET - players;
    }

    function isValidBuyIn(uint64 buyIn) internal pure returns (bool) {
        return buyIn == 0 || buyIn == 10 * CHIP_UNIT || buyIn == 25 * CHIP_UNIT || buyIn == 50 * CHIP_UNIT;
    }
}
