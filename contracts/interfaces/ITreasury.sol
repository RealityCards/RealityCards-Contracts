// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface ITreasury
{
    function payout(address,uint256) external returns (bool);
    function payRent(address,uint256) external returns (bool);
    function addMarket(address) external;
    function userDeposit(address) external returns (uint256);
    function setFactoryAddress() external returns(bool);
    function allocateCardSpecificDeposit(address,address,uint256,uint256) external returns (bool);
    function processHarbergerPayment(address,address,uint256) external returns (bool);
    function cardSpecificDeposits(address,address,uint256) external returns(uint256);
    function deposit(address) external payable returns (bool);
    function sponsor() external payable returns (bool);
    function hotPotatoWeekDivisor() external payable returns (uint256);
    function updateUserBid(address _user, uint256 _tokenId, uint256 _price) external returns (bool);
    function updateMarketStatus(bool _open) external;
    function userTotalBids(address) external returns (uint256);
    function updateLastRentalTime(address) external returns (bool);
    function minRentalDayDivisor() external returns (uint256);
    function maxContractBalance() external returns (uint256);
    function marketPaused(address _market) external returns(bool);
    function globalPause() external returns(bool);
    function cleanUserBidArray(address _user) external;
} 