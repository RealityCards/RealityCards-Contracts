pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/ICash.sol";
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
    ICash public cash; 
    ITreasury public treasury;

    ///// MARKET ADDRESSES /////
    struct referenceContract { 
        address referenceContractAddress;
        uint256 version; }
    // the reference deployment of the contract logic, uint = mode
    mapping(uint256 => referenceContract) public referenceContracts; 
    mapping(address => bool) public mappingOfMarkets;
    address[] public marketAddresses;

    ///// EVENTS /////
    event MarketCreated(address contractAddress, address treasuryAddress, uint256 mode, uint256 version, bytes ipfsHash);

    constructor(ICash _daiAddress, IRealitio _realitioAddress, ITreasury _treasuryAddress) public 
    {
        cash = _daiAddress;
        realitio = _realitioAddress;
        treasury = _treasuryAddress;
        Ownable.initialize(msg.sender);
        assert(treasury.setFactoryAddress(address(this)));
    }

    /// @notice set the reference contract for the contract logic
    /// @dev automatically increments version number if we 'upgrade' the contract
    function setReferenceContractAddress(uint256 _mode, address _referenceContractAddress) public onlyOwner {
        referenceContracts[_mode].referenceContractAddress = _referenceContractAddress;
        referenceContracts[_mode].version = referenceContracts[_mode].version.add(1);
    }

    /// @notice create a new market
    function createMarket(
        uint32 _mode,
        bytes memory _ipfsHash,
        address _owner,
        uint256 _numberOfTokens,
        uint32[] memory timestamps,
        string memory _realitioQuestion,
        address _arbitrator,
        uint32 _timeout,
        string memory _tokenName
    ) public onlyOwner returns (address)  {
        address _newAddress;

        if (_mode == 0) {
            _newAddress = createClone(referenceContracts[_mode].referenceContractAddress);
            IRCMarketXdaiV1(_newAddress).initialize({
                _owner: _owner,
                _numberOfTokens: _numberOfTokens,
                _marketLockingTime: timestamps[0],
                _oracleResolutionTime: timestamps[1],
                _templateId: 2,
                _question: _realitioQuestion,
                _arbitrator: _arbitrator,
                _timeout: _timeout,
                _tokenName: _tokenName
            });
            treasury.addMarket(_newAddress);
        }
        
        marketAddresses.push(_newAddress);
        mappingOfMarkets[_newAddress] = true;
        uint256 _version = referenceContracts[_mode].version;
        emit MarketCreated(address(_newAddress), address(treasury), _mode, _version, _ipfsHash);

        return _newAddress;
    }

    function getMarkets() public view returns (address[] memory) {
        return marketAddresses;
    }

}

