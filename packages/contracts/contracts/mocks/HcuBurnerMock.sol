// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract HcuBurnerMock is ZamaEthereumConfig {
    euint64 public last;

    function burnDeep(uint256 multiplications) external {
        euint64 value = FHE.randEuint64();
        for (uint256 i = 0; i < multiplications; ++i) {
            value = FHE.mul(value, FHE.randEuint64());
        }
        last = FHE.allowThis(value);
    }

    function burnWide(uint256 multiplications) external {
        euint64 value = FHE.randEuint64();
        for (uint256 i = 0; i < multiplications; ++i) {
            last = FHE.allowThis(FHE.mul(value, FHE.randEuint64()));
        }
    }
}
