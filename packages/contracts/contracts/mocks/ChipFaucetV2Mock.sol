// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ChipFaucet} from "../ChipFaucet.sol";

contract ChipFaucetV2Mock is ChipFaucet {
    uint256 public upgradeMarker;

    function initializeV2(uint256 marker) external reinitializer(2) {
        upgradeMarker = marker;
    }

    function version() external pure override returns (string memory) {
        return "2.0.0";
    }
}
