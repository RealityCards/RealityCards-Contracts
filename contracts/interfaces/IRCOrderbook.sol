// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IRCOrderbook {
    function addMarket(
        address _market,
        uint256 _tokenCount,
        uint256 _minIncrease
    ) external;

    function addBidToOrderbook(
        address _user,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        address _prevUserAddress
    ) external;

    function removeBidFromOrderbook(address _user, uint256 _token) external;

    function findNewOwner(uint256 _token) external returns (address _newOwner);

    function findNextBid(
        address _user,
        address _market,
        uint256 _token
    ) external view returns (address _newUser, uint256 _newPrice);

    function getBidValue(address _user, uint256 _token)
        external
        view
        returns (uint256);

    function getTimeHeldlimit(address _user, uint256 _token)
        external
        returns (uint256);

    function setTimeHeldlimit(
        address _user,
        uint256 _token,
        uint256 _timeHeldLimit
    ) external;

    function removeUserFromOrderbook(address _user) external;

    function foreclosureTime(address _user)
        external
        returns (uint256 _foreclosureTime);

    function removeMarketFromUser(
        address _user,
        address _market,
        uint256[] calldata _tokens
    ) external;

    function collectRentOwnedCards(address _user) external;
}