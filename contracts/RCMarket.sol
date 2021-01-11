pragma solidity 0.5.13;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "hardhat/console.sol";
import "./interfaces/IRealitio.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/ITreasury.sol";
import './interfaces/IRCProxyXdai.sol';
import './interfaces/IRCNftHub.sol';
import './lib/NativeMetaTransaction.sol';

/// @title Reality Cards Market
/// @author Andrew Stanger
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCMarket is Initializable, NativeMetaTransaction {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT SETUP /////
    /// @dev = how many outcomes/teams/NFTs etc 
    uint256 public numberOfTokens;
    /// @dev only for _revertToPreviousOwner to prevent gas limits
    uint256 public constant MAX_ITERATIONS = 10;
    uint256 public constant MAX_UINT256 = 2**256 - 1;
    enum States {CLOSED, OPEN, LOCKED, WITHDRAW}
    States public state; 
    /// @dev type of event. 0 = classic, 1 = winner takes all, 2 = hot potato 
    uint256 public mode;
    /// @dev so the Factory can check its a market
    bool public constant isMarket = true;
    /// @dev counts the total NFTs minted across all events at the time market created
    /// @dev nft tokenId = card Id + totalNftMintCount
    uint256 public totalNftMintCount;
    /// @dev contractURI for opensea 
    string public contractURI;

    ///// CONTRACT VARIABLES /////
    ITreasury public treasury;
    IFactory public factory;
    IRCProxyXdai public oracleproxy;
    IRCNftHub public nfthub;

    ///// PRICE, DEPOSITS, RENT /////
    /// @dev in attodai (so 100xdai = 100000000000000000000)
    mapping (uint256 => uint256) public price; 
    /// @dev keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome.
    mapping (address => uint256) public collectedPerUser;
    /// @dev keeps track of all the rent paid for each token, for card specific affiliate payout
    mapping (uint256 => uint256) public collectedPerToken;
    /// @dev an easy way to track the above across all tokens
    uint256 public totalCollected; 
    /// @dev the minimum required price increase
    uint256 public minimumPriceIncrease;
 
    ///// TIME /////
    /// @dev how many seconds each user has held each token for, for determining winnings  
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;
    /// @dev users can optionally set a maximum time to hold it for, after which it reverts
    mapping (uint256 => mapping (address => uint256) ) public timeHeldLimit;
    /// @dev sums all the timeHelds for each. Used when paying out. Should always increment at the same time as timeHeld
    mapping (uint256 => uint256) public totalTimeHeld; 
    /// @dev used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    mapping (uint256 => uint256) public timeLastCollected; 
    /// @dev to track the max timeheld of each token (for giving NFT to winner)
    mapping (uint256 => uint256) public longestTimeHeld;
    /// @dev to track who has owned it the most (for giving NFT to winner)
    mapping (uint256 => address) public longestOwner;
    /// @dev tells the contract to exit position after min rental duration (or immediately, if already rented for this long)
    /// @dev if not current owner, prevents ownership reverting back to you
    /// @dev user => tokenId => bool
    mapping (address => mapping (uint256 => bool)) public exitFlag;

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

    ///// TIMESTAMPS ///// 
    /// @dev when the market opens 
    uint32 public marketOpeningTime; 
    /// @dev when the market locks 
    uint32 public marketLockingTime; 
    /// @dev when the question can be answered on realitio
    /// @dev only needed for circuit breaker
    uint32 public oracleResolutionTime;

    ///// PAYOUT VARIABLES /////
    uint256 public winningOutcome;
    /// @dev prevent users withdrawing twice
    mapping (address => bool) public userAlreadyWithdrawn;
    /// @dev the artist
    address public artistAddress;
    uint256 public artistCut;
    bool public artistPaid = false;
    /// @dev the affiliate
    address public affiliateAddress;
    uint256 public affiliateCut;
    bool public affiliatePaid = false;
    /// @dev the winner
    uint256 public winnerCut;
    /// @dev the market creator
    address public marketCreatorAddress;
    uint256 public creatorCut;
    bool public creatorPaid = false;
    /// @dev card specific recipients
    address[] public cardAffiliateAddresses;
    uint256 public cardAffiliateCut;
    bool public cardAffiliatePaid = false;

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////
    
    /// @param _mode 0 = normal, 1 = winner takes all, 2 = hot potato
    /// @param _timestamps for market opening, locking, and oracle resolution
    /// @param _numberOfTokens how many Cards in this market
    /// @param _totalNftMintCount total existing Cards across all markets
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
    ) public initializer {
        assert(_mode <= 2);

        // initialise MetaTransactions
        _initializeEIP712("RealityCardsMarket","1");

        // external contract variables:
        factory = IFactory(msg.sender);
        treasury = factory.treasury();
        oracleproxy = factory.oracleproxy();
        nfthub = factory.nfthub();
        
        // initialiiize!
        winningOutcome = MAX_UINT256; // default invalid

        // assign arguments to public variables
        mode = _mode;
        numberOfTokens = _numberOfTokens;
        totalNftMintCount = _totalNftMintCount;
        marketOpeningTime = _timestamps[0];
        marketLockingTime = _timestamps[1];
        oracleResolutionTime = _timestamps[2];
        artistAddress = _artistAddress;
        marketCreatorAddress = _marketCreatorAddress;
        affiliateAddress = _affiliateAddress;
        cardAffiliateAddresses = _cardAffiliateAddresses;
        uint256[5] memory _potDistribution = factory.getPotDistribution();
        minimumPriceIncrease = factory.minimumPriceIncrease();
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
            for (uint i = 0; i < _numberOfTokens; i++) { 
                if (_cardAffiliateAddresses[i] == address(0)) {
                    cardAffiliateCut = 0;
                }
            }
        } else {
            cardAffiliateCut = 0;
        }

        // if winner takes all mode, set winnerCut to max
        if (_mode == 1) {
            winnerCut = (((uint256(1000).sub(artistCut)).sub(creatorCut)).sub(affiliateCut)).sub(cardAffiliateCut);
        } 

        // move to OPEN immediately if market opening time in the past
        if (marketOpeningTime <= now) {
            _incrementState();
        }
        
        // 2 because there is another event within the factory
        emit LogMarketCreated2(_mode, _timestamps, _artistAddress, _marketCreatorAddress, _affiliateAddress, artistCut, winnerCut, creatorCut, affiliateCut, cardAffiliateCut);
    } 

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogNewRental(address indexed newOwner, uint256 indexed newPrice, uint256 timeHeldLimit, uint256 indexed tokenId);
    event LogForeclosure(address indexed prevOwner, uint256 indexed tokenId);
    event LogRentCollection(uint256 indexed rentCollected, uint256 indexed tokenId, address indexed owner);
    event LogReturnToPreviousOwner(uint256 indexed tokenId, address indexed previousOwner);
    event LogContractLocked(bool indexed didTheEventFinish);
    event LogWinnerKnown(uint256 indexed winningOutcome);
    event LogWinningsPaid(address indexed paidTo, uint256 indexed amountPaid);
    event LogStakeholderPaid(address indexed paidTo, uint256 indexed amountPaid);
    event LogRentReturned(address indexed returnedTo, uint256 indexed amountReturned);
    event LogTimeHeldUpdated(uint256 indexed newTimeHeld, address indexed owner, uint256 indexed tokenId);
    event LogStateChange(uint256 indexed newState);
    event LogUpdateTimeHeldLimit(address indexed owner, uint256 newLimit, uint256 tokenId);
    event LogExit(address indexed owner, uint256 tokenId);
    event LogSponsor(uint256 amount);
    event LogNftUpgraded(uint256 currentTokenId, uint256 _newTokenId);
    event LogMarketCreated2(uint256 mode, uint32[] timestamps, address artistAddress, address marketCreatorAddress, address affiliateAddress, uint256 artistCut, uint256 winnerCut, uint256 creatorCut, uint256 affiliateCut, uint256 cardAffiliateCut);
    event LogTransferCardToLongestOwner(uint256 tokenId, address longestOwner);

    ////////////////////////////////////
    /////////// MODIFIERS //////////////
    ////////////////////////////////////

    modifier checkState(States currentState) {
        require(state == currentState, "Incorrect state");
        _;
    }

    /// @dev automatically opens market if appropriate
    modifier autoUnlock() {
        if (marketOpeningTime <= now && state == States.CLOSED) {
            _incrementState();
        }
        _;
    }

    /// @dev automatically locks market if appropriate
    modifier autoLock() {
        _;
        if (marketLockingTime <= now) {
            lockMarket();
        }
    }

    /// @notice what it says on the tin
    modifier amountNotZero(uint256 _dai) {
        require(_dai > 0, "Amount must be above zero");
       _;
    }

    /// @notice what it says on the tin
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(msgSender() == ownerOf(_tokenId), "Not owner");
       _;
    }

    ////////////////////////////////////
    //// ORACLE PROXY CONTRACT CALLS ///
    ////////////////////////////////////

    /// @dev send NFT to mainnet
    /// @dev upgrades not possible if market not approved
    function upgradeNft(uint256 _tokenId) external checkState(States.WITHDRAW) onlyTokenOwner(_tokenId) {
        require(!factory.trapIfUnapproved() || factory.isMarketApproved(address(this)), "Upgrade blocked");
        string memory _tokenUri = tokenURI(_tokenId);
        address _owner = ownerOf(_tokenId);
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        oracleproxy.upgradeNft(_actualTokenId, _tokenUri, _owner);
        _transferCard(ownerOf(_tokenId), address(this), _tokenId);
        emit LogNftUpgraded(_tokenId, _actualTokenId);
    }

    /// @notice gets the winning outcome from realitio
    /// @dev the returned value is equivilent to tokenId
    /// @dev this function call will revert if it has not yet resolved
    function _getWinner() internal view returns(uint256) {
        uint256 _winningOutcome = oracleproxy.getWinner(address(this));
        return _winningOutcome;
    }

    /// @notice has the question been finalized on realitio?
    function _isQuestionFinalized() internal view returns (bool) {
        return oracleproxy.isFinalized(address(this));
    }

    ////////////////////////////////////
    /////// NFT HUB CONTRACT CALLS /////
    ////////////////////////////////////

    /// @notice gets the owner of the NFT
    function ownerOf(uint256 _tokenId) public view returns(address) {
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        return nfthub.ownerOf(_actualTokenId);
    }

    /// @notice gets tokenURI
    function tokenURI(uint256 _tokenId) public view returns(string memory) {
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        return nfthub.tokenURI(_actualTokenId);
    }

    /// @notice transfer ERC 721 between users
    function _transferCard(address _currentOwner, address _newOwner, uint256 _tokenId) internal {
        require(_currentOwner != address(0) && _newOwner != address(0) , "Cannot send to/from zero address");
        uint256 _actualTokenId = _tokenId.add(totalNftMintCount);
        assert(nfthub.transferNft(_currentOwner, _newOwner, _actualTokenId));
    }

    ////////////////////////////////////
    //// MARKET RESOLUTION FUNCTIONS ///
    ////////////////////////////////////

    /// @notice checks whether the competition has ended, if so moves to LOCKED state
    /// @dev can be called by anyone 
    /// @dev public because possibly called within newRental
    function lockMarket() public checkState(States.OPEN) {
        require(marketLockingTime < now, "Market has not finished");
        // do a final rent collection before the contract is locked down
        collectRentAllCards();
        _incrementState();
        emit LogContractLocked(true);
    }

    /// @notice checks whether the Realitio question has resolved, and if yes, gets the winner
    /// @dev can be called by anyone 
    function determineWinner() external checkState(States.LOCKED) {
        require(_isQuestionFinalized() == true, "Oracle not resolved");
        // get the winner. This will revert if answer is not resolved.
        winningOutcome = _getWinner();
        _incrementState();
        // transfer NFTs to the longest owners
        _processCardsAfterEvent(); 
        emit LogWinnerKnown(winningOutcome);
    }

    /// @notice pays out winnings, or returns funds
    /// @dev public because called by withdrawWinningsAndDeposit
    function withdraw() external checkState(States.WITHDRAW) {
        require(!userAlreadyWithdrawn[msgSender()], "Already withdrawn");
        userAlreadyWithdrawn[msgSender()] = true;
        if (totalTimeHeld[winningOutcome] > 0) {
            _payoutWinnings();
        } else {
             _returnRent();
        }
    }

    /// @notice pays winnings
    function _payoutWinnings() internal {
        uint256 _winningsToTransfer;
        uint256 _remainingCut = ((((uint256(1000).sub(artistCut)).sub(affiliateCut))).sub(cardAffiliateCut).sub(winnerCut)).sub(creatorCut); 
        // calculate longest owner's extra winnings, if relevant
        if (longestOwner[winningOutcome] == msgSender() && winnerCut > 0){
            _winningsToTransfer = (totalCollected.mul(winnerCut)).div(1000);
        }
        // calculate normal winnings, if any
        uint256 _remainingPot = (totalCollected.mul(_remainingCut)).div(1000);
        uint256 _winnersTimeHeld = timeHeld[winningOutcome][msgSender()];
        uint256 _numerator = _remainingPot.mul(_winnersTimeHeld);
        _winningsToTransfer = _winningsToTransfer.add(_numerator.div(totalTimeHeld[winningOutcome]));
        require(_winningsToTransfer > 0, "Not a winner");
        _payout(msgSender(), _winningsToTransfer);
        emit LogWinningsPaid(msgSender(), _winningsToTransfer);
    }

    /// @notice returns all funds to users in case of invalid outcome
    function _returnRent() internal {
        // deduct artist share and card specific share if relevant but NOT market creator share or winner's share (no winner, market creator does not deserve)
        uint256 _remainingCut = ((uint256(1000).sub(artistCut)).sub(affiliateCut)).sub(cardAffiliateCut);      
        uint256 _rentCollected = collectedPerUser[msgSender()];
        require(_rentCollected > 0, "Paid no rent");
        uint256 _rentCollectedAdjusted = (_rentCollected.mul(_remainingCut)).div(1000);
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
    function payArtist() external checkState(States.WITHDRAW) {
        require(!artistPaid, "Artist already paid");
        artistPaid = true;
        _processStakeholderPayment(artistCut, artistAddress);
    }

    /// @notice pay market creator
    function payMarketCreator() external checkState(States.WITHDRAW) {
        require(totalTimeHeld[winningOutcome] > 0, "No winner");
        require(!creatorPaid, "Creator already paid");
        creatorPaid = true;
        _processStakeholderPayment(creatorCut, marketCreatorAddress);
    }

    /// @notice pay affiliate
    function payAffiliate() external checkState(States.WITHDRAW) {
        require(!affiliatePaid, "Affiliate already paid");
        affiliatePaid = true;
        _processStakeholderPayment(affiliateCut, affiliateAddress);
    }

    function _processStakeholderPayment(uint256 _cut, address _recipient) internal {
        if (_cut > 0) {
            uint256 _payment = (totalCollected.mul(_cut)).div(1000);
            _payout(_recipient, _payment);
            emit LogStakeholderPaid(_recipient, _payment);
        }
    }

    /// @notice pay card recipients
    /// @dev does not call _processStakeholderPayment because it works differently
    function payCardAffiliate() external checkState(States.WITHDRAW) {
        require(!cardAffiliatePaid, "Card recipients already paid");
        cardAffiliatePaid = true;
        if (cardAffiliateCut > 0) {
            for (uint i = 0; i < numberOfTokens; i++) {
                uint256 _cardAffiliatePayment = (collectedPerToken[i].mul(cardAffiliateCut)).div(1000);
                if (_cardAffiliatePayment > 0) {
                    _payout(cardAffiliateAddresses[i], _cardAffiliatePayment);
                }
                emit LogStakeholderPaid(cardAffiliateAddresses[i], _cardAffiliatePayment);
            }
        }
    }

    ////////////////////////////////////
    ///// CORE FUNCTIONS- EXTERNAL /////
    ////////////////////////////////////
    /// @dev basically functions that have checkState(States.OPEN) modifier

    /// @notice collects rent for all tokens
    /// @dev cannot be external because it is called within the lockContract function, therefore public
    function collectRentAllCards() public checkState(States.OPEN) {
       for (uint i = 0; i < numberOfTokens; i++) {
            _collectRent(i);
        }
    }

    /// @notice rent every Card at the minimum price
    function rentAllCards(uint256 _maxSumOfPrices) external {
        // check that not being front run
        uint256 _actualSumOfPrices;
        for (uint i = 0; i < numberOfTokens; i++) {
            _actualSumOfPrices = _actualSumOfPrices.add(price[i]);
        }
        require(_actualSumOfPrices <= _maxSumOfPrices, "Prices too high");

        for (uint i = 0; i < numberOfTokens; i++) {
            if (ownerOf(i) != msgSender()) {
                uint _newPrice;
                if (price[i]>0) {
                    _newPrice = (price[i].mul(minimumPriceIncrease.add(100))).div(100);
                } else {
                    _newPrice = 1 ether;
                }
                newRental(_newPrice, 0, i);
            }
        }
    }

    /// @notice to rent a Card
    function newRental(uint256 _newPrice, uint256 _timeHeldLimit, uint256 _tokenId) public payable autoUnlock() autoLock() checkState(States.OPEN) returns(bool) {
        require(_newPrice >= 1 ether, "Minimum rental 1 Dai");
        require(_tokenId < numberOfTokens, "This token does not exist");

        bool _validPrice = false;

        if (_newPrice >= (price[_tokenId].mul(minimumPriceIncrease.add(100))).div(100)) {
            _collectRent(_tokenId);
            _validPrice = true;
            address _currentOwner = ownerOf(_tokenId);

            // below must be after collectRent so timeHeld is up to date
            // _timeHeldLimit = 0 = no limit
            uint256 _minRentalTime = uint256(1 days).div(treasury.minRentalDivisor());
            require(_timeHeldLimit == 0 || _timeHeldLimit >= timeHeld[_tokenId][msgSender()].add(_minRentalTime), "Limit too low"); 

            // process deposit, if sent
            if (msg.value > 0) {
                assert(treasury.deposit.value(msg.value)(msgSender()));
            }

            // allocate minimum rental deposit (or increase if same owner) and unallocate current owner's minimum deposit
            assert(treasury.allocateCardSpecificDeposit(msgSender(), _currentOwner, _tokenId, _newPrice));

            if (_currentOwner == msgSender()) { 
                // bought by current owner- just change price
                price[_tokenId] = _newPrice;
                ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
            } else {   
                // if hot potato mode, pay current owner
                if (mode == 2) {
                    assert(treasury.payCurrentOwner(msgSender(), _currentOwner, price[_tokenId]));
                }
                // update internals
                price[_tokenId] = _newPrice;
                currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].add(1); 
                ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
                ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].owner = msgSender(); 
                // externals
                _transferCard(_currentOwner, msgSender(), _tokenId);
            }

            // update timeHeldLimit for user
            if (_timeHeldLimit == 0) {
                    _timeHeldLimit = MAX_UINT256; // so 0 defaults to no limit
                }
            if (timeHeldLimit[_tokenId][msgSender()] != _timeHeldLimit) {
                timeHeldLimit[_tokenId][msgSender()] = _timeHeldLimit;
            }
            
            // make sure exit flag is set back to false
            if (exitFlag[msgSender()][_tokenId]) {
                exitFlag[msgSender()][_tokenId] = false;
            }

            emit LogNewRental(msgSender(), _timeHeldLimit, _newPrice, _tokenId); 
        }

        return _validPrice;
    }

    /// @notice to change your timeHeldLimit without having to re-rent
    function updateTimeHeldLimit(uint256 _timeHeldLimit, uint256 _tokenId) external checkState(States.OPEN) {
        _collectRent(_tokenId);
        uint256 _minRentalTime = uint256(1 days).div(treasury.minRentalDivisor());
        require(_timeHeldLimit == 0 || _timeHeldLimit >= timeHeld[_tokenId][msgSender()].add(_minRentalTime), "Limit too low");
        if (_timeHeldLimit == 0) {
            _timeHeldLimit = MAX_UINT256; // so 0 defaults to no limit
        } 
        timeHeldLimit[_tokenId][msgSender()] = _timeHeldLimit;
        emit LogUpdateTimeHeldLimit(msgSender(), _timeHeldLimit, _tokenId); 
    }

    /// @notice stop renting a token
    /// @dev public because called by exitAll()
    /// @dev doesn't need to be current owner so user can prevent ownership returning to them
    function exit(uint256 _tokenId) public checkState(States.OPEN) {
        // if current owner, collect rent, revert if necessary
        if (ownerOf(_tokenId) == msgSender()) {
            // collectRent first, so correct rent to now is taken
            _collectRent(_tokenId);
            // if still the current owner and used all card specific deposit, revert immediately
            if (ownerOf(_tokenId) == msgSender()) {
                if (treasury.cardSpecificDeposits(address(this), msgSender(), _tokenId) == 0) {
                    exitFlag[msgSender()][_tokenId] = true; // else they might get it back at lower price on revert
                    _revertToPreviousOwner(_tokenId);
                    }
                }
        }
        // set exit flag if not already set in all cases
        if (!exitFlag[msgSender()][_tokenId]) {
                exitFlag[msgSender()][_tokenId] = true;
        }
        emit LogExit(msgSender(), _tokenId); 
    }

    /// @notice stop renting all tokens
    function exitAll() external {
        for (uint i = 0; i < numberOfTokens; i++) {
            exit(i);
        }
    }

    /// @notice ability to add liqudity to the pot without being able to win. 
    function sponsor() external payable {
        require(msg.value > 0, "Must send something");
        require(state != States.LOCKED, "Incorrect state");
        require(state != States.WITHDRAW, "Incorrect state");
        // send funds to the Treasury
        assert(treasury.sponsor.value(msg.value)());
        totalCollected = totalCollected.add(msg.value);
        // just so user can get it back if invalid outcome
        collectedPerUser[msgSender()] = collectedPerUser[msgSender()].add(msg.value); 
        // allocate equally to each token, in case card specific affiliates
        for (uint i = 0; i < numberOfTokens; i++) {
            collectedPerToken[i] =  collectedPerToken[i].add(msg.value.div(numberOfTokens));
        }
        emit LogSponsor(msg.value); 
    }

    ////////////////////////////////////
    ///// CORE FUNCTIONS- INTERNAL /////
    ////////////////////////////////////

    /// @notice collects rent for a specific token
    /// @dev also calculates and updates how long the current user has held the token for
    /// @dev is not a problem if called externally, but making internal over public to save gas
    function _collectRent(uint256 _tokenId) internal {
        uint256 _timeOfThisCollection = now;

        //only collect rent if the token is owned (ie, if owned by the contract this implies unowned)
        if (ownerOf(_tokenId) != address(this)) {
            uint256 _rentOwed = price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(1 days);
            address _currentOwner = ownerOf(_tokenId);
            uint256 _cardSpecificDeposit = treasury.cardSpecificDeposits(address(this), _currentOwner, _tokenId);
            uint256 _totalDeposit = treasury.deposits(_currentOwner).add(_cardSpecificDeposit);
            bool _exitFlag = exitFlag[_currentOwner][_tokenId];
            
            // get the maximum rent they can pay based on timeHeldLimit
            uint256 _rentOwedLimit;
            if (timeHeldLimit[_tokenId][_currentOwner] == MAX_UINT256) {
                _rentOwedLimit = MAX_UINT256;
            } else {
                _rentOwedLimit = price[_tokenId].mul(timeHeldLimit[_tokenId][_currentOwner].sub(timeHeld[_tokenId][_currentOwner])).div(1 days);
            }

            if (!_exitFlag) {
                if (_rentOwed >= _totalDeposit || _rentOwed >= _rentOwedLimit)  {
                    // case 1: rentOwed is reduced to _totalDeposit
                    if (_totalDeposit <= _rentOwedLimit)
                    {
                        _timeOfThisCollection = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(_totalDeposit).div(_rentOwed)));
                        _rentOwed = _totalDeposit; // take what's left     
                    // case 2: rentOwed is reduced to _rentOwedLimit
                    } else {
                        _timeOfThisCollection = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(_rentOwedLimit).div(_rentOwed)));
                        _rentOwed = _rentOwedLimit; // take up to the max   
                    }
                    _revertToPreviousOwner(_tokenId);
                } 
            } else {
                if (_rentOwed >= _cardSpecificDeposit) {
                    // run out of deposit. Calculate time it was actually paid for, then revert to previous owner 
                    _timeOfThisCollection = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(_cardSpecificDeposit).div(_rentOwed)));
                    _rentOwed = _cardSpecificDeposit; // take what's left     
                    _revertToPreviousOwner(_tokenId);
                } 
            }
            // _rentOwed will be 0 if _exitFlag set after cardSpecificDeposit used
            if (_rentOwed > 0) {
                // decrease deposit by rent owed at the Treasury
                assert(treasury.payRent(_currentOwner, _rentOwed, _tokenId, _exitFlag));
                // update time held and amount collected variables
                uint256 _timeHeldToIncrement = (_timeOfThisCollection.sub(timeLastCollected[_tokenId]));
                // note that if _revertToPreviousOwner was called above, _currentOwner will no longer refer to the
                // ... actual current owner. This is correct- we are updating the variables of the user who just
                // ... had their rent collected, not the new owner, if there is one
                timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add(_timeHeldToIncrement);
                totalTimeHeld[_tokenId] = totalTimeHeld[_tokenId].add(_timeHeldToIncrement);
                collectedPerUser[_currentOwner] = collectedPerUser[_currentOwner].add(_rentOwed);
                collectedPerToken[_tokenId] = collectedPerToken[_tokenId].add(_rentOwed);
                totalCollected = totalCollected.add(_rentOwed);

                // longest owner tracking
                if (timeHeld[_tokenId][_currentOwner] > longestTimeHeld[_tokenId]) {
                    longestTimeHeld[_tokenId] = timeHeld[_tokenId][_currentOwner];
                    longestOwner[_tokenId] = _currentOwner;
                }

                emit LogTimeHeldUpdated(timeHeld[_tokenId][_currentOwner], _currentOwner, _tokenId);
                emit LogRentCollection(_rentOwed, _tokenId, _currentOwner);
            } 
        }

        // timeLastCollected is updated regardless of whether the token is owned, so that the clock starts ticking
        // ... when the first owner buys it, because this function is run before ownership changes upon calling newRental
        timeLastCollected[_tokenId] = _timeOfThisCollection;
    }

    /// @notice if a users deposit runs out, either return to previous owner or foreclose
    function _revertToPreviousOwner(uint256 _tokenId) internal {
        uint256 _index;
        address _previousOwner;
        uint256 _previousOwnersDeposit;

        // loop max ten times before just assigning it to that owner, to prevent block limit
        for (uint i=0; i < MAX_ITERATIONS; i++)  {
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].sub(1); // currentOwnerIndex will now point to  previous owner
            _index = currentOwnerIndex[_tokenId]; // just for readability
            _previousOwner = ownerTracker[_tokenId][_index].owner;
            _previousOwnersDeposit = treasury.deposits(_previousOwner);
            // because always unallocated upon new rental
            assert(treasury.cardSpecificDeposits(address(this),_previousOwner,_tokenId) == 0);
            
            // if no previous owners. price -> zero, foreclose
            // if previous owners, revert to them if they have deposit AND exit flag is not set
            if (_index == 0) {
                _foreclose(_tokenId);
                break;
            } else if (_previousOwnersDeposit > 0 && !exitFlag[_previousOwner][_tokenId]) {
                break;
            }  
        }   

        // if the above loop did not end in foreclose, then transfer to previous owner
        if (ownerOf(_tokenId) != address(this)) {
            // transfer to previous owner
            address _currentOwner = ownerOf(_tokenId);
            uint256 _oldPrice = ownerTracker[_tokenId][_index].price;
            price[_tokenId] = _oldPrice;
            _transferCard(_currentOwner, _previousOwner, _tokenId);
            emit LogReturnToPreviousOwner(_tokenId, _previousOwner);
        }
    }

    /// @notice gives each Card to the longest owner
    function _processCardsAfterEvent() internal {
        for (uint i = 0; i < numberOfTokens; i++) {
            if (longestOwner[i] != address(0)) {
                // if never owned, longestOwner[i] will = zero
                _transferCard(ownerOf(i), longestOwner[i], i);
                emit LogTransferCardToLongestOwner(i, longestOwner[i]);
            } 
        }
    }

    /// @notice return token to the contract and return price to zero
    function _foreclose(uint256 _tokenId) internal {
        address _currentOwner = ownerOf(_tokenId);
        price[_tokenId] = 0;
        _transferCard(_currentOwner, address(this), _tokenId);
        emit LogForeclosure(_currentOwner, _tokenId);
    }

     /// @dev should only be called thrice
    function _incrementState() internal {
        assert(uint256(state) < 4);
        state = States(uint256(state) + 1);
        emit LogStateChange(uint256(state));
    }

    ////////////////////////////////////
    /////////// CIRCUIT BREAKER ////////
    ////////////////////////////////////

    /// @dev alternative to determineWinner, in case Oracle never resolves for any reason
    /// @dev does not set a winner so same as invalid outcome
    /// @dev market does not need to be locked, just in case lockMarket bugs out
    function circuitBreaker() external {
        require(now > (oracleResolutionTime + 12 weeks), "Too early");
        _incrementState();
        _processCardsAfterEvent(); 
        state = States.WITHDRAW;
    }

}
