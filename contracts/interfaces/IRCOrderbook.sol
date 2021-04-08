// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IRCOrderbook {
    function addBidToOrderbook(
        address _user,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        address _prevUserAddress
    ) external;

    function removeBidFromOrderbook(address _user, uint256 _token) external;

    function findNextBid(
        address _user,
        address _market,
        uint256 _token
    ) external view returns (address _newUser, uint256 _newPrice);

    function getBidValue(address _user, uint256 _token)
        external
        view
        returns (uint256);

    function adjustedBidRate(address _user, uint256 _token)
        external
        view
        returns (uint256);

    function removeUserFromOrderbook(address _user) external;

    function removeMarketFromUser(
        address _user,
        address _market,
        uint256[] calldata _tokens
    ) external;
}
