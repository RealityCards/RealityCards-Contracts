pragma solidity 0.5.13;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";

/// @title Reality Cards Treasury
/// @author Andrew Stanger

contract RCTreasury is Ownable {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev address of the Factory so only the Factory can add new markets
    address public factoryAddress;
    bool public factoryAddressSet = false;
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

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogDepositIncreased(uint256 indexed daiDeposited, address indexed sentBy);
    event LogDepositWithdrawal(uint256 indexed daiWithdrawn, address indexed returnedTo);

    ////////////////////////////////////
    /////////// MODIFIERS //////////////
    ////////////////////////////////////

    modifier balancedBooks() {
        _;
        assert(address(this).balance == totalDeposits + totalMarketPots);
    }

    modifier onlyMarkets {
        require(isMarket[msg.sender], "Not authorised");
        _;
    }

    ////////////////////////////////////
    ////////// INITIALISATION //////////
    ////////////////////////////////////

    function setFactoryAddress() external returns(bool) {
        require(!factoryAddressSet, "Factory already set");
        factoryAddressSet = true;
        factoryAddress = msg.sender;
        return true;
    }

    function addMarket(address _newMarket) external returns(bool) {
        require(msg.sender == factoryAddress, "Not factory");
        isMarket[_newMarket] = true;
        return true;
    }

    ////////////////////////////////////
    ///// ADJUSTABLE PARAMETERS ////////
    ////////////////////////////////////

    function updateMinRental(uint256 _newDivisor) public onlyOwner() {
        minRentalDivisor = _newDivisor;
    }

    function updateHotPotatoPayment(uint256 _newDivisor) public onlyOwner() {
        hotPotatoDivisor = _newDivisor;
    }

    function updateMaxContractBalance(uint256 _newBalanceLimit) public onlyOwner() {
        maxContractBalance = _newBalanceLimit;
    }

    ////////////////////////////////////
    /// DEPOSIT & WITHDRAW FUNCTIONS ///
    ////////////////////////////////////

    /// @dev it is passed the user instead of using msg.value because might be called
    /// @dev ... via contract (newRental function, specifically) instead of direct
    function deposit(address _user) public payable balancedBooks() returns(bool) {
        require(msg.value > 0, "Must deposit something");
        require(address(this).balance <= maxContractBalance, "Limit hit");
        deposits[_user] = deposits[_user].add(msg.value);
        totalDeposits = totalDeposits.add(msg.value);
        emit LogDepositIncreased(msg.value, _user);
        return true;
    }

    /// @dev this is the only function where funds leave the contract
    function withdrawDeposit(uint256 _dai) external balancedBooks()  {
        require(deposits[msg.sender] > 0, "Nothing to withdraw");
        if (_dai > deposits[msg.sender]) {
            _dai = deposits[msg.sender];
        }
        deposits[msg.sender] = deposits[msg.sender].sub(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        address _thisAddressNotPayable = msg.sender;
        address payable _recipient = address(uint160(_thisAddressNotPayable));
        (bool _success, ) = _recipient.call.value(_dai)("");
        require(_success, "Transfer failed");
        emit LogDepositWithdrawal(_dai, msg.sender);
    }

    ////////////////////////////////////
    //////    MARKET CALLABLE     //////
    ////////////////////////////////////
    /// only markets can call these functions

    /// @dev moves the amount required for minimum rental duration to seperate pot
    /// @dev if current owner rents again, _newOwner and _currentOwner will be the same, this is fine; 
    /// @dev ... card specific deposit will just be increased 
    function allocateCardSpecificDeposit(address _newOwner, address _currentOwner, uint256 _tokenId, uint256 _newPrice) external balancedBooks() onlyMarkets() returns(bool) {
        uint256 _depositToAllocate = _newPrice.div(minRentalDivisor);
        require(deposits[_newOwner] >= _depositToAllocate, "Insufficient deposit");

        // first, unallocate card specific deposit of previous owner
        if (cardSpecificDeposits[msg.sender][_currentOwner][_tokenId] > 0) {
            deposits[_currentOwner] = deposits[_currentOwner].add(cardSpecificDeposits[msg.sender][_currentOwner][_tokenId]);
            cardSpecificDeposits[msg.sender][_currentOwner][_tokenId] = 0;
        }

        // allocate card specific deposit for new owner
        deposits[_newOwner] = deposits[_newOwner].sub(_depositToAllocate);
        cardSpecificDeposits[msg.sender][_newOwner][_tokenId] = _depositToAllocate;
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
        uint256 _cardSpecificDeposit = cardSpecificDeposits[msg.sender][_user][_tokenId];
        // exitFlag true = only pay rent up to balance of cardSpecificDeposit and no more
        if (!_exitFlag) {
            if (_cardSpecificDeposit == 0) {
                // no specific deposit left, take from general deposit 
                deposits[_user] = deposits[_user].sub(_dai);
            } else if (_cardSpecificDeposit < _dai) {
                // specific deposit left, but not enough, zero it out and take remainder from general deposit
                deposits[_user] = deposits[_user].sub(_dai.sub(_cardSpecificDeposit));
                cardSpecificDeposits[msg.sender][_user][_tokenId] = 0;
            } else {
                // specific deposit sufficient
                cardSpecificDeposits[msg.sender][_user][_tokenId] = _cardSpecificDeposit.sub(_dai);
            }
        } else {
            cardSpecificDeposits[msg.sender][_user][_tokenId] = _cardSpecificDeposit.sub(_dai);
        } 
        
        marketPot[msg.sender] = marketPot[msg.sender].add(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        return true;
    }

    /// @dev a payout is equivalent to moving from market pot to user's deposit (the opposite of payRent)
    function payout(address _user, uint256 _dai) external balancedBooks() onlyMarkets() returns(bool) {
        marketPot[msg.sender] = marketPot[msg.sender].sub(_dai);
        deposits[_user] = deposits[_user].add(_dai);
        totalMarketPots = totalMarketPots.sub(_dai);
        totalDeposits = totalDeposits.add(_dai);
        return true;
    }

    /// @notice ability to add liqudity to the pot without being able to win (called by market sponsor function). 
    function sponsor() external payable balancedBooks() onlyMarkets() returns(bool) {
        marketPot[msg.sender] = marketPot[msg.sender].add(msg.value);
        totalMarketPots = totalMarketPots.add(msg.value);
        return true;
    }
 
    /// @dev sending ether direct is equal to a deposit, if this was not here balancedBooks modifier would break. 
    function() external payable {
        assert(deposit(msg.sender));
    }

}
