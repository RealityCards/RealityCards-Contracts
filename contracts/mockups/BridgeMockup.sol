pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";

import '../interfaces/IRCProxyXdai.sol';
import '../interfaces/IRCProxyMainnet.sol';

// this is only for ganache testing. Public chain deployments will use the existing Realitio contracts. 

contract BridgeMockup
{
    address public oracleProxyMainnetAddress;
    address public oracleProxyXdaiAddress;

    function requireToPassMessage(address _RCProxyAddress, bytes calldata _data, uint256 _gasLimit) external {
        _gasLimit;
        (bool _success, ) = _RCProxyAddress.call.value(0)(_data);
        _success;
    }

    function messageSender() external view returns(address)  {
        if (msg.sender == oracleProxyMainnetAddress) {
            return oracleProxyXdaiAddress;
        } else {
            return oracleProxyMainnetAddress;
        }
    }

    function setOracleProxyMainnetAddress(address _newAddress) external {
        oracleProxyMainnetAddress = _newAddress;
    }

    function setOracleProxyXdaiAddress(address _newAddress) external {
        oracleProxyXdaiAddress = _newAddress;
    }
}

