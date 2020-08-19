pragma solidity 0.5.13;

import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import '@openzeppelin/contracts/utils/Pausable.sol';
import "@nomiclabs/buidler/console.sol";
import "./interfaces/ICash.sol";
import "./interfaces/IRealitio.sol";
import './RealityCardsMarket.sol';

/// @title Reality Cards Factory
/// @author Andrew Stanger

// contract RealityCardsFactory is Ownable, Pausable {

//     using SafeMath for uint256;

//     ////////////////////////////////////
//     //////// VARIABLES /////////////////
//     ////////////////////////////////////

//     ///// CONTRACT VARIABLES /////
//     IRealitio public realitio;
//     ICash public cash; 

//     mapping(address => bool) public mappingOfMarkets;
//     address[] public marketAddresses;

//     event MarketCreated(address contractAddress);

//     constructor(
//         ICash _daiAddress,
//         IRealitio _realitioAddress,
//     ) public {
//         cash = _daiAddress;
//         realitio = _realitioAddress;
//     }

//     /// @notice This contract is the framework of each new market
//     /// @dev Currently, only owners can generate the markets
//     /// @param _eventName The event name
//     /// @param _marketOpeningTime When the market opens
//     /// @param _marketLockingTime When the market locks
//     /// @param _marketResolutionTime When the market is set to resolve
//     /// @param _timeout The timeout period
//     /// @param _arbitrator The arbitrator address
//     /// @param _realitioQuestion The question, formatted to suit how realitio required
//     function createMarket(
//         string memory _eventName,
//         uint256 _marketLockingTime,
//         uint32 _oracleResolutionTime,
//         string memory _realitioQuestion,
//         bytes32 _questionId,
//         bool _useExistingQuestion,
//         address _arbitrator,
//         uint32 _timeout,
//         string memory _tokenName,
//     ) public virtual onlyOwner whenNotPaused returns (RealityCardsMarket) {
//         uint256[3] memory marketTimes = [_marketLockingTime, _marketResolutionTime, _timeout];
//         MBMarket newContract = new RealityCardsMarket({
//             _daiAddress: dai,
//             _aaveAddresses: [address(aToken), address(aaveLendingPool), address(aaveLendingPoolCore)],
//             _realitioAddress: realitio,
//             _uniswapRouter: uniswapRouter,
//             _eventName: _eventName,
//             _marketTimes: marketTimes,
//             _arbitrator: _arbitrator,
//             _realitioQuestion: _realitioQuestion,
//             _outcomeNamesArray: _outcomeNamesArray,
//             _owner: msg.sender
//         });
//         address newAddress = address(newContract);
//         marketAddresses.push(newAddress);
//         mappingOfMarkets[newAddress] = true;
//         mostRecentContract = newAddress;
//         emit MarketCreated(address(newAddress));
//         return newContract;
//     }

// }

