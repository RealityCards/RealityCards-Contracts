// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";

// to test force sending Ether to Treasury

contract SelfDestructMockup
{
    function killme(address payable _address) public {
        selfdestruct(_address);
    }

    receive() external payable {}
}

