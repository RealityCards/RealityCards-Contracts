// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.3;

import "./IRealitio.sol";
import "./IRCTreasury.sol";
import "./IRCProxyXdai.sol";
import "./IRCNftHubXdai.sol";
import "./IRCOrderbook.sol";

interface IRCFactory {
    function proxy() external returns (IRCProxyXdai);

    function nfthub() external returns (IRCNftHubXdai);

    function treasury() external returns (IRCTreasury);

    function orderbook() external returns (IRCOrderbook);

    function getPotDistribution() external returns (uint256[5] memory);

    function minimumPriceIncreasePercent() external returns (uint256);

    function trapIfUnapproved() external returns (bool);

    function isMarketApproved(address) external returns (bool);

    function hotPotatoWeekDivisor() external returns (uint256);
}
