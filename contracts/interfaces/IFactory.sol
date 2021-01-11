pragma solidity 0.5.13;

import "./IRealitio.sol";
import "./ITreasury.sol";
import './IRCProxyXdai.sol';
import './IRCNftHub.sol';

interface IFactory
{
    function realitio() external returns (IRealitio);
    function proxy() external returns (IRCProxyXdai);
    function nfthub() external returns (IRCNftHub);
    function treasury() external returns (ITreasury);
    function realitioTimeout() external returns (uint32);
    function arbitrator() external returns (address);
    function deposit() external payable returns(bool);
    function getPotDistribution() external returns(uint256[5] memory);
    function minimumPriceIncrease() external returns (uint256);
    function trapIfUnapproved() external returns(bool);
    function isMarketApproved(address) external returns(bool);
}