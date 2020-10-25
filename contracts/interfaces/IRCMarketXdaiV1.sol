pragma solidity 0.5.13;

interface IRCMarketXdaiV1 {

    function initialize(
        address _owner,
        uint256 _numberOfTokens, 
        uint256 _templateId, 
        string calldata _question, 
        address _arbitrator, 
        string calldata _tokenName
    ) external; 

}
