// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IRCTreasury
{
    function userDeposit(address) external returns (uint256);

    function addMarket(address) external;
    function setMinRental(uint256 _newDivisor) external;
    function setMaxContractBalance() external;
    function setMaxBidLimit(uint256 _newBidLimit) external;
    function setAlternateReceiverAddress(address _newAddress) external;
    function changeGlobalPause() external;
    function changePauseMarket(address _market) external;
    function setFactoryAddress(address _newFactory) external;
    function changeUberOwner(address _newUberOwner) external;
    function deposit(address) external payable returns (bool);
    function withdrawDeposit(uint256 _dai, bool _localWithdrawal) external;
    function payRent(address,uint256) external returns (bool);
    function payout(address,uint256) external returns (bool);
    function sponsor() external payable returns (bool);
    function processHarbergerPayment(address,address,uint256) external returns (bool);
    function updateLastRentalTime(address) external returns (bool);
    function userTotalBids(address) external returns (uint256);
    function cleanUserBids(address _user) external;
    function updateUserBids(address _user, uint256 _price, uint256 _tokenId, bool _add) external;
    function updateUserOwnership(address _user, uint256 _price, uint256 _tokenId, bool _add) external;
    function updateUserTotalBids(address _user, uint256 _price, bool _add) external;
    function updateUserRentalRate(address _user, uint256 _price, bool _add) external;
    function updateMarketStatus(bool _open) external;
} 