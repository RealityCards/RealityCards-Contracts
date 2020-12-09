pragma solidity 0.5.13;

interface IBridgeContract {
    function requireToPassMessage(address,bytes calldata,uint256) external;
    function messageSender() external returns (address);
}