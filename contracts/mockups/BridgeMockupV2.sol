pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";

import '../interfaces/IRCOracleProxyXdai.sol';
import '../interfaces/IRCOracleProxyMainnet.sol';

// test

contract BridgeMockupV2
{
    address public oracleProxyMainnetAddress;
    address public oracleProxyXdaiAddress;
    uint public number;

    function requireToPassMessage(address _RCProxyAddress, bytes calldata _data, uint256 _gasLimit) external {
        _gasLimit;
        _RCProxyAddress;
        _data;
        number = 69;
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

