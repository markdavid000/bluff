// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library BidRules {
    uint8 internal constant WILD_FACE = 1;
    uint8 internal constant MIN_BID_FACE = 2;
    uint8 internal constant MAX_FACE = 6;

    function isValidFace(uint8 face) internal pure returns (bool) {
        return face >= MIN_BID_FACE && face <= MAX_FACE;
    }

    function isValidQuantity(uint8 quantity, uint8 diceInPlay) internal pure returns (bool) {
        return quantity >= 1 && quantity <= diceInPlay;
    }

    function isHigher(
        uint8 quantity,
        uint8 face,
        uint8 currentQuantity,
        uint8 currentFace
    ) internal pure returns (bool) {
        if (currentQuantity == 0) return true;
        return quantity > currentQuantity || (quantity == currentQuantity && face > currentFace);
    }

    function isMaximal(uint8 quantity, uint8 face, uint8 diceInPlay) internal pure returns (bool) {
        return quantity == diceInPlay && face == MAX_FACE;
    }

    function faceOf(uint8 dieValue) internal pure returns (uint8) {
        return dieValue + 1;
    }

    function countMatching(uint8[] memory dieValues, uint8 bidFace) internal pure returns (uint8 count) {
        for (uint256 i = 0; i < dieValues.length; ++i) {
            uint8 face = faceOf(dieValues[i]);
            if (face == bidFace || face == WILD_FACE) ++count;
        }
    }
}
