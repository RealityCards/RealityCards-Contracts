pragma solidity 0.6.6;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Harber Tokens Contract
/// @dev split into its own contract because otherwise 24kB limit is hit
/// @author Andrew Stanger

contract Token is ERC721 {

    address private owner;
    bool ownerSet;

    constructor() ERC721("realitycards.io", "RC") public {} 

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice assign ownership to RC contract
    function setOwner() external {
        require(!ownerSet, "Owner already set");
        ownerSet = true;
        owner = msg.sender;
    }

    /// @notice mints and sets URIs
    function mint(address _owner, uint _tokenId, string calldata _uri) external onlyOwner {
        _mint(_owner, _tokenId);
        _setTokenURI(_tokenId, _uri);
    }

    /// @notice all transfer must pass through this function. 
    function transferRcOnly(address _currentOwner, address _newOwner, uint256 _tokenId) external onlyOwner {
        _transfer(_currentOwner, _newOwner, _tokenId);
    }

    /// @dev prevent anyone other than RC contract from making transfers
    function transferFrom(address from, address to, uint256 tokenId) override public {
        require(false, "Only the contract can make transfers");
        from;
        to;
        tokenId;
    }
    /// @dev prevent anyone other than RC contract from making transfers
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) override public {
        require(false, "Only the contract can make transfers");
        from;
        to;
        tokenId;
        _data;
    }
}

