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
        require(!init, "Already initialized");
        init = true;

        steward = msg.sender; //only the steward can make transfers
        address _originalOwner = andrewsAddress;
        // mint NFT for each outcome
        _mint(_originalOwner, 0); // mint
        _setTokenURI(0, "https://en.wikipedia.org/wiki/Manchester_United_F.C.");
        _mint(_originalOwner, 1); // mint
        _setTokenURI(1, "https://en.wikipedia.org/wiki/Liverpool_F.C.");
        _mint(_originalOwner, 2); // mint
        _setTokenURI(2, "https://en.wikipedia.org/wiki/FC_Barcelona");
        _mint(_originalOwner, 3); // mint
        _setTokenURI(3, "https://en.wikipedia.org/wiki/FC_Barcelona");
        _mint(_originalOwner, 4); // mint
        _setTokenURI(4, "https://en.wikipedia.org/wiki/FC_Barcelona");
    }
}