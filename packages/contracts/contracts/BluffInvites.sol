// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IBluff} from "./interfaces/IBluff.sol";
import {IBluffInvites} from "./interfaces/IBluffInvites.sol";

contract BluffInvites is IBluffInvites, Initializable, UUPSUpgradeable, Ownable2StepUpgradeable, PausableUpgradeable {
    /// @custom:storage-location erc7201:bluff.storage.BluffInvites
    struct BluffInvitesStorage {
        IBluff bluff;
        mapping(uint256 tableId => euint64) codes;
        mapping(uint256 tableId => mapping(address player => ebool)) attempts;
        mapping(uint256 tableId => mapping(address player => uint8)) tries;
        mapping(uint256 tableId => mapping(address player => bool)) invited;
    }

    uint8 public constant MAX_TRIES = 3;

    bytes32 private constant _BLUFF_INVITES_STORAGE_LOCATION =
        0x52be405ae8e3852f7938856bf58c07d0240e35f789a73d189be20c3163fabb00;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, IBluff game) external initializer {
        if (address(game) == address(0)) revert ZeroAddress();
        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        __Pausable_init();
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
        _getBluffInvitesStorage().bluff = game;
    }

    function newCode(uint256 id, address host) external {
        BluffInvitesStorage storage $ = _getBluffInvitesStorage();
        if (msg.sender != address($.bluff)) revert NotBluff(msg.sender);
        euint64 code = FHE.randEuint64();
        $.codes[id] = FHE.allow(FHE.allowThis(code), host);
        $.invited[id][host] = true;
        emit CodeCreated(id, host);
    }

    function tryCode(uint256 id, externalEuint64 guess, bytes calldata proof) external whenNotPaused {
        BluffInvitesStorage storage $ = _getBluffInvitesStorage();
        euint64 code = $.codes[id];
        if (!FHE.isInitialized(code)) revert NoCode(id);
        if ($.invited[id][msg.sender]) revert AlreadyInvited(id);
        uint8 tries = $.tries[id][msg.sender];
        if (tries >= MAX_TRIES) revert TooManyTries(id);
        ebool matches = FHE.eq(code, FHE.fromExternal(guess, proof));
        $.attempts[id][msg.sender] = FHE.makePubliclyDecryptable(FHE.allowThis(matches));
        $.tries[id][msg.sender] = ++tries;
        emit CodeTried(id, msg.sender, tries);
    }

    function confirmCode(
        uint256 id,
        address player,
        bytes calldata clearValues,
        bytes calldata proof
    ) external whenNotPaused {
        BluffInvitesStorage storage $ = _getBluffInvitesStorage();
        ebool attempt = $.attempts[id][player];
        if (!FHE.isInitialized(attempt)) revert NoAttempt(id, player);
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(attempt);
        FHE.checkSignatures(handles, clearValues, proof);
        $.attempts[id][player] = ebool.wrap(0);
        if (abi.decode(clearValues, (bool))) {
            $.invited[id][player] = true;
            FHE.allow($.codes[id], player);
            emit Invited(id, player);
        } else {
            emit CodeRejected(id, player);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function isInvited(uint256 id, address player) external view returns (bool) {
        return _getBluffInvitesStorage().invited[id][player];
    }

    function codeOf(uint256 id) external view returns (euint64) {
        return _getBluffInvitesStorage().codes[id];
    }

    function attemptOf(uint256 id, address player) external view returns (ebool) {
        return _getBluffInvitesStorage().attempts[id][player];
    }

    function triesOf(uint256 id, address player) external view returns (uint8) {
        return _getBluffInvitesStorage().tries[id][player];
    }

    function bluff() external view returns (IBluff) {
        return _getBluffInvitesStorage().bluff;
    }

    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    function _getBluffInvitesStorage() private pure returns (BluffInvitesStorage storage $) {
        assembly {
            $.slot := _BLUFF_INVITES_STORAGE_LOCATION
        }
    }
}
