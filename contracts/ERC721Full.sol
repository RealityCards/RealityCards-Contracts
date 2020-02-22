pragma solidity 0.5.13;

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

    constructor (string memory name, string memory symbol) public ERC721Metadata(name, symbol) {

    }

    function setup(address _originalOwner) public {
        require(!init, "Already initialized");
        init = true;

        harberContract = _originalOwner; //only the harber.sol contract can make transfers
        // mint NFT for each outcome
        // these URIs are NOT the production URIs and will need to be changed
        _mint(_originalOwner, 0); // mint
        _setTokenURI(0, "https://en.wikipedia.org/wiki/Manchester_United_F.C.");
        _mint(_originalOwner, 1); // mint
        _setTokenURI(1, "https://en.wikipedia.org/wiki/Liverpool_F.C.");
        _mint(_originalOwner, 2); // mint
        _setTokenURI(2, "https://en.wikipedia.org/wiki/Leicester_City_F.C.");
        _mint(_originalOwner, 3); // mint
        _setTokenURI(3, "https://en.wikipedia.org/wiki/Manchester_City_F.C.");
        _mint(_originalOwner, 4); // mint
        _setTokenURI(4, "https://en.wikipedia.org/wiki/Chelsea_F.C.");
        _mint(_originalOwner, 5); // mint
        _setTokenURI(5, "https://en.wikipedia.org/wiki/Tottenham_Hotspur_F.C.");
        _mint(_originalOwner, 6); // mint
        _setTokenURI(6, "https://en.wikipedia.org/wiki/Wolverhampton_Wanderers_F.C.");
        _mint(_originalOwner, 7); // mint
        _setTokenURI(7, "https://en.wikipedia.org/wiki/Sheffield_United_F.C.");
        _mint(_originalOwner, 8); // mint
        _setTokenURI(8, "https://en.wikipedia.org/wiki/Crystal_Palace_F.C.");
        _mint(_originalOwner, 9); // mint
        _setTokenURI(9, "https://en.wikipedia.org/wiki/Arsenal_F.C.");
        _mint(_originalOwner, 10); // mint
        _setTokenURI(10, "https://en.wikipedia.org/wiki/Everton_F.C.");
        _mint(_originalOwner, 11); // mint
        _setTokenURI(11, "https://en.wikipedia.org/wiki/Southampton_F.C.");
        _mint(_originalOwner, 12); // mint
        _setTokenURI(12, "https://en.wikipedia.org/wiki/Newcastle_United_F.C.");
        _mint(_originalOwner, 13); // mint
        _setTokenURI(13, "https://en.wikipedia.org/wiki/Brighton_%26_Hove_Albion_F.C.");
        _mint(_originalOwner, 14); // mint
        _setTokenURI(14, "https://en.wikipedia.org/wiki/Burnley_F.C.");
        _mint(_originalOwner, 15); // mint
        _setTokenURI(15, "https://en.wikipedia.org/wiki/West_Ham_United_F.C.");
        _mint(_originalOwner, 16); // mint
        _setTokenURI(16, "https://en.wikipedia.org/wiki/Aston_Villa_F.C.");
        _mint(_originalOwner, 17); // mint
        _setTokenURI(17, "https://en.wikipedia.org/wiki/Bournemouth_F.C.");
        _mint(_originalOwner, 18); // mint
        _setTokenURI(18, "https://en.wikipedia.org/wiki/Watford_F.C.");
        _mint(_originalOwner, 19); // mint
        _setTokenURI(19, "https://en.wikipedia.org/wiki/Norwich_City_F.C.");
    }
}