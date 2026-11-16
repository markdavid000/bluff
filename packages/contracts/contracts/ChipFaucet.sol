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
import {AvatarRules} from "./libraries/AvatarRules.sol";
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
        mapping(address player => uint8) avatars;
        mapping(address player => string) avatarImages;
        mapping(bytes32 nameKey => address owner) nicknameOwners;
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
        _checkClaimAllowed($);
        if (bytes(nickname).length != 0) _setNickname($, nickname);
        _claim($);
    }

    function claimWithAvatar(string calldata nickname, uint8 avatar) external whenNotPaused nonReentrant {
        ChipFaucetStorage storage $ = _getChipFaucetStorage();
        _checkClaimAllowed($);
        if (bytes(nickname).length != 0) _setNickname($, nickname);
        _setAvatar($, avatar);
        _claim($);
    }

    function setNickname(string calldata nickname) external {
        _setNickname(_getChipFaucetStorage(), nickname);
    }

    function setAvatar(uint8 avatar) external {
        _setAvatar(_getChipFaucetStorage(), avatar);
    }

    function setAvatarImage(string calldata image) external {
        if (!AvatarRules.isValidImage(image)) revert InvalidAvatarImage();
        ChipFaucetStorage storage $ = _getChipFaucetStorage();
        $.avatars[msg.sender] = 0;
        $.avatarImages[msg.sender] = image;
        emit AvatarSet(msg.sender, 0, image);
    }

    function reserveExistingNicknames(address[] calldata players) external onlyOwner {
        ChipFaucetStorage storage $ = _getChipFaucetStorage();
        for (uint256 i = 0; i < players.length; ++i) {
            address player = players[i];
            string memory nickname = $.nicknames[player];
            if (bytes(nickname).length == 0) continue;
            bytes32 key = NicknameRules.keyOf(nickname);
            if ($.nicknameOwners[key] != address(0)) continue;
            $.nicknameOwners[key] = player;
            emit NicknameReserved(player, nickname);
        }
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

    function isNicknameTaken(string calldata nickname, address asker) external view returns (bool) {
        address holder = _getChipFaucetStorage().nicknameOwners[NicknameRules.keyOf(nickname)];
        return holder != address(0) && holder != asker;
    }

    function nextClaimAt(address player) external view returns (uint64) {
        return _getChipFaucetStorage().nextClaimAt[player];
    }

    function avatarOf(address player) external view returns (uint8 preset, string memory image) {
        ChipFaucetStorage storage $ = _getChipFaucetStorage();
        return ($.avatars[player], $.avatarImages[player]);
    }

    function chips() external view returns (IERC7984ERC20Wrapper) {
        return _getChipFaucetStorage().chips;
    }

    function dollars() external view returns (IMintableERC20) {
        return _getChipFaucetStorage().dollars;
    }

    function version() external pure virtual returns (string memory) {
        return "1.2.0";
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    function _claim(ChipFaucetStorage storage $) private {
        uint64 next = uint64(block.timestamp) + CLAIM_INTERVAL;
        $.nextClaimAt[msg.sender] = next;
        uint256 dollarAmount = uint256(CLAIM_CHIPS) * $.chips.rate();
        $.dollars.mint(address(this), dollarAmount);
        SafeERC20.forceApprove($.dollars, address($.chips), dollarAmount);
        euint64 minted = $.chips.wrap(msg.sender, dollarAmount);
        emit ChipsClaimed(msg.sender, minted, next);
    }

    function _setAvatar(ChipFaucetStorage storage $, uint8 avatar) private {
        if (!AvatarRules.isValidPreset(avatar)) revert InvalidAvatar(avatar);
        $.avatars[msg.sender] = avatar;
        delete $.avatarImages[msg.sender];
        emit AvatarSet(msg.sender, avatar, "");
    }

    function _setNickname(ChipFaucetStorage storage $, string calldata nickname) private {
        if (!NicknameRules.isValid(nickname)) revert InvalidNickname();
        bytes32 key = NicknameRules.keyOf(nickname);
        address holder = $.nicknameOwners[key];
        if (holder != address(0) && holder != msg.sender) revert NicknameTaken();
        string memory previous = $.nicknames[msg.sender];
        if (bytes(previous).length != 0) {
            bytes32 previousKey = NicknameRules.keyOf(previous);
            if (previousKey != key && $.nicknameOwners[previousKey] == msg.sender) {
                delete $.nicknameOwners[previousKey];
            }
        }
        $.nicknameOwners[key] = msg.sender;
        $.nicknames[msg.sender] = nickname;
        emit NicknameSet(msg.sender, nickname);
    }

    function _checkClaimAllowed(ChipFaucetStorage storage $) private view {
        uint64 allowedAt = $.nextClaimAt[msg.sender];
        if (block.timestamp < allowedAt) revert ClaimTooSoon(allowedAt);
    }

    function _getChipFaucetStorage() private pure returns (ChipFaucetStorage storage $) {
        assembly {
            $.slot := _CHIP_FAUCET_STORAGE_LOCATION
        }
    }
}
