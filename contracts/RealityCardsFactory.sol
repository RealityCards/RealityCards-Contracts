pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/ICash.sol";
import "./interfaces/IRealitio.sol";
import "./interfaces/ITreasury.sol";
import './RealityCardsMarketXdaiV1.sol';

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
    ITreasury public treasury;

    ///// MARKET ADDRESSES /////
    // the single deployment of the contract logic, uint = mode
    mapping(uint256 => address) public referenceContractAddresses; 
    mapping(address => bool) public mappingOfMarkets;
    address[] public marketAddresses;
    address public mostRecentContract;

    ///// EVENTS /////
    event MarketCreated(address contractAddress, address treasuryAddress, bytes ipfsHash);

    constructor(ICash _daiAddress, IRealitio _realitioAddress, ITreasury _treasuryAddress) public 
    {
        cash = _daiAddress;
        realitio = _realitioAddress;
        treasury = _treasuryAddress;
        Ownable.initialize(msg.sender);
        assert(treasury.setFactoryAddress(address(this)));
    }

    /// @notice These functions set the reference contract for the contract logic
    function setReferenceContractAddress(uint256 _mode, address _referenceContractAddress) public onlyOwner {
        referenceContractAddresses[_mode] = _referenceContractAddress;
    }

    /// @notice This contract is the framework of each new market
    /// @dev Currently, only owners can generate the markets
    /// @param _marketLockingTime When the market locks
    /// @param _oracleResolutionTime When the market is set to resolve
    /// @param _timeout The timeout period
    /// @param _arbitrator The arbitrator address
    /// @param _realitioQuestion The question, formatted to suit how realitio required
    function createMarket(
        uint32 _mode,
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

        if (_mode == 0) {
            _newAddress = createClone(referenceContractAddresses[_mode]);
            RealityCardsMarketXdaiV1(_newAddress).initialize({
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
            treasury.addMarket(_newAddress);
        }
        
        marketAddresses.push(_newAddress);
        mappingOfMarkets[_newAddress] = true;
        mostRecentContract = _newAddress;
        emit MarketCreated(address(_newAddress), address(treasury), _ipfsHash);

        return _newAddress;
    }

    function getMarkets() public view returns (address[] memory) {
        return marketAddresses;
    }

}

