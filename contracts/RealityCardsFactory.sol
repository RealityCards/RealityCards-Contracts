pragma solidity 0.5.13;

import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/ICash.sol";
import "./interfaces/IRealitio.sol";
import './RealityCardsMarket.sol';

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
    mapping(address => bool) public mappingOfMarkets;
    address[] public marketAddresses;
    address public mostRecentContract;

    ///// EVENTS /////
    event MarketCreated(address contractAddress);

    constructor(ICash _daiAddress, IRealitio _realitioAddress) public 
    {
        cash = _daiAddress;
        realitio = _realitioAddress;
    }

    /// @notice This function sets the library for the contract logic
    function setLibraryAddress(address _libraryAddress) public onlyOwner {
        libraryAddress = _libraryAddress;
    }

    /// @notice This contract is the framework of each new market
    /// @dev Currently, only owners can generate the markets
    /// @param _marketLockingTime When the market locks
    /// @param _oracleResolutionTime When the market is set to resolve
    /// @param _timeout The timeout period
    /// @param _arbitrator The arbitrator address
    /// @param _realitioQuestion The question, formatted to suit how realitio required
    function createMarket(
        uint256 _numberOfTokens,
        uint32 _marketLockingTime,
        uint32 _oracleResolutionTime,
        uint256 _templateId,
        string memory _realitioQuestion,
        bytes32 _questionId,
        bool _useExistingQuestion,
        address _arbitrator,
        uint32 _timeout,
        string memory _tokenName
    ) public onlyOwner returns (RealityCardsMarket) {
        address newAddress = createClone(libraryAddress);

        marketAddresses.push(newAddress);
        mappingOfMarkets[newAddress] = true;
        mostRecentContract = newAddress;
        emit MarketCreated(address(newAddress));

        _initLatestMarket(
            _numberOfTokens, 
            _marketLockingTime, 
            _oracleResolutionTime, 
            _templateId, 
            _realitioQuestion, 
            _questionId, 
            _useExistingQuestion, 
            _arbitrator, 
            _timeout, 
            _tokenName
        );
        
        return RealityCardsMarket(newAddress);
    }

    function _initLatestMarket( 
        uint256 _numberOfTokens, 
        uint32 _marketLockingTime,
        uint32 _oracleResolutionTime, 
        uint256 _templateId, 
        string memory _realitioQuestion, 
        bytes32 _questionId,
        bool _useExistingQuestion,
        address _arbitrator, 
        uint32 _timeout,
        string memory _tokenName
    ) internal {
        RealityCardsMarket(marketAddresses[marketAddresses.length - 1]).initialize({
            _numberOfTokens: _numberOfTokens,
            _addressOfCashContract: cash,
            _addressOfRealitioContract: realitio,
            _marketLockingTime: _marketLockingTime,
            _oracleResolutionTime: _oracleResolutionTime,
            _templateId: _templateId,
            _question: _realitioQuestion,
            _questionId: _questionId,
            _useExistingQuestion: _useExistingQuestion,
            _arbitrator: _arbitrator,
            _timeout: _timeout,
            _tokenName: _tokenName
            });

            // RealityCardsMarket(marketAddresses[marketAddresses.length - 1]).transferOwnership({newOwner: address(this)});
    }

    function getMarkets() public view returns (address[] memory) {
        return marketAddresses;
    }

}

