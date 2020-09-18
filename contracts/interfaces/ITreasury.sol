pragma solidity 0.5.13;

interface ITreasury
{
    function payout(uint256,address) external;
    function addMarket(address) external;
    function deposits(address) external returns (uint256);
    function getDepositPerMarket(uint256) external returns (uint256);
    function updateTotalRentalAmount(address,uint256,bool) external;
}