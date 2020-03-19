pragma solidity 0.5.13;

import './IERC20.sol';

contract ICash is IERC20 {
    function joinMint(address usr, uint wad) public returns (bool);
    function joinBurn(address usr, uint wad) public returns (bool);
}