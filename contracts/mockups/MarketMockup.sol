pragma solidity 0.5.13;

// this is only for ganache testing. Public chain deployments will use the existing markets. 

contract MarketMockup
{
    // 69 = unresolved, 0 = invalid, 1 = win, 2 = loss
    uint result = 69;

    function setResult(uint _result) public
    {
        result = _result;
    }

    function getWinningPayoutNumerator(uint256 _outcome) external view returns (uint256) 
    {
        if (result == _outcome)
        {
            return 1;
        }
        else 
        {
            return 0;
        }
    }
}
