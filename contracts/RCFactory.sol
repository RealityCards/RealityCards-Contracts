pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/IRealitio.sol";
import "./interfaces/ITreasury.sol";
import './interfaces/IRCMarketXdaiV1.sol';

/// @title Reality Cards Factory
/// @author Andrew Stanger

contract RCFactory is Ownable, CloneFactory {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    IRealitio public realitio;
    ITreasury public treasury;

    ///// CONTRACT ADDRESSES /////
    // version implied by position
    mapping(uint256 => address[]) public referenceContractAddresses; 
    mapping(uint256 => address[]) public marketAddresses;
    mapping(address => bool) public mappingOfMarkets; //not currently used

    ///// MARKET PARAMETERS /////
    uint32 public realitioTimeout;
    address public arbitrator;
    uint256[2] public potDistribution;

    ///// MARKET CREATION /////
    bool marketCreatorWhitelistEnabled;
    mapping(address => bool) public marketCreatorWhitelist;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogMarketCreated(address contractAddress, address treasuryAddress, string[] tokenURIs, uint32[] timestamps, uint256 mode, uint256 version, string ipfsHash);
    event LogNewReferenceContract(address contractAddress, uint256 mode, uint256 version);

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    /// @dev Treasury must be deployed before Factory
    /// @dev Realitio address is passed for testing on mock realitio contract
    constructor(ITreasury _treasuryAddress, IRealitio _realitio) public 
    {
        treasury = _treasuryAddress;
        Ownable.initialize(msg.sender);

        // initialise market parameters
        updateRealitioTimeout(86400); // 24 hours
        updateRealitioAddress(IRealitio(_realitio));
        updateArbitrator(0xA6EAd513D05347138184324392d8ceb24C116118); // kleros
        updatePotDistribution(0,0); // 0% artist, 0% market creators
    }

    ////////////////////////////////////
    ///////// VIEW FUNCTIONS ///////////
    ////////////////////////////////////

    function getMostRecentReferenceContract(uint256 _mode) public view returns (address) {
        return referenceContractAddresses[_mode][referenceContractAddresses[_mode].length-1];
    }

    function getAllReferenceContracts(uint256 _mode) public view returns (address[] memory) {
        return referenceContractAddresses[_mode];
    }

    function getMostRecentMarket(uint256 _mode) public view returns (address) {
        return marketAddresses[_mode][marketAddresses[_mode].length-1];
    }

    function getAllMarkets(uint256 _mode) public view returns (address[] memory) {
        return marketAddresses[_mode];
    }

    function getPotDistribution() public view returns (uint256[2] memory) {
        return potDistribution;
    }

    ////////////////////////////////////
    /////// REFERENCE CONTRACT /////////
    ////////////////////////////////////

    /// @notice set the reference contract for the contract logic
    /// @dev automatically increments version number if we 'upgrade' the contract
    function setReferenceContractAddress(uint256 _mode, address _referenceContractAddress) public onlyOwner {
        // check its an RC contract by reading the one constant
        IRCMarketXdaiV1 newContractVariable = IRCMarketXdaiV1(_referenceContractAddress);
        assert(newContractVariable.isMarket());
        // push new reference contracts
        referenceContractAddresses[_mode].push(_referenceContractAddress);
        uint256 _version = referenceContractAddresses[_mode].length-1;
        emit LogNewReferenceContract(_referenceContractAddress, _mode, _version);
    }

    ////////////////////////////////////
    /////// MARKET PARAMETERS //////////
    ////////////////////////////////////
    /// @dev governance functions

    function updateRealitioTimeout(uint32 _newTimeout) public onlyOwner {
        require(_newTimeout >= 86400, "24 hours min");
        realitioTimeout = _newTimeout;
    }

    function updateRealitioAddress(IRealitio _newRealitioAddress) public onlyOwner {
        realitio = IRealitio(_newRealitioAddress);
    }

    function updateArbitrator(address _newArbitrator) public onlyOwner {
        arbitrator = _newArbitrator;
    } 

    /// @dev in basis points
    function updatePotDistribution(uint256 _artistCut, uint256 _creatorCut) public onlyOwner {
        require(_artistCut + _creatorCut <= 100, "Arist/creator cut too big");
        potDistribution[0] = _artistCut;
        potDistribution[1] = _creatorCut;
    }

    /// @notice add or remove an address from market creator whitelist
    function updateMarketCreatorWhitelist(address _marketCreator) public onlyOwner {
        if (!marketCreatorWhitelist[_marketCreator]) {
            marketCreatorWhitelist[_marketCreator] = true;
        } else {
            marketCreatorWhitelist[_marketCreator] = false;
        }
    }

    /// @notice allows createMarket to be called by anyone
    /// @dev if called again will enable it again
    function disableMarketCreatorWhitelist() public onlyOwner {
        if (marketCreatorWhitelistEnabled) {
            marketCreatorWhitelistEnabled = false;
        } else {
            marketCreatorWhitelistEnabled = true;
        }
    }

    ////////////////////////////////////
    /////// MARKET PARAMETERS //////////
    ////////////////////////////////////

    /// @notice create a new market
    function createMarket(
        uint32 _mode,
        string memory _ipfsHash,
        uint32[] memory _timestamps,
        string[] memory _tokenURIs,
        address _artistAddress,
        string memory _realitioQuestion,
        string memory _tokenName
    ) public returns (address)  {
        if (marketCreatorWhitelistEnabled) {
            require(marketCreatorWhitelist[msg.sender] || owner() == msg.sender, "Not approved");
        }
        address _newAddress;

        _newAddress = createClone(getMostRecentReferenceContract(_mode));
        IRCMarketXdaiV1(_newAddress).initialize({
            _mode: _mode,
            _timestamps: _timestamps,
            _tokenURIs: _tokenURIs,
            _artistAddress: _artistAddress,
            _marketCreatorAddress: msg.sender,
            _templateId: 2,
            _question: _realitioQuestion,
            _tokenName: _tokenName
        });
        
        assert(treasury.addMarket(_newAddress));
        marketAddresses[_mode].push(_newAddress);
        mappingOfMarkets[_newAddress] = true;
        uint256 _version = referenceContractAddresses[_mode].length-1;
        emit LogMarketCreated(address(_newAddress), address(treasury), _tokenURIs, _timestamps,  _mode, _version, _ipfsHash);
        return _newAddress;
    }

}

