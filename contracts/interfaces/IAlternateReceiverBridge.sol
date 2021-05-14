// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

interface IAlternateReceiverBridge {
    function relayTokens(
        address _sender,
        address _receiver,
        uint256 _amount
    ) external payable;

    function withinLimit(uint256 _amount) external view returns (bool);
}
