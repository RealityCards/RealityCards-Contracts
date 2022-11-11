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
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import 'hardhat/console.sol';
import '../interfaces/IRCMarket.sol';
import '../interfaces/IRCTreasury.sol';
import '../interfaces/IRCFactory.sol';
import '../interfaces/IRCNftHubL2.sol';

/// @title Reality Cards NFT Hub- Layer 2 side
/// @author Andrew Stanger & Daniel Chilvers
contract RCNftHubL2 is
    Ownable,
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    AccessControl,
    IRCNftHubL2
{
    /*╔═════════════════════════════════╗
      ║           VARIABLES             ║
      ╚═════════════════════════════════╝*/

    uint256 public override mintCount;

    /// @dev the market each NFT belongs to
    mapping(uint256 => address) public override marketTracker;

    /// @dev keeps track of minted gloryPass nfts
    mapping(address => mapping(uint256 => bool))
        public gloryPassCollectedByUserByTokenId;

    /// @dev governance variables
    IRCFactory public factory;
    IRCTreasury public treasury;
    IERC721 public gloryPass;
    bytes32 public constant UBER_OWNER = keccak256('UBER_OWNER');
    bytes32 public constant MINTER = keccak256('MINTER');
    mapping(uint256 => bool) public withdrawnTokens;
    event TransferWithMetadata(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId,
        bytes metaData
    );
    event LogMintNFTCopy(
        uint256 _originalTokenId,
        address _newOwner,
        uint256 _newTokenId
    );

    /*╔═════════════════════════════════╗
      ║           MODIFIERS             ║
      ╚═════════════════════════════════╝*/

    modifier onlyUberOwner() {
        require(
            treasury.checkPermission(UBER_OWNER, msg.sender),
            'Not approved'
        );
        _;
    }

    /*╔═════════════════════════════════╗
      ║          CONSTRUCTOR            ║
      ╚═════════════════════════════════╝*/

    constructor(address _factoryAddress, address _gloryPassAddress)
        ERC721('RealityCards', 'RC')
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER, msg.sender);
        factory = IRCFactory(_factoryAddress);
        treasury = factory.treasury();
        gloryPass = IERC721(_gloryPassAddress);
    }

    /*╔═════════════════════════════════╗
      ║          GOVERNANCE             ║
      ╚═════════════════════════════════╝*/

    /// @dev address of RC factory contract, so only factory can mint
    function setFactory(address _newAddress) external onlyUberOwner {
        require(_newAddress != address(0), 'Must set an address');
        factory = IRCFactory(_newAddress);
        treasury = factory.treasury();
    }

    /// @dev address of Binance GloryPass contract
    function setGloryPass(address _newAddress) external onlyUberOwner {
        require(_newAddress != address(0), 'Must set an address');
        gloryPass = IERC721(_newAddress);
    }

    function setTokenURI(uint256 _tokenId, string calldata _tokenURI)
        external
        override
    {
        address _msgSender = msg.sender;
        require(
            _msgSender == address(factory) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender),
            'Not Authorised'
        );
        _setTokenURI(_tokenId, _tokenURI);
    }

    /*╔═════════════════════════════════╗
      ║        CORE FUNCTIONS           ║
      ╚═════════════════════════════════╝*/

    // FACTORY OR MINTER ONLY
    function mint(
        address _originalOwner,
        uint256 _tokenId,
        string calldata _tokenURI
    ) external override {
        require(
            !withdrawnTokens[_tokenId],
            'ChildMintableERC721: TOKEN_EXISTS_ON_ROOT_CHAIN'
        );
        require(
            msg.sender == address(factory) || hasRole(MINTER, msg.sender),
            'No permisson'
        );
        marketTracker[_tokenId] = _originalOwner;
        mintCount++;
        _mint(_originalOwner, _tokenId);
        _setTokenURI(_tokenId, _tokenURI);
    }

    function gloryPassMint(address _market, uint256 _cardId) external {
        require(gloryPass.balanceOf(msg.sender) > 0, 'No glory pass');
        require(
            !treasury.marketPaused(_market) && !treasury.globalPause(),
            'Market is Paused'
        );
        require(factory.isMarketApproved(_market), 'Market is not approved');
        IRCMarket market = IRCMarket(_market);
        require(market.state() == IRCMarket.States.WITHDRAW, 'Incorrect state');
        bool _winner = _cardId == market.winningOutcome(); // invalid outcome defaults to losing
        uint256 _tokenId = market.getTokenId(_cardId);
        require(
            !gloryPassCollectedByUserByTokenId[msg.sender][_tokenId],
            'Already claimed'
        );
        gloryPassCollectedByUserByTokenId[msg.sender][_tokenId] = true;
        uint256 _numberOfCards = IRCMarket(_market).numberOfCards();
        uint256 _tokenURIIndex;
        if (_winner) {
            _tokenURIIndex = _cardId + (_numberOfCards * 3);
        } else {
            _tokenURIIndex = _cardId + (_numberOfCards * 4);
        }
        uint256 _newTokenId = totalSupply();
        marketTracker[_newTokenId] = msg.sender;
        mintCount++;
        _mint(msg.sender, _newTokenId);
        _setTokenURI(_tokenId, tokenURI(_tokenId));
        emit LogMintNFTCopy(_tokenId, msg.sender, _newTokenId);
    }

    // MARKET ONLY
    function transferNft(
        address _currentOwner,
        address _newOwner,
        uint256 _tokenId
    ) external override {
        require(marketTracker[_tokenId] == msg.sender, 'Not market');
        _transfer(_currentOwner, _newOwner, _tokenId);
    }

    /// @notice to burn the NFT
    function burn(uint256 _tokenId) external {
        _isApprovedOrOwner(msg.sender, _tokenId);
        _burn(_tokenId);
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

        if (
            msg.sender != address(factory) &&
            msg.sender != marketTracker[tokenId]
        ) {
            IRCMarket market = IRCMarket(marketTracker[tokenId]);
            require(
                market.state() == IRCMarket.States.WITHDRAW ||
                    market.state() == IRCMarket.States.LOCKED,
                'Incorrect state'
            );
        }
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
        return
            interfaceId == type(IRCNftHubL2).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, IRCNftHubL2)
        returns (address)
    {
        return ERC721.ownerOf(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage, IRCNftHubL2)
        returns (string memory)
    {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function totalSupply()
        public
        view
        virtual
        override(ERC721Enumerable, IRCNftHubL2)
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
