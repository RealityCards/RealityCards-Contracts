// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "./interfaces/IRealitio.sol";
import "./interfaces/IRCFactory.sol";
import "./interfaces/IRCLeaderboard.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IRCNftHubL2.sol";
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
    uint256 public constant PER_MILLE = 1000; // in MegaBip so (1000 = 100%)
    uint256 public override numberOfCards;
    uint256 public constant MIN_RENTAL_VALUE = 24_000_000;
    States public override state;
    /// @dev type of event.
    Mode public override mode;
    /// @dev so the Factory can check it's a market
    bool public constant override isMarket = true;
    /// @dev how many nfts to award to the leaderboard
    uint256 public override nftsToAward;
    uint256[] public tokenIds;

    // CONTRACT VARIABLES
    IRCTreasury public override treasury;
    IRCFactory public override factory;
    IRCNftHubL2 public override nfthub;
    IRCOrderbook public override orderbook;
    IRCLeaderboard public override leaderboard;
    IRealitio public override realitio;

    // PRICE, DEPOSITS, RENT
    /// @dev in wei
    mapping(uint256 => uint256) public override cardPrice;
    /// @dev keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome.
    mapping(address => uint256) public override rentCollectedPerUser;
    /// @dev keeps track of all the rent paid for each card, for card specific affiliate payout
    mapping(uint256 => uint256) public override rentCollectedPerCard;
    /// @dev keeps track of the rent each user has paid for each card, for Safe mode payout
    mapping(address => mapping(uint256 => uint256))
        public
        override rentCollectedPerUserPerCard;
    /// @dev an easy way to track the above across all cards
    uint256 public override totalRentCollected;
    /// @dev prevents user from exiting and re-renting in the same block (limits troll attacks)
    mapping(address => uint256) public override exitedTimestamp;

    // PARAMETERS
    /// @dev read from the Factory upon market creation, can not be changed for existing market
    /// @dev the minimum required price increase in %
    uint256 public override minimumPriceIncreasePercent;
    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    uint256 public override minRentalDayDivisor;
    /// @dev maximum number of times to calculate rent in one transaction
    uint256 public override maxRentIterations;

    // TIME
    /// @dev how many seconds each user has held each card for, for determining winnings
    mapping(uint256 => mapping(address => uint256)) public override timeHeld;
    /// @dev sums all the timeHelds for each. Used when paying out. Should always increment at the same time as timeHeld
    mapping(uint256 => uint256) public override totalTimeHeld;
    /// @dev used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    mapping(uint256 => uint256) public override timeLastCollected;
    /// @dev to track the max timeheld of each card (for giving NFT to winner)
    mapping(uint256 => uint256) public override longestTimeHeld;
    /// @dev to track who has owned it the most (for giving NFT to winner)
    mapping(uint256 => address) public override longestOwner;
    /// @dev to track the card timeHeldLimit for the current owner
    mapping(uint256 => uint256) public override cardTimeLimit;

    // TIMESTAMPS
    /// @dev when the market opens
    uint32 public override marketOpeningTime;
    /// @dev when the market locks
    uint32 public override marketLockingTime;
    /// @dev when the question can be answered on realitio
    /// @dev only needed for circuit breaker
    uint32 public override oracleResolutionTime;

    // PAYOUT VARIABLES
    uint256 public override winningOutcome;
    /// @dev prevent users withdrawing twice
    mapping(address => bool) public override userAlreadyWithdrawn;
    /// @dev prevent users claiming twice
    mapping(uint256 => mapping(address => bool))
        public
        override userAlreadyClaimed; // cardID // user // bool
    /// @dev the artist
    address public override artistAddress;
    uint256 public override artistCut;
    bool public override artistPaid;
    /// @dev the affiliate
    address public override affiliateAddress;
    uint256 public override affiliateCut;
    bool public override affiliatePaid;
    /// @dev the winner
    uint256 public override winnerCut;
    /// @dev the market creator
    address public override marketCreatorAddress;
    uint256 public override creatorCut;
    bool public override creatorPaid;
    /// @dev card specific recipients
    address[] public override cardAffiliateAddresses;
    uint256 public override cardAffiliateCut;
    mapping(uint256 => bool) public override cardAffiliatePaid;

    // ORACLE VARIABLES
    bytes32 public override questionId;
    address public override arbitrator;
    uint32 public override timeout;

    /*╔═════════════════════════════════╗
      ║             EVENTS              ║
      ╚═════════════════════════════════╝*/

    event LogNewOwner(uint256 indexed cardId, address indexed newOwner);
    event LogRentCollection(
        uint256 rentCollected,
        uint256 indexed newTimeHeld,
        uint256 indexed cardId,
        address indexed owner
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
    event LogStateChange(uint256 indexed newState);
    event LogUpdateTimeHeldLimit(
        address indexed owner,
        uint256 newLimit,
        uint256 cardId
    );
    event LogSponsor(address indexed sponsor, uint256 indexed amount);
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
        uint256 minRentalDayDivisor,
        uint256 minimumPriceIncreasePercent,
        uint256 nftsToAward
    );
    event LogLongestOwner(uint256 cardId, address longestOwner);
    event LogQuestionPostedToOracle(
        address indexed marketAddress,
        bytes32 indexed questionId
    );

    /*╔═════════════════════════════════╗
      ║           CONSTRUCTOR           ║
      ╚═════════════════════════════════╝*/

    /// @param _mode 0 = normal, 1 = winner takes all, 2 = Safe Mode
    /// @param _timestamps for market opening, locking, and oracle resolution
    /// @param _numberOfCards how many Cards in this market
    /// @param _artistAddress where to send artist's cut, if any
    /// @param _affiliateAddress where to send affiliate's cut, if any
    /// @param _cardAffiliateAddresses where to send card specific affiliate's cut, if any
    /// @param _marketCreatorAddress where to send market creator's cut, if any
    /// @param _realitioQuestion the question posted to the Oracle
    function initialize(
        Mode _mode,
        uint32[] memory _timestamps,
        uint256 _numberOfCards,
        address _artistAddress,
        address _affiliateAddress,
        address[] memory _cardAffiliateAddresses,
        address _marketCreatorAddress,
        string calldata _realitioQuestion,
        uint256 _nftsToAward
    ) external override initializer {
        mode = Mode(_mode);

        // initialise MetaTransactions
        _initializeEIP712("RealityCardsMarket", "1");

        // external contract variables:
        factory = IRCFactory(msgSender());
        treasury = factory.treasury();
        nfthub = factory.nfthub();
        orderbook = factory.orderbook();
        leaderboard = factory.leaderboard();

        // get adjustable parameters from the factory/treasury
        uint256[5] memory _potDistribution = factory.getPotDistribution();
        minRentalDayDivisor = treasury.minRentalDayDivisor();
        minimumPriceIncreasePercent = factory.minimumPriceIncreasePercent();
        maxRentIterations = factory.maxRentIterations();

        // Initialize!
        winningOutcome = type(uint256).max; // default invalid

        // assign arguments to public variables
        numberOfCards = _numberOfCards;
        nftsToAward = _nftsToAward;
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
        (realitio, arbitrator, timeout) = factory.getOracleSettings();
        for (uint256 i = 0; i < _numberOfCards; i++) {
            tokenIds.push(type(uint256).max);
        }

        // reduce artist cut to zero if zero address set
        if (_artistAddress == address(0)) {
            artistCut = 0;
        }

        // reduce affiliate cut to zero if zero address set
        if (_affiliateAddress == address(0)) {
            affiliateCut = 0;
        }

        // check the validity of card affiliate array.
        // if not valid, reduce payout to zero
        if (_cardAffiliateAddresses.length == _numberOfCards) {
            for (uint256 i = 0; i < _numberOfCards; i++) {
                if (_cardAffiliateAddresses[i] == address(0)) {
                    cardAffiliateCut = 0;
                    break;
                }
            }
        } else {
            cardAffiliateCut = 0;
        }

        // if winner takes all mode, set winnerCut to max
        if (_mode == Mode.WINNER_TAKES_ALL) {
            winnerCut =
                (((uint256(PER_MILLE) - artistCut) - creatorCut) -
                    affiliateCut) -
                cardAffiliateCut;
        }

        // post question to Oracle
        _postQuestionToOracle(_realitioQuestion, _timestamps[2]);

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
            nftsToAward
        );
    }

    /*╔═════════════════════════════════╗
      ║            MODIFIERS            ║
      ╚═════════════════════════════════╝*/

    /// @notice automatically opens market if appropriate
    modifier autoUnlock() {
        if (marketOpeningTime <= block.timestamp && state == States.CLOSED) {
            _incrementState();
        }
        _;
    }

    /// @notice automatically locks market if appropriate
    modifier autoLock() {
        if (marketLockingTime <= block.timestamp) {
            lockMarket();
        }
        _;
    }

    /// @dev can only be called by Card owners
    modifier onlyTokenOwner(uint256 _token) {
        require(msgSender() == ownerOf(_token), "Not owner");
        _;
    }

    /*╔═════════════════════════════════╗
      ║     NFT HUB CONTRACT CALLS      ║
      ╚═════════════════════════════════╝*/

    /// @notice gets the owner of the NFT via their Card Id
    function ownerOf(uint256 _cardId) public view override returns (address) {
        require(_cardId < numberOfCards, "Card does not exist");
        if (tokenExists(_cardId)) {
            uint256 _tokenId = getTokenId(_cardId);
            return nfthub.ownerOf(_tokenId);
        } else {
            return address(0);
        }
    }

    /// @notice gets tokenURI via their Card Id
    function tokenURI(uint256 _cardId)
        external
        view
        override
        returns (string memory)
    {
        uint256 _tokenId = getTokenId(_cardId);
        return nfthub.tokenURI(_tokenId);
    }

    /// @notice transfer ERC 721 between users
    /// @dev called internally during contract open state
    function _transferCard(
        address _from,
        address _to,
        uint256 _cardId
    ) internal {
        require(
            _from != address(0) && _to != address(0),
            "Cannot send to/from zero address"
        );
        uint256 _tokenId = getTokenId(_cardId);

        nfthub.transferNft(_from, _to, _tokenId);
        emit LogNewOwner(_cardId, _to);
    }

    /// @notice transfer ERC 721 between users
    /// @dev called externally by Orderbook during contract open state
    function transferCard(
        address _from,
        address _to,
        uint256 _cardId,
        uint256 _price,
        uint256 _timeLimit
    ) external override {
        require(msgSender() == address(orderbook), "Not orderbook");
        _checkState(States.OPEN);
        if (_to != _from) {
            _transferCard(_from, _to, _cardId);
        }
        cardTimeLimit[_cardId] = _timeLimit;
        cardPrice[_cardId] = _price;
    }

    /*╔═════════════════════════════════╗
      ║        ORACLE FUNCTIONS         ║
      ╚═════════════════════════════════╝*/

    /// @dev called within initializer only
    function _postQuestionToOracle(
        string calldata _question,
        uint32 _oracleResolutionTime
    ) internal {
        uint256 templateId = 2; //template 2 works for all RealityCards questions
        uint256 nonce = 0; // We don't need to ask it again, always use 0
        bytes32 questionHash = keccak256(
            abi.encodePacked(templateId, _oracleResolutionTime, _question)
        );
        questionId = keccak256(
            abi.encodePacked(
                questionHash,
                arbitrator,
                timeout,
                msg.sender,
                nonce
            )
        );
        if (realitio.getContentHash(questionId) != questionHash) {
            // check if our questionHash matches an existing questionId
            // otherwise ask the question.
            questionId = realitio.askQuestion(
                templateId,
                _question,
                arbitrator,
                timeout,
                _oracleResolutionTime,
                nonce
            );
        }
        emit LogQuestionPostedToOracle(address(this), questionId);
    }

    /// @notice has the oracle finalised
    function isFinalized() public view override returns (bool) {
        bool _isFinalized = realitio.isFinalized(questionId);
        return _isFinalized;
    }

    /// @dev sets the winning outcome
    /// @dev market.setWinner() will revert if done twice, because wrong state
    function getWinnerFromOracle() external override {
        require(isFinalized(), "Oracle not finalised");
        // check market state to prevent market closing early
        require(marketLockingTime <= block.timestamp, "Market not finished");
        bytes32 _winningOutcome = realitio.resultFor(questionId);
        // call the market
        setWinner(uint256(_winningOutcome));
    }

    /// @dev admin override of the oracle
    function setAmicableResolution(uint256 _winningOutcome) external override {
        require(
            treasury.checkPermission(keccak256("OWNER"), msgSender()),
            "Not authorised"
        );
        setWinner(_winningOutcome);
    }

    /*╔═════════════════════════════════╗
      ║  MARKET RESOLUTION FUNCTIONS    ║
      ╚═════════════════════════════════╝*/

    /// @notice checks whether the competition has ended, if so moves to LOCKED state
    /// @dev can be called by anyone
    /// @dev public because called within autoLock modifier & setWinner
    function lockMarket() public override {
        _checkState(States.OPEN);
        require(
            marketLockingTime <= block.timestamp,
            "Market has not finished"
        );
        // do a final rent collection before the contract is locked down

        if (
            collectRentAllCards() &&
            gasleft() > (350_000 + (175_000 * numberOfCards))
        ) {
            orderbook.closeMarket();
            _incrementState();

            for (uint256 i; i < numberOfCards; i++) {
                if (tokenExists(i)) {
                    // bring the cards back to the market so the winners get the satisfaction of claiming them
                    _transferCard(ownerOf(i), address(this), i);
                }
                emit LogLongestOwner(i, longestOwner[i]);
            }
            emit LogContractLocked(true);
        }
    }

    /// @notice called by getWinnerFromOracle, sets the winner
    /// @param _winningOutcome the index of the winning card
    function setWinner(uint256 _winningOutcome) internal {
        if (state == States.OPEN) {
            // change the locking time to allow lockMarket to lock
            /// @dev implementing our own SafeCast as this is the only place we need it
            uint256 _blockTimestamp = uint32(block.timestamp);
            require(_blockTimestamp <= type(uint32).max, "Overflow");
            marketLockingTime = uint32(_blockTimestamp);
            lockMarket();
        }
        if (state == States.LOCKED) {
            // get the winner. This will revert if answer is not resolved.
            winningOutcome = _winningOutcome;
            _incrementState();
            emit LogWinnerKnown(winningOutcome);
        }
    }

    /// @notice pays out winnings, or returns funds
    function withdraw() external override {
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
    /// @notice users on the leaderboard can make a copy of it
    /// @dev LOCKED or WITHDRAW states are fine- does not need to wait for winner to be known
    /// @param _card the id of the card, the index
    function claimCard(uint256 _card) external override {
        _checkNotState(States.CLOSED);
        _checkNotState(States.OPEN);
        require(
            !treasury.marketPaused(address(this)) && !treasury.globalPause(),
            "Market is Paused"
        );
        address _user = msgSender();
        require(!userAlreadyClaimed[_card][_user], "Already claimed");
        userAlreadyClaimed[_card][_user] = true;
        if (_user == longestOwner[_card]) {
            _transferCard(ownerOf(_card), longestOwner[_card], _card);
        } else {
            leaderboard.claimNFT(_user, _card);
            factory.mintCopyOfNFT(_user, _card);
        }
    }

    /// @notice pays winnings
    function _payoutWinnings() internal {
        uint256 _winningsToTransfer = 0;
        uint256 _remainingCut = ((((uint256(PER_MILLE) - artistCut) -
            affiliateCut) - cardAffiliateCut) - winnerCut) - creatorCut;
        // calculate longest owner's extra winnings, if relevant
        if (longestOwner[winningOutcome] == msgSender() && winnerCut > 0) {
            _winningsToTransfer =
                (totalRentCollected * winnerCut) /
                (PER_MILLE);
        }
        uint256 _remainingPot = 0;
        if (mode == Mode.SAFE_MODE) {
            // return all rent paid on winning card
            _remainingPot =
                ((totalRentCollected - rentCollectedPerCard[winningOutcome]) *
                    _remainingCut) /
                PER_MILLE;
            _winningsToTransfer +=
                (rentCollectedPerUserPerCard[msgSender()][winningOutcome] *
                    _remainingCut) /
                PER_MILLE;
        } else {
            // calculate normal winnings, if any
            _remainingPot = (totalRentCollected * _remainingCut) / (PER_MILLE);
        }
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
        uint256 _remainingCut = ((uint256(PER_MILLE) - artistCut) -
            affiliateCut) - cardAffiliateCut;
        uint256 _rentCollected = rentCollectedPerUser[msgSender()];
        require(_rentCollected > 0, "Paid no rent");
        uint256 _rentCollectedAdjusted = (_rentCollected * _remainingCut) /
            (PER_MILLE);
        _payout(msgSender(), _rentCollectedAdjusted);
        emit LogRentReturned(msgSender(), _rentCollectedAdjusted);
    }

    /// @notice all payouts happen through here
    function _payout(address _recipient, uint256 _amount) internal {
        treasury.payout(_recipient, _amount);
    }

    /// @dev the below functions pay stakeholders (artist, creator, affiliate, card specific affiliates)
    /// @dev they are not called within setWinner() because of the risk of an
    /// @dev ....  address being a contract which refuses payment, then nobody could get winnings
    /// @dev [hangover from when ether was native currency, keeping in case we return to this]

    /// @notice pay artist
    function payArtist() external override {
        _checkState(States.WITHDRAW);
        require(!artistPaid, "Artist already paid");
        artistPaid = true;
        _processStakeholderPayment(artistCut, artistAddress);
    }

    /// @notice pay market creator
    function payMarketCreator() external override {
        _checkState(States.WITHDRAW);
        require(totalTimeHeld[winningOutcome] > 0, "No winner");
        require(!creatorPaid, "Creator already paid");
        creatorPaid = true;
        _processStakeholderPayment(creatorCut, marketCreatorAddress);
    }

    /// @notice pay affiliate
    function payAffiliate() external override {
        _checkState(States.WITHDRAW);
        require(!affiliatePaid, "Affiliate already paid");
        affiliatePaid = true;
        _processStakeholderPayment(affiliateCut, affiliateAddress);
    }

    /// @notice pay card affiliate
    /// @dev does not call _processStakeholderPayment because it works differently
    function payCardAffiliate(uint256 _card) external override {
        _checkState(States.WITHDRAW);
        require(!cardAffiliatePaid[_card], "Card affiliate already paid");
        cardAffiliatePaid[_card] = true;
        uint256 _cardAffiliatePayment = (rentCollectedPerCard[_card] *
            cardAffiliateCut) / (PER_MILLE);
        if (_cardAffiliatePayment > 0) {
            _payout(cardAffiliateAddresses[_card], _cardAffiliatePayment);
            emit LogStakeholderPaid(
                cardAffiliateAddresses[_card],
                _cardAffiliatePayment
            );
        }
    }

    function _processStakeholderPayment(uint256 _cut, address _recipient)
        internal
    {
        if (_cut > 0) {
            uint256 _payment = (totalRentCollected * _cut) / (PER_MILLE);
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

    /// @notice collects rent for all cards
    /// @dev cannot be external because it is called within the lockMarket function, therefore public
    function collectRentAllCards() public override returns (bool) {
        _checkState(States.OPEN);
        bool _success = true;
        for (uint256 i = 0; i < numberOfCards; i++) {
            if (ownerOf(i) != address(this)) {
                _success = _collectRent(i);
            }
            if (!_success) {
                return false;
            }
        }
        return true;
    }

    /// @notice rent every Card at the minimum price
    /// @param _maxSumOfPrices a limit to the sum of the bids to place
    function rentAllCards(uint256 _maxSumOfPrices) external override {
        _checkState(States.OPEN);
        // check that not being front run
        uint256 _actualSumOfPrices;
        for (uint256 i = 0; i < numberOfCards; i++) {
            if (cardPrice[i] == 0) {
                _actualSumOfPrices += MIN_RENTAL_VALUE;
            } else {
                _actualSumOfPrices +=
                    (cardPrice[i] * (minimumPriceIncreasePercent + 100)) /
                    100;
            }
        }
        require(_actualSumOfPrices <= _maxSumOfPrices, "Prices too high");

        for (uint256 i = 0; i < numberOfCards; i++) {
            if (ownerOf(i) != msgSender()) {
                uint256 _newPrice;
                if (cardPrice[i] > 0) {
                    _newPrice =
                        (cardPrice[i] * (minimumPriceIncreasePercent + 100)) /
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
    /// @param _card the index of the card to update
    function newRental(
        uint256 _newPrice,
        uint256 _timeHeldLimit,
        address _startingPosition,
        uint256 _card
    ) public override autoUnlock autoLock {
        if (state == States.OPEN) {
            require(_newPrice >= MIN_RENTAL_VALUE, "Price below min");
            require(_card < numberOfCards, "Card does not exist");
            if (!tokenExists(_card)) {
                tokenIds[_card] = nfthub.totalSupply();
                factory.mintMarketNFT(_card);
            }

            address _user = msgSender();

            require(
                exitedTimestamp[_user] != block.timestamp,
                "Cannot lose and re-rent in same block"
            );
            require(
                !treasury.marketPaused(address(this)) &&
                    !treasury.globalPause(),
                "Rentals are disabled"
            );
            require(
                treasury.marketWhitelistCheck(_user),
                "Not approved for this market"
            );

            if (treasury.isForeclosed(_user)) {
                orderbook.removeUserFromOrderbook(_user);
            }
            require(
                !treasury.isForeclosed(_user),
                "Can't rent while foreclosed"
            );
            if (ownerOf(_card) == _user) {
                // the owner may only increase by more than X% or reduce their price
                uint256 _requiredPrice = (cardPrice[_card] *
                    (minimumPriceIncreasePercent + 100)) / (100);
                require(
                    _newPrice >= _requiredPrice || _newPrice < cardPrice[_card],
                    "Invalid price"
                );
            }

            // do some cleaning up before we collect rent or check their bidRate
            orderbook.removeOldBids(_user);

            /// @dev ignore the return value and let the user post the bid for the sake of UX
            _collectRent(_card);

            // check sufficient deposit
            uint256 _userTotalBidRate = (treasury.userTotalBids(_user) -
                orderbook.getBidValue(_user, _card)) + _newPrice;
            require(
                treasury.userDeposit(_user) >=
                    _userTotalBidRate / minRentalDayDivisor,
                "Insufficient deposit"
            );

            _timeHeldLimit = _checkTimeHeldLimit(_timeHeldLimit);

            // replaces _newBid and _updateBid
            orderbook.addBidToOrderbook(
                _user,
                _card,
                _newPrice,
                _timeHeldLimit,
                _startingPosition
            );

            treasury.updateLastRentalTime(_user);
        }
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
    /// @param _card the index of the card to update
    function updateTimeHeldLimit(uint256 _timeHeldLimit, uint256 _card)
        external
        override
    {
        _checkState(States.OPEN);
        address _user = msgSender();

        if (_collectRent(_card)) {
            _timeHeldLimit = _checkTimeHeldLimit(_timeHeldLimit);

            orderbook.setTimeHeldlimit(_user, _card, _timeHeldLimit);

            if (ownerOf(_card) == _user) {
                cardTimeLimit[_card] = _timeHeldLimit;
            }

            emit LogUpdateTimeHeldLimit(_user, _timeHeldLimit, _card);
        }
    }

    /// @notice stop renting all cards
    function exitAll() external override {
        for (uint256 i = 0; i < numberOfCards; i++) {
            exit(i);
        }
    }

    /// @notice stop renting a card and/or remove from orderbook
    /// @dev public because called by exitAll()
    /// @dev doesn't need to be current owner so user can prevent ownership returning to them
    /// @dev does not apply minimum rental duration, because it returns ownership to the next user
    /// @dev doesn't revert if nonexistant bid because user might be trying to exitAll()
    /// @param _card The card index to exit
    function exit(uint256 _card) public override {
        _checkState(States.OPEN);
        address _msgSender = msgSender();

        // collectRent first
        /// @dev ignore the return value and let the user exit the bid for the sake of UX
        _collectRent(_card);

        if (ownerOf(_card) == _msgSender) {
            // block frontrunning attack
            exitedTimestamp[_msgSender] = block.timestamp;

            // if current owner, find a new one
            orderbook.findNewOwner(_card, block.timestamp);
            assert(!orderbook.bidExists(_msgSender, address(this), _card));
        } else {
            // if not owner, just delete from orderbook
            if (orderbook.bidExists(_msgSender, address(this), _card)) {
                // block frontrunning attack
                exitedTimestamp[_msgSender] = block.timestamp;

                orderbook.removeBidFromOrderbook(_msgSender, _card);
            }
        }
    }

    /// @notice ability to add liqudity to the pot without being able to win.
    /// @dev called by user, sponsor is msgSender
    function sponsor(uint256 _amount) external override {
        address _creator = msgSender();
        _sponsor(_creator, _amount);
    }

    /// @notice ability to add liqudity to the pot without being able to win.
    /// @dev called by Factory during market creation
    /// @param _sponsorAddress the msgSender of createMarket in the Factory
    function sponsor(address _sponsorAddress, uint256 _amount)
        external
        override
    {
        address _msgSender = msgSender();
        if (_msgSender != address(factory)) {
            _sponsorAddress = _msgSender;
        }
        _sponsor(_sponsorAddress, _amount);
    }

    /// @dev actually processes the sponsorship
    function _sponsor(address _sponsorAddress, uint256 _amount) internal {
        _checkNotState(States.LOCKED);
        _checkNotState(States.WITHDRAW);
        require(_amount > 0, "Must send something");
        // send tokens to the Treasury
        treasury.sponsor(_sponsorAddress, _amount);
        totalRentCollected = totalRentCollected + _amount;
        // just so user can get it back if invalid outcome
        rentCollectedPerUser[_sponsorAddress] =
            rentCollectedPerUser[_sponsorAddress] +
            _amount;
        // allocate equally to each card, in case card specific affiliates
        for (uint256 i = 0; i < numberOfCards; i++) {
            rentCollectedPerCard[i] =
                rentCollectedPerCard[i] +
                (_amount / numberOfCards);
        }
        emit LogSponsor(_sponsorAddress, _amount);
    }

    /*╔═════════════════════════════════╗
      ║         CORE FUNCTIONS          ║
      ╠═════════════════════════════════╣
      ║             INTERNAL            ║
      ╚═════════════════════════════════╝*/

    /// @notice collects rent for a specific card
    /// @dev also calculates and updates how long the current user has held the card for
    /// @dev is not a problem if called externally, but making internal over public to save gas
    /// @param _card the card id to collect rent for
    /// @return true if we should repeat the rent collection
    function _collectRentAction(uint256 _card) internal returns (bool) {
        address _user = ownerOf(_card);
        uint256 _timeOfThisCollection = block.timestamp;

        // don't collect rent beyond the locking time
        if (marketLockingTime <= block.timestamp) {
            _timeOfThisCollection = marketLockingTime;
        }

        //only collect rent if the card is owned (ie, if owned by the contract this implies unowned)
        // AND if the last collection was in the past (ie, don't do 2+ rent collections in the same block)
        if (
            _user != address(this) &&
            timeLastCollected[_card] < _timeOfThisCollection
        ) {
            // User rent collect and fetch the time the user foreclosed, 0 means they didn't foreclose yet
            uint256 _timeUserForeclosed = treasury.collectRentUser(
                _user,
                _timeOfThisCollection
            );

            // Calculate the card timeLimitTimestamp
            uint256 _cardTimeLimitTimestamp = timeLastCollected[_card] +
                cardTimeLimit[_card];

            // input bools
            bool _foreclosed = _timeUserForeclosed != 0;
            bool _limitHit = cardTimeLimit[_card] != 0 &&
                _cardTimeLimitTimestamp < block.timestamp;

            // outputs
            bool _newOwner;
            uint256 _refundTime; // seconds of rent to refund the user

            /* Permutations of the events: Foreclosure and Time limit
            ┌───────────┬─┬─┬─┬─┐
            │Case       │1│2│3│4│
            ├───────────┼─┼─┼─┼─┤
            │Foreclosure│0│0│1│1│
            │Time Limit │0│1│0│1│
            └───────────┴─┴─┴─┴─┘
            */

            if (!_foreclosed && !_limitHit) {
                // CASE 1
                // didn't foreclose AND
                // didn't hit time limit
                // THEN simple rent collect, same owner
                _timeOfThisCollection = _timeOfThisCollection;
                _newOwner = false;
                _refundTime = 0;
            } else if (!_foreclosed && _limitHit) {
                // CASE 2
                // didn't foreclose AND
                // did hit time limit
                // THEN refund rent between time limit and now
                _timeOfThisCollection = _cardTimeLimitTimestamp;
                _newOwner = true;
                _refundTime = block.timestamp - _cardTimeLimitTimestamp;
            } else if (_foreclosed && !_limitHit) {
                // CASE 3
                // did foreclose AND
                // didn't hit time limit
                // THEN rent OK, find new owner
                _timeOfThisCollection = _timeUserForeclosed;
                _newOwner = true;
                _refundTime = 0;
            } else if (_foreclosed && _limitHit) {
                // CASE 4
                // did foreclose AND
                // did hit time limit
                // THEN if foreclosed first rent ok, otherwise refund after limit
                if (_timeUserForeclosed < _cardTimeLimitTimestamp) {
                    // user foreclosed before time limit
                    _timeOfThisCollection = _timeUserForeclosed;
                    _newOwner = true;
                    _refundTime = 0;
                } else {
                    // time limit hit before user foreclosed
                    _timeOfThisCollection = _cardTimeLimitTimestamp;
                    _newOwner = true;
                    _refundTime = _timeUserForeclosed - _cardTimeLimitTimestamp;
                }
            }
            if (_refundTime != 0) {
                uint256 _refundAmount = (_refundTime * cardPrice[_card]) /
                    1 days;
                treasury.refundUser(_user, _refundAmount);
            }
            _processRentCollection(_user, _card, _timeOfThisCollection); // where the rent collection actually happens

            if (_newOwner) {
                orderbook.findNewOwner(_card, _timeOfThisCollection);
                return true;
            }
        } else {
            // timeLastCollected is updated regardless of whether the card is owned, so that the clock starts ticking
            // ... when the first owner buys it, because this function is run before ownership changes upon calling newRental
            timeLastCollected[_card] = _timeOfThisCollection;
        }
        return false;
    }

    /// @dev _collectRentAction goes back one owner at a time, this function repeatedly calls
    /// @dev ... _collectRentAction until the backlog of next owners has been processed, or maxRentIterations hit
    /// @param _card the card id to collect rent for
    /// @return true if the rent collection was completed, (ownership updated to the current time)
    function _collectRent(uint256 _card) internal returns (bool) {
        uint32 counter = 0;
        bool shouldContinue = true;
        while (counter < maxRentIterations && shouldContinue) {
            shouldContinue = _collectRentAction(_card);
            counter++;
        }
        return !shouldContinue;
    }

    /// @dev processes actual rent collection and updates the state
    function _processRentCollection(
        address _user,
        uint256 _card,
        uint256 _timeOfCollection
    ) internal {
        uint256 _rentOwed = (cardPrice[_card] *
            (_timeOfCollection - timeLastCollected[_card])) / 1 days;
        /// @dev get back the actual rent collected, it may be less than owed
        uint256 _rentCollected = treasury.payRent(_rentOwed);
        uint256 _timeHeldToIncrement = (_timeOfCollection -
            timeLastCollected[_card]);

        // if the user has a timeLimit, adjust it as necessary
        if (cardTimeLimit[_card] != 0) {
            orderbook.reduceTimeHeldLimit(_user, _card, _timeHeldToIncrement);
            cardTimeLimit[_card] -= _timeHeldToIncrement;
        }
        timeHeld[_card][_user] += _timeHeldToIncrement;
        totalTimeHeld[_card] += _timeHeldToIncrement;
        rentCollectedPerUser[_user] += _rentCollected;
        rentCollectedPerCard[_card] += _rentCollected;
        rentCollectedPerUserPerCard[_user][_card] += _rentCollected;
        totalRentCollected += _rentCollected;
        timeLastCollected[_card] = _timeOfCollection;

        // longest owner tracking
        if (timeHeld[_card][_user] > longestTimeHeld[_card]) {
            longestTimeHeld[_card] = timeHeld[_card][_user];
            longestOwner[_card] = _user;
        }
        leaderboard.updateLeaderboard(_user, _card, timeHeld[_card][_user]);
        emit LogRentCollection(
            _rentCollected,
            _timeHeldToIncrement,
            _card,
            _user
        );
    }

    function _checkState(States currentState) internal view {
        require(state == currentState, "Incorrect state");
    }

    function _checkNotState(States currentState) internal view {
        require(state != currentState, "Incorrect state");
    }

    /// @dev should only be called thrice
    function _incrementState() internal {
        state = States(uint256(state) + 1);
        emit LogStateChange(uint256(state));
    }

    function getTokenId(uint256 _card)
        public
        view
        override
        returns (uint256 _tokenId)
    {
        return tokenIds[_card];
    }

    function tokenExists(uint256 _card) internal view returns (bool) {
        return tokenIds[_card] != type(uint256).max;
    }

    /*╔═════════════════════════════════╗
      ║          BACKUP MODE            ║
      ╚═════════════════════════════════╝*/

    /// @dev quick and easy view function to get all market data relvant to the UI
    function getMarketInfo()
        external
        view
        returns (
            States,
            string memory,
            uint256,
            uint256,
            address[] memory,
            uint256[] memory
        )
    {
        address[] memory _owners = new address[](numberOfCards);
        uint256[] memory _prices = new uint256[](numberOfCards);
        for (uint256 i; i < numberOfCards; i++) {
            _owners[i] = ownerOf(i);
            _prices[i] = cardPrice[i];
        }
        return (
            state,
            factory.ipfsHash(address(this)),
            winningOutcome,
            totalRentCollected,
            _owners,
            _prices
        );
    }

    /*╔═════════════════════════════════╗
      ║        CIRCUIT BREAKER          ║
      ╚═════════════════════════════════╝*/

    /// @dev in case Oracle never resolves for any reason
    /// @dev does not set a winner so same as invalid outcome
    /// @dev market does not need to be locked, just in case lockMarket bugs out
    function circuitBreaker() external override {
        require(
            block.timestamp > (uint256(oracleResolutionTime) + (12 weeks)),
            "Too early"
        );
        state = States.WITHDRAW;
        orderbook.closeMarket();
        emit LogStateChange(uint256(state));
    }
    /*
         ▲  
        ▲ ▲ 
              */
}
