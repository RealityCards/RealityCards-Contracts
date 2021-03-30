// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";

import '../interfaces/IRCProxyXdai.sol';
import '../interfaces/IRCProxyMainnet.sol';

// this is only for ganache testing. Public chain deployments will use the existing Realitio contracts. 

contract AlternateReceiverBridgeMockup
{

    receive() external payable {}

    function relayTokens(address _notused, address _RCProxyAddress, uint256 _amount) payable external {
        _notused;
        address payable _recipient = address(uint160(_RCProxyAddress));
        (bool _success, ) = _recipient.call{value:_amount}("");
        require(_success, "Transfer failed");
    }
}

