pragma solidity 0.5.13;
import "./interfaces/IERC721Full.sol";

//this is done in a seperate contract. Originally it was within Harber.sol, but 
//deployment used over 10m gas so I had to seperate it. 
contract MintNFTs {

    // CONTRACT VARIABLES
    IERC721Full public team; // ERC721 NFT.

    constructor(address _addressOfToken, address _harberContractAddress) public {
        //initialise ERC721s
        team = IERC721Full(_addressOfToken);

        //mint the NFTs and pass the Harber contract address so the contract is set as the original owner
        team.setup(_harberContractAddress);
    }
}
