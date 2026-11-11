// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

interface IBluff {
    error ZeroAddress();

    function pause() external;

    function unpause() external;

    function chips() external view returns (IERC7984);

    function version() external pure returns (string memory);
}
