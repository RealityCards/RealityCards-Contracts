// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.3;

interface IRCTreasury {
    function foreclosureTimeUser(address _user) external view returns (uint256);

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

    function setMaxContractBalance(uint256) external;

    function setMaxBidLimit(uint256 _newBidLimit) external;

    function setAlternateReceiverAddress(address _newAddress) external;

    function changeGlobalPause() external;

    function changePauseMarket(address _market) external;

    function setFactoryAddress(address _newFactory) external;

    function changeUberOwner(address _newUberOwner) external;

    function deposit(address) external payable returns (bool);

    function withdrawDeposit(uint256 _dai, bool _localWithdrawal) external;

    function payRent(uint256) external returns (bool);

    function payout(address, uint256) external returns (bool);

    function sponsor() external payable returns (bool);

    function processHarbergerPayment(
        address,
        address,
        uint256
    ) external returns (bool);

    function updateLastRentalTime(address) external returns (bool);

    function userTotalBids(address) external view returns (uint256);

    function updateRentalRate(
        address _oldOwner,
        address _newOwner,
        uint256 _oldPrice,
        uint256 _newPrice
    ) external;

    function increaseBidRate(address _user, uint256 _price) external;

    function decreaseBidRate(address _user, uint256 _price) external;

    function collectRentUserAndSettleCard(uint256 card)
        external
        returns (bool didTokenForeclose);

    function updateMarketStatus(bool _open) external;

    function userDeposit(address) external view returns (uint256);
}
