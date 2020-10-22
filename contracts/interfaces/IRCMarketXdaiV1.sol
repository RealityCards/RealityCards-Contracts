pragma solidity 0.5.13;

/// @title Reality Cards Market
/// @author Andrew Stanger

interface IRCMarketXdaiV1 {

    function initialize(
        address _owner,
        uint256 _numberOfTokens, 
        uint32 _marketLockingTime,
        uint32 _oracleResolutionTime, 
        uint256 _templateId, 
        string calldata _question, 
        address _arbitrator, 
        uint32 _timeout,
        string calldata _tokenName
    ) external; 

}
