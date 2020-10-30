pragma solidity 0.5.13;

interface ITreasury
{
    function payout(address,uint256) external returns (bool);
    function payRent(address,uint256,uint256,bool) external returns (bool);
    function addMarket(address) external returns (bool);
    function deposits(address) external returns (uint256);
    function depositViaMarket(address) external payable returns (bool);
    function setFactoryAddress(address) external returns(bool);
    function allocateCardSpecificDeposit(address,address,uint256,uint256) external returns (bool);
    function cardSpecificDeposits(address,address,uint256) external returns(uint256);
}