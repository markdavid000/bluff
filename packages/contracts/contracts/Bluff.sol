// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IBluff} from "./interfaces/IBluff.sol";

contract Bluff is IBluff, Initializable, UUPSUpgradeable, Ownable2StepUpgradeable, PausableUpgradeable {
    /// @custom:storage-location erc7201:bluff.storage.Bluff
    struct BluffStorage {
        IERC7984 chips;
    }

    bytes32 private constant _BLUFF_STORAGE_LOCATION =
        0x23b5f92c78153b667665d35bef9c2d58f327709d7637cfd5b4e5892e2333f700;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, IERC7984 chipToken) external initializer {
        if (address(chipToken) == address(0)) revert ZeroAddress();
        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        __Pausable_init();
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
        _getBluffStorage().chips = chipToken;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function chips() external view returns (IERC7984) {
        return _getBluffStorage().chips;
    }

    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    function _getBluffStorage() private pure returns (BluffStorage storage $) {
        assembly {
            $.slot := _BLUFF_STORAGE_LOCATION
        }
    }
}
