pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";

import '../interfaces/IRCOracleProxyXdai.sol';
import '../interfaces/IRCOracleProxyMainnet.sol';

// mockup for the xdai-mainnet arbitrary message bridge, for local testing. 
// should never be deployed to a public chain. 

contract BridgeMockup
{
    address oracleProxyMainnetAddress;
    address oracleProxyXdaiAddress;

    function requireToPassMessage(address _RCProxyAddress, bytes calldata _data, uint256 _gasLimit) external {
        console.log(_RCProxyAddress);
        IRCOracleProxyMainnet _instance = IRCOracleProxyMainnet(_RCProxyAddress);
        uint _number = _instance.number();
        console.log("_number is ,",_number);
        _gasLimit;
        (bool _success, bytes memory data) = _RCProxyAddress.call.value(0)(_data);
        // (bool _success, bytes memory data) = _RCProxyAddress.call.value(0)("");
        console.log(_success);
        // console.log(data);
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

