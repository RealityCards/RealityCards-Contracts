pragma solidity ^0.5.0;

import "./ERC721.sol";
import "./ERC721Enumerable.sol";
import "./ERC721Metadata.sol";

/**
 * @title Full ERC721 Token
 * This implementation includes all the required and some optional functionality of the ERC721 standard
 * Moreover, it includes approve all functionality using operator terminology
 * @dev see https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
 */
contract ERC721Full is ERC721, ERC721Enumerable, ERC721Metadata {

    address andrewsAddress;

    constructor (string memory name, string memory symbol, address _andrewsAddress) public ERC721Metadata(name, symbol) {
        andrewsAddress = _andrewsAddress;
    }

    function setup() public {
        //consider the token setup here being modified such that it enforces a match between the token ID on augur and the token ID here. Ie, use the getMarketOutcomes function within the main Augur contract to get the 'name' of each outcome, and then pass this name over to the _mint process. 
        //also, note that token 0 is not used, since this refers to an invalid outcome within Augur
        require(!init, "Already initialized");
        init = true;

        steward = msg.sender; //only the steward can make transfers
        address _originalOwner = steward;
        // mint NFT for each outcome
        _mint(_originalOwner, 1); // mint
        _setTokenURI(1, "https://en.wikipedia.org/wiki/Manchester_United_F.C.");
        _mint(_originalOwner, 2); // mint
        _setTokenURI(2, "https://en.wikipedia.org/wiki/Liverpool_F.C.");
        _mint(_originalOwner, 3); // mint
        _setTokenURI(3, "https://en.wikipedia.org/wiki/Leicester_City_F.C.");
        _mint(_originalOwner, 4); // mint
        _setTokenURI(4, "https://en.wikipedia.org/wiki/Manchester_City_F.C.");
        _mint(_originalOwner, 5); // mint
        _setTokenURI(5, "https://en.wikipedia.org/wiki/Chelsea_F.C.");
        // _mint(_originalOwner, 6); // mint
        // _setTokenURI(6, "https://en.wikipedia.org/wiki/Tottenham_Hotspur_F.C.");
        // _mint(_originalOwner, 7); // mint
        // _setTokenURI(7, "Wolverhampton Wanderers F.C.");
        // _mint(_originalOwner, 8); // mint
        // _setTokenURI(8, "https://en.wikipedia.org/wiki/Sheffield_United_F.C.");
        // _mint(_originalOwner, 9); // mint
        // _setTokenURI(9, "https://en.wikipedia.org/wiki/Crystal_Palace_F.C.");
        // _mint(_originalOwner, 10); // mint
        // _setTokenURI(10, "https://en.wikipedia.org/wiki/Arsenal_F.C.");
        // _mint(_originalOwner, 11); // mint
        // _setTokenURI(11, "https://en.wikipedia.org/wiki/Everton_F.C.");
        // _mint(_originalOwner, 12); // mint
        // _setTokenURI(12, "https://en.wikipedia.org/wiki/Southampton_F.C.");
        // _mint(_originalOwner, 13); // mint
        // _setTokenURI(13, "https://en.wikipedia.org/wiki/Newcastle_United_F.C.");
        // _mint(_originalOwner, 14); // mint
        // _setTokenURI(14, "https://en.wikipedia.org/wiki/Brighton_%26_Hove_Albion_F.C.");
        // _mint(_originalOwner, 15); // mint
        // _setTokenURI(15, "https://en.wikipedia.org/wiki/Burnley_F.C.");
        // _mint(_originalOwner, 16); // mint
        // _setTokenURI(16, "https://en.wikipedia.org/wiki/West_Ham_United_F.C.");
        // _mint(_originalOwner, 17); // mint
        // _setTokenURI(17, "https://en.wikipedia.org/wiki/Aston_Villa_F.C.");
        // _mint(_originalOwner, 18); // mint
        // _setTokenURI(18, "https://en.wikipedia.org/wiki/Bournemouth_F.C.");
        // _mint(_originalOwner, 19); // mint
        // _setTokenURI(19, "https://en.wikipedia.org/wiki/Watford_F.C.");
        // _mint(_originalOwner, 20); // mint
        // _setTokenURI(20, "https://en.wikipedia.org/wiki/Norwich_City_F.C.");
    }
}