// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";

contract DaiMockup
{

    function approve(address _address, uint256 _amount) pure external returns(bool) {
        _address;
        _amount;
        return true;
    }

    function transferFrom(address,address,uint256) public pure returns(bool) {
        return true;
    }
}

