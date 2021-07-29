// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "./IRCTreasury.sol";

interface IRCLeaderboard {
    function treasury() external view returns (IRCTreasury);

    function addMarket(
        address _market,
        uint256 _cardCount,
        uint256 _minIncrease
    ) external;

    function updateLeaderboard(address _user, uint256 _card) external;
}
