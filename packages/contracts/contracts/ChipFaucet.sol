// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IChipFaucet} from "./interfaces/IChipFaucet.sol";
import {IMintableERC20} from "./interfaces/IMintableERC20.sol";

contract ChipFaucet is IChipFaucet, Initializable, UUPSUpgradeable, Ownable2StepUpgradeable, PausableUpgradeable {
    /// @custom:storage-location erc7201:bluff.storage.ChipFaucet
    struct ChipFaucetStorage {
        IERC7984ERC20Wrapper chips;
        IMintableERC20 dollars;
    }

    bytes32 private constant _CHIP_FAUCET_STORAGE_LOCATION =
        0x0e050407d3d414cfacdc6be26afb1d6afead96e5025155e10212f610e9bebe00;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        IERC7984ERC20Wrapper chipToken,
        IMintableERC20 dollarToken
    ) external initializer {
        if (address(chipToken) == address(0) || address(dollarToken) == address(0)) revert ZeroAddress();
        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        __Pausable_init();
        ChipFaucetStorage storage $ = _getChipFaucetStorage();
        $.chips = chipToken;
        $.dollars = dollarToken;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function chips() external view returns (IERC7984ERC20Wrapper) {
        return _getChipFaucetStorage().chips;
    }

    function dollars() external view returns (IMintableERC20) {
        return _getChipFaucetStorage().dollars;
    }

    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    function _getChipFaucetStorage() private pure returns (ChipFaucetStorage storage $) {
        assembly {
            $.slot := _CHIP_FAUCET_STORAGE_LOCATION
        }
    }
}
