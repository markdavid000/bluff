// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IBluff} from "./IBluff.sol";

interface IBluffInvites {
    event CodeCreated(uint256 indexed id, address indexed host);
    event CodeTried(uint256 indexed id, address indexed player, uint8 tries);
    event Invited(uint256 indexed id, address indexed player);
    event CodeRejected(uint256 indexed id, address indexed player);

    error ZeroAddress();
    error NotBluff(address caller);
    error NoCode(uint256 id);
    error AlreadyInvited(uint256 id);
    error TooManyTries(uint256 id);
    error NoAttempt(uint256 id, address player);

    function newCode(uint256 id, address host) external;

    function tryCode(uint256 id, externalEuint64 guess, bytes calldata proof) external;

    function confirmCode(uint256 id, address player, bytes calldata clearValues, bytes calldata proof) external;

    function pause() external;

    function unpause() external;

    function isInvited(uint256 id, address player) external view returns (bool);

    function codeOf(uint256 id) external view returns (euint64);

    function attemptOf(uint256 id, address player) external view returns (ebool);

    function triesOf(uint256 id, address player) external view returns (uint8);

    function bluff() external view returns (IBluff);

    function version() external pure returns (string memory);
}
