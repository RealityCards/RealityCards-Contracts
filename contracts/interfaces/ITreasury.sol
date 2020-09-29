pragma solidity 0.5.13;

interface ITreasury
{
    function payout(address,uint256) external;
    function payRent(address,uint256) external;
    function addMarket(address) external;
    function deposits(address) external returns (uint256);
    function getDepositPerMarket(address,uint256) external view returns (uint256);
    function updateTotalRentalAmount(address,uint256,bool) external;
    function setFactoryAddress(address) external returns(bool);
}