pragma solidity 0.5.13;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "hardhat/console.sol";
import './lib/NativeMetaTransaction.sol';

/// @title Reality Cards Treasury
/// @author Andrew Stanger
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCTreasury is Ownable, NativeMetaTransaction {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev address of the Factory so only the Factory can add new markets
    address public factoryAddress;
    /// @dev so only markets can move balances between deposits and market pots
    mapping (address => bool) public isMarket;
    /// @dev keeps track of all the deposits for each user
    mapping (address => uint256) public deposits;
    uint256 public totalDeposits;
    /// @dev keeps track of rental payments made in each market
    mapping (address => uint256) public marketPot;
    uint256 public totalMarketPots;
    /// @dev to enforce minimum rental duration, small deposit is allocated to specific Card 
    /// @dev market -> user -> tokenId -> deposit
    mapping (address => mapping (address => mapping (uint256 => uint256))) public cardSpecificDeposits;

    ///// ADJUSTABLE PARAMETERS /////
    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    uint256 public minRentalDivisor = 24*6; // defaults ten mins
    /// @dev if hot potato mode, how much rent new owner must pay current owner (1 week divisor: i.e. 7 = 1 day, 14 = 12 hours)
    uint256 public hotPotatoDivisor = 7; // defaults one day
    /// @dev max deposit balance, to minimise funds at risk
    uint256 public maxContractBalance = 1000000 ether; // default 1m

    ///// SAFETY /////
    /// @dev if true, cannot deposit or rent any cards across all events
    bool public globalPause;
    /// @dev if true, cannot rent any cards for specific market
    mapping (address => bool) public marketPaused;

    ///// UBER OWNER /////
    /// @dev high level owner who can change the factory address
    address public uberOwner;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogDepositIncreased(uint256 indexed daiDeposited, address indexed sentBy);
    event LogDepositWithdrawal(uint256 indexed daiWithdrawn, address indexed returnedTo);
    event LogAdjustCardSpecificDeposit(address indexed user, uint256 indexed amount, bool increase);

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    constructor() public {
        // initialise MetaTransactions
        _initializeEIP712("RealityCardsTreasury","1");

        // at initiation, uberOwner and owner will be the same
        uberOwner = msg.sender;
    }

    ////////////////////////////////////
    /////////// MODIFIERS //////////////
    ////////////////////////////////////

    modifier balancedBooks() {
        _;
        // using >= not == because forced Ether send via selfdestruct will not trigger a deposit via the fallback
        assert(address(this).balance >= totalDeposits + totalMarketPots);
    }

    modifier onlyMarkets {
        require(isMarket[msg.sender], "Not authorised");
        _;
    }

    ////////////////////////////////////
    //////////// ADD MARKETS ///////////
    ////////////////////////////////////

    /// @dev so only markets can move funds from deposits to marketPots and vice versa
    function addMarket(address _newMarket) external returns(bool) {
        require(msg.sender == factoryAddress, "Not factory");
        isMarket[_newMarket] = true;
        return true;
    }

    ////////////////////////////////////
    /////// GOVERNANCE- OWNER //////////
    ////////////////////////////////////
    /// @dev all functions should be onlyOwner

    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    function setMinRental(uint256 _newDivisor) external onlyOwner {
        minRentalDivisor = _newDivisor;
    }

    /// @dev if hot potato mode, how much rent new owner must pay current owner (1 week divisor: i.e. 7 = 1 day, 14 = 12 hours)
    function setHotPotatoPayment(uint256 _newDivisor) external onlyOwner {
        hotPotatoDivisor = _newDivisor;
    }

    /// @dev max deposit balance, to minimise funds at risk
    function setMaxContractBalance(uint256 _newBalanceLimit) external onlyOwner {
        maxContractBalance = _newBalanceLimit;
    }

    /// @dev if true, cannot deposit or rent any cards, can still withdraw
    function setGlobalPause() public onlyOwner {
        globalPause = globalPause ? false : true;
    }

    /// @dev if true, cannot rent any cards for specific market
    function setPauseMarket(address _market) public onlyOwner {
        marketPaused[_market] = marketPaused[_market] ? false : true;
    }

    ////////////////////////////////////
    ////// GOVERNANCE- UBER OWNER //////
    ////////////////////////////////////
    //// ******** DANGER ZONE ******** ////
    /// @dev uber owner required for upgrades
    /// @dev deploying and setting a new factory is effectively an upgrade
    /// @dev only the uber owner can do this, which can be set to burn address to relinquish upgrade ability
    /// @dev ... while maintaining governance over other governanace functions

    function setFactoryAddress(address _newFactory) external {
        require(msg.sender == uberOwner, "Verboten");
        factoryAddress = _newFactory;
    }

    function changeUberOwner(address _newUberOwner) external {
        require(msg.sender == uberOwner, "Verboten");
        uberOwner = _newUberOwner;
    }

    ////////////////////////////////////
    /// DEPOSIT & WITHDRAW FUNCTIONS ///
    ////////////////////////////////////

    /// @dev it is passed the user instead of using msg.value because might be called
    /// @dev ... via contract (newRental function, specifically) instead of direct
    function deposit(address _user) public payable balancedBooks() returns(bool) {
        require(!globalPause, "Deposits are disabled");
        require(msg.value > 0, "Must deposit something");
        require(address(this).balance <= maxContractBalance, "Limit hit");
        deposits[_user] = deposits[_user].add(msg.value);
        totalDeposits = totalDeposits.add(msg.value);
        emit LogDepositIncreased(msg.value, _user);
        return true;
    }

    /// @dev this is the only function where funds leave the contract
    function withdrawDeposit(uint256 _dai) external balancedBooks()  {
        require(deposits[msgSender()] > 0, "Nothing to withdraw");
        if (_dai > deposits[msgSender()]) {
            _dai = deposits[msgSender()];
        }
        deposits[msgSender()] = deposits[msgSender()].sub(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        address _thisAddressNotPayable = msgSender();
        address payable _recipient = address(uint160(_thisAddressNotPayable));
        (bool _success, ) = _recipient.call.value(_dai)("");
        require(_success, "Transfer failed");
        emit LogDepositWithdrawal(_dai, msgSender());
    }

    ////////////////////////////////////
    //////    MARKET CALLABLE     //////
    ////////////////////////////////////
    /// only markets can call these functions

    /// @dev moves the amount required for minimum rental duration to seperate pot
    /// @dev if current owner rents again, _newOwner and _currentOwner will be the same, this is fine; 
    /// @dev ... card specific deposit will just be increased 
    function allocateCardSpecificDeposit(address _newOwner, address _currentOwner, uint256 _tokenId, uint256 _newPrice) external balancedBooks() onlyMarkets() returns(bool) {
        address _marketAddress = msg.sender;
        require(!globalPause, "Rentals are disabled");
        require(!marketPaused[_marketAddress], "Rentals are disabled");
        uint256 _depositToAllocate = _newPrice.div(minRentalDivisor);
        require(deposits[_newOwner] >= _depositToAllocate, "Insufficient deposit");

        // first, unallocate card specific deposit of previous owner
        if (cardSpecificDeposits[_marketAddress][_currentOwner][_tokenId] > 0) {
            uint256 _depositToUnallocate = cardSpecificDeposits[_marketAddress][_currentOwner][_tokenId];
            deposits[_currentOwner] = deposits[_currentOwner].add(_depositToUnallocate);
            cardSpecificDeposits[_marketAddress][_currentOwner][_tokenId] = 0;
            emit LogAdjustCardSpecificDeposit(_currentOwner, _depositToUnallocate, false);
        }

        // allocate card specific deposit for new owner
        deposits[_newOwner] = deposits[_newOwner].sub(_depositToAllocate);
        cardSpecificDeposits[_marketAddress][_newOwner][_tokenId] = _depositToAllocate;
        emit LogAdjustCardSpecificDeposit(_newOwner, _depositToAllocate, true);
        return true;
    }

    /// @dev new owner pays current owner for hot potato mode
    function payCurrentOwner(address _newOwner, address _currentOwner, uint256 _oldPrice) external balancedBooks() onlyMarkets() returns(bool) {
        uint256 _duration = uint256(1 weeks).div(hotPotatoDivisor);
        uint256 _requiredPayment = (_oldPrice.mul(_duration)).div(uint256(1 days));
        require(deposits[_newOwner] >= _requiredPayment, "Insufficient deposit");
        deposits[_newOwner] = deposits[_newOwner].sub(_requiredPayment);
        deposits[_currentOwner] = deposits[_currentOwner].add(_requiredPayment);
        return true;
    }

    /// @dev a rental payment is equivalent to moving to market pot from user's deposit, called by _collectRent in the market
    /// @dev no require statement checking that user has sufficient deposit because _dai should have been reduced to the 
    /// @dev ... appropriate amount before this function is called (plus, safemath would enforce it anyway). 
    function payRent(address _user, uint256 _dai, uint256 _tokenId, bool _exitFlag) external balancedBooks() onlyMarkets() returns(bool) {
        address _marketAddress = msg.sender;
        uint256 _cardSpecificDeposit = cardSpecificDeposits[_marketAddress][_user][_tokenId];
        // exitFlag true = only pay rent up to balance of cardSpecificDeposit and no more
        if (!_exitFlag) {
            if (_cardSpecificDeposit == 0) {
                // no specific deposit left, take from general deposit 
                deposits[_user] = deposits[_user].sub(_dai);
            } else if (_cardSpecificDeposit < _dai) {
                // specific deposit left, but not enough, zero it out and take remainder from general deposit
                deposits[_user] = deposits[_user].sub(_dai.sub(_cardSpecificDeposit));
                cardSpecificDeposits[_marketAddress][_user][_tokenId] = 0;
                emit LogAdjustCardSpecificDeposit(_user, _cardSpecificDeposit, false);
            } else {
                // specific deposit sufficient
                cardSpecificDeposits[_marketAddress][_user][_tokenId] = _cardSpecificDeposit.sub(_dai);
                emit LogAdjustCardSpecificDeposit(_user, _dai, false);
            }
        } else {
            cardSpecificDeposits[_marketAddress][_user][_tokenId] = _cardSpecificDeposit.sub(_dai);
            emit LogAdjustCardSpecificDeposit(_user, _cardSpecificDeposit, false);
        } 
        
        marketPot[_marketAddress] = marketPot[_marketAddress].add(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        return true;
    }

    /// @dev a payout is equivalent to moving from market pot to user's deposit (the opposite of payRent)
    function payout(address _user, uint256 _dai) external balancedBooks() onlyMarkets() returns(bool) {
        address _marketAddress = msg.sender;
        marketPot[_marketAddress] = marketPot[_marketAddress].sub(_dai);
        deposits[_user] = deposits[_user].add(_dai);
        totalMarketPots = totalMarketPots.sub(_dai);
        totalDeposits = totalDeposits.add(_dai);
        return true;
    }

    /// @notice ability to add liqudity to the pot without being able to win (called by market sponsor function). 
    function sponsor() external payable balancedBooks() onlyMarkets() returns(bool) {
        address _marketAddress = msgSender();
        marketPot[_marketAddress] = marketPot[_marketAddress].add(msg.value);
        totalMarketPots = totalMarketPots.add(msg.value);
        return true;
    }
 
    /// @dev sending ether direct is equal to a deposit
    function() external payable {
        assert(deposit(msgSender()));
    }

}
