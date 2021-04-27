// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.4;

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

    function maxRentIterations() external returns (uint256);

    function setminimumPriceIncreasePercent(uint256 _percentIncrease) external;

    function setHotPotatoPayment(uint256 _newDivisor) external;

    function setNFTMintingLimit(uint256 _mintLimit) external;

    function setMaxRentIterations(uint256 _rentLimit) external;
}
