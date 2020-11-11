pragma solidity 0.5.13;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";

/// @title Reality Cards Treasury
/// @author Andrew Stanger
/// @dev supports xDai only (aka Ether)

contract RCTreasury is Ownable {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev address of the Factory so only the Factory can add new markets
    address public factoryAddress;
    bool public factoryAddressSet = false;
    /// @dev so only markets can withdraw funds
    mapping (address => bool) public isMarket;
    /// @dev keeps track of all the deposits for each user
    mapping (address => uint256) public deposits;
    uint256 public totalDeposits;
    /// @dev keeps track of rental payments made
    mapping (address => uint256) public marketPot;
    uint256 public totalMarketPots;
    /// @dev first ten mins of each rental is specific to each Card
    /// @dev market -> user -> tokenId -> deposit
    mapping (address => mapping (address => mapping (uint256 => uint256))) public cardSpecificDeposits;
    /// @dev minimum rental duration (1 day in seconds diviser) therefore 24 = 1 hour, 48 = 30 mins
    uint256 public minRentalDivisor = 24*6; // defaults ten mins
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

    /// @dev can never set a new factory address
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

    function updateMaxContractBalance(uint256 _newBalanceLimit) public onlyOwner() {
        maxContractBalance = _newBalanceLimit;
    }

    ////////////////////////////////////
    /// DEPOSIT & WITHDRAW FUNCTIONS ///
    ////////////////////////////////////

    /// @dev it is passed the user instead of using msg.value because might be called
    /// @dev ... via contract instead of direct
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
        (bool _success, bytes memory data) = _recipient.call.value(_dai)("");
        require(_success, "Transfer failed");
        data; // suppress compilation warning
        emit LogDepositWithdrawal(_dai, msg.sender);
    }

    ////////////////////////////////////
    //////    MARKET CALLABLE     //////
    ////////////////////////////////////
    /// only markets can call these functions

    /// @dev moves ten minutes' deposit into a seperate pot
    function allocateCardSpecificDeposit(address _newOwner, address _previousOwner, uint256 _tokenId, uint256 _price) external balancedBooks() onlyMarkets() returns(bool) {
        uint256 _depositToAllocate = _price.div(minRentalDivisor);
        require(deposits[_newOwner] >= _depositToAllocate, "Insufficient deposit");

        // first, unallocate card specific deposit of previous owner
        if (cardSpecificDeposits[msg.sender][_previousOwner][_tokenId] > 0) {
            deposits[_previousOwner] = deposits[_previousOwner].add(cardSpecificDeposits[msg.sender][_previousOwner][_tokenId]);
            cardSpecificDeposits[msg.sender][_previousOwner][_tokenId] = 0;
        }

        // allocate card specific deposit for new owner
        // balance should have been cleared out as per the above
        assert(cardSpecificDeposits[msg.sender][_newOwner][_tokenId] == 0);
        deposits[_newOwner] = deposits[_newOwner].sub(_depositToAllocate);
        cardSpecificDeposits[msg.sender][_newOwner][_tokenId] = cardSpecificDeposits[msg.sender][_newOwner][_tokenId].add(_depositToAllocate);
        return true;
    }

    /// @dev a rental payment is equivilent to moving to market pot from user's deposit
    function payRent(address _user, uint256 _dai, uint256 _tokenId, bool _exitFlag) external balancedBooks() onlyMarkets() returns(bool) {
        uint256 _cardSpecificDeposit = cardSpecificDeposits[msg.sender][_user][_tokenId];
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
            assert(_dai <= _cardSpecificDeposit); // already enforced by _collectRent function in the market and safeMath
            cardSpecificDeposits[msg.sender][_user][_tokenId] = _cardSpecificDeposit.sub(_dai);
        } 
        
        marketPot[msg.sender] = marketPot[msg.sender].add(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        return true;
    }

    /// @dev a payout is equivilent to moving from market pot to user's deposit (the opposite of payRent)
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
