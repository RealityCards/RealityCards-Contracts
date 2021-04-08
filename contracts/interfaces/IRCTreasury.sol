// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IRCTreasury {
    function alternateReceiverBridgeAddress() external view returns (address);

    function factoryAddress() external view returns (address);

    function isMarket(address) external view returns (bool);

    function totalDeposits() external view returns (uint256);

    function marketPot(address) external view returns (uint256);

    function totalMarketPots() external view returns (uint256);

    function isMarketActive(address) external view returns (bool);

    function minRentalDayDivisor() external view returns (uint256);

    function maxContractBalance() external view returns (uint256);

    function globalPause() external view returns (bool);

    function marketPaused(address) external view returns (bool);

    function uberOwner() external view returns (address);

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

    function payRent(address, uint256) external returns (bool);

    function payout(address, uint256) external returns (bool);

    function sponsor() external payable returns (bool);

    function processHarbergerPayment(
        address,
        address,
        uint256
    ) external returns (bool);

    function updateLastRentalTime(address) external returns (bool);

    function userTotalBids(address) external view returns (uint256);

    function cleanUserBids(address _user) external;

    function updateUserBids(
        address _user,
        uint256 _price,
        uint256 _tokenId,
        bool _add
    ) external;

    function updateOwnership(
        address _oldOwner,
        address _newOwner,
        uint256 _oldPrice,
        uint256 _newPrice,
        uint256 _tokenId
    ) external;

    function collectRent(address _user) external;

    function updateUserTotalBids(address _user, int256 _priceChange) external;

    function updateUserRentalRate(address _user, int256 _priceChange) external;

    function updateMarketStatus(bool _open) external;

    function userDeposit(address) external view returns (uint256);
}
