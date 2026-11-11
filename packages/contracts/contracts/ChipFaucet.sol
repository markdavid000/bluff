// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IChipFaucet} from "./interfaces/IChipFaucet.sol";
import {IMintableERC20} from "./interfaces/IMintableERC20.sol";
import {NicknameRules} from "./libraries/NicknameRules.sol";

contract ChipFaucet is
    IChipFaucet,
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardTransient
{
    /// @custom:storage-location erc7201:bluff.storage.ChipFaucet
    struct ChipFaucetStorage {
        IERC7984ERC20Wrapper chips;
        IMintableERC20 dollars;
        mapping(address player => string) nicknames;
        mapping(address player => uint64) nextClaimAt;
    }

    uint64 public constant CLAIM_CHIPS = 100 * 1e6;
    uint64 public constant CLAIM_INTERVAL = 24 hours;

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

    function claim(string calldata nickname) external whenNotPaused nonReentrant {
        ChipFaucetStorage storage $ = _getChipFaucetStorage();
        uint64 allowedAt = $.nextClaimAt[msg.sender];
        if (block.timestamp < allowedAt) revert ClaimTooSoon(allowedAt);
        if (bytes(nickname).length != 0) _setNickname($, nickname);
        uint64 next = uint64(block.timestamp) + CLAIM_INTERVAL;
        $.nextClaimAt[msg.sender] = next;
        uint256 dollarAmount = uint256(CLAIM_CHIPS) * $.chips.rate();
        $.dollars.mint(address(this), dollarAmount);
        SafeERC20.forceApprove($.dollars, address($.chips), dollarAmount);
        euint64 minted = $.chips.wrap(msg.sender, dollarAmount);
        emit ChipsClaimed(msg.sender, minted, next);
    }

    function setNickname(string calldata nickname) external {
        _setNickname(_getChipFaucetStorage(), nickname);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function nicknameOf(address player) external view returns (string memory) {
        return _getChipFaucetStorage().nicknames[player];
    }

    function nextClaimAt(address player) external view returns (uint64) {
        return _getChipFaucetStorage().nextClaimAt[player];
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

    function _setNickname(ChipFaucetStorage storage $, string calldata nickname) private {
        if (!NicknameRules.isValid(nickname)) revert InvalidNickname();
        $.nicknames[msg.sender] = nickname;
        emit NicknameSet(msg.sender, nickname);
    }

    function _getChipFaucetStorage() private pure returns (ChipFaucetStorage storage $) {
        assembly {
            $.slot := _CHIP_FAUCET_STORAGE_LOCATION
        }
    }
}
