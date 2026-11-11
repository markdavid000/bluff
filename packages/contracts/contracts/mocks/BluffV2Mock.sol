// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Bluff} from "../Bluff.sol";

contract BluffV2Mock is Bluff {
    uint256 public upgradeMarker;

    function initializeV2(uint256 marker) external reinitializer(2) {
        upgradeMarker = marker;
    }

    function version() external pure override returns (string memory) {
        return "2.0.0";
    }
}
