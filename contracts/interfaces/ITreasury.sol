pragma solidity 0.5.13;

interface ITreasury
{
    function payout(address,uint256) external;
    function payRent(address,uint256) external;
    function addMarket(address) external;
    function deposits(address) external returns (uint256);
    function setFactoryAddress(address) external returns(bool);
    function newRental(address,uint256,uint256) external;
    function cardSpecificDeposits(address,address,uint256) external returns(uint256);
}