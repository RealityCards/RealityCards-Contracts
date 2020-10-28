pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

interface IRCMarketXdaiV1 {

    function MAX_ITERATIONS() external view returns (uint);

    function initialize(
        string[] calldata _tokenURIs, 
        uint32[] calldata _timestamps,
        uint256 _templateId, 
        string calldata _question, 
        string calldata _tokenName
    ) external; 

}
