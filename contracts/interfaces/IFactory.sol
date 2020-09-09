pragma solidity 0.5.13;

import "./ICash.sol";
import "./IRealitio.sol";

interface IFactory
{
    function realitio() external returns (IRealitio);
    function cash() external returns (ICash);
}