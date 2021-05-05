// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "hardhat/console.sol";
import "../../interfaces/IRCFactory.sol";
import "../../interfaces/IRCTreasury.sol";
import "../../interfaces/IRCMarket.sol";
import "../../interfaces/IRCProxyXdai.sol";
import "../../interfaces/IRCNftHubXdai.sol";
import "../../interfaces/IRCOrderbook.sol";
import "../../lib/NativeMetaTransaction.sol";

/// @title Reality Cards Factory
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCFactoryV2 is Ownable, NativeMetaTransaction, IRCFactory {
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    IRCTreasury public override treasury;
    IRCProxyXdai public override proxy;
    IRCNftHubXdai public override nfthub;
    IRCOrderbook public override orderbook;

    ///// CONTRACT ADDRESSES /////
    /// @dev reference contract
    address public referenceContractAddress;
    /// @dev increments each time a new reference contract is added
    uint256 public referenceContractVersion;
    /// @dev market addresses, mode // address
    /// @dev these are not used for anything, just an easy way to get markets
    mapping(uint256 => address[]) public marketAddresses;
    mapping(address => bool) public mappingOfMarkets;

    ///// GOVERNANCE VARIABLES- OWNER /////
    /// @dev artist / winner / market creator / affiliate / card affiliate
    uint256[5] public potDistribution;
    /// @dev minimum xDai that must be sent when creating market which forms iniital pot
    uint256 public sponsorshipRequired;
    /// @dev adjust required price increase (in %)
    uint256 public override minimumPriceIncreasePercent;
    /// @dev market opening time must be at least this many seconds in the future
    uint32 public advancedWarning;
    /// @dev market closing time must be no more than this many seconds in the future
    uint32 public maximumDuration;
    /// @dev if hot potato mode, how much rent new owner must pay current owner (1 week divisor: i.e. 7 = 1 day's rent, 14 = 12 hours's rent)
    uint256 public override hotPotatoWeekDivisor;
    /// @dev list of governors
    mapping(address => bool) public governors;
    /// @dev if false, anyone can create markets
    bool public marketCreationGovernorsOnly = true;
    /// @dev if true, cards are burnt at the end of events for hidden markets to enforce scarcity
    bool public override trapIfUnapproved = true;
    /// @dev high level owner who can change the factory address
    address public uberOwner;
    /// @dev the maximum number of rent collections to perform in a single transaction
    uint256 public override maxRentIterations;

    ///// GOVERNANCE VARIABLES- GOVERNORS /////
    /// @dev unapproved markets hidden from the interface
    mapping(address => bool) public override isMarketApproved;
    /// @dev allows artist to receive cut of total rent
    mapping(address => bool) public isArtistApproved;
    /// @dev allows affiliate to receive cut of total rent
    mapping(address => bool) public isAffiliateApproved;
    /// @dev allows card affiliate to receive cut of total rent
    mapping(address => bool) public isCardAffiliateApproved;
    /// @dev a limit to the number of NFTs to mint per market
    uint256 public nftMintingLimit;

    ///// OTHER /////
    /// @dev counts the total NFTs minted across all events
    /// @dev ... so the appropriate token id is used when upgrading to mainnet
    uint256 public totalNftMintCount;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogMarketCreated1(
        address contractAddress,
        address treasuryAddress,
        address nftHubAddress,
        uint256 referenceContractVersion
    );
    event LogMarketCreated2(
        address contractAddress,
        uint32 mode,
        string[] tokenURIs,
        string ipfsHash,
        uint32[] timestamps,
        uint256 totalNftMintCount
    );
    event LogMarketApproved(address market, bool hidden);
    event LogAdvancedWarning(uint256 _newAdvancedWarning);
    event LogMaximumDuration(uint256 _newMaximumDuration);

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    /// @dev Treasury must be deployed before Factory
    constructor(IRCTreasury _treasuryAddress) {
        require(address(_treasuryAddress) != address(0));
        // initialise MetaTransactions
        _initializeEIP712("RealityCardsFactory", "1");

        // at initiation, uberOwner and owner will be the same
        uberOwner = msg.sender;

        // initialise contract variable
        treasury = _treasuryAddress;

        // initialise adjustable parameters
        // artist // winner // creator // affiliate // card affiliates
        setPotDistribution(20, 0, 0, 20, 100); // 2% artist, 2% affiliate, 10% card affiliate
        setminimumPriceIncreasePercent(10); // 10%
        setHotPotatoPayment(7); // one day's rent
        setNFTMintingLimit(50); // current gas limit (12.5m) allows for 50 NFTs to be minted
        setMaxRentIterations(10);
    }

    ////////////////////////////////////
    ///////// VIEW FUNCTIONS ///////////
    ////////////////////////////////////

    /// @notice Fetch the address of the most recently created market
    /// @param _mode Filter by market mode, 0=Classic 1=Winner Takes All 2=Hot Potato
    function getMostRecentMarket(uint256 _mode)
        external
        view
        returns (address)
    {
        return marketAddresses[_mode][marketAddresses[_mode].length - (1)];
    }

    /// @notice Fetch all the market addresses for a given mode
    /// @param _mode Filter by market mode, 0=Classic 1=Winner Takes All 2=Hot Potato
    function getAllMarkets(uint256 _mode)
        external
        view
        returns (address[] memory)
    {
        return marketAddresses[_mode];
    }

    /// @notice Returns the currently set pot distribution
    function getPotDistribution()
        external
        view
        override
        returns (uint256[5] memory)
    {
        return potDistribution;
    }

    ////////////////////////////////////
    //////////// MODIFERS //////////////
    ////////////////////////////////////

    modifier onlyGovernors() {
        require(
            governors[msgSender()] || owner() == msgSender(),
            "Not approved"
        );
        _;
    }

    ////////////////////////////////////
    ///// GOVERNANCE- OWNER (SETUP) ////
    ////////////////////////////////////
    /// @dev all functions should have onlyOwner modifier

    /// @notice address of the xDai Proxy contract
    function setProxyXdaiAddress(IRCProxyXdai _newAddress) external onlyOwner {
        require(address(_newAddress) != address(0));
        proxy = _newAddress;
    }

    /// @notice where the NFTs live
    /// @dev nftMintCount will probably need to be reset to zero if new nft contract, but
    /// @dev ... keeping flexible in case returning to previous contract
    function setNftHubAddress(
        IRCNftHubXdai _newAddress,
        uint256 _newNftMintCount
    ) external onlyOwner {
        require(address(_newAddress) != address(0));
        nfthub = _newAddress;
        totalNftMintCount = _newNftMintCount;
    }

    function setOrderbookAddress(IRCOrderbook _newAddress) external onlyOwner {
        require(address(_newAddress) != address(0));
        orderbook = _newAddress;
    }

    ////////////////////////////////////
    /////// GOVERNANCE- OWNER //////////
    ////////////////////////////////////
    /// @dev all functions should have onlyOwner modifier
    // Min price increase, pot distribution & hot potato events emitted by Market.
    // Advanced Warning and Maximum Duration events emitted here. Nothing else need be emitted.

    /// CALLED WITHIN CONSTRUCTOR (public)

    /// @notice update stakeholder payouts
    /// @dev in 10s of basis points (so 1000 = 100%)
    function setPotDistribution(
        uint256 _artistCut,
        uint256 _winnerCut,
        uint256 _creatorCut,
        uint256 _affiliateCut,
        uint256 _cardAffiliateCut
    ) public onlyOwner {
        require(
            _artistCut +
                (_winnerCut) +
                (_creatorCut) +
                (_affiliateCut) +
                (_cardAffiliateCut) <=
                1000,
            "Cuts too big"
        );
        potDistribution[0] = _artistCut;
        potDistribution[1] = _winnerCut;
        potDistribution[2] = _creatorCut;
        potDistribution[3] = _affiliateCut;
        potDistribution[4] = _cardAffiliateCut;
    }

    /// @notice how much above the current price a user must bid, in %
    function setminimumPriceIncreasePercent(uint256 _percentIncrease)
        public
        override
        onlyOwner
    {
        minimumPriceIncreasePercent = _percentIncrease;
    }

    /// @dev if hot potato mode, how much rent new owner must pay current owner (1 week divisor: i.e. 7 = 1 day, 14 = 12 hours)
    function setHotPotatoPayment(uint256 _newDivisor)
        public
        override
        onlyOwner
    {
        hotPotatoWeekDivisor = _newDivisor;
    }

    /// @dev A limit to the number of NFTs to mint per market
    function setNFTMintingLimit(uint256 _mintLimit) public override onlyOwner {
        nftMintingLimit = _mintLimit;
    }

    /// @dev A limit to the number of rent collections per transaction
    function setMaxRentIterations(uint256 _rentLimit)
        public
        override
        onlyOwner
    {
        maxRentIterations = _rentLimit;
    }

    /// NOT CALLED WITHIN CONSTRUCTOR (external)

    /// @notice whether or not only governors can create the market
    function changeMarketCreationGovernorsOnly() external onlyOwner {
        marketCreationGovernorsOnly = !marketCreationGovernorsOnly;
    }

    /// @notice how much xdai must be sent in the createMarket tx which forms the initial pot
    function setSponsorshipRequired(uint256 _dai) external onlyOwner {
        sponsorshipRequired = _dai;
    }

    /// @notice if true, Cards in unapproved markets can't be upgraded
    function changeTrapCardsIfUnapproved() external onlyOwner {
        trapIfUnapproved = !trapIfUnapproved;
    }

    /// @notice market opening time must be at least this many seconds in the future
    function setAdvancedWarning(uint32 _newAdvancedWarning) external onlyOwner {
        advancedWarning = _newAdvancedWarning;
        emit LogAdvancedWarning(_newAdvancedWarning);
    }

    /// @notice market closing time must be no more than this many seconds in the future
    function setMaximumDuration(uint32 _newMaximumDuration) external onlyOwner {
        maximumDuration = _newMaximumDuration;
        emit LogMaximumDuration(_newMaximumDuration);
    }

    // EDIT GOVERNORS

    /// @notice add or remove an address from market creator whitelist
    function changeGovernorApproval(address _governor) external onlyOwner {
        require(_governor != address(0));
        governors[_governor] = !governors[_governor];
    }

    ////////////////////////////////////
    ///// GOVERNANCE- GOVERNORS ////////
    ////////////////////////////////////
    /// @dev all functions should have onlyGovernors modifier

    /// @notice markets are default hidden from the interface, this reveals them
    function changeMarketApproval(address _market) external onlyGovernors {
        require(_market != address(0));
        isMarketApproved[_market] = !isMarketApproved[_market];
        emit LogMarketApproved(_market, isMarketApproved[_market]);
    }

    /// @notice artistAddress, passed in createMarket, must be approved
    function changeArtistApproval(address _artist) external onlyGovernors {
        require(_artist != address(0));
        isArtistApproved[_artist] = !isArtistApproved[_artist];
    }

    /// @notice affiliateAddress, passed in createMarket, must be approved
    function changeAffiliateApproval(address _affiliate)
        external
        onlyGovernors
    {
        require(_affiliate != address(0));
        isAffiliateApproved[_affiliate] = !isAffiliateApproved[_affiliate];
    }

    /// @notice cardAffiliateAddress, passed in createMarket, must be approved
    function changeCardAffiliateApproval(address _affiliate)
        external
        onlyGovernors
    {
        require(_affiliate != address(0));
        isCardAffiliateApproved[_affiliate] = !isCardAffiliateApproved[
            _affiliate
        ];
    }

    ////////////////////////////////////
    ////// GOVERNANCE- UBER OWNER //////
    ////////////////////////////////////
    //// ******** DANGER ZONE ******** ////
    /// @dev uber owner required for upgrades
    /// @dev this is seperated so owner so can be set to multisig, or burn address to relinquish upgrade ability
    /// @dev ... while maintaining governance over other governanace functions

    /// @notice change the reference contract for the contract logic
    function setReferenceContractAddress(address _newAddress) external {
        require(msg.sender == uberOwner, "Extremely Verboten");
        require(_newAddress != address(0));
        // check it's an RC contract
        IRCMarket newContractVariable = IRCMarket(_newAddress);
        assert(newContractVariable.isMarket());
        // set
        referenceContractAddress = _newAddress;
        // increment version
        referenceContractVersion = referenceContractVersion + (1);
    }

    function changeUberOwner(address _newUberOwner) external {
        require(msg.sender == uberOwner, "Extremely Verboten");
        require(_newUberOwner != address(0));
        uberOwner = _newUberOwner;
    }

    ////////////////////////////////////
    //////// MARKET CREATION ///////////
    ////////////////////////////////////

    /// @notice Creates a new market with the given parameters
    /// @param _mode 0 = normal, 1 = winner takes all, 2 = hot potato
    /// @param _timestamps for market opening, locking, and oracle resolution
    /// @param _tokenURIs location of NFT metadata
    /// @param _artistAddress where to send artist's cut, if any
    /// @param _affiliateAddress where to send affiliate's cut, if any
    /// @param _cardAffiliateAddresses where to send card specific affiliate's cut, if any
    /// @param _realitioQuestion the details of the event to send to the oracle
    function createMarket(
        uint32 _mode,
        string memory _ipfsHash,
        uint32[] memory _timestamps,
        string[] memory _tokenURIs,
        address _artistAddress,
        address _affiliateAddress,
        address[] memory _cardAffiliateAddresses,
        string memory _realitioQuestion
    ) external payable returns (address) {
        // check sponsorship
        require(msg.value >= sponsorshipRequired, "Insufficient sponsorship");

        // check stakeholder addresses
        // artist
        require(
            isArtistApproved[_artistAddress] || _artistAddress == address(0),
            "Artist not approved"
        );
        // affiliate
        require(
            isAffiliateApproved[_affiliateAddress] ||
                _affiliateAddress == address(0),
            "Affiliate not approved"
        );
        // card affiliates
        for (uint256 i = 0; i < _cardAffiliateAddresses.length; i++) {
            require(
                isCardAffiliateApproved[_cardAffiliateAddresses[i]] ||
                    _cardAffiliateAddresses[i] == address(0),
                "Card affiliate not approved"
            );
        }

        // check market creator is approved
        if (marketCreationGovernorsOnly) {
            require(
                governors[msgSender()] || owner() == msgSender(),
                "Not approved"
            );
        }

        // check timestamps
        require(_timestamps.length == 3, "Incorrect number of array elements");
        // check market opening time
        if (advancedWarning != 0) {
            require(
                _timestamps[0] >= block.timestamp,
                "Market opening time not set"
            );
            require(
                _timestamps[0] - (advancedWarning) > block.timestamp,
                "Market opens too soon"
            );
        }
        // check market locking time
        if (maximumDuration != 0) {
            require(
                _timestamps[1] < block.timestamp + (maximumDuration),
                "Market locks too late"
            );
        }
        // check oracle resolution time (no more than 1 week after market locking to get result)
        require(
            _timestamps[1] + (1 weeks) > _timestamps[2] &&
                _timestamps[1] <= _timestamps[2],
            "Oracle resolution time error"
        );

        // check the number of NFTs to mint is within limits
        require(
            _tokenURIs.length <= nftMintingLimit,
            "Too many tokens to mint"
        );
        uint256 _numberOfTokens = _tokenURIs.length;

        // create the market and emit the appropriate events
        // two events to avoid stack too deep error
        address _newAddress = Clones.clone(referenceContractAddress);
        emit LogMarketCreated1(
            _newAddress,
            address(treasury),
            address(nfthub),
            referenceContractVersion
        );
        emit LogMarketCreated2(
            _newAddress,
            _mode,
            _tokenURIs,
            _ipfsHash,
            _timestamps,
            totalNftMintCount
        );

        // tell Treasury, Proxy, and NFT hub about new market
        // before initialize as during initialize the market may call the treasury
        treasury.addMarket(_newAddress);
        proxy.addMarket(_newAddress);
        nfthub.addMarket(_newAddress);
        orderbook.addMarket(
            _newAddress,
            _numberOfTokens,
            minimumPriceIncreasePercent
        );

        // update internals
        marketAddresses[_mode].push(_newAddress);
        mappingOfMarkets[_newAddress] = true;

        IRCMarket(_newAddress).initialize({
            _mode: _mode,
            _timestamps: _timestamps,
            _numberOfTokens: _numberOfTokens,
            _totalNftMintCount: totalNftMintCount,
            _artistAddress: _artistAddress,
            _affiliateAddress: _affiliateAddress,
            _cardAffiliateAddresses: _cardAffiliateAddresses,
            _marketCreatorAddress: msgSender()
        });

        // create the NFTs
        require(address(nfthub) != address(0), "Nfthub not set");
        for (uint256 i = 0; i < _numberOfTokens; i++) {
            uint256 _tokenId = i + (totalNftMintCount);
            require(
                nfthub.mintNft(_newAddress, _tokenId, _tokenURIs[i]),
                "Nft Minting Failed"
            );
        }

        // increment totalNftMintCount
        totalNftMintCount = totalNftMintCount + (_numberOfTokens);

        // post question to Oracle
        require(address(proxy) != address(0), "xDai proxy not set");
        proxy.postQuestionToOracle(
            _newAddress,
            _realitioQuestion,
            _timestamps[2]
        );

        // pay sponsorship, if applicable
        if (msg.value > 0) {
            IRCMarket(_newAddress).sponsor{value: msg.value}();
        }

        return _newAddress;
    }
}
