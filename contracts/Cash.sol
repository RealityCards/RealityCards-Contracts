pragma solidity ^0.5.0;

contract localCash 
{

address a;
uint b;
mapping (address => uint256) balances;

function approve(address _spender, uint256 _amount) external returns (bool)
{
    a = _spender;
    b = _amount;
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
    balances[msg.sender] = balances[msg.sender] - _amount;
    balances[_to] = balances[_to] + _amount;
    return true;
}

function transferFrom(address _from, address _to, uint256 _amount) external returns (bool)
{
    balances[_from] = balances[_from] - _amount;
    balances[_to] = balances[_to] + _amount;
    return true;
}

}