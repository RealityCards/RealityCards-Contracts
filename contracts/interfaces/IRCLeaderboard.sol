// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "./IRCTreasury.sol";
import "./IRCMarket.sol";

interface IRCLeaderboard {
    function treasury() external view returns (IRCTreasury);

    function market() external view returns (IRCMarket);

    function addMarket(
        address _market,
        uint256 _cardCount,
        uint256 _minIncrease
    ) external;

    function updateLeaderboard(
        address _user,
        uint256 _card,
        uint256 _timeHeld
    ) external;

    function claimNFT(address _user, uint256 _card) external;
}
