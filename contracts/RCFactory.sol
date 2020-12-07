pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/ITreasury.sol";
import './interfaces/IRCMarketXdaiV1.sol';
import './interfaces/IRCOracleProxyXdai.sol';

/// @title Reality Cards Factory
/// @author Andrew Stanger

contract RCFactory is Ownable, CloneFactory {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    ITreasury public treasury;
    IRCOracleProxyXdai public oracleProxy;

    ///// CONTRACT ADDRESSES /////
    // reference contract
    address public referenceContractAddress; 
    // market addresses, mode // address
    mapping(uint256 => address[]) public marketAddresses;
    mapping(address => bool) public mappingOfMarkets; // not used for anything 

    ///// ADJUSTABLE PARAMETERS /////
    // artist / winner / market creator / affiliate / card specific affiliate
    uint256[5] public potDistribution;
    uint256 public sponsorshipRequired;
    // so markets can be hidden from the interface
    mapping(address => bool) public hiddenMarkets;
    // adjust required price increase
    uint256 public minimumPriceIncrease;

    ///// MARKET CREATION /////
    bool public marketCreatorWhitelistEnabled = true;
    mapping(address => bool) public marketCreatorWhitelist;

    ///// UBER OWNER /////
    /// @dev high level owner who can change the factory address
    address public uberOwner;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogMarketCreated(address contractAddress, address treasuryAddress, string[] tokenURIs, uint32[] timestamps, uint256 mode, string ipfsHash);
    event LogMarketHidden(address market);

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    /// @dev Treasury must be deployed before Factory
    constructor(ITreasury _treasuryAddress) public 
    {
        // at initiation, uberOwner and owner will be the same
        uberOwner = msg.sender;

        // initialise contract variable
        treasury = _treasuryAddress;

        // initialise market parameters
        // artist // winner // creator // affiliate // card specific affiliates
        updatePotDistribution(20,0,0,20,100); // 2% artist, 2% affiliate, 10% card specific affiliate default
        updateMinimumPriceIncrease(10); // 10% default
    }

    ////////////////////////////////////
    ///////// VIEW FUNCTIONS ///////////
    ////////////////////////////////////

    function getMostRecentMarket(uint256 _mode) public view returns (address) {
        return marketAddresses[_mode][marketAddresses[_mode].length-1];
    }

    function getAllMarkets(uint256 _mode) public view returns (address[] memory) {
        return marketAddresses[_mode];
    }

    function getPotDistribution() public view returns (uint256[5] memory) {
        return potDistribution;
    }

    ////////////////////////////////////
    //////////// GOVERNANCE ////////////
    ////////////////////////////////////

    /// CALLED WITHIN CONSTRUCTOR (public)

    /// @dev in 10s of basis points (so 1000 = 100%)
    function updatePotDistribution(uint256 _artistCut, uint256 _winnerCut, uint256 _creatorCut, uint256 _affiliateCut, uint256 _cardSpecificAffiliateCut) public onlyOwner {
        require(_artistCut.add(_affiliateCut).add(_creatorCut).add(_winnerCut).add(_affiliateCut).add(_cardSpecificAffiliateCut) <= 1000, "Cuts too big");
        potDistribution[0] = _artistCut;
        potDistribution[1] = _winnerCut;
        potDistribution[2] = _creatorCut;
        potDistribution[3] = _affiliateCut;
        potDistribution[4] = _cardSpecificAffiliateCut;
    }

    /// @dev in %
    function updateMinimumPriceIncrease(uint256 _percentIncrease) public onlyOwner {
        minimumPriceIncrease = _percentIncrease;
    }

    /// NOT CALLED WITHIN CONSTRUCTOR (external)

    /// @notice add or remove an address from market creator whitelist
    function addOrRemoveMarketCreator(address _marketCreator) external onlyOwner {
        marketCreatorWhitelist[_marketCreator] = marketCreatorWhitelist[_marketCreator] ? false : true;
    }

    /// @notice allows createMarket to be called by anyone
    /// @dev if called again will enable it again
    function enableOrDisableMarketCreatorWhitelist() external onlyOwner {
        marketCreatorWhitelistEnabled = marketCreatorWhitelistEnabled ? false : true;
    }

    function updateSponsorshipRequired(uint256 _dai) external onlyOwner {
        sponsorshipRequired = _dai;
    }

    function hideOrUnhideMarket(address _market) external onlyOwner {
        hiddenMarkets[_market] = hiddenMarkets[_market] ? false : true;
        emit LogMarketHidden(_market);
    }

    function updateOracleProxyXdaiAddress(IRCOracleProxyXdai _newAddress) external onlyOwner {
        oracleProxy = _newAddress;
    }

    ////////////////////////////////////
    ///////////// UPGRADES /////////////
    ////////////////////////////////////
    /// @dev deploying and setting a new reference contract is effectively an upgrade
    /// @dev only the uber owner can do this, which can be set to burn address to relinquish upgrade ability
    /// @dev ... while maintaining governance over adjustable parameters

    /// @notice set the reference contract for the contract logic
    function setReferenceContractAddress(address _newAddress) external {
        require(msg.sender == uberOwner, "Access denied");
        // check it's an RC contract
        IRCMarketXdaiV1 newContractVariable = IRCMarketXdaiV1(_newAddress);
        assert(newContractVariable.isMarket());
        // set 
        referenceContractAddress = _newAddress;
    }

    function changeUberOwner(address _newUberOwner) external {
        require(msg.sender == uberOwner, "Access denied");
        uberOwner = _newUberOwner;
    }

    ////////////////////////////////////
    //////// MARKET CREATION ///////////
    ////////////////////////////////////

    /// @notice create a new market
    function createMarket(
        uint32 _mode,
        string memory _ipfsHash,
        uint32[] memory _timestamps,
        string[] memory _tokenURIs,
        address _artistAddress,
        address _affiliateAddress,
        address[] memory _cardSpecificAffiliateAddresses,
        string memory _realitioQuestion,
        string memory _tokenName
    ) public payable returns (address)  {
        require(msg.value >= sponsorshipRequired, "Insufficient sponsorship");

        if (marketCreatorWhitelistEnabled) {
            require(marketCreatorWhitelist[msg.sender] || owner() == msg.sender, "Not approved");
        }

        address _newAddress = createClone(referenceContractAddress);
        IRCMarketXdaiV1(_newAddress).initialize({
            _mode: _mode,
            _timestamps: _timestamps,
            _tokenURIs: _tokenURIs,
            _artistAddress: _artistAddress,
            _affiliateAddress: _affiliateAddress,
            _cardSpecificAffiliateAddresses: _cardSpecificAffiliateAddresses,
            _marketCreatorAddress: msg.sender,
            _tokenName: _tokenName
        });

        // post question to Oracle
        require(address(oracleProxy) != address(0), "xDai proxy not set");
        oracleProxy.sendQuestionToBridge(_newAddress, _realitioQuestion, _timestamps[2]);

        // tell Treasury about new market
        assert(treasury.addMarket(_newAddress));

        // update internals
        marketAddresses[_mode].push(_newAddress);
        mappingOfMarkets[_newAddress] = true;

        // pay sponsorship, if applicable
        if (msg.value > 0) {
            IRCMarketXdaiV1(_newAddress).sponsor.value(msg.value)();
        }

        emit LogMarketCreated(address(_newAddress), address(treasury), _tokenURIs, _timestamps,  _mode, _ipfsHash);
        return _newAddress;
    }

}

