pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@nomiclabs/buidler/console.sol";
import './RealityCardsMarketXdaiV1.sol';

/// @title Reality Cards Treasury
/// @author Andrew Stanger
/// @dev supports xDai only (aka Ether)

contract RealityCardsTreasury {

    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev address of the Factory so only the Factory can add new markets
    address public factoryAddress;
    /// @dev so only markets can withdraw funds
    mapping (address => bool) public isMarket;
    /// @dev keeps track of all the deposits for each user
    mapping (address => uint256) public deposits;
    uint256 public totalDeposits;
    /// @dev keeps track of rental payments made
    mapping (address => uint256) public marketPot;
    uint256 public totalMarketPots;
    /// @dev sum of prices of all Cards for each user 
    mapping (address => uint256) public totalRentalAmount; 

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
        uint256 _contractBalance = address(this).balance;
        assert(_contractBalance == totalDeposits + totalMarketPots);
    }

    modifier onlyMarkets {
        require(isMarket[msg.sender], "Not authorised");
        _;
    }

    ////////////////////////////////////
    ///////// VIEW FUNCTIONS ///////////
    ////////////////////////////////////

    /// @dev returns the deposit left for the specific market
    function getDepositPerMarket(address _currentOwner, uint256 _thisRentalAmount) public view {
        return ((deposits[_currentOwner].mul(_thisRentalAmount)).div(totalRentalAmount[_currentOwner]));
    }

    ////////////////////////////////////
    ////////// INITIALISATION //////////
    ////////////////////////////////////

    constructor (address _factoryAddress) public {
        factoryAddress = _factoryAddress;
    }

    function addMarket(address _newMarket) external {
        require(msg.sender == factoryAddress, "not factory");
        isMarket[_newMarket] = true;
    }

    ////////////////////////////////////
    /// DEPOSIT & WITHDRAW FUNCTIONS ///
    ////////////////////////////////////

    function increaseDeposit() external payable balancedBooks() {
        uint256 _dai = msg.value;
        deposits[msg.sender] = deposits[msg.sender].add(_dai);
        totalDeposits = totalDeposits.add(_dai);
        emit LogDepositIncreased(_dai, msg.sender);
    }

    /// @notice withdraw deposit
    /// @dev must leave enough for one hour's rental across all Cards
    function withdrawDeposit(uint256 _daiToWithdraw) external balancedBooks() {
        uint256 _minDepositToLeave = totalRentalAmount[msg.sender].div(24);
        uint256 _maxDaiToWithdraw = deposits[msg.sender].sub(_minDepositToLeave);
        if (_daiToWithdraw > _maxDaiToWithdraw) {
            _daiToWithdraw = _maxDaiToWithdraw;
        }

        _withdrawDeposit(_daiToWithdraw);
    }

    /// @notice withdraw deposit
    /// @dev must leave enough for one hour's rental across all Cards
    function withdrawMaxDeposit() external balancedBooks() {
        uint256 _minDepositToLeave = totalRentalAmount[msg.sender].div(24);
        uint256 _maxDaiToWithdraw = deposits[msg.sender].sub(_minDepositToLeave);
        
        _withdrawDeposit(_maxDaiToWithdraw);
    }

    ////////////////////////////////////
    //////    MARKET CALLABLE     //////
    ////////////////////////////////////
    /// @dev these functions can only be called by an existing RC Market instance

    function updateTotalRentalAmount(address _owner, uint256 _price, bool _exit) external onlyMarkets() {
        if (!_exit) {
            totalRentalAmount[_owner] = totalRentalAmount[_owner].add(_price);
        } else {
            totalRentalAmount[_owner] = totalRentalAmount[_owner].sub(_price);
        }
    }

    /// @dev a rental payment is equivilent to moving to market pot from user's deposit
    function payRent(address _recipient, uint256 _dai) external balancedBooks() onlyMarkets() {
        marketPot[msg.sender] = marketPot[msg.sender].add(_dai);
        deposits[_recipient] = deposits[_recipient].sub(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
    }

    /// @dev a payout is equivilent to moving from market pot to user's deposit
    function payout(address _recipient, uint256 _dai) external balancedBooks() onlyMarkets {
        marketPot[msg.sender] = marketPot[msg.sender].sub(_dai);
        deposits[_recipient] = deposits[_recipient].add(_dai);
        totalMarketPots = totalMarketPots.sub(_dai);
        totalDeposits = totalDeposits.add(_dai);
    }

    ////////////////////////////////////
    //////////   INTERNAL   ////////////
    ////////////////////////////////////

    /// @dev this is the only function where funds leave the contract
    function _withdrawDeposit(uint256 _dai) internal  {
        // this is an assert because safe math should enforce this
        assert (_dai >= deposits[msg.sender]); 
        deposits[msg.sender] = deposits[msg.sender].sub(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        address _thisAddressNotPayable = msg.sender;
        address payable _recipient = address(uint160(_thisAddressNotPayable));
        _recipient.call.value(_dai)("");
        emit LogDepositWithdrawal(_dai, msg.sender);
    }

}
