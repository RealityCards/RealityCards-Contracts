// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

interface IRCFactory {
    function createMarket(
        uint32 _mode,
        string memory _ipfsHash,
        uint32[] memory _timestamps,
        string[] memory _tokenURIs,
        address _artistAddress,
        address _affiliateAddress,
        address[] memory _cardAffiliateAddresses,
        string calldata _realitioQuestion,
        uint256 _sponsorship
    ) external returns (address);

    // view functions

    function nfthub() external view returns (address);

    function treasury() external view returns (address);

    function orderbook() external view returns (address);

    function realitio() external view returns (address);

    function getAllMarkets(IRCMarket.Mode _mode)
        external
        view
        returns (address[] memory);

    function getMostRecentMarket(IRCMarket.Mode _mode)
        external
        view
        returns (address);

    function referenceContractAddress() external view returns (address);

    function referenceContractVersion() external view returns (uint256);

    function sponsorshipRequired() external view returns (uint256);

    function advancedWarning() external view returns (uint32);

    function maximumDuration() external view returns (uint32);

    function minimumDuration() external view returns (uint32);

    function marketCreationGovernorsOnly() external view returns (bool);

    function approvedAffiliatesOnly() external view returns (bool);

    function approvedArtistsOnly() external view returns (bool);

    function arbitrator() external view returns (address);

    function timeout() external view returns (uint32);

    function nftMintingLimit() external view returns (uint256);

    function getPotDistribution() external view returns (uint256[5] memory);

    function minimumPriceIncreasePercent() external view returns (uint256);

    function isMarketApproved(address) external view returns (bool);

    function getOracleSettings()
        external
        view
        returns (
            address oracle,
            address arbitratorAddress,
            uint32 _timeout
        );

    // only Governors
    function changeMarketApproval(address _market) external;

    function addArtist(address _newArtist) external;

    function removeArtist(address _oldArtist) external;

    function addAffiliate(address _newAffiliate) external;

    function removeAffiliate(address _oldAffiliate) external;

    function addCardAffiliate(address _newCardAffiliate) external;

    function removeCardAffiliate(address _oldCardAffiliate) external;

    // only Owner
    function setTimeout(uint32 _newTimeout) external;

    function setMaxRentIterations(uint256 _rentLimit) external;

    function setArbitrator(address _newAddress) external;

    function setRealitioAddress(address _newAddress) external;

    function maxRentIterations() external view returns (uint256);

    function setNFTMintingLimit(uint256 _mintLimit) external;

    function setMinimumPriceIncreasePercent(uint256 _percentIncrease) external;

    function setPotDistribution(
        uint256 _artistCut,
        uint256 _winnerCut,
        uint256 _creatorCut,
        uint256 _affiliateCut,
        uint256 _cardAffiliateCut
    ) external;

    function changeMarketCreationGovernorsOnly() external;

    function changeApprovedArtistsOnly() external;

    function changeApprovedAffilliatesOnly() external;

    function setSponsorshipRequired(uint256 _amount) external;

    function setAdvancedWarning(uint32 _newAdvancedWarning) external;

    function setMaximumDuration(uint32 _newMaximumDuration) external;

    function setMinimumDuration(uint32 _newMinimumDuration) external;

    function addGovernor(address _newGovernor) external;

    function removeGovernor(address _oldGovernor) external;

    // only UberOwner
    function setReferenceContractAddress(address _newAddress) external;

    function setOrderbookAddress(address _newAddress) external;

    function setNftHubAddress(address _newAddress) external;
}

interface IRCTreasury {
    function setTokenAddress(address _newToken) external;

    function grantRole(string memory role, address account) external;

    function grantRole(bytes32, address) external;

    function revokeRole(string memory role, address account) external;

    function revokeRole(bytes32, address) external;

    function collectRentUser(address _user, uint256 _timeToCollectTo)
        external
        returns (uint256 newTimeLastCollectedOnForeclosure);

    function topupMarketBalance(uint256 _amount) external;

    // view functions
    function foreclosureTimeUser(
        address _user,
        uint256 _newBid,
        uint256 _timeOfNewBid
    ) external view returns (uint256);

    function bridgeAddress() external view returns (address);

    function checkPermission(bytes32, address) external view returns (bool);

    function erc20() external view returns (address);

    function factory() external view returns (address);

    function orderbook() external view returns (address);

    function isForeclosed(address) external view returns (bool);

    function userTotalBids(address) external view returns (uint256);

    function userDeposit(address) external view returns (uint256);

    function totalDeposits() external view returns (uint256);

    function marketPot(address) external view returns (uint256);

    function totalMarketPots() external view returns (uint256);

    function marketBalance() external view returns (uint256);

    function marketBalanceDiscrepancy() external view returns (uint256);

    function minRentalDayDivisor() external view returns (uint256);

    function maxContractBalance() external view returns (uint256);

    function globalPause() external view returns (bool);

    function marketPaused(address) external view returns (bool);

    function batchWhitelist(address[] calldata _users, bool add) external;

    function marketWhitelistCheck(address _user) external returns (bool);

    function lockMarketPaused(address _market) external view returns (bool);

    function setBridgeAddress(address _newAddress) external;

    function setOrderbookAddress(address _newAddress) external;

    function setFactoryAddress(address _newFactory) external;

    function deposit(uint256 _amount, address _user) external returns (bool);

    function withdrawDeposit(uint256 _amount, bool _localWithdrawal) external;

    function checkSponsorship(address sender, uint256 _amount) external view;

    //only orderbook
    function increaseBidRate(address _user, uint256 _price) external;

    function decreaseBidRate(address _user, uint256 _price) external;

    function resetUser(address _user) external;

    function updateRentalRate(
        address _oldOwner,
        address _newOwner,
        uint256 _oldPrice,
        uint256 _newPrice,
        uint256 _timeOwnershipChanged
    ) external;

    // only owner
    function setMinRental(uint256 _newDivisor) external;

    function setMaxContractBalance(uint256) external;

    function changeGlobalPause() external;

    function changePauseMarket(address _market, bool _paused) external;

    function toggleWhitelist() external;

    // only factory
    function unPauseMarket(address _market) external;

    // only markets
    function payRent(uint256) external returns (uint256);

    function payout(address, uint256) external returns (bool);

    function refundUser(address _user, uint256 _refund) external;

    function sponsor(address _sponsor, uint256 _amount) external;

    function updateLastRentalTime(address) external;
}

interface IRCMarket {
    enum States {
        CLOSED,
        OPEN,
        LOCKED,
        WITHDRAW
    }
    enum Mode {
        CLASSIC,
        WINNER_TAKES_ALL,
        SAFE_MODE
    }

    function upgradeCard(uint256 _card) external;

    function getWinnerFromOracle() external;

    function setAmicableResolution(uint256 _winningOutcome) external;

    function lockMarket() external;

    function claimCard(uint256 _card) external;

    function rentAllCards(uint256 _maxSumOfPrices) external;

    function newRental(
        uint256 _newPrice,
        uint256 _timeHeldLimit,
        address _startingPosition,
        uint256 _card
    ) external;

    function updateTimeHeldLimit(uint256 _timeHeldLimit, uint256 _card)
        external;

    function collectRentAllCards() external returns (bool);

    function exitAll() external;

    function exit(uint256) external;

    function sponsor(address _sponsor, uint256 _amount) external;

    function sponsor(uint256 _amount) external;

    function circuitBreaker() external;

    // payouts
    function withdraw() external;

    function payArtist() external;

    function payMarketCreator() external;

    function payAffiliate() external;

    function payCardAffiliate(uint256) external;

    // view functions
    function nfthub() external view returns (address);

    function treasury() external view returns (address);

    function factory() external view returns (address);

    function orderbook() external view returns (address);

    function realitio() external view returns (address);

    function mode() external view returns (Mode);

    function isMarket() external view returns (bool);

    function numberOfCards() external view returns (uint256);

    function tokenURI(uint256) external view returns (string memory);

    function ownerOf(uint256 tokenId) external view returns (address);

    function state() external view returns (States);

    // prices, deposits, rent

    function cardPrice(uint256) external view returns (uint256);

    function rentCollectedPerUser(address) external view returns (uint256);

    function rentCollectedPerCard(uint256) external view returns (uint256);

    function rentCollectedPerUserPerCard(address, uint256)
        external
        view
        returns (uint256);

    function totalRentCollected() external view returns (uint256);

    function exitedTimestamp(address) external view returns (uint256);

    //parameters

    function minimumPriceIncreasePercent() external view returns (uint256);

    function minRentalDayDivisor() external view returns (uint256);

    function maxRentIterations() external view returns (uint256);

    // time
    function timeHeld(uint256, address) external view returns (uint256);

    function totalTimeHeld(uint256) external view returns (uint256);

    function timeLastCollected(uint256) external view returns (uint256);

    function longestTimeHeld(uint256) external view returns (uint256);

    function longestOwner(uint256) external view returns (address);

    function cardTimeLimit(uint256) external view returns (uint256);

    function marketOpeningTime() external view returns (uint32);

    function marketLockingTime() external view returns (uint32);

    function oracleResolutionTime() external view returns (uint32);

    // payout settings
    function winningOutcome() external view returns (uint256);

    function userAlreadyWithdrawn(address) external view returns (bool);

    function userAlreadyClaimed(uint256, address) external view returns (bool);

    function artistAddress() external view returns (address);

    function artistCut() external view returns (uint256);

    function artistPaid() external view returns (bool);

    function affiliateAddress() external view returns (address);

    function affiliateCut() external view returns (uint256);

    function affiliatePaid() external view returns (bool);

    function winnerCut() external view returns (uint256);

    function marketCreatorAddress() external view returns (address);

    function creatorCut() external view returns (uint256);

    function creatorPaid() external view returns (bool);

    function cardAffiliateAddresses(uint256) external view returns (address);

    function cardAffiliateCut() external view returns (uint256);

    function cardAffiliatePaid(uint256) external view returns (bool);

    // oracle

    function questionId() external view returns (bytes32);

    function arbitrator() external view returns (address);

    function timeout() external view returns (uint32);

    function isFinalized() external view returns (bool);

    // setup
    function initialize(
        Mode _mode,
        uint32[] calldata _timestamps,
        uint256 _numberOfCards,
        address _artistAddress,
        address _affiliateAddress,
        address[] calldata _cardAffiliateAddresses,
        address _marketCreatorAddress,
        string calldata _realitioQuestion
    ) external;

    function transferCard(
        address _oldOwner,
        address _newOwner,
        uint256 _token,
        uint256 _price,
        uint256 _timeLimit
    ) external;
}

interface IRCOrderbook {
    struct Bid {
        address market;
        address next;
        address prev;
        uint64 card;
        uint128 price;
        uint64 timeHeldLimit;
    }

    function index(
        address _market,
        address _user,
        uint256 _token
    ) external view returns (uint256);

    function ownerOf(address, uint256) external view returns (address);

    function closedMarkets(uint256) external view returns (address);

    function userClosedMarketIndex(address) external view returns (uint256);

    function treasury() external view returns (IRCTreasury);

    function maxSearchIterations() external view returns (uint256);

    function maxDeletions() external view returns (uint256);

    function cleaningLoops() external view returns (uint256);

    function nonce() external view returns (uint256);

    function cleanWastePile() external;

    function getBid(
        address _market,
        address _user,
        uint256 _card
    ) external view returns (Bid memory);

    function setTreasuryAddress(address _newTreasury) external;

    function addMarket(
        address _market,
        uint256 _tokenCount,
        uint256 _minIncrease
    ) external;

    function addBidToOrderbook(
        address _user,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        address _prevUserAddress
    ) external;

    function removeBidFromOrderbook(address _user, uint256 _token) external;

    function closeMarket() external;

    function findNewOwner(uint256 _token, uint256 _timeOwnershipChanged)
        external;

    function getBidValue(address _user, uint256 _token)
        external
        view
        returns (uint256);

    function getTimeHeldlimit(address _user, uint256 _token)
        external
        returns (uint256);

    function bidExists(
        address _user,
        address _market,
        uint256 _card
    ) external view returns (bool);

    function setTimeHeldlimit(
        address _user,
        uint256 _token,
        uint256 _timeHeldLimit
    ) external;

    function removeUserFromOrderbook(address _user)
        external
        returns (bool _userForeclosed);

    function removeOldBids(address _user) external;

    function reduceTimeHeldLimit(
        address _user,
        uint256 _token,
        uint256 _timeToReduce
    ) external;

    function setDeletionLimit(uint256 _deletionLimit) external;

    function setCleaningLimit(uint256 _cleaningLimit) external;

    function setSearchLimit(uint256 _searchLimit) external;
}
