// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "./IRealitio.sol";
import "./ITreasury.sol";
import './IRCProxyXdai.sol';
import './IRCNftHubXdai.sol';

interface IFactory
{
    function realitio() external returns (IRealitio);
    function proxy() external returns (IRCProxyXdai);
    function nfthub() external returns (IRCNftHubXdai);
    function treasury() external returns (ITreasury);
    function realitioTimeout() external returns (uint32);
    function arbitrator() external returns (address);
    function deposit() external payable returns(bool);
    function getPotDistribution() external returns(uint256[5] memory);
    function minimumPriceIncreasePercent() external returns (uint256);
    function trapIfUnapproved() external returns(bool);
    function isMarketApproved(address) external returns(bool);
    function hotPotatoWeekDivisor() external returns (uint256);
}