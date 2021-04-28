// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "hardhat/console.sol";
import "./interfaces/IRealitio.sol";
import "./interfaces/IRCFactory.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCProxyXdai.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IRCNftHubXdai.sol";
import "./interfaces/IRCOrderbook.sol";
import "./lib/NativeMetaTransaction.sol";

/// @title Reality Cards Market
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCMarket is Initializable, NativeMetaTransaction, IRCMarket {
    /*╔═════════════════════════════════╗
      ║            VARIABLES            ║
      ╚═════════════════════════════════╝*/

    // CONTRACT SETUP
    /// @dev = how many outcomes/teams/NFTs etc
    uint256 public numberOfTokens;
    uint256 public constant MAX_UINT256 = type(uint256).max;
    uint256 public constant MIN_RENTAL_VALUE = 1 ether;
    States public override state;
    /// @dev type of event.
    enum Mode {CLASSIC, WINNER_TAKES_ALL, HOT_POTATO}
    Mode public mode;
    /// @dev so the Factory can check it's a market
    bool public constant override isMarket = true;
    /// @dev counts the total NFTs minted across all events at the time market created
    /// @dev nft tokenId = card Id + totalNftMintCount
    uint256 public totalNftMintCount;

    // CONTRACT VARIABLES
    IRCTreasury public treasury;
    IRCFactory public factory;
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
    uint256 public maxRentIterations;
    uint256 public collectRentCounter;

    // ORDERBOOK
    /// @dev incrementing nonce for each rental, for frontend sorting
    uint256 nonce;

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
    /// @dev to track the token timeHeldLimit for the current owner
    mapping(uint256 => uint256) public tokenTimeLimit;

    // TIMESTAMPS
    /// @dev when the market opens
    uint32 public marketOpeningTime;
    /// @dev when the market locks
    uint32 public override marketLockingTime;
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

    /*╔═════════════════════════════════╗
      ║             EVENTS              ║
      ╚═════════════════════════════════╝*/

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

    /*╔═════════════════════════════════╗
      ║           CONSTRUCTOR           ║
      ╚═════════════════════════════════╝*/

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
    ) external override initializer {
        assert(_mode <= 2);

        // initialise MetaTransactions
        _initializeEIP712("RealityCardsMarket", "1");

        // external contract variables:
        factory = IRCFactory(msg.sender);
        treasury = factory.treasury();
        proxy = factory.proxy();
        nfthub = factory.nfthub();
        orderbook = factory.orderbook();

        // get adjustable parameters from the factory/treasury
        uint256[5] memory _potDistribution = factory.getPotDistribution();
        minRentalDayDivisor = treasury.minRentalDayDivisor();
        minimumPriceIncreasePercent = factory.minimumPriceIncreasePercent();
        hotPotatoWeekDivisor = factory.hotPotatoWeekDivisor();
        maxRentIterations = factory.maxRentIterations();

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
            winnerCut =
                (((uint256(1000) - artistCut) - creatorCut) - affiliateCut) -
                cardAffiliateCut;
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

    /*╔═════════════════════════════════╗
      ║            MODIFIERS            ║
      ╚═════════════════════════════════╝*/

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

    modifier onlyTreasury() {
        require(address(treasury) == msgSender(), "only treasury");
        _;
    }

    function updateCard(
        uint256 tokenId,
        address user,
        uint256 rentCollected,
        uint256 collectedUntil
    ) external override onlyTreasury() {
        uint256 _localTokenId = totalNftMintCount - tokenId;
        rentCollectedPerUser[user] += rentCollected;
        rentCollectedPerToken[_localTokenId] += rentCollected;
        totalRentCollected += rentCollected;

        uint256 timeHeldSinceLastCollection =
            collectedUntil - timeLastCollected[_localTokenId];
        timeHeld[_localTokenId][user] += timeHeldSinceLastCollection;
        if (timeHeld[_localTokenId][user] > longestTimeHeld[_localTokenId]) {
            longestTimeHeld[_localTokenId] = timeHeld[_localTokenId][user];
            longestOwner[_localTokenId] = user;
        }
        totalTimeHeld[_localTokenId] += timeHeldSinceLastCollection;

        timeLastCollected[_localTokenId] = collectedUntil;
    }

    /*╔═════════════════════════════════╗
      ║   ORACLE PROXY CONTRACT CALLS   ║
      ╚═════════════════════════════════╝*/

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
        uint256 _actualTokenId = _tokenId + totalNftMintCount;
        proxy.saveCardToUpgrade(_actualTokenId, _tokenUri, _owner);
        _transferCard(ownerOf(_tokenId), address(this), _tokenId); // contract becomes final resting place
        emit LogNftUpgraded(_tokenId, _actualTokenId);
    }

    /*╔═════════════════════════════════╗
      ║     NFT HUB CONTRACT CALLS      ║
      ╚═════════════════════════════════╝*/

    /// @notice gets the owner of the NFT via their Card Id
    function ownerOf(uint256 _tokenId) public view override returns (address) {
        uint256 _actualTokenId = _tokenId + totalNftMintCount;
        return nfthub.ownerOf(_actualTokenId);
    }

    /// @notice gets tokenURI via their Card Id
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        uint256 _actualTokenId = _tokenId + totalNftMintCount;
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
        uint256 _actualTokenId = _tokenId + totalNftMintCount;

        assert(nfthub.transferNft(_from, _to, _actualTokenId));
        emit LogNewOwner(_tokenId, _to);
    }

    function transferCard(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _price,
        uint256 _timeLimit
    ) external override {
        require(msgSender() == address(orderbook));
        _checkState(States.OPEN);
        if (_to != _from) {
            _transferCard(_from, _to, _tokenId);
        }
        tokenTimeLimit[_tokenId] = _timeLimit;
        tokenPrice[_tokenId] = _price;
    }

    /*╔═════════════════════════════════╗
      ║  MARKET RESOLUTION FUNCTIONS    ║
      ╚═════════════════════════════════╝*/

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
        if (collectRentAllCards()) {
            orderbook.closeMarket();
            // let the treasury know the market is closed
            treasury.updateMarketStatus(false);
            _incrementState();

            for (uint256 i; i < numberOfTokens; i++) {
                // bring the cards back to the market so the winners get the satisfcation of claiming them
                _transferCard(ownerOf(i), address(this), i);
            }
            emit LogContractLocked(true);
        }
    }

    /// @notice called by proxy, sets the winner
    /// @dev the proxy checks if the market has locked already so
    /// @dev .. that the market can't be closed early by the oracle.
    /// @param _winningOutcome the index of the winning card
    function setWinner(uint256 _winningOutcome) external override {
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
            ((((uint256(1000) - artistCut) - affiliateCut)) -
                cardAffiliateCut -
                winnerCut) - (creatorCut);
        // calculate longest owner's extra winnings, if relevant
        if (longestOwner[winningOutcome] == msgSender() && winnerCut > 0) {
            _winningsToTransfer = (totalRentCollected * winnerCut) / (1000);
        }
        // calculate normal winnings, if any
        uint256 _remainingPot = (totalRentCollected * _remainingCut) / (1000);
        uint256 _winnersTimeHeld = timeHeld[winningOutcome][msgSender()];
        uint256 _numerator = _remainingPot * _winnersTimeHeld;
        _winningsToTransfer =
            _winningsToTransfer +
            (_numerator / totalTimeHeld[winningOutcome]);
        require(_winningsToTransfer > 0, "Not a winner");
        _payout(msgSender(), _winningsToTransfer);
        emit LogWinningsPaid(msgSender(), _winningsToTransfer);
    }

    /// @notice returns all funds to users in case of invalid outcome
    function _returnRent() internal {
        // deduct artist share and card specific share if relevant but NOT market creator share or winner's share (no winner, market creator does not deserve)
        uint256 _remainingCut =
            ((uint256(1000) - artistCut) - affiliateCut) - cardAffiliateCut;
        uint256 _rentCollected = rentCollectedPerUser[msgSender()];
        require(_rentCollected > 0, "Paid no rent");
        uint256 _rentCollectedAdjusted =
            (_rentCollected * _remainingCut) / (1000);
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
            (rentCollectedPerToken[_tokenId] * cardAffiliateCut) / (1000);
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
            uint256 _payment = (totalRentCollected * _cut) / (1000);
            _payout(_recipient, _payment);
            emit LogStakeholderPaid(_recipient, _payment);
        }
    }

    /*╔═════════════════════════════════╗
      ║         CORE FUNCTIONS          ║
      ╠═════════════════════════════════╣
      ║             EXTERNAL            ║
      ╚═════════════════════════════════╝*/

    /// @dev basically functions that have _checkState(States.OPEN) on first line

    /// @notice collects rent for all tokens
    /// @dev cannot be external because it is called within the lockMarket function, therefore public
    function collectRentAllCards() public override returns (bool) {
        _checkState(States.OPEN);
        bool _success = true;
        for (uint256 i = 0; i < numberOfTokens; i++) {
            if (ownerOf(i) != address(this)) {
                _success = _collectRent(i);
            }
            if (!_success) {
                return false;
            }
        }
        return true;
    }

    /// @notice collect rent on a set of cards
    /// @dev used by the treasury to collect rent on specifc cards
    /// @param _cards the tokenId of the cards to collect rent on
    function collectRentSpecificCards(uint256[] calldata _cards)
        external
        override
    {
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
            _actualSumOfPrices = _actualSumOfPrices + (tokenPrice[i]);
        }
        require(_actualSumOfPrices <= _maxSumOfPrices, "Prices too high");

        for (uint256 i = 0; i < numberOfTokens; i++) {
            if (ownerOf(i) != msgSender()) {
                uint256 _newPrice;
                if (tokenPrice[i] > 0) {
                    _newPrice =
                        (tokenPrice[i] * (minimumPriceIncreasePercent + 100)) /
                        100;
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
    )
        public
        payable
        autoUnlock()
        autoLock() /*returns (uint256)*/
    {
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
        if (ownerOf(_tokenId) == _user) {
            // the owner may only increase by more than 10% or reduce their price
            uint256 _requiredPrice =
                (tokenPrice[_tokenId] * (minimumPriceIncreasePercent + 100)) /
                    (100);
            require(
                _newPrice >= _requiredPrice || _newPrice < tokenPrice[_tokenId],
                "Not 10% higher"
            );
        }

        // do some cleaning up before we collect rent or check their bidRate
        orderbook.removeOldBids(_user);

        _collectRent(_tokenId);

        // process deposit, if sent
        if (msg.value > 0) {
            assert(treasury.deposit{value: msg.value}(_user));
        }

        // check sufficient deposit
        uint256 _userTotalBidRate =
            treasury.userTotalBids(_user) -
                (orderbook.getBidValue(_user, _tokenId)) +
                _newPrice;
        require(
            treasury.userDeposit(_user) >=
                _userTotalBidRate / minRentalDayDivisor,
            "Insufficient deposit"
        );

        _timeHeldLimit = _checkTimeHeldLimit(_timeHeldLimit);

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
        //return tokenPrice[_tokenId];
    }

    function _checkTimeHeldLimit(uint256 _timeHeldLimit)
        internal
        view
        returns (uint256)
    {
        if (_timeHeldLimit == 0) {
            return 0;
        } else {
            uint256 _minRentalTime = uint256(1 days) / minRentalDayDivisor;
            require(_timeHeldLimit >= _minRentalTime, "Limit too low");
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

        _collectRent(_tokenId);

        _timeHeldLimit = _checkTimeHeldLimit(_timeHeldLimit);

        orderbook.setTimeHeldlimit(_user, _tokenId, _timeHeldLimit);

        if (ownerOf(_tokenId) == _user) {
            tokenTimeLimit[_tokenId] = _timeHeldLimit;
        }

        emit LogUpdateTimeHeldLimit(_user, _timeHeldLimit, _tokenId);
    }

    /// @notice stop renting a token and/or remove from orderbook
    /// @dev public because called by exitAll()
    /// @dev doesn't need to be current owner so user can prevent ownership returning to them
    /// @dev does not apply minimum rental duration, because it returns ownership to the next user
    /// @param _tokenId The token index to exit
    function exit(uint256 _tokenId) public override {
        _checkState(States.OPEN);
        address _msgSender = msgSender();

        // if current owner, collect rent, revert if necessary
        if (ownerOf(_tokenId) == _msgSender) {
            // collectRent first
            _collectRent(_tokenId);

            // if still the current owner after collecting rent, revert to underbidder
            if (ownerOf(_tokenId) == _msgSender) {
                orderbook.findNewOwner(_tokenId, block.timestamp);
                // if not current owner no further action necessary because they will have been deleted from the orderbook
            } else {
                //assert(orderbook[_tokenId][_msgSender].price == 0);
            }
            // if not owner, just delete from orderbook
        } else {
            if (orderbook.bidExists(_msgSender, address(this), _tokenId)) {
                _collectRent(_tokenId);
                orderbook.removeBidFromOrderbook(_msgSender, _tokenId);
                emit LogRemoveFromOrderbook(_msgSender, _tokenId);
            }
        }
        emit LogExit(_msgSender, _tokenId);
    }

    /// @notice stop renting all tokens
    function exitAll() external override {
        for (uint256 i = 0; i < numberOfTokens; i++) {
            exit(i);
        }
    }

    /// @notice ability to add liqudity to the pot without being able to win.
    function sponsor() external payable override {
        _checkNotState(States.LOCKED);
        _checkNotState(States.WITHDRAW);
        require(msg.value > 0, "Must send something");
        // send funds to the Treasury
        require(treasury.sponsor{value: msg.value}());
        totalRentCollected = totalRentCollected + (msg.value);
        // just so user can get it back if invalid outcome
        rentCollectedPerUser[msgSender()] =
            rentCollectedPerUser[msgSender()] +
            (msg.value);
        // allocate equally to each token, in case card specific affiliates
        for (uint256 i = 0; i < numberOfTokens; i++) {
            rentCollectedPerToken[i] =
                rentCollectedPerToken[i] +
                (msg.value / numberOfTokens);
        }
        emit LogSponsor(msgSender(), msg.value);
    }

    function getTimeLastCollected(uint256 _actualTokenId)
        external
        view
        override
        returns (uint256 _timeCollected)
    {
        uint256 _localTokenId = _actualTokenId - totalNftMintCount;
        _timeCollected = timeLastCollected[_localTokenId];
    }

    function getTokenPrice(uint256 _actualTokenId)
        external
        view
        override
        returns (uint256 _tokenPrice)
    {
        uint256 _localTokenId = _actualTokenId - totalNftMintCount;
        _tokenPrice = tokenPrice[_localTokenId];
    }

    /*╔═════════════════════════════════╗
      ║         CORE FUNCTIONS          ║
      ╠═════════════════════════════════╣
      ║             INTERNAL            ║
      ╚═════════════════════════════════╝*/

    /// @notice collects rent for a specific token
    /// @dev also calculates and updates how long the current user has held the token for
    /// @dev is not a problem if called externally, but making internal over public to save gas
    function _collectRent(uint256 _tokenId) internal returns (bool) {
        address _user = ownerOf(_tokenId);
        uint256 _timeOfThisCollection = block.timestamp;

        // don't collect rent beyond the locking time
        if (marketLockingTime <= block.timestamp) {
            _timeOfThisCollection = marketLockingTime;
        }

        //only collect rent if the token is owned (ie, if owned by the contract this implies unowned)
        // AND if the last collection was in the past (ie, don't do 2+ rent collections in the same block)
        if (
            _user != address(this) &&
            timeLastCollected[_tokenId] < _timeOfThisCollection
        ) {
            // User rent collect and fetch the time the user foreclosed, 0 means they didn't foreclose yet
            uint256 _timeUserForeclosed = treasury.collectRentUser(_user);

            // Calculate the token timeLimitTimestamp
            uint256 _tokenTimeLimitTimestamp =
                timeLastCollected[_tokenId] + tokenTimeLimit[_tokenId];

            // input bools
            bool _foreclosed = _timeUserForeclosed != 0;
            bool _limitHit =
                tokenTimeLimit[_tokenId] != 0 &&
                    _tokenTimeLimitTimestamp < block.timestamp;
            bool _marketLocked = marketLockingTime <= block.timestamp;

            // outputs
            bool _newOwner;
            uint256 _refundTime; // seconds of rent to refund the user

            /* Permutations of the events: Foreclosure, Time limit and Market Locking
            ┌───────────┬─┬─┬─┬─┬─┬─┬─┬─┐
            │Case       │1│2│3│4│5│6│7│8│
            ├───────────┼─┼─┼─┼─┼─┼─┼─┼─┤
            │Foreclosure│0│0│0│0│1│1│1│1│
            │Time Limit │0│0│1│1│0│0│1│1│
            │Market Lock│0│1│0│1│0│1│0│1│
            └───────────┴─┴─┴─┴─┴─┴─┴─┴─┘
            TODO: some of these cases may be combined, or at least reordered for optimisation
            */

            if (!_foreclosed && !_limitHit && !_marketLocked) {
                // CASE 1
                // didn't foreclose AND
                // didn't hit time limit AND
                // didn't lock market
                // THEN simple rent collect, same owner
                _timeOfThisCollection = _timeOfThisCollection;
                _newOwner = false;
                _refundTime = 0;
            } else if (!_foreclosed && !_limitHit && _marketLocked) {
                // CASE 2
                // didn't foreclose AND
                // didn't hit time limit AND
                // did lock market
                // THEN refund rent between locking and now
                _timeOfThisCollection = marketLockingTime;
                _newOwner = false;
                _refundTime = block.timestamp - marketLockingTime;
            } else if (!_foreclosed && _limitHit && !_marketLocked) {
                // CASE 3
                // didn't foreclose AND
                // did hit time limit AND
                // didn't lock market
                // THEN refund rent between time limit and now
                _timeOfThisCollection = _tokenTimeLimitTimestamp;
                _newOwner = true;
                _refundTime = block.timestamp - _tokenTimeLimitTimestamp;
            } else if (!_foreclosed && _limitHit && _marketLocked) {
                // CASE 4
                // didn't foreclose AND
                // did hit time limit AND
                // did lock market
                // THEN refund rent between the earliest event and now
                if (_tokenTimeLimitTimestamp < marketLockingTime) {
                    // time limit hit before market locked
                    _timeOfThisCollection = _tokenTimeLimitTimestamp;
                    _newOwner = true;
                    _refundTime = block.timestamp - _tokenTimeLimitTimestamp;
                } else {
                    // market locked before time limit hit
                    _timeOfThisCollection = marketLockingTime;
                    _newOwner = false;
                    _refundTime = block.timestamp - marketLockingTime;
                }
            } else if (_foreclosed && !_limitHit && !_marketLocked) {
                // CASE 5
                // did foreclose AND
                // didn't hit time limit AND
                // didn't lock market
                // THEN rent OK, find new owner
                _timeOfThisCollection = _timeUserForeclosed;
                _newOwner = true;
                _refundTime = 0;
            } else if (_foreclosed && !_limitHit && _marketLocked) {
                // CASE 6
                // did foreclose AND
                // didn't hit time limit AND
                // did lock market
                // THEN if foreclosed first rent ok, otherwise refund after locking
                if (_timeUserForeclosed < marketLockingTime) {
                    // user foreclosed before market locked
                    _timeOfThisCollection = _timeUserForeclosed;
                    _newOwner = true;
                    _refundTime = 0;
                } else {
                    // market locked before user foreclosed
                    _timeOfThisCollection = marketLockingTime;
                    _newOwner = false;
                    _refundTime = block.timestamp - marketLockingTime;
                }
            } else if (_foreclosed && _limitHit && !_marketLocked) {
                // CASE 7
                // did foreclose AND
                // did hit time limit AND
                // didn't lock market
                // THEN if foreclosed first rent ok, otherwise refund after limit
                if (_timeUserForeclosed < _tokenTimeLimitTimestamp) {
                    // user foreclosed before time limit
                    _timeOfThisCollection = _timeUserForeclosed;
                    _newOwner = true;
                    _refundTime = 0;
                } else {
                    // time limit hit before user foreclosed
                    _timeOfThisCollection = _tokenTimeLimitTimestamp;
                    _newOwner = true;
                    _refundTime =
                        _timeUserForeclosed -
                        _tokenTimeLimitTimestamp;
                }
            } else {
                // CASE 8
                // did foreclose AND
                // did hit time limit AND
                // did lock market
                // THEN (╯°益°)╯彡┻━┻
                if (
                    _timeUserForeclosed < _tokenTimeLimitTimestamp &&
                    _timeUserForeclosed < marketLockingTime
                ) {
                    // user foreclosed first
                    _timeOfThisCollection = _timeUserForeclosed;
                    _newOwner = true;
                    _refundTime = 0;
                } else if (
                    _tokenTimeLimitTimestamp < _timeUserForeclosed &&
                    _tokenTimeLimitTimestamp < marketLockingTime
                ) {
                    // time limit hit first
                    _timeOfThisCollection = _tokenTimeLimitTimestamp;
                    _newOwner = true;
                    _refundTime =
                        _timeUserForeclosed -
                        _tokenTimeLimitTimestamp;
                } else {
                    // market locked first
                    _timeOfThisCollection = marketLockingTime;
                    _newOwner = false;
                    _refundTime = _timeUserForeclosed - marketLockingTime;
                }
            }
            if (_refundTime != 0) {
                uint256 _refundAmount =
                    (_refundTime * tokenPrice[_tokenId]) / 1 days;
                treasury.refundUser(_user, _refundAmount);
            }
            _processRentCollection(_user, _tokenId, _timeOfThisCollection);

            if (_newOwner) {
                orderbook.findNewOwner(_tokenId, _timeOfThisCollection);
                collectRentCounter++;
                if (collectRentCounter < maxRentIterations) {
                    _collectRent(_tokenId);
                } else {
                    return false;
                }
                collectRentCounter = 0;
            }
        }
        // timeLastCollected is updated regardless of whether the token is owned, so that the clock starts ticking
        // ... when the first owner buys it, because this function is run before ownership changes upon calling newRental
        timeLastCollected[_tokenId] = _timeOfThisCollection;
        return true;
    }

    function _processRentCollection(
        address _user,
        uint256 _token,
        uint256 _timeOfCollection
    ) internal {
        uint256 _rentOwed =
            (tokenPrice[_token] *
                (_timeOfCollection - timeLastCollected[_token])) / 1 days;
        treasury.payRent(_rentOwed);
        uint256 _timeHeldToIncrement =
            (_timeOfCollection - timeLastCollected[_token]);

        // if the user has a timeLimit, adjust it as necessary
        uint256 _timeLimitSpent;
        if (tokenTimeLimit[_token] != 0) {
            if (_timeHeldToIncrement > tokenTimeLimit[_token]) {
                _timeLimitSpent = tokenTimeLimit[_token];
            } else {
                _timeLimitSpent = _timeHeldToIncrement;
            }
            orderbook.reduceTimeHeldLimit(_user, _token, _timeLimitSpent);
            tokenTimeLimit[_token] -= _timeLimitSpent;
        }

        timeHeld[_token][_user] += _timeHeldToIncrement;
        totalTimeHeld[_token] += _timeHeldToIncrement;
        rentCollectedPerUser[_user] += _rentOwed;
        rentCollectedPerToken[_token] += _rentOwed;
        totalRentCollected += _rentOwed;
        timeLastCollected[_token] = _timeOfCollection;
        // longest owner tracking
        if (timeHeld[_token][_user] > longestTimeHeld[_token]) {
            longestTimeHeld[_token] = timeHeld[_token][_user];
            longestOwner[_token] = _user;
        }

        emit LogTimeHeldUpdated(timeHeld[_token][_user], _user, _token);
        emit LogRentCollection(_rentOwed, _token, _user);
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
        state = States(uint256(state) + (1));
        if (uint256(state) == 1) {
            treasury.updateMarketStatus(true);
        }
        emit LogStateChange(uint256(state));
    }

    /*╔═════════════════════════════════╗
      ║        CIRCUIT BREAKER          ║
      ╚═════════════════════════════════╝*/

    /// @dev alternative to determineWinner, in case Oracle never resolves for any reason
    /// @dev does not set a winner so same as invalid outcome
    /// @dev market does not need to be locked, just in case lockMarket bugs out
    function circuitBreaker() external {
        require(
            block.timestamp > (uint256(oracleResolutionTime) + (12 weeks)),
            "Too early"
        );
        _incrementState();
        orderbook.closeMarket();
        state = States.WITHDRAW;
    }
}
