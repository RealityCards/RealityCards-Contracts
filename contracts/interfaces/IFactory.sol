pragma solidity 0.5.13;

import "./ICash.sol";
import "./IRealitio.sol";
import "./ITreasury.sol";
import './IRCOracleProxyXdai.sol';

interface IFactory
{
    function realitio() external returns (IRealitio);
    function oracleProxy() external returns (IRCOracleProxyXdai);
    function cash() external returns (ICash);
    function treasury() external returns (ITreasury);
    function realitioTimeout() external returns (uint32);
    function arbitrator() external returns (address);
    function deposit() external payable returns(bool);
    function getPotDistribution() external returns(uint256[5] memory);
    function minimumPriceIncrease() external returns (uint256);
}