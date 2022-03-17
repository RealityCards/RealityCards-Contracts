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
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "hardhat/console.sol";
import "../lib/NativeMetaTransaction.sol";

/// @title Reality Cards Achievements NFT Hub
/// @author Daniel Chilvers
contract RCAchievements is
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
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
    uint256 private splidgesSecret;

    /// @dev the market each NFT belongs to
    mapping(uint256 => address) public marketTracker;

    /// @dev governance variables
    bytes32 public constant UBER_OWNER = keccak256("UBER_OWNER");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant MINTER = keccak256("MINTER"); // 0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9
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
        uint256 tokenID
    );
    event userEligableForAchievement(address user, uint256 achievementIndex);

    /*╔═════════════════════════════════╗
      ║           MODIFIERS             ║
      ╚═════════════════════════════════╝*/

    /*╔═════════════════════════════════╗
      ║          CONSTRUCTOR            ║
      ╚═════════════════════════════════╝*/

    function initialize(address childChainManager) public initializer {
        require(
            childChainManager != address(0),
            "Must add childChainManager address"
        );
        // initialise MetaTransactions
        _initializeEIP712("RealityCardsAchievements", "1");
        __ERC721_init("RealityCardsAchievements", "RC-A");
        _setupRole(DEFAULT_ADMIN_ROLE, msgSender());
        _setupRole(MINTER, msgSender());
        _setupRole(DEPOSITOR_ROLE, childChainManager);
    }

    /*╔═════════════════════════════════╗
      ║          GOVERNANCE             ║
      ╚═════════════════════════════════╝*/

    function setTokenURI(uint256 _tokenId, string calldata _tokenURI) external {
        address _msgSender = msgSender();
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender), "Not Authorised");
        _setTokenURI(_tokenId, _tokenURI);
    }

    /// @notice Add a new achievment to the list of possible achievements
    function addAchievement(
        string memory _name,
        string memory _imageURI,
        string memory _requirements
    ) external {
        require(hasRole(MINTER, msgSender()), "Not Authorised");
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

    /// @notice Give a particular user an achievement
    /// @param user the user to award the achievement to
    /// @param achievementIndex the index of the achievement in the achievementArray to award
    function awardAchievement(address user, uint256 achievementIndex) public {
        require(hasRole(MINTER, msgSender()), "Not Authorised");
        _mint(user, mintCount);
        _setTokenURI(mintCount, achievementArray[achievementIndex].imageURI);
        emit achievementAwarded(user, achievementIndex, mintCount);
        mintCount++;
    }

    function setSecret(uint256 _input) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msgSender()), "Not Authorised");
        // TODO some manipulation to _input that isn't comitted to github
        splidgesSecret = _input;
    }

    function readSecret() internal view returns (uint256) {
        uint256 _secret = splidgesSecret;
        // TODO some manipulation to _secret that isn't comitted to github
        return _secret;
    }

    /*╔═════════════════════════════════╗
      ║        CORE FUNCTIONS           ║
      ╚═════════════════════════════════╝*/

    /// @notice Claim an achievement
    function claimAchievement(uint256 achievementIndex, bytes32 secret) public {
        uint256 secret_number = readSecret();
        address user = msgSender();
        require(
            secret ==
                keccak256(
                    abi.encodePacked(secret_number, achievementIndex, user)
                ),
            "Achievement is unavailable"
        );
        _mint(user, mintCount);
        _setTokenURI(mintCount, achievementArray[achievementIndex].imageURI);
        emit achievementAwarded(user, achievementIndex, mintCount);
        mintCount++;
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
            "ChildMintableERC721: INVALID_TOKEN_OWNER"
        );
        withdrawnTokens[tokenId] = true;
        _burn(tokenId);
    }

    function withdrawWithMetadata(uint256 tokenId) external {
        require(
            _isApprovedOrOwner(msgSender(), tokenId),
            "ChildMintableERC721: INVALID_TOKEN_OWNER"
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
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        virtual
        override(ERC721EnumerableUpgradeable, ERC721Upgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId);

        // put token movement restricions in here
    }

    function _burn(uint256 _tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(_tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(
            AccessControlUpgradeable,
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override(ERC721Upgradeable)
        returns (address)
    {
        return ERC721Upgradeable.ownerOf(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC721URIStorageUpgradeable.tokenURI(tokenId);
    }

    function totalSupply()
        public
        view
        virtual
        override(ERC721EnumerableUpgradeable)
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
