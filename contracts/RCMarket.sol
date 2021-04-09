// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "hardhat/console.sol";
import "./interfaces/IRealitio.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCProxyXdai.sol";
import "./interfaces/IRCNftHubXdai.sol";
import "./interfaces/IRCOrderbook.sol";
import "./lib/NativeMetaTransaction.sol";

/// @title Reality Cards Market
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCMarket is Initializable, NativeMetaTransaction {
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    // VARIABLES

    // CONTRACT SETUP
    /// @dev = how many outcomes/teams/NFTs etc
    uint256 public numberOfTokens;
    /// @dev only for _revertToUnderbidder to prevent gas limits
    uint256 public constant UNDERBID_MAX_ITERATIONS = 10;
    /// @dev to prevent hitting gas limits during _placeInList
    uint256 public constant LIST_MAX_ITERATIONS = 100;
    uint256 public constant MAX_UINT256 = type(uint256).max;
    uint256 public constant MAX_UINT128 = type(uint128).max;
    uint256 public constant MIN_RENTAL_VALUE = 1 ether;
    enum States {CLOSED, OPEN, LOCKED, WITHDRAW}
    States public state;
    /// @dev type of event.
    enum Mode {CLASSIC, WINNER_TAKES_ALL, HOT_POTATO}
    Mode public mode;
    /// @dev so the Factory can check it's a market
    bool public constant isMarket = true;
    /// @dev counts the total NFTs minted across all events at the time market created
    /// @dev nft tokenId = card Id + totalNftMintCount
    uint256 public totalNftMintCount;

    // CONTRACT VARIABLES
    IRCTreasury public treasury;
    IFactory public factory;
    IRCProxyXdai public proxy;
    IRCNftHubXdai public nfthub;
    IRCOrderbook public orderbook;

    // PRICE, DEPOSITS, RENT
    /// @dev in attodai (so 100xdai = 100000000000000000000)
    mapping(uint256 => uint256) public tokenPrice;
    /// @dev keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome.
    mapping(address => uint256) public rentCollectedPerUser;
    /// @dev keeps track of all the rent paid for each token, for card specific affiliate payout
    mapping(uint256 => uint256) public rentCollectedPerToken;
    /// @dev an easy way to track the above across all tokens
    uint256 public totalRentCollected;
    /// @dev prevents user from exiting and re-renting in the same block (prevents troll attacks)
    mapping(address => uint256) public exitedTimestamp;

    // PARAMETERS
    /// @dev read from the Factory upon market creation, can not be changed for existing market
    /// @dev the minimum required price increase in %
    uint256 public minimumPriceIncreasePercent;
    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    uint256 public minRentalDayDivisor;
    /// @dev if hot potato mode, how much rent new owner must pay current owner (1 week divisor: i.e. 7 = 1 day, 14 = 12 hours)
    uint256 public hotPotatoWeekDivisor;

    // ORDERBOOK
    /// @dev incrementing nonce for each rental, for frontend sorting
    uint256 nonce;
    /// @dev stores the orderbook. Doubly linked list.
    mapping(uint256 => mapping(address => Bid)) public orderbook; // tokenID // user address // Bid
    /// @dev orderbook uses uint128 to save gas, because Struct. Using uint256 everywhere else because best for maths.
    struct Bid {
        uint128 price;
        uint128 timeHeldLimit; // users can optionally set a maximum time to hold it for
        address next; // who it will return to when current owner exits (i.e, next = going down the list)
        address prev; // who it returned from (i.e., prev = going up the list)
    }

    // TIME
    /// @dev how many seconds each user has held each token for, for determining winnings
    mapping(uint256 => mapping(address => uint256)) public timeHeld;
    /// @dev sums all the timeHelds for each. Used when paying out. Should always increment at the same time as timeHeld
    mapping(uint256 => uint256) public totalTimeHeld;
    /// @dev used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    mapping(uint256 => uint256) public timeLastCollected;
    /// @dev to track the max timeheld of each token (for giving NFT to winner)
    mapping(uint256 => uint256) public longestTimeHeld;
    /// @dev to track who has owned it the most (for giving NFT to winner)
    mapping(uint256 => address) public longestOwner;

    // TIMESTAMPS
    /// @dev when the market opens
    uint32 public marketOpeningTime;
    /// @dev when the market locks
    uint32 public marketLockingTime;
    /// @dev when the question can be answered on realitio
    /// @dev only needed for circuit breaker
    uint32 public oracleResolutionTime;

    // PAYOUT VARIABLES
    uint256 public winningOutcome;
    /// @dev prevent users withdrawing twice
    mapping(address => bool) public userAlreadyWithdrawn;
    /// @dev prevent users claiming twice
    mapping(uint256 => mapping(address => bool)) public userAlreadyClaimed; // token ID // user // bool
    /// @dev the artist
    address public artistAddress;
    uint256 public artistCut;
    bool public artistPaid;
    /// @dev the affiliate
    address public affiliateAddress;
    uint256 public affiliateCut;
    bool public affiliatePaid;
    /// @dev the winner
    uint256 public winnerCut;
    /// @dev the market creator
    address public marketCreatorAddress;
    uint256 public creatorCut;
    bool public creatorPaid;
    /// @dev card specific recipients
    address[] public cardAffiliateAddresses;
    uint256 public cardAffiliateCut;
    mapping(uint256 => bool) public cardAffiliatePaid;

    // EVENTS

    event LogAddToOrderbook(
        address indexed newOwner,
        uint256 indexed newPrice,
        uint256 timeHeldLimit,
        uint256 nonce,
        uint256 indexed tokenId
    );
    event LogNewOwner(uint256 indexed tokenId, address indexed newOwner);
    event LogRentCollection(
        uint256 indexed rentCollected,
        uint256 indexed tokenId,
        address indexed owner
    );
    event LogRemoveFromOrderbook(
        address indexed owner,
        uint256 indexed tokenId
    );
    event LogContractLocked(bool indexed didTheEventFinish);
    event LogWinnerKnown(uint256 indexed winningOutcome);
    event LogWinningsPaid(address indexed paidTo, uint256 indexed amountPaid);
    event LogStakeholderPaid(
        address indexed paidTo,
        uint256 indexed amountPaid
    );
    event LogRentReturned(
        address indexed returnedTo,
        uint256 indexed amountReturned
    );
    event LogTimeHeldUpdated(
        uint256 indexed newTimeHeld,
        address indexed owner,
        uint256 indexed tokenId
    );
    event LogStateChange(uint256 indexed newState);
    event LogUpdateTimeHeldLimit(
        address indexed owner,
        uint256 newLimit,
        uint256 tokenId
    );
    event LogExit(address indexed owner, uint256 tokenId);
    event LogSponsor(address indexed sponsor, uint256 indexed amount);
    event LogNftUpgraded(
        uint256 indexed currentTokenId,
        uint256 indexed newTokenId
    );
    event LogPayoutDetails(
        address indexed artistAddress,
        address marketCreatorAddress,
        address affiliateAddress,
        address[] cardAffiliateAddresses,
        uint256 indexed artistCut,
        uint256 winnerCut,
        uint256 creatorCut,
        uint256 affiliateCut,
        uint256 cardAffiliateCut
    );
    event LogSettings(
        uint256 indexed minRentalDayDivisor,
        uint256 indexed minimumPriceIncreasePercent,
        uint256 hotPotatoWeekDivisor
    );

    // CONSTRUCTOR

    /// @param _mode 0 = normal, 1 = winner takes all, 2 = hot potato
    /// @param _timestamps for market opening, locking, and oracle resolution
    /// @param _numberOfTokens how many Cards in this market
    /// @param _totalNftMintCount total existing Cards across all markets excl this event's Cards
    /// @param _artistAddress where to send artist's cut, if any
    /// @param _affiliateAddress where to send affiliate's cut, if any
    /// @param _cardAffiliateAddresses where to send card specific affiliate's cut, if any
    /// @param _marketCreatorAddress where to send market creator's cut, if any
    function initialize(
        uint256 _mode,
        uint32[] memory _timestamps,
        uint256 _numberOfTokens,
        uint256 _totalNftMintCount,
        address _artistAddress,
        address _affiliateAddress,
        address[] memory _cardAffiliateAddresses,
        address _marketCreatorAddress
    ) external initializer {
        assert(_mode <= 2);

        // initialise MetaTransactions
        _initializeEIP712("RealityCardsMarket", "1");

        // external contract variables:
        factory = IFactory(msg.sender);
        treasury = factory.treasury();
        proxy = factory.proxy();
        nfthub = factory.nfthub();
        orderbook = factory.orderbook();

        // get adjustable parameters from the factory/treasury
        uint256[5] memory _potDistribution = factory.getPotDistribution();
        minRentalDayDivisor = treasury.minRentalDayDivisor();
        minimumPriceIncreasePercent = factory.minimumPriceIncreasePercent();
        hotPotatoWeekDivisor = factory.hotPotatoWeekDivisor();

        // initialiiize!
        winningOutcome = MAX_UINT256; // default invalid

        // assign arguments to public variables
        mode = Mode(_mode);
        numberOfTokens = _numberOfTokens;
        totalNftMintCount = _totalNftMintCount;
        marketOpeningTime = _timestamps[0];
        marketLockingTime = _timestamps[1];
        oracleResolutionTime = _timestamps[2];
        artistAddress = _artistAddress;
        marketCreatorAddress = _marketCreatorAddress;
        affiliateAddress = _affiliateAddress;
        cardAffiliateAddresses = _cardAffiliateAddresses;
        artistCut = _potDistribution[0];
        winnerCut = _potDistribution[1];
        creatorCut = _potDistribution[2];
        affiliateCut = _potDistribution[3];
        cardAffiliateCut = _potDistribution[4];

        // reduce artist cut to zero if zero adddress set
        if (_artistAddress == address(0)) {
            artistCut = 0;
        }

        // reduce affiliate cut to zero if zero adddress set
        if (_affiliateAddress == address(0)) {
            affiliateCut = 0;
        }

        // check the validity of card affiliate array.
        // if not valid, reduce payout to zero
        if (_cardAffiliateAddresses.length == _numberOfTokens) {
            for (uint256 i = 0; i < _numberOfTokens; i++) {
                if (_cardAffiliateAddresses[i] == address(0)) {
                    cardAffiliateCut = 0;
                }
            }
        } else {
            cardAffiliateCut = 0;
        }

        // if winner takes all mode, set winnerCut to max
        if (_mode == 1) {
            winnerCut = (
                ((uint256(1000).sub(artistCut)).sub(creatorCut)).sub(
                    affiliateCut
                )
            )
                .sub(cardAffiliateCut);
        }

        // move to OPEN immediately if market opening time in the past
        if (marketOpeningTime <= block.timestamp) {
            _incrementState();
        }

        emit LogPayoutDetails(
            _artistAddress,
            _marketCreatorAddress,
            _affiliateAddress,
            cardAffiliateAddresses,
            artistCut,
            winnerCut,
            creatorCut,
            affiliateCut,
            cardAffiliateCut
        );
        emit LogSettings(
            minRentalDayDivisor,
            minimumPriceIncreasePercent,
            hotPotatoWeekDivisor
        );
    }

    // MODIFIERS

    /// @dev automatically opens market if appropriate
    modifier autoUnlock() {
        if (marketOpeningTime <= block.timestamp && state == States.CLOSED) {
            _incrementState();
        }
        _;
    }

    /// @dev automatically locks market if appropriate
    modifier autoLock() {
        _;
        if (marketLockingTime <= block.timestamp) {
            lockMarket();
        }
    }

    /// @notice what it says on the tin
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(msgSender() == ownerOf(_tokenId), "Not owner");
        _;
    }

    // ORACLE PROXY CONTRACT CALLS

    /// @notice send NFT to mainnet
    /// @dev upgrades not possible if market not approved
    function upgradeCard(uint256 _tokenId) external onlyTokenOwner(_tokenId) {
        _checkState(States.WITHDRAW);
        require(
            !factory.trapIfUnapproved() ||
                factory.isMarketApproved(address(this)),
            "Upgrade blocked"
        );
        string memory _tokenUri = tokenURI(_tokenId);
        address _owner = ownerOf(_tokenId);
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        proxy.saveCardToUpgrade(_actualTokenId, _tokenUri, _owner);
        _transferCard(ownerOf(_tokenId), address(this), _tokenId); // contract becomes final resting place
        emit LogNftUpgraded(_tokenId, _actualTokenId);
    }

    // NFT HUB CONTRACT CALLS

    /// @notice gets the owner of the NFT via their Card Id
    function ownerOf(uint256 _tokenId) public view returns (address) {
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        return nfthub.ownerOf(_actualTokenId);
    }

    /// @notice gets tokenURI via their Card Id
    function tokenURI(uint256 _tokenId) public view returns (string memory) {
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        return nfthub.tokenURI(_actualTokenId);
    }

    /// @notice transfer ERC 721 between users
    function _transferCard(
        address _from,
        address _to,
        uint256 _tokenId
    ) internal {
        require(
            _from != address(0) && _to != address(0),
            "Cannot send to/from zero address"
        );
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        assert(nfthub.transferNft(_from, _to, _actualTokenId));
        emit LogNewOwner(_tokenId, _to);
    }

    // MARKET RESOLUTION FUNCTIONS

    /// @notice checks whether the competition has ended, if so moves to LOCKED state
    /// @dev can be called by anyone
    /// @dev public because called within autoLock modifier & setWinner
    function lockMarket() public {
        _checkState(States.OPEN);
        require(
            marketLockingTime <= block.timestamp,
            "Market has not finished"
        );
        // do a final rent collection before the contract is locked down
        collectRentAllCards();
        // let the treasury know the market is closed
        treasury.updateMarketStatus(false);
        _incrementState();
        emit LogContractLocked(true);
    }

    /// @notice called by proxy, sets the winner
    /// @dev the proxy checks if the market has locked already so
    /// @dev .. that the market can't be closed early by the oracle.
    /// @param _winningOutcome the index of the winning card
    function setWinner(uint256 _winningOutcome) external {
        if (state == States.OPEN) {
            // change the locking time to allow lockMarket to lock
            marketLockingTime = SafeCast.toUint32(block.timestamp);
            lockMarket();
        }
        _checkState(States.LOCKED);
        require(msgSender() == address(proxy), "Not proxy");
        // get the winner. This will revert if answer is not resolved.
        winningOutcome = _winningOutcome;
        _incrementState();
        emit LogWinnerKnown(winningOutcome);
    }

    /// @notice pays out winnings, or returns funds
    function withdraw() external {
        _checkState(States.WITHDRAW);
        require(!userAlreadyWithdrawn[msgSender()], "Already withdrawn");
        userAlreadyWithdrawn[msgSender()] = true;
        if (totalTimeHeld[winningOutcome] > 0) {
            _payoutWinnings();
        } else {
            _returnRent();
        }
    }

    /// @notice the longest owner of each NFT gets to keep it
    /// @dev LOCKED or WITHDRAW states are fine- does not need to wait for winner to be known
    /// @param _tokenId the index of the token
    function claimCard(uint256 _tokenId) external {
        _checkNotState(States.CLOSED);
        _checkNotState(States.OPEN);
        require(!userAlreadyClaimed[_tokenId][msgSender()], "Already claimed");
        userAlreadyClaimed[_tokenId][msgSender()] = true;
        require(longestOwner[_tokenId] == msgSender(), "Not longest owner");
        _transferCard(ownerOf(_tokenId), longestOwner[_tokenId], _tokenId);
    }

    /// @notice pays winnings
    function _payoutWinnings() internal {
        uint256 _winningsToTransfer = 0;
        uint256 _remainingCut =
            (
                (((uint256(1000).sub(artistCut)).sub(affiliateCut)))
                    .sub(cardAffiliateCut)
                    .sub(winnerCut)
            )
                .sub(creatorCut);
        // calculate longest owner's extra winnings, if relevant
        if (longestOwner[winningOutcome] == msgSender() && winnerCut > 0) {
            _winningsToTransfer = (totalRentCollected.mul(winnerCut)).div(1000);
        }
        // calculate normal winnings, if any
        uint256 _remainingPot =
            (totalRentCollected.mul(_remainingCut)).div(1000);
        uint256 _winnersTimeHeld = timeHeld[winningOutcome][msgSender()];
        uint256 _numerator = _remainingPot.mul(_winnersTimeHeld);
        _winningsToTransfer = _winningsToTransfer.add(
            _numerator.div(totalTimeHeld[winningOutcome])
        );
        require(_winningsToTransfer > 0, "Not a winner");
        _payout(msgSender(), _winningsToTransfer);
        emit LogWinningsPaid(msgSender(), _winningsToTransfer);
    }

    /// @notice returns all funds to users in case of invalid outcome
    function _returnRent() internal {
        // deduct artist share and card specific share if relevant but NOT market creator share or winner's share (no winner, market creator does not deserve)
        uint256 _remainingCut =
            ((uint256(1000).sub(artistCut)).sub(affiliateCut)).sub(
                cardAffiliateCut
            );
        uint256 _rentCollected = rentCollectedPerUser[msgSender()];
        require(_rentCollected > 0, "Paid no rent");
        uint256 _rentCollectedAdjusted =
            (_rentCollected.mul(_remainingCut)).div(1000);
        _payout(msgSender(), _rentCollectedAdjusted);
        emit LogRentReturned(msgSender(), _rentCollectedAdjusted);
    }

    /// @notice all payouts happen through here
    function _payout(address _recipient, uint256 _amount) internal {
        assert(treasury.payout(_recipient, _amount));
    }

    /// @dev the below functions pay stakeholders (artist, creator, affiliate, card specific affiliates)
    /// @dev they are not called within determineWinner() because of the risk of an
    /// @dev ....  address being a contract which refuses payment, then nobody could get winnings

    /// @notice pay artist
    function payArtist() external {
        _checkState(States.WITHDRAW);
        require(!artistPaid, "Artist already paid");
        artistPaid = true;
        _processStakeholderPayment(artistCut, artistAddress);
    }

    /// @notice pay market creator
    function payMarketCreator() external {
        _checkState(States.WITHDRAW);
        require(totalTimeHeld[winningOutcome] > 0, "No winner");
        require(!creatorPaid, "Creator already paid");
        creatorPaid = true;
        _processStakeholderPayment(creatorCut, marketCreatorAddress);
    }

    /// @notice pay affiliate
    function payAffiliate() external {
        _checkState(States.WITHDRAW);
        require(!affiliatePaid, "Affiliate already paid");
        affiliatePaid = true;
        _processStakeholderPayment(affiliateCut, affiliateAddress);
    }

    /// @notice pay card affiliate
    /// @dev does not call _processStakeholderPayment because it works differently
    function payCardAffiliate(uint256 _tokenId) external {
        _checkState(States.WITHDRAW);
        require(!cardAffiliatePaid[_tokenId], "Card affiliate already paid");
        cardAffiliatePaid[_tokenId] = true;
        uint256 _cardAffiliatePayment =
            (rentCollectedPerToken[_tokenId].mul(cardAffiliateCut)).div(1000);
        if (_cardAffiliatePayment > 0) {
            _payout(cardAffiliateAddresses[_tokenId], _cardAffiliatePayment);
            emit LogStakeholderPaid(
                cardAffiliateAddresses[_tokenId],
                _cardAffiliatePayment
            );
        }
    }

    function _processStakeholderPayment(uint256 _cut, address _recipient)
        internal
    {
        if (_cut > 0) {
            uint256 _payment = (totalRentCollected.mul(_cut)).div(1000);
            _payout(_recipient, _payment);
            emit LogStakeholderPaid(_recipient, _payment);
        }
    }

    // CORE FUNCTIONS- EXTERNAL

    /// @dev basically functions that have _checkState(States.OPEN) on first line

    /// @notice collects rent for all tokens
    /// @dev cannot be external because it is called within the lockMarket function, therefore public
    function collectRentAllCards() public {
        _checkState(States.OPEN);
        for (uint256 i = 0; i < numberOfTokens; i++) {
            _collectRent(i);
        }
    }

    /// @notice collect rent on a set of cards
    /// @dev used by the treasury to collect rent on specifc cards
    /// @param _cards the tokenId of the cards to collect rent on
    function collectRentSpecificCards(uint256[] calldata _cards) external {
        //_checkState(States.OPEN);
        for (uint256 i; i < _cards.length; i++) {
            _collectRent(_cards[i]);
        }
    }

    /// @notice rent every Card at the minimum price
    /// @param _maxSumOfPrices a limit to the sum of the bids to place
    function rentAllCards(uint256 _maxSumOfPrices) external {
        // check that not being front run
        uint256 _actualSumOfPrices;
        for (uint256 i = 0; i < numberOfTokens; i++) {
            _actualSumOfPrices = _actualSumOfPrices.add(tokenPrice[i]);
        }
        require(_actualSumOfPrices <= _maxSumOfPrices, "Prices too high");

        for (uint256 i = 0; i < numberOfTokens; i++) {
            if (ownerOf(i) != msgSender()) {
                uint256 _newPrice;
                if (tokenPrice[i] > 0) {
                    _newPrice = (
                        tokenPrice[i].mul(minimumPriceIncreasePercent.add(100))
                    )
                        .div(100);
                } else {
                    _newPrice = MIN_RENTAL_VALUE;
                }
                newRental(_newPrice, 0, address(0), i);
            }
        }
    }

    /// @notice to rent a Card
    /// @dev no event: it is emitted in _updateBid, _setNewOwner or _placeInList as appropriate
    /// @param _newPrice the price to rent the card for
    /// @param _timeHeldLimit an optional time limit to rent the card for
    /// @param _startingPosition where to start looking to insert the bid into the orderbook
    /// @param _tokenId the index of the card to update
    function newRental(
        uint256 _newPrice,
        uint256 _timeHeldLimit,
        address _startingPosition,
        uint256 _tokenId
    ) public payable autoUnlock() autoLock() returns (uint256) {
        _checkState(States.OPEN);
        require(_newPrice >= MIN_RENTAL_VALUE, "Minimum rental 1 xDai");
        require(_tokenId < numberOfTokens, "This token does not exist");
        address _user = msgSender();
        require(
            exitedTimestamp[_user] != block.timestamp,
            "Cannot lose and re-rent in same block"
        );
        require(
            !treasury.marketPaused(address(this)) && !treasury.globalPause(),
            "Rentals are disabled"
        );

        treasury.collectRent(_user);

        // process deposit, if sent
        if (msg.value > 0) {
            assert(treasury.deposit{value: msg.value}(_user));
        }

        // check sufficient deposit
        uint256 _userTotalBidRate =
            orderbook.adjustedBidRate(_user, _tokenId).add(_newPrice);
        require(
            treasury.userDeposit(_user) >=
                _userTotalBidRate.div(minRentalDayDivisor),
            "Insufficient deposit"
        );

        _timeHeldLimit = _checkTimeHeldLimit(_user, _tokenId, _timeHeldLimit);

        // replaces _newBid and _updateBid
        orderbook.addBidToOrderbook(
            _user,
            _tokenId,
            _newPrice,
            _timeHeldLimit,
            _startingPosition
        );

        assert(treasury.updateLastRentalTime(_user));
        nonce++;
        return tokenPrice[_tokenId];
    }

    function _checkTimeHeldLimit(
        address _user,
        uint256 _tokenId,
        uint256 _timeHeldLimit
    ) internal returns (uint256) {
        if (_timeHeldLimit == 0) {
            return MAX_UINT128; // so 0 defaults to no limit
        } else {
            uint256 _minRentalTime = uint256(1 days).div(minRentalDayDivisor);
            require(
                _timeHeldLimit >=
                    treasury.timeHeld(_user, _tokenId).add(_minRentalTime),
                "Limit too low"
            ); // must be after collectRent so timeHeld is up to date
            return _timeHeldLimit;
        }
    }

    /// @notice to change your timeHeldLimit without having to re-rent
    /// @param _timeHeldLimit an optional time limit to rent the card for
    /// @param _tokenId the index of the card to update
    function updateTimeHeldLimit(uint256 _timeHeldLimit, uint256 _tokenId)
        external
    {
        _checkState(States.OPEN);
        address _user = msgSender();
        treasury.collectRent(_user);

        _timeHeldLimit = _checkTimeHeldLimit(_user, _tokenId, _timeHeldLimit);

        orderbook.setTimeHeldlimit(_user, _tokenId, _timeHeldLimit);

        emit LogUpdateTimeHeldLimit(_user, _timeHeldLimit, _tokenId);
    }

    /// @notice stop renting a token and/or remove from orderbook
    /// @dev public because called by exitAll() and exitSpecifcCards()
    /// @dev doesn't need to be current owner so user can prevent ownership returning to them
    /// @dev does not apply minimum rental duration, because it returns ownership to the next user
    /// @param _tokenId The token index to exit
    function exit(uint256 _tokenId) external {
        _exit(_tokenId, address(0));
    }

    /// @notice stop renting all tokens
    function exitAll() external {
        for (uint256 i = 0; i < numberOfTokens; i++) {
            _exit(i, address(0));
        }
    }

    /// @notice stop renting a set of cards
    /// @dev can be called by anyone but unless it's the treasury the address given will be ignored
    /// @param _cards the array of tokenIds that are to be exited
    /// @param _user the user bids to exit (only can be used by the treasury)
    function exitSpecificCards(uint256[] calldata _cards, address _user)
        external
    {
        for (uint256 i; i < _cards.length; i++) {
            _exit(_cards[i], _user);
        }
    }

    /// @notice ability to add liqudity to the pot without being able to win.
    function sponsor() external payable {
        _checkNotState(States.LOCKED);
        _checkNotState(States.WITHDRAW);
        require(msg.value > 0, "Must send something");
        // send funds to the Treasury
        require(treasury.sponsor{value: msg.value}());
        totalRentCollected = totalRentCollected.add(msg.value);
        // just so user can get it back if invalid outcome
        rentCollectedPerUser[msgSender()] = rentCollectedPerUser[msgSender()]
            .add(msg.value);
        // allocate equally to each token, in case card specific affiliates
        for (uint256 i = 0; i < numberOfTokens; i++) {
            rentCollectedPerToken[i] = rentCollectedPerToken[i].add(
                msg.value.div(numberOfTokens)
            );
        }
        emit LogSponsor(msgSender(), msg.value);
    }

    // CORE FUNCTIONS- INTERNAL

    /// @dev cancels a bid on a given _tokenId
    /// @dev the Treasury can call this on users when they withdraw their deposits
    function _exit(uint256 _tokenId, address _user) internal {
        _checkState(States.OPEN);
        address _msgSender = msgSender();
        if (orderbook[_tokenId][_msgSender].price > 0) {
            if (_msgSender == address(treasury)) {
                _msgSender = _user;
            }
            // if current owner, collect rent, revert if necessary
            if (ownerOf(_tokenId) == _msgSender) {
                // collectRent first
                _collectRent(_tokenId);

                // if still the current owner after collecting rent, revert to underbidder
                if (ownerOf(_tokenId) == _msgSender) {
                    _revertToUnderbidder(_tokenId);
                    // if not current owner no further action necessary because they will have been deleted from the orderbook
                } else {
                    assert(orderbook[_tokenId][_msgSender].price == 0);
                }
                // if not owner, just delete from orderbook
            } else {
                treasury.updateUserBids(
                    _msgSender,
                    orderbook[_tokenId][_msgSender].price,
                    _tokenId,
                    false
                );
                orderbook[_tokenId][orderbook[_tokenId][_msgSender].next]
                    .prev = orderbook[_tokenId][_msgSender].prev;
                orderbook[_tokenId][orderbook[_tokenId][_msgSender].prev]
                    .next = orderbook[_tokenId][_msgSender].next;
                delete orderbook[_tokenId][_msgSender];
                emit LogRemoveFromOrderbook(_msgSender, _tokenId);
            }
            emit LogExit(_msgSender, _tokenId);
        }
    }

    /// @notice collects rent for a specific token
    /// @dev also calculates and updates how long the current user has held the token for
    /// @dev is not a problem if called externally, but making internal over public to save gas
    function _collectRent(uint256 _tokenId) internal {
        uint256 _timeOfThisCollection = block.timestamp;
        if (marketLockingTime <= block.timestamp) {
            _timeOfThisCollection = marketLockingTime;
        }
        //only collect rent if the token is owned (ie, if owned by the contract this implies unowned)
        // AND if the last collection was in the past (ie, don't do 2+ rent collections in the same block)
        if (
            ownerOf(_tokenId) != address(this) &&
            timeLastCollected[_tokenId] < _timeOfThisCollection
        ) {
            uint256 _rentOwed =
                tokenPrice[_tokenId]
                    .mul(_timeOfThisCollection.sub(timeLastCollected[_tokenId]))
                    .div(1 days);
            address _collectRentFrom = ownerOf(_tokenId);
            uint256 _deposit = treasury.userDeposit(_collectRentFrom);

            // get the maximum rent they can pay based on timeHeldLimit
            uint256 _rentOwedLimit;
            uint256 _timeHeldLimit =
                orderbook[_tokenId][_collectRentFrom].timeHeldLimit;
            if (_timeHeldLimit == MAX_UINT128) {
                _rentOwedLimit = MAX_UINT256;
            } else {
                _rentOwedLimit = tokenPrice[_tokenId]
                    .mul(
                    _timeHeldLimit.sub(timeHeld[_tokenId][_collectRentFrom])
                )
                    .div(1 days);
            }

            // if rent owed is too high, reduce
            if (_rentOwed >= _deposit || _rentOwed >= _rentOwedLimit) {
                // case 1: rentOwed is reduced to _deposit
                if (_deposit <= _rentOwedLimit) {
                    _timeOfThisCollection = timeLastCollected[_tokenId].add(
                        (
                            (
                                _timeOfThisCollection.sub(
                                    timeLastCollected[_tokenId]
                                )
                            )
                                .mul(_deposit)
                                .div(_rentOwed)
                        )
                    );
                    _rentOwed = _deposit; // take what's left
                    // case 2: rentOwed is reduced to _rentOwedLimit
                } else {
                    _timeOfThisCollection = timeLastCollected[_tokenId].add(
                        (
                            (
                                _timeOfThisCollection.sub(
                                    timeLastCollected[_tokenId]
                                )
                            )
                                .mul(_rentOwedLimit)
                                .div(_rentOwed)
                        )
                    );
                    _rentOwed = _rentOwedLimit; // take up to the max
                }
                _revertToUnderbidder(_tokenId);
            }

            if (_rentOwed > 0) {
                // decrease deposit by rent owed at the Treasury
                assert(treasury.payRent(_collectRentFrom, _rentOwed));
                // update internals
                uint256 _timeHeldToIncrement =
                    (_timeOfThisCollection.sub(timeLastCollected[_tokenId]));
                timeHeld[_tokenId][_collectRentFrom] = timeHeld[_tokenId][
                    _collectRentFrom
                ]
                    .add(_timeHeldToIncrement);
                totalTimeHeld[_tokenId] = totalTimeHeld[_tokenId].add(
                    _timeHeldToIncrement
                );
                rentCollectedPerUser[_collectRentFrom] = rentCollectedPerUser[
                    _collectRentFrom
                ]
                    .add(_rentOwed);

                rentCollectedPerToken[_tokenId] = rentCollectedPerToken[
                    _tokenId
                ]
                    .add(_rentOwed);
                totalRentCollected = totalRentCollected.add(_rentOwed);

                // longest owner tracking
                if (
                    timeHeld[_tokenId][_collectRentFrom] >
                    longestTimeHeld[_tokenId]
                ) {
                    longestTimeHeld[_tokenId] = timeHeld[_tokenId][
                        _collectRentFrom
                    ];
                    longestOwner[_tokenId] = _collectRentFrom;
                }

                emit LogTimeHeldUpdated(
                    timeHeld[_tokenId][_collectRentFrom],
                    _collectRentFrom,
                    _tokenId
                );
                emit LogRentCollection(_rentOwed, _tokenId, _collectRentFrom);
            }
        }

        // timeLastCollected is updated regardless of whether the token is owned, so that the clock starts ticking
        // ... when the first owner buys it, because this function is run before ownership changes upon calling newRental
        timeLastCollected[_tokenId] = _timeOfThisCollection;
    }

    /// @dev user is not in the orderbook
    function _newBid(
        uint256 _newPrice,
        uint256 _tokenId,
        uint256 _timeHeldLimit,
        address _startingPosition
    ) internal {
        // check user not in the orderbook
        assert(orderbook[_tokenId][msgSender()].price == 0);
        uint256 _minPriceToOwn =
            (tokenPrice[_tokenId].mul(minimumPriceIncreasePercent.add(100)))
                .div(100);
        // case 1: user is sufficiently above highest bidder (or only bidder)
        if (ownerOf(_tokenId) == address(this) || _newPrice >= _minPriceToOwn) {
            _setNewOwner(_newPrice, _tokenId, _timeHeldLimit);
        } else {
            // case 2: user is not sufficiently above highest bidder
            _placeInList(
                _newPrice,
                _tokenId,
                _timeHeldLimit,
                _startingPosition
            );
        }
    }

    /// @dev user is already in the orderbook
    function _updateBid(
        uint256 _newPrice,
        uint256 _tokenId,
        uint256 _timeHeldLimit,
        address _startingPosition
    ) internal {
        uint256 _minPriceToOwn;
        address _msgSender = msgSender();
        // ensure user is in the orderbook
        assert(orderbook[_tokenId][_msgSender].price > 0);
        // case 1: user is currently the owner
        if (_msgSender == ownerOf(_tokenId)) {
            _minPriceToOwn = (
                tokenPrice[_tokenId].mul(minimumPriceIncreasePercent.add(100))
            )
                .div(100);
            // case 1A: new price must be X% higher than previous OR lower, otherwise revert the tx to prevent frontrunning
            require(
                _newPrice >= _minPriceToOwn ||
                    _newPrice <= tokenPrice[_tokenId],
                "Not 10% higher"
            );
            // case 1B: new price is at least X% above current price- adjust price & timeHeldLimit. newRental event required.
            if (_newPrice >= _minPriceToOwn) {
                orderbook[_tokenId][_msgSender].price = SafeCast.toUint128(
                    _newPrice
                );
                orderbook[_tokenId][_msgSender].timeHeldLimit = SafeCast
                    .toUint128(_timeHeldLimit);
                _processUpdateOwner(_newPrice, _tokenId);
                emit LogAddToOrderbook(
                    _msgSender,
                    _newPrice,
                    _timeHeldLimit,
                    nonce,
                    _tokenId
                );
                // case 1C: new price is equal or below old price
            } else {
                _minPriceToOwn = (
                    uint256(
                        orderbook[_tokenId][
                            orderbook[_tokenId][_msgSender].next
                        ]
                            .price
                    )
                        .mul(minimumPriceIncreasePercent.add(100))
                )
                    .div(100);
                // case 1Ca: still the highest owner- adjust price & timeHeldLimit. newRental event required.
                if (_newPrice >= _minPriceToOwn) {
                    int256 _priceChange =
                        int256(_newPrice).sub(
                            int256(orderbook[_tokenId][_msgSender].price)
                        );
                    treasury.updateUserTotalBids(
                        ownerOf(_tokenId),
                        _priceChange
                    );
                    orderbook[_tokenId][_msgSender].price = SafeCast.toUint128(
                        _newPrice
                    );
                    orderbook[_tokenId][_msgSender].timeHeldLimit = SafeCast
                        .toUint128(_timeHeldLimit);
                    _processUpdateOwner(_newPrice, _tokenId);
                    emit LogAddToOrderbook(
                        _msgSender,
                        _newPrice,
                        _timeHeldLimit,
                        nonce,
                        _tokenId
                    );
                    // case 1Cb: user is not owner anymore-  remove from list & add back. newRental event called in _setNewOwner or _placeInList via _newBid
                } else {
                    _revertToUnderbidder(_tokenId);
                    _newBid(
                        _newPrice,
                        _tokenId,
                        _timeHeldLimit,
                        _startingPosition
                    );
                }
            }
            // case 2: user is not currently the owner- remove and add them back
        } else {
            // remove from the list
            int256 _priceChange =
                int256(0).sub(int256(orderbook[_tokenId][_msgSender].price));
            treasury.updateUserTotalBids(_msgSender, _priceChange);
            orderbook[_tokenId][orderbook[_tokenId][_msgSender].prev]
                .next = orderbook[_tokenId][_msgSender].next;
            orderbook[_tokenId][orderbook[_tokenId][_msgSender].next]
                .prev = orderbook[_tokenId][_msgSender].prev;
            delete orderbook[_tokenId][_msgSender]; // no LogRemoveFromOrderbook they are being added right back
            _minPriceToOwn = (
                tokenPrice[_tokenId].mul(minimumPriceIncreasePercent.add(100))
            )
                .div(100);
            // case 2A: should be owner, add on top. newRental event called in _setNewOwner
            if (_newPrice >= _minPriceToOwn) {
                treasury.updateUserTotalBids(_msgSender, int256(_newPrice));
                _setNewOwner(_newPrice, _tokenId, _timeHeldLimit);
                // case 2B: should not be owner, add to list. newRental event called in _placeInList
            } else {
                _placeInList(
                    _newPrice,
                    _tokenId,
                    _timeHeldLimit,
                    _startingPosition
                );
            }
        }
    }

    /// @dev only for when user is NOT already in the list and IS the highest bidder
    function _setNewOwner(
        uint256 _newPrice,
        uint256 _tokenId,
        uint256 _timeHeldLimit
    ) internal {
        // if hot potato mode, pay current owner
        address _msgSender = msgSender();
        if (mode == Mode.HOT_POTATO) {
            uint256 _duration = uint256(1 weeks).div(hotPotatoWeekDivisor);
            uint256 _requiredPayment =
                (tokenPrice[_tokenId].mul(_duration)).div(uint256(1 days));
            assert(
                treasury.processHarbergerPayment(
                    _msgSender,
                    ownerOf(_tokenId),
                    _requiredPayment
                )
            );
        }
        // process new owner
        orderbook[_tokenId][_msgSender] = Bid(
            SafeCast.toUint128(_newPrice),
            SafeCast.toUint128(_timeHeldLimit),
            ownerOf(_tokenId),
            address(this)
        );
        orderbook[_tokenId][ownerOf(_tokenId)].prev = _msgSender;
        // _processNewOwner must be after LogAddToOrderbook so LogNewOwner is not emitted before user is in the orderbook
        emit LogAddToOrderbook(
            _msgSender,
            _newPrice,
            _timeHeldLimit,
            nonce,
            _tokenId
        );
        _processNewOwner(_msgSender, _newPrice, _tokenId);
    }

    /// @dev only for when user is NOT already in the list and NOT the highest bidder
    function _placeInList(
        uint256 _newPrice,
        uint256 _tokenId,
        uint256 _timeHeldLimit,
        address _startingPosition
    ) internal {
        uint256 _oldPrice = _newPrice;
        // if starting position is not set, start at the top
        if (_startingPosition == address(0)) {
            _startingPosition = ownerOf(_tokenId);
            // _newPrice could be the highest, but not X% above owner, hence _newPrice must be reduced or require statement below would fail
            if (orderbook[_tokenId][_startingPosition].price < _newPrice) {
                _newPrice = orderbook[_tokenId][_startingPosition].price;
            }
        }
        // check the starting location is not too low down the list
        require(
            orderbook[_tokenId][_startingPosition].price >= _newPrice,
            "Location too low"
        );

        address _tempNext = _startingPosition;
        address _tempPrev;
        uint256 _loopCount = 0;
        uint256 _requiredPrice;

        // loop through orderbook until bid is at least _requiredPrice above that user
        do {
            _tempPrev = _tempNext;
            _tempNext = orderbook[_tokenId][_tempPrev].next;
            _requiredPrice = (
                uint256(orderbook[_tokenId][_tempNext].price).mul(
                    minimumPriceIncreasePercent.add(100)
                )
            )
                .div(100);
            _loopCount = _loopCount.add(1);
        } while (
            // break loop if match price above AND above price below (so if either is false, continue, hence OR )
            (_newPrice != orderbook[_tokenId][_tempPrev].price ||
                _newPrice <= orderbook[_tokenId][_tempNext].price) &&
                // break loop if price x% above below
                _newPrice < _requiredPrice &&
                // break loop if hits max iterations
                _loopCount < LIST_MAX_ITERATIONS
        );
        require(_loopCount < LIST_MAX_ITERATIONS, "Location too high");

        // reduce user's price to the user above them in the list if necessary, so prices are in order
        if (orderbook[_tokenId][_tempPrev].price < _newPrice) {
            _newPrice = orderbook[_tokenId][_tempPrev].price;
        }
        if (_oldPrice != _newPrice) {
            int256 _priceChange = int256(_newPrice).sub(int256(_oldPrice));
            treasury.updateUserTotalBids(msgSender(), _priceChange);
        }
        // add to the list
        orderbook[_tokenId][msgSender()] = Bid(
            SafeCast.toUint128(_newPrice),
            SafeCast.toUint128(_timeHeldLimit),
            _tempNext,
            _tempPrev
        );
        orderbook[_tokenId][_tempPrev].next = msgSender();
        orderbook[_tokenId][_tempNext].prev = msgSender();
        emit LogAddToOrderbook(
            msgSender(),
            _newPrice,
            _timeHeldLimit,
            nonce,
            _tokenId
        );
    }

    /// @notice if a users deposit runs out, either return to previous owner or foreclose
    /// @dev can be called by anyone via collectRent, therefore should never use msg.sender
    function _revertToUnderbidder(uint256 _tokenId) internal {
        address _tempNext = ownerOf(_tokenId);
        address _tempPrev;
        uint256 _tempNextDeposit;
        uint256 _requiredDeposit;
        uint256 _loopCount = 0;

        // loop through orderbook list for user with sufficient deposit, deleting users who fail the test
        do {
            // get the address of next person in the list
            _tempPrev = _tempNext;
            _tempNext = orderbook[_tokenId][_tempPrev].next;
            // remove the previous user
            treasury.updateUserBids(
                _tempPrev,
                orderbook[_tokenId][_tempPrev].price,
                _tokenId,
                false
            );
            orderbook[_tokenId][_tempNext].prev = address(this);
            delete orderbook[_tokenId][_tempPrev];
            emit LogRemoveFromOrderbook(_tempPrev, _tokenId);
            // get required  and actual deposit of next user
            _tempNextDeposit = treasury.userDeposit(_tempNext);
            uint256 _nextUserTotalBids =
                treasury.userTotalBids(_tempNext).add(
                    orderbook[_tokenId][_tempNext].price
                );
            _requiredDeposit = _nextUserTotalBids.div(minRentalDayDivisor);
            _loopCount = _loopCount.add(1);
        } while (
            _tempNext != address(this) &&
                _tempNextDeposit < _requiredDeposit &&
                _loopCount < UNDERBID_MAX_ITERATIONS
        );

        exitedTimestamp[ownerOf(_tokenId)] = block.timestamp;
        _processNewOwner(
            _tempNext,
            orderbook[_tokenId][_tempNext].price,
            _tokenId
        );
    }

    /// @dev we don't emit LogAddToOrderbook because this is not correct if called via _revertToUnderbidder
    function _processNewOwner(
        address _newOwner,
        uint256 _newPrice,
        uint256 _tokenId
    ) internal {
        treasury.updateOwnership(
            ownerOf(_tokenId),
            _newOwner,
            tokenPrice[_tokenId],
            _newPrice,
            _tokenId
        );
        _transferCard(ownerOf(_tokenId), _newOwner, _tokenId);
        tokenPrice[_tokenId] = _newPrice;
    }

    /// @dev same as above except does not transfer the Card or update last rental time
    function _processUpdateOwner(uint256 _newPrice, uint256 _tokenId) internal {
        int256 _priceChange =
            int256(_newPrice).sub(int256(tokenPrice[_tokenId]));
        treasury.updateUserRentalRate(ownerOf(_tokenId), _priceChange);
        tokenPrice[_tokenId] = _newPrice;
    }

    function _checkState(States currentState) internal view {
        require(state == currentState, "Incorrect state");
    }

    function _checkNotState(States currentState) internal view {
        require(state != currentState, "Incorrect state");
    }

    /// @dev should only be called thrice
    function _incrementState() internal {
        assert(uint256(state) < 4);
        state = States(uint256(state).add(1));
        if (uint256(state) == 1) {
            treasury.updateMarketStatus(true);
        }
        emit LogStateChange(uint256(state));
    }

    // CIRCUIT BREAKER

    /// @dev alternative to determineWinner, in case Oracle never resolves for any reason
    /// @dev does not set a winner so same as invalid outcome
    /// @dev market does not need to be locked, just in case lockMarket bugs out
    function circuitBreaker() external {
        require(
            block.timestamp > (uint256(oracleResolutionTime).add(12 weeks)),
            "Too early"
        );
        _incrementState();
        state = States.WITHDRAW;
    }
}
