pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";

import '../interfaces/IRCOracleProxyXdai.sol';
import '../interfaces/IRCOracleProxyMainnet.sol';

// this is only for ganache testing. Public chain deployments will use the existing Realitio contracts. 

contract BridgeMockup
{
    function requireToPassMessage(address _RCProxyAddress, bytes calldata _data, uint256 _gasLimit) external {
        _gasLimit;
        (bool _success, ) = _RCProxyAddress.call.value(0)(_data);
        _success;
    }
}

