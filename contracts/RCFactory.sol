pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './lib/CloneFactory.sol';
import "./interfaces/ITreasury.sol";
import './interfaces/IRCMarket.sol';
import './interfaces/IRCProxyXdai.sol';

/// @title Reality Cards Factory
/// @author Andrew Stanger

contract RCFactory is Ownable, CloneFactory {

    using SafeMath for uint256;
    using SafeMath for uint32;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    ITreasury public treasury;
    IRCProxyXdai public oracleProxy;

    ///// CONTRACT ADDRESSES /////
    /// @dev reference contract
    address public referenceContractAddress; 
    /// @dev increments each time a new reference contract is added
    uint256 public referenceContractVersion;
    /// @dev market addresses, mode // address
    mapping(uint256 => address[]) public marketAddresses;
    mapping(address => bool) public mappingOfMarkets; // not used for anything 

    ///// ADJUSTABLE PARAMETERS /////
    /// @dev artist / winner / market creator / affiliate / card specific affiliate
    uint256[5] public potDistribution;
    /// @dev minimum xDai that must be sent when creating market which forms iniital pot
    uint256 public sponsorshipRequired;
    /// @dev adjust required price increase
    uint256 public minimumPriceIncrease;
    /// @dev market opening time must be at least this many seconds in the future
    uint32 public advancedWarning;
    /// @dev market closing time must be no more than this many seconds in the future
    uint32 public maximumDuration;

    ///// MARKET CREATION & HIDING /////
    /// @dev if false, anyone can create markets
    bool public marketCreationGovernorsOnly;
    /// @dev who can create markets if above true. Also used to unhide hidden markets. 
    mapping(address => bool) public governors;
    /// @dev  so markets can be hidden from the interface
    mapping(address => bool) public isMarketApproved;
    /// @dev if true, cards are burnt at the end of events for hidden markets to enforce scarcity
    bool public burnIfUnapproved = true;
    /// @dev prevents the same slug being used twice
    mapping(string => bool) public existingSlug;
    /// @dev counts the total NFTs minted across all events
    /// @dev ... so the appropriate token id is used when upgrading to mainnet
    uint256 public totalNftMintCount;

    ///// UBER OWNER /////
    /// @dev high level owner who can change the factory address
    address public uberOwner;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogMarketCreated(address contractAddress, address treasuryAddress, string[] tokenURIs, uint32[] timestamps, uint256 mode, string ipfsHash, uint256 referenceContractVersion);
    event LogMarketHidden(address market, bool hidden);

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
    /////// GOVERNANCE- OWNER //////////
    ////////////////////////////////////
    /// @dev all functions should be onlyOwner

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

    /// @notice whether or not only governors can create the market
    function updateMarketCreationGovernorsOnly() external onlyOwner {
        marketCreationGovernorsOnly = marketCreationGovernorsOnly ? false : true;
    }

    /// @notice how much xdai must be sent in the createMarket tx which forms the initial pot
    function updateSponsorshipRequired(uint256 _dai) external onlyOwner {
        sponsorshipRequired = _dai;
    }

    /// @notice where the question to post to the oracle is first sent to
    function updateOracleProxyXdaiAddress(IRCProxyXdai _newAddress) external onlyOwner {
        oracleProxy = _newAddress;
    }

    /// @notice if true, Cards are burnt upon market resolution for unapproved markets
    function burnCardsIfUnapproved() onlyOwner external {
        burnIfUnapproved = burnIfUnapproved ? false : true;
    }

    /// @notice market opening time must be at least this many seconds in the future
    function updateAdvancedWarning(uint32 _newAdvancedWarning) onlyOwner external {
        advancedWarning = _newAdvancedWarning;
    }

    /// @notice market closing time must be no more than this many seconds in the future
    function updateMaximumDuration(uint32 _newMaximumDuration) onlyOwner external {
        maximumDuration = _newMaximumDuration;
    }

    ////////////////////////////////////
    ///// GOVERNANCE- GOVERNORS ////////
    ////////////////////////////////////
    /// @dev multiple addresses have the ability to approve markets

     /// @notice add or remove an address from market creator whitelist, should be onlyOwner
    function addOrRemoveGovernor(address _governor) external onlyOwner {
        governors[_governor] = governors[_governor] ? false : true;
    }

    /// @notice markets are default hidden from the interface, this reveals them
    /// @dev uses the governors
    function approveOrUnapproveMarket(address _market) external {
        require(governors[msg.sender] || owner() == msg.sender, "Not approved");
        isMarketApproved[_market] = isMarketApproved[_market] ? false : true;
        emit LogMarketHidden(_market, isMarketApproved[_market]);
    }

    ////////////////////////////////////
    ////// GOVERNANCE- UBER OWNER //////
    ////////////////////////////////////
    /// @dev uber owner required for upgrades
    /// @dev deploying and setting a new reference contract is effectively an upgrade
    /// @dev different owner so can be set to multisig, or burn address to relinquish upgrade ability
    /// @dev ... while maintaining governance over other governanace functions

    /// @notice set the reference contract for the contract logic
    function setReferenceContractAddress(address _newAddress) external {
        require(msg.sender == uberOwner, "Access denied");
        // check it's an RC contract
        IRCMarket newContractVariable = IRCMarket(_newAddress);
        assert(newContractVariable.isMarket());
        // set 
        referenceContractAddress = _newAddress;
        // increment version
        referenceContractVersion = referenceContractVersion.add(1);
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
        string[2] memory _eventDetails // 0 = token name, 1 = slug
    ) public payable returns (address)  {
        // check sponsorship
        require(msg.value >= sponsorshipRequired, "Insufficient sponsorship");

        // check slug not used before
        require(!existingSlug[_eventDetails[1]], "Duplicate slug");
        existingSlug[_eventDetails[1]] = true;

        // check market creator is approved
        if (marketCreationGovernorsOnly) {
            require(governors[msg.sender] || owner() == msg.sender, "Not approved");
        }

        // check timestamps
        // check market opening time
        if (advancedWarning != 0) {
            require(_timestamps[0] >= advancedWarning, "Market opening time not set"); 
            require(_timestamps[0].sub(advancedWarning) > now, "Market opens too soon" );
        }
        // check market locking time
        if (maximumDuration != 0) {
            require(_timestamps[1] < now.add(maximumDuration), "Market locks too late");
        }
        // check oracle resolution time
        require(_timestamps[1].add(1 weeks) > _timestamps[2] && _timestamps[1] <= _timestamps[2], "Oracle resolution time error" );

        // create the market
        address _newAddress = createClone(referenceContractAddress);
        IRCMarket(_newAddress).initialize({
            _mode: _mode,
            _timestamps: _timestamps,
            _tokenURIs: _tokenURIs,
            _totalNftMintCount: totalNftMintCount,
            _artistAddress: _artistAddress,
            _affiliateAddress: _affiliateAddress,
            _cardSpecificAffiliateAddresses: _cardSpecificAffiliateAddresses,
            _marketCreatorAddress: msg.sender,
            _tokenName: _eventDetails[0]
        });

        // increment totalNftMintCount
        totalNftMintCount = totalNftMintCount.add(_tokenURIs.length);

        // post question to Oracle
        require(address(oracleProxy) != address(0), "xDai proxy not set");
        oracleProxy.sendQuestionToBridge(_newAddress, _realitioQuestion, _timestamps[2]);

        // tell Treasury and Bridge Proxy about new market
        assert(treasury.addMarket(_newAddress));
        assert(oracleProxy.addMarket(_newAddress));

        // update internals
        marketAddresses[_mode].push(_newAddress);
        mappingOfMarkets[_newAddress] = true;

        // pay sponsorship, if applicable
        if (msg.value > 0) {
            IRCMarket(_newAddress).sponsor.value(msg.value)();
        }

        emit LogMarketCreated(address(_newAddress), address(treasury), _tokenURIs, _timestamps,  _mode, _ipfsHash, referenceContractVersion);
        return _newAddress;
    }

}
