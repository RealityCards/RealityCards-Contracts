pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

interface IRCMarketXdaiV1 {

    function MAX_ITERATIONS() external view returns (uint);

    function initialize(
        uint256 _mode, 
        uint32[] calldata _timestamps,
        string[] calldata _tokenURIs,
        address _artistAddress,
        uint256 _templateId, 
        string calldata _question, 
        string calldata _tokenName
    ) external; 

}
