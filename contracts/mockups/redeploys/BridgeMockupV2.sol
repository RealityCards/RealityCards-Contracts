// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "hardhat/console.sol";

import "../../interfaces/IRCProxyXdai.sol";
import "../../interfaces/IRCProxyMainnet.sol";

// a mockup to test changing the proxy, this is as per the original has a new number variable which is read
contract BridgeMockupV2 {
    address public oracleProxyMainnetAddress;
    address public oracleProxyXdaiAddress;
    uint256 public number;

    function requireToPassMessage(
        address _RCProxyAddress,
        bytes calldata _data,
        uint256 _gasLimit
    ) external {
        _gasLimit;
        _RCProxyAddress;
        _data;
        number = 69;
    }

    function messageSender() external view returns (address) {
        if (msg.sender == oracleProxyMainnetAddress) {
            return oracleProxyXdaiAddress;
        } else {
            return oracleProxyMainnetAddress;
        }
    }

    function setProxyMainnetAddress(address _newAddress) external {
        oracleProxyMainnetAddress = _newAddress;
    }

    function setProxyXdaiAddress(address _newAddress) external {
        oracleProxyXdaiAddress = _newAddress;
    }
}
