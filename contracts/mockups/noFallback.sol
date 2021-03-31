// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";
import "../interfaces/IRCTreasury.sol";

// to test denying a value transfer

contract noFallback {
    function deposit(address payable _address) public payable {
        (bool _success, ) = _address.call{value: msg.value}("");
        _success;
    }

    function withdrawDeposit(address _address, uint256 _amount) public {
        IRCTreasury treasury = IRCTreasury(_address);
        treasury.withdrawDeposit(_amount, true);
    }
}
