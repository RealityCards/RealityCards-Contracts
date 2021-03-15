// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IBridge {
    function requireToPassMessage(address,bytes calldata,uint256) external;
    function messageSender() external returns (address);
}