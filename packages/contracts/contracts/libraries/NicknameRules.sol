// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library NicknameRules {
    uint256 internal constant MIN_LENGTH = 3;
    uint256 internal constant MAX_LENGTH = 20;

    function isValid(string memory nickname) internal pure returns (bool) {
        bytes memory characters = bytes(nickname);
        uint256 length = characters.length;
        if (length < MIN_LENGTH || length > MAX_LENGTH) return false;
        if (characters[0] == " " || characters[length - 1] == " ") return false;
        for (uint256 i = 0; i < length; ++i) {
            if (!_isAllowed(characters[i])) return false;
            if (i > 0 && characters[i] == " " && characters[i - 1] == " ") return false;
        }
        return true;
    }

    function keyOf(string memory nickname) internal pure returns (bytes32) {
        bytes memory lowered = bytes(nickname);
        bytes memory copy = new bytes(lowered.length);
        for (uint256 i = 0; i < lowered.length; ++i) {
            bytes1 character = lowered[i];
            copy[i] = character >= "A" && character <= "Z" ? bytes1(uint8(character) + 32) : character;
        }
        return keccak256(copy);
    }

    function _isAllowed(bytes1 character) private pure returns (bool) {
        return
            (character >= "a" && character <= "z") ||
            (character >= "A" && character <= "Z") ||
            (character >= "0" && character <= "9") ||
            character == " " ||
            character == "_" ||
            character == "-";
    }
}
