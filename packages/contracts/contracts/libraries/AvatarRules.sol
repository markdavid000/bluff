// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library AvatarRules {
    uint8 internal constant PRESET_COUNT = 12;
    uint256 internal constant MAX_IMAGE_LENGTH = 100;

    function isValidPreset(uint8 avatar) internal pure returns (bool) {
        return avatar >= 1 && avatar <= PRESET_COUNT;
    }

    function isValidImage(string memory image) internal pure returns (bool) {
        bytes memory characters = bytes(image);
        uint256 length = characters.length;
        if (length == 0 || length > MAX_IMAGE_LENGTH) return false;
        for (uint256 i = 0; i < length; ++i) {
            bytes1 character = characters[i];
            bool allowed =
                (character >= "a" && character <= "z") ||
                    (character >= "A" && character <= "Z") ||
                    (character >= "0" && character <= "9");
            if (!allowed) return false;
        }
        return true;
    }
}
