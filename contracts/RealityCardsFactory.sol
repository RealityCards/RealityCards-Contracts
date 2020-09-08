pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/ICash.sol";
import "./interfaces/IRealitio.sol";
import './RealityCardsMarket.sol';
import './RealityCardsMarketLite.sol';

/// @title Reality Cards Factory
/// @author Andrew Stanger

contract RealityCardsFactory is Ownable, CloneFactory {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    IRealitio public realitio;
    ICash public cash; 

    ///// MARKET ADDRESSES /////
    address public libraryAddress; // the single deployment of the contract logic
    address public libraryAddressLite; // the single deployment of the contract logic
    mapping(address => bool) public mappingOfMarkets;
    address[] public marketAddresses;
    address public mostRecentContract;

    ///// EVENTS /////
    event MarketCreated(address contractAddress, bytes ipfsHash);

    constructor(ICash _daiAddress, IRealitio _realitioAddress) public 
    {
        cash = _daiAddress;
        realitio = _realitioAddress;
        Ownable.initialize(msg.sender);
    }

    /// @notice This function sets the library for the contract logic
    function setLibraryAddress(address _libraryAddress) public onlyOwner {
        libraryAddress = _libraryAddress;
    }

    /// @notice This function sets the library for the contract logic
    function setLibraryAddressLite(address _libraryAddress) public onlyOwner {
        libraryAddressLite = _libraryAddress;
    }

    /// @notice This contract is the framework of each new market
    /// @dev Currently, only owners can generate the markets
    /// @param _marketLockingTime When the market locks
    /// @param _oracleResolutionTime When the market is set to resolve
    /// @param _timeout The timeout period
    /// @param _arbitrator The arbitrator address
    /// @param _realitioQuestion The question, formatted to suit how realitio required
    function createMarket(
        bool _liteMode,
        bytes memory _ipfsHash,
        address _owner,
        uint256 _numberOfTokens,
        uint32 _marketLockingTime,
        uint32 _oracleResolutionTime,
        uint256 _templateId,
        string memory _realitioQuestion,
        address _arbitrator,
        uint32 _timeout,
        string memory _tokenName
    ) public onlyOwner returns (address)  {
        address _newAddress;

        if (!_liteMode) {
            _newAddress = createClone(libraryAddress);
            RealityCardsMarket(marketAddresses[marketAddresses.length - 1]).initialize({
                _owner: _owner,
                _numberOfTokens: _numberOfTokens,
                _marketLockingTime: _marketLockingTime,
                _oracleResolutionTime: _oracleResolutionTime,
                _templateId: _templateId,
                _question: _realitioQuestion,
                _arbitrator: _arbitrator,
                _timeout: _timeout,
                _tokenName: _tokenName
            });
        } else {
            _newAddress = createClone(libraryAddressLite);

            RealityCardsMarketLite(marketAddresses[marketAddresses.length - 1]).initialize({
                _numberOfTokens: _numberOfTokens,
                _marketLockingTime: _marketLockingTime,
                _oracleResolutionTime: _oracleResolutionTime,
                _templateId: _templateId,
                _question: _realitioQuestion,
                _arbitrator: _arbitrator,
                _timeout: _timeout
            });
        }
        
        marketAddresses.push(_newAddress);
        mappingOfMarkets[_newAddress] = true;
        mostRecentContract = _newAddress;
        emit MarketCreated(address(_newAddress), _ipfsHash);

        return _newAddress;
    }

    function getMarkets() public view returns (address[] memory) {
        return marketAddresses;
    }

}

