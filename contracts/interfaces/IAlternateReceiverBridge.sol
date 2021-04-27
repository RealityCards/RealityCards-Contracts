// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.4;

interface IAlternateReceiverBridge {
    function relayTokens(
        address _sender,
        address _receiver,
        uint256 _amount
    ) external payable;

    function withinLimit(uint256 _amount) external view returns (bool);
}
