pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

interface IRCMarketXdaiV1 {

    function isMarket() external view returns (bool);

    function initialize(
        uint256 _mode, 
        uint32[] calldata _timestamps,
        string[] calldata _tokenURIs,
        address[] calldata _cardRecipients,
        address _artistAddress,
        address _marketCreatorAddress,
        uint256 _templateId, 
        string calldata _question, 
        string calldata _tokenName
    ) external; 

}
