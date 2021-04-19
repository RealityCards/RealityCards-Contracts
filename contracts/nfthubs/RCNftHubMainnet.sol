// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/// @title Reality Cards NFT Hub- mainnet side
/// @author Andrew Stanger
contract RCNftHubMainnet is Ownable, ERC721 {
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    address public mainnetProxyAddress;

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    constructor() ERC721("RealityCards", "RC") {}

    ////////////////////////////////////
    ////////// GOVERNANCE //////////////
    ////////////////////////////////////

    /// @dev address of Mainnet Proxy contract, so only this contract can mint nfts
    function setProxyMainnetAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        mainnetProxyAddress = _newAddress;
    }

    ////////////////////////////////////
    ///////// CORE FUNCTIONS ///////////
    ////////////////////////////////////

    function mintNft(
        uint256 _tokenId,
        string calldata _tokenURI,
        address _originalOwner
    ) external {
        require(msg.sender == mainnetProxyAddress, "Not proxy");
        _mint(_originalOwner, _tokenId);
        _setTokenURI(_tokenId, _tokenURI);
    }
}
