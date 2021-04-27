// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.4;

interface IBridge {
    function requireToPassMessage(
        address,
        bytes calldata,
        uint256
    ) external;

    function messageSender() external returns (address);
}
