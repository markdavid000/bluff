// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {IMintableERC20} from "./IMintableERC20.sol";

interface IChipFaucet {
    event ChipsClaimed(address indexed player, euint64 amount, uint64 nextClaimAt);
    event NicknameSet(address indexed player, string nickname);

    error ZeroAddress();
    error ClaimTooSoon(uint64 nextClaimAt);
    error InvalidNickname();

    function claim(string calldata nickname) external;

    function setNickname(string calldata nickname) external;

    function pause() external;

    function unpause() external;

    function nicknameOf(address player) external view returns (string memory);

    function nextClaimAt(address player) external view returns (uint64);

    function chips() external view returns (IERC7984ERC20Wrapper);

    function dollars() external view returns (IMintableERC20);

    function version() external pure returns (string memory);
}
