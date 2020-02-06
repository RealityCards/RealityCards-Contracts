pragma solidity 0.5.13;

import "./utils/SafeMath.sol";

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

contract ShareTokenMockup

{

    using SafeMath for uint256;
    Cash public cash;

    function publicBuyCompleteSets(IMarket _market, uint256 _amount) external returns (bool)
    {
        cash.transferFromNoApproval(msg.sender, address(this),_amount);
    }

}