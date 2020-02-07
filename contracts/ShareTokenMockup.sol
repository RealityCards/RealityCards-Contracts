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

contract IMarket 
{
    function getWinningPayoutNumerator(uint256 _outcome) external view returns (uint256) 
    {
        return 0;
    }
}


contract ShareTokenMockup

{
    using SafeMath for uint256;
    Cash public cash;
    IMarket[20] public market;

    constructor(address _addressOfCashContract) public 
    {
        cash = Cash(_addressOfCashContract);
    }

    function publicBuyCompleteSets(IMarket _market, uint256 _amount) external returns (bool)
    { 
        uint _amountToBuy = _amount.mul(100);
        cash.transferFromNoApproval(msg.sender, address(this), _amountToBuy);
        return true;
    }

    function publicSellCompleteSets(IMarket _market, uint256 _amount) external returns (uint256 _creatorFee, uint256 _reportingFee)
    { 
        uint _amountToSell = _amount.mul(100);
        cash.transferFromNoApproval(address(this), msg.sender, _amountToSell);
    }


}