// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IBluff} from "./IBluff.sol";

interface IBluffCashier {
    event PaymentRecorded(uint256 indexed id, address indexed player, euint64 paid);
    event Refunded(uint256 indexed id, address indexed player, euint64 amount);
    event PotPaid(uint256 indexed id, address indexed winner, euint64 amount);

    error ZeroAddress();
    error NotBluff(address caller);
    error UnauthorizedCallback(address caller);
    error InvalidCallbackData();

    function publishPayments(uint256 id, address[] calldata players) external;

    function refund(uint256 id, address player) external;

    function payOut(uint256 id, address[] calldata winners) external;

    function pause() external;

    function unpause() external;

    function paymentHandles(uint256 id, address[] calldata players) external view returns (bytes32[] memory);

    function paymentOf(uint256 id, address player) external view returns (euint64);

    function chips() external view returns (IERC7984);

    function bluff() external view returns (IBluff);

    function version() external pure returns (string memory);
}
