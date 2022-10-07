// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

/// @title timeKeeper contract interface
interface ITimeKeeper {
    function latestTimestamp() external view returns (uint256);
}
