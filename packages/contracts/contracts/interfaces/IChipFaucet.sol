// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {IMintableERC20} from "./IMintableERC20.sol";

interface IChipFaucet {
    error ZeroAddress();

    function pause() external;

    function unpause() external;

    function chips() external view returns (IERC7984ERC20Wrapper);

    function dollars() external view returns (IMintableERC20);

    function version() external pure returns (string memory);
}
