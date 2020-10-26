pragma solidity 0.5.13;

interface IRCMarketXdaiV1 {

    function initialize(
        address _owner,
        uint256 _numberOfTokens, 
        uint32[] calldata _timestamps,
        uint256 _templateId, 
        string calldata _question, 
        string calldata _tokenName
    ) external; 

}
