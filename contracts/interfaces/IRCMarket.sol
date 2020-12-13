pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

interface IRCMarket {

    function isMarket() external view returns (bool);
    function sponsor() external payable;

    function initialize(
        uint256 _mode, 
        uint32[] calldata _timestamps,
        string[] calldata _tokenURIs,
        uint256 _totalNftMintCount,
        address _artistAddress,
        address _affiliateAddress,
        address[] calldata _cardSpecificAffiliateAddresses,
        address _marketCreatorAddress,
        string calldata _tokenName
    ) external; 

    function tokenURI(uint256) external view returns (string memory);  
    function ownerOf(uint256 tokenId) external view returns  (address);

}
