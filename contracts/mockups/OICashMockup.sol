pragma solidity 0.5.13;

import "./../utils/SafeMath.sol";

// this is only for ganache testing. Public chain deployments will use the existing Augur contract. 

interface Cash 
{
    function approve(address _spender, uint256 _amount) external returns (bool);
    function balanceOf(address _ownesr) external view returns (uint256);
    function faucet(uint256 _amount) external;
    function transfer(address _to, uint256 _amount) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
    function transferFromNoApproval(address _from, address _to, uint256 _amount) external returns (bool);
}

interface IMarket 
{
    function getWinningPayoutNumerator(uint256 _outcome) external view returns (uint256);
}

contract OICashMockup

{
    using SafeMath for uint256;
    Cash public cash;

    constructor(address _addressOfCashContract) public 
    {
        cash = Cash(_addressOfCashContract);
    }

    function deposit(uint256 _amount) external returns (bool)
    { 
        cash.transferFromNoApproval(msg.sender, address(this), _amount);
        return true;
    }

    function withdraw(uint256 _amount) external returns (bool)
    { 
        cash.transferFromNoApproval(address(this), msg.sender, _amount);
    }


}