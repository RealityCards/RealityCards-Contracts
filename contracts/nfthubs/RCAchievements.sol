// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;
/*
██████╗ ███████╗ █████╗ ██╗     ██╗████████╗██╗   ██╗ ██████╗ █████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██║     ██║╚══██╔══╝╚██╗ ██╔╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
██████╔╝█████╗  ███████║██║     ██║   ██║    ╚████╔╝ ██║     ███████║██████╔╝██║  ██║███████╗
██╔══██╗██╔══╝  ██╔══██║██║     ██║   ██║     ╚██╔╝  ██║     ██╔══██║██╔══██╗██║  ██║╚════██║
██║  ██║███████╗██║  ██║███████╗██║   ██║      ██║   ╚██████╗██║  ██║██║  ██║██████╔╝███████║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝      ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝ 
*/
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import 'hardhat/console.sol';
import '../lib/NativeMetaTransaction.sol';

/// @title Reality Cards Achievements NFT Hub
/// @author Daniel Chilvers
contract RCAchievements is
    Ownable,
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    AccessControl,
    NativeMetaTransaction
{
    /*╔═════════════════════════════════╗
      ║           VARIABLES             ║
      ╚═════════════════════════════════╝*/

    uint256 public mintCount;
    struct Achievement {
        string name;
        string imageURI;
        string requirements;
    }
    Achievement[] public achievementArray;
    mapping(address => uint256[]) public userAchievements;
    mapping(address => mapping(uint256 => bool)) userEligable;

    /// @dev the market each NFT belongs to
    mapping(uint256 => address) public marketTracker;

    /// @dev governance variables
    bytes32 public constant UBER_OWNER = keccak256('UBER_OWNER');
    bytes32 public constant DEPOSITOR_ROLE = keccak256('DEPOSITOR_ROLE');
    bytes32 public constant MINTER = keccak256('MINTER');
    mapping(uint256 => bool) public withdrawnTokens;
    event TransferWithMetadata(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId,
        bytes metaData
    );
    event newAchievement(
        uint256 achievementIndex,
        string name,
        string imageURI,
        string requirements
    );
    event achievementAwarded(
        address user,
        uint256 achievementIndex,
        uint256 tokenId
    );
    event userEligableForAchievement(address user, uint256 achievementIndex);

    /*╔═════════════════════════════════╗
      ║           MODIFIERS             ║
      ╚═════════════════════════════════╝*/

    /*╔═════════════════════════════════╗
      ║          CONSTRUCTOR            ║
      ╚═════════════════════════════════╝*/

    constructor(address childChainManager) ERC721('RealityCards', 'RC') {
        require(
            childChainManager != address(0),
            'Must add childChainManager address'
        );
        // initialise MetaTransactions
        _initializeEIP712('RealityCardsNftHubL2', '1');
        _setupRole(DEFAULT_ADMIN_ROLE, msgSender());
        _setupRole(MINTER, msgSender());
        _setupRole(DEPOSITOR_ROLE, childChainManager);
    }

    /*╔═════════════════════════════════╗
      ║          GOVERNANCE             ║
      ╚═════════════════════════════════╝*/

    function setTokenURI(uint256 _tokenId, string calldata _tokenURI) external {
        address _msgSender = msgSender();
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender), 'Not Authorised');
        _setTokenURI(_tokenId, _tokenURI);
    }

    function addAchievement(
        string memory _name,
        string memory _imageURI,
        string memory _requirements
    ) external {
        achievementArray.push(
            Achievement({
                name: _name,
                imageURI: _imageURI,
                requirements: _requirements
            })
        );
        uint256 achievementIndex = achievementArray.length - 1;
        emit newAchievement(achievementIndex, _name, _imageURI, _requirements);
    }

    function awardAchievement(address user, uint256 achievementIndex) public {
        _mint(user, mintCount);
        _setTokenURI(mintCount, achievementArray[achievementIndex].imageURI);
        emit achievementAwarded(user, achievementIndex, mintCount);
        mintCount++;
    }

    function allowAchievement(address user, uint256 achievementIndex) public {
        userEligable[user][achievementIndex] = true;
        emit userEligableForAchievement(user, achievementIndex);
    }

    /*╔═════════════════════════════════╗
      ║        CORE FUNCTIONS           ║
      ╚═════════════════════════════════╝*/

    function claimAchievement(uint256 achievementIndex) public {
        awardAchievement(msgSender(), achievementIndex);
    }

    function viewAchievement(uint256 achievementIndex)
        external
        view
        returns (
            string memory,
            string memory,
            string memory
        )
    {
        return (
            achievementArray[achievementIndex].name,
            achievementArray[achievementIndex].imageURI,
            achievementArray[achievementIndex].requirements
        );
    }

    // MARKET ONLY
    function transfer(
        address _currentOwner,
        address _newOwner,
        uint256 _tokenId
    ) external {
        _transfer(_currentOwner, _newOwner, _tokenId);
    }

    /// @notice to burn the NFT
    function burn(uint256 _tokenId) external {
        _isApprovedOrOwner(msgSender(), _tokenId);
        _burn(_tokenId);
    }

    /*╔═════════════════════════════════╗
      ║        MATIC MINTABLE           ║
      ╚═════════════════════════════════╝*/

    function deposit(address user, bytes calldata depositData)
        external
        onlyRole(DEPOSITOR_ROLE)
    {
        // deposit single
        if (depositData.length == 32) {
            uint256 tokenId = abi.decode(depositData, (uint256));
            withdrawnTokens[tokenId] = false;
            _mint(user, tokenId);

            // deposit batch
        } else {
            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
            uint256 length = tokenIds.length;
            for (uint256 i = 0; i < length; i++) {
                withdrawnTokens[tokenIds[i]] = false;
                _mint(user, tokenIds[i]);
            }
        }
    }

    function withdraw(uint256 tokenId) external {
        require(
            _isApprovedOrOwner(msgSender(), tokenId),
            'ChildMintableERC721: INVALID_TOKEN_OWNER'
        );
        withdrawnTokens[tokenId] = true;
        _burn(tokenId);
    }

    function withdrawWithMetadata(uint256 tokenId) external {
        require(
            _isApprovedOrOwner(msgSender(), tokenId),
            'ChildMintableERC721: INVALID_TOKEN_OWNER'
        );
        withdrawnTokens[tokenId] = true;

        // Encoding metadata associated with tokenId & emitting event
        emit TransferWithMetadata(
            ownerOf(tokenId),
            address(0),
            tokenId,
            this.encodeTokenMetadata(tokenId)
        );

        _burn(tokenId);
    }

    function encodeTokenMetadata(uint256 tokenId)
        external
        view
        virtual
        returns (bytes memory)
    {
        return abi.encode(tokenURI(tokenId));
    }

    /*╔═════════════════════════════════╗
      ║           OVERRIDES             ║
      ╚═════════════════════════════════╝*/
    /// @dev ensures NFTs can only be moved when market is resolved
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable, ERC721) {
        super._beforeTokenTransfer(from, to, tokenId);

        // put token movement restricions in here
    }

    function _burn(uint256 _tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(_tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override(ERC721)
        returns (address)
    {
        return ERC721.ownerOf(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function totalSupply()
        public
        view
        virtual
        override(ERC721Enumerable)
        returns (uint256)
    {
        /// @dev for our purposes the NFTs minted is more useful than the NFTs in circulation
        /// @dev overriding totalSupply (which can decrement) with mintCount which only increases
        /// @dev always giving a fresh tokenId to mint to.
        return mintCount;
    }

    /*
         ▲  
        ▲ ▲ 
              */
}
