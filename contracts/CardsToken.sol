// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import "hardhat/console.sol";

contract CardsToken is ERC20PresetFixedSupply {
    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        address owner
    ) ERC20PresetFixedSupply(name, symbol, supply, owner) {}
}
