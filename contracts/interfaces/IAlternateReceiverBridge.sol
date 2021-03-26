// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IAlternateReceiverBridge {
    function relayTokens(address _sender, address _receiver, uint256 _amount) payable external;
    function withinLimit(uint256 _amount) external view returns (bool);
}