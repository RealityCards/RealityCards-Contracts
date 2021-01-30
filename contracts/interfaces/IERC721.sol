pragma solidity 0.5.13;

interface IERC721 {

    function mintNft(uint256,string calldata,address) external;
    function ownerOf(uint256 _tokenId) external view returns (address);
    function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
}
