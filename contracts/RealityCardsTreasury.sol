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

    modifier initialised {
        require(factoryAddressSet, "Factory address not set");
        _;
    }

    ////////////////////////////////////
    ////////// INITIALISATION //////////
    ////////////////////////////////////

    function setFactoryAddress(address _factoryAddress) external returns(bool) {
        require(!factoryAddressSet, "Factory address already set");
        factoryAddress = _factoryAddress;
        factoryAddressSet = true;
        return true;
    }

    function addMarket(address _newMarket) external initialised() {
        require(msg.sender == factoryAddress, "Not factory");
        isMarket[_newMarket] = true;
    }

    ////////////////////////////////////
    /// DEPOSIT & WITHDRAW FUNCTIONS ///
    ////////////////////////////////////

    function deposit() external payable balancedBooks() initialised() {
        uint256 _dai = msg.value;
        deposits[msg.sender] = deposits[msg.sender].add(_dai);
        totalDeposits = totalDeposits.add(_dai);
        emit LogDepositIncreased(_dai, msg.sender);
    }

    /// @dev this is the only function where funds leave the contract
    function withdrawDeposit(uint256 _dai) external balancedBooks()  {
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
    function allocateCardSpecificDeposit(address _newOwner, address _previousOwner, uint256 _tokenId, uint256 _price) external balancedBooks() onlyMarkets() {

        // first, unallocate card specific deposit of previous owner
        if (cardSpecificDeposits[msg.sender][_previousOwner][_tokenId] > 0) {
            deposits[_previousOwner] = deposits[_previousOwner].add(cardSpecificDeposits[msg.sender][_previousOwner][_tokenId]);
            cardSpecificDeposits[msg.sender][_previousOwner][_tokenId] = 0;
        }

        // allocate card specific deposit for new owner
        // balance should have been cleared out as per the above
        assert(cardSpecificDeposits[msg.sender][_newOwner][_tokenId] == 0);
        uint256 _tenMinsDeposit = _price.div(24*6);
        require(deposits[_newOwner] >= _tenMinsDeposit, "Insufficient deposit");
        // move the deposit
        deposits[_newOwner] = deposits[_newOwner].sub(_tenMinsDeposit);
        cardSpecificDeposits[msg.sender][_newOwner][_tokenId] = cardSpecificDeposits[msg.sender][_newOwner][_tokenId].add(_tenMinsDeposit);
    }

    /// @dev a rental payment is equivilent to moving to market pot from user's deposit
    function payRent(address _user, uint256 _dai, uint256 _tokenId, bool _exitFlag) external balancedBooks() onlyMarkets() {
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
            assert(_dai <= _cardSpecificDeposit); // enforced by _collectRent function in the market
            cardSpecificDeposits[msg.sender][_user][_tokenId] = _cardSpecificDeposit.sub(_dai);
        } 
        
        marketPot[msg.sender] = marketPot[msg.sender].add(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
    }

    /// @dev a payout is equivilent to moving from market pot to user's deposit
    function payout(address _user, uint256 _dai) external balancedBooks() onlyMarkets() {
        marketPot[msg.sender] = marketPot[msg.sender].sub(_dai);
        deposits[_user] = deposits[_user].add(_dai);
        totalMarketPots = totalMarketPots.sub(_dai);
        totalDeposits = totalDeposits.add(_dai);
    }

}
