pragma solidity ^0.5.0;

import './Cash.sol';

contract CashMockup is Cash
{

mapping (address => uint256) balances;
mapping (address => mapping (address => uint256 ) ) allowances;

function approve(address _spender, uint256 _amount) external returns (bool)
{
    allowances[_spender][msg.sender] = _amount;
    return true;
}

function balanceOf(address _owner) public view returns (uint256)
{
    return balances[_owner];
}

function faucet(uint256 _amount) external
{
    balances[msg.sender] = _amount;
}

function transfer(address _to, uint256 _amount) external returns (bool)
{   
    require (balances[msg.sender] >= _amount, "Insufficient balance");
    balances[msg.sender] = balances[msg.sender] - _amount;
    balances[_to] = balances[_to] + _amount;
    return true;
}

function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)
{
    require (allowances[msg.sender][_from] >= _amount, "Insufficient approval");
    require (balances[_from] >= _amount, "Insufficient balance");
    balances[_from] = balances[_from] - _amount;
    balances[_to] = balances[_to] + _amount;
    return true;
}
}