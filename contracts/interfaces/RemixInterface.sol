pragma solidity 0.5.13;

interface RealityCardsInterface {

    function nftMintCount() external view returns(uint); 
    function state() external view returns(uint);
    function numberOfTokens() external view returns(uint); 
    function questionId() external view returns(bytes32); 
    function ownerOf(uint) external view returns(address); 
    function timeHeld(uint,address) external view returns(uint);
    function totalTimeHeld(uint) external view returns(uint);
    function totalCollected() external view returns(uint);
    function marketLockingTime() external view returns(uint);
    function marketExpectedResolutionTime() external view returns(uint);
    function oracleResolutionTime() external view returns(uint);
    function price(uint) external view returns (uint);
    function timeLastCollected(uint) external view returns (uint);
    function owner() external view returns(address);
    function mintNfts(string calldata _uri) external;
    function lockMarket() external;
    function sponsor(uint) external;
    function determineWinner() external ;
    function determineWinner2(uint) external ;
    function withdraw() external ;
    function withdrawDepositAfterMarketEnded() external;
    function collectRentAllTokens() external;
    function newRental(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) external ;
    function depositDai(uint256 _dai, uint256 _tokenId) external ;
    function changePrice(uint256 _newPrice, uint256 _tokenId) external ;
    function withdrawDeposit(uint256 _daiToWithdraw, uint256 _tokenId) external ;
    function exit(uint256 _tokenId) external;
    function circuitBreaker() external ;
    function tokenURI(uint256) external view returns (string memory) ;
    function winningOutcome() external view returns (uint);
    function transferOwnership(address newOwner) external;
    function test(address _to, uint256 tokenId) external;

}

