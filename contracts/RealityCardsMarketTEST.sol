pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@nomiclabs/buidler/console.sol";
import "./interfaces/ICash.sol";
import "./interfaces/IRealitio.sol";

/// @title Reality Cards Market
/// @author Andrew Stanger
/// @dev modified version of RealityCardsMarket to remove NFT element to save on gas
/// @dev all public variable/function names unchanged so frontend is agnostic to the type of market

contract RealityCardsMarketTest is Initializable {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT SETUP /////
    /// @dev = how many outcomes/teams/NFTs etc 
    uint256 public numberOfTokens;
    /// @dev counts how many NFTs have been minted 
    /// @dev when cardMintCount = numberOfTokens, increment state
    uint256 public cardMintCount;
    /// @dev the question ID of the question on realitio
    bytes32 public questionId;
    uint256 public constant UNRESOLVED_OUTCOME_RESULT = 2**256 - 1;
    /// @dev only for _revertToPreviousOwner to prevent gas limits
    uint256 public constant MAX_ITERATIONS = 10;
    enum States {CARDSNOTMINTED, OPEN, LOCKED, WITHDRAW}
    States public state; 

    ///// CONTRACT VARIABLES /////
    IRealitio public realitio;
    ICash public cash; 

    ///// FAKE ERC721 VARIABLES /////
    string private _baseURI;
    mapping(uint256 => string) private _tokenURIs;
    mapping (uint256 => address) private _tokenOwner; 

    ///// PRICE, DEPOSITS, RENT /////
    /// @dev in attodai (so $100 = 100000000000000000000)
    mapping (uint256 => uint256) public price; 
    /// @dev keeps track of all the deposits for each token, for each owner
    mapping (uint256 => mapping (address => uint256) ) public deposits; 
    /// @dev keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome.
    mapping (address => uint256) public collectedPerUser;
    /// @dev keeps track of all the rent paid for each token, front end only
    mapping (uint256 => uint256) public collectedPerToken;
    /// @dev an easy way to track the above across all tokens
    uint256 public totalCollected; 

    ///// TIME /////
    /// @dev how many seconds each user has held each token for, for determining winnings  
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;
    /// @dev sums all the timeHelds for each. Not required, but saves on gas when paying out. Should always increment at the same time as timeHeld
    mapping (uint256 => uint256) public totalTimeHeld; 
    /// @dev used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    mapping (uint256 => uint256) public timeLastCollected; 
    /// @dev when a token was bought. Used to enforce minimum of one hour rental, also used in front end. Rent collection does not need this, only needs timeLastCollected.
    mapping (uint256 => uint256) public timeAcquired; 

    ///// PREVIOUS OWNERS /////
    /// @dev keeps track of all previous owners of a token, including the price, so that if the current owner's deposit runs out,
    /// @dev ...ownership can be reverted to a previous owner with the previous price. Index 0 is NOT used, this tells the contract to foreclose.
    /// @dev this does NOT keep a reliable list of all owners, if it reverts to a previous owner then the next owner will overwrite the owner that was in that slot.
    mapping (uint256 => mapping (uint256 => rental) ) public ownerTracker;  
    /// @dev tracks the position of the current owner in the ownerTracker mapping
    mapping (uint256 => uint256) public currentOwnerIndex; 
    /// @dev the struct for ownerTracker
    struct rental { address owner;
                    uint256 price; }

    ///// MARKET RESOLUTION VARIABLES /////
    uint256 public winningOutcome = UNRESOLVED_OUTCOME_RESULT; 
    //// @dev when the market locks 
    uint32 public marketLockingTime; 
    //// @dev when the question can be answered on realitio
    uint32 public oracleResolutionTime;
    /// @dev prevent users withdrawing twice
    mapping (address => bool) public userAlreadyWithdrawn;

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    function initialize(
        address _owner,
        uint256 _numberOfTokens, 
        uint32 _marketLockingTime,
        uint32 _oracleResolutionTime,
        uint32 _timeout,
        uint256 _templateId,
        string memory _question,
        address _arbitrator
    ) public initializer {

        // external contract variables:
        // realitio = _addressOfRealitioContract;
        // cash = _addressOfCashContract;

    } 

}

