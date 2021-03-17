// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "hardhat/console.sol";
import "./lib/NativeMetaTransaction.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IAlternateReceiverBridge.sol";

/// @title Reality Cards Treasury
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCTreasury is Ownable, NativeMetaTransaction {
    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev address of the alternate Receiver Bridge for withdrawals to mainnet
    address public alternateReceiverBridgeAddress;
    /// @dev address of the Factory so only the Factory can add new markets
    address public factoryAddress;
    /// @dev so only markets can use certain functions
    mapping(address => bool) public isMarket;
    /// @dev the deposit balance of each user
    mapping(address => uint256) public userDeposit;
    /// @dev sum of all deposits
    uint256 public totalDeposits;
    /// @dev the rental payments made in each market
    mapping(address => uint256) public marketPot;
    /// @dev sum of all market pots
    uint256 public totalMarketPots;
    /// @dev when a user most recently rented (to prevent users withdrawing within minRentalTime)
    mapping(address => uint256) public lastRentalTime;
    /// @dev keeps track of the tokens and bid prices the user has in each market
    struct Bid {
        address market;
        uint128[] tokenIds;
        uint128[] bidPrices;
    }
    /// @dev maps a user address to an array of their bids
    mapping(address => Bid[]) public userBids;
    /// @dev total number of user bids, uses less gas than counting the array every time
    mapping(address => uint256) public userBidCount;
    /// @dev a quick check if the market is active or not
    mapping(address => bool) public isMarketActive;

    ///// GOVERNANCE VARIABLES /////
    /// @dev only parameters that need to be are here, the rest are in the Factory
    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    uint256 public minRentalDayDivisor;
    /// @dev max deposit balance, to minimise funds at risk
    uint256 public maxContractBalance;
    /// @dev the maximum number of bids a user is allowed
    uint256 public maxBidCountLimit;

    ///// SAFETY /////
    /// @dev if true, cannot deposit, withdraw or rent any cards across all events
    bool public globalPause;
    /// @dev if true, cannot rent any cards for specific market
    mapping(address => bool) public marketPaused;

    ///// UBER OWNER /////
    /// @dev high level owner who can change the factory address
    address public uberOwner;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogDepositIncreased(address indexed sentBy, uint256 indexed daiDeposited);
    event LogDepositWithdrawal(address indexed returnedTo, uint256 indexed daiWithdrawn);
    event LogAdjustDeposit(address indexed user, uint256 indexed amount, bool increase);
    event LogHotPotatoPayment(address from, address to, uint256 amount);

    ////////////////////////////////////
    //////// CONSTRUCTOR ///////////////
    ////////////////////////////////////

    constructor() {
        // initialise MetaTransactions
        _initializeEIP712("RealityCardsTreasury", "1");

        // at initiation, uberOwner and owner will be the same
        uberOwner = msg.sender;

        // initialise adjustable parameters
        setMinRental(24 * 6); // MinRental is a divisor of 1 day(86400 seconds), 24*6 will set to 10 minutes
        setMaxContractBalance(1000000 ether); // 1m
        setMaxBidLimit(30); // 30 is safe with current gas limit (12.5m)
    }

    ////////////////////////////////////
    /////////// MODIFIERS //////////////
    ////////////////////////////////////

    modifier balancedBooks {
        _;
        // using >= not == because forced Ether send via selfdestruct will not trigger a deposit via the fallback
        assert(address(this).balance >= totalDeposits.add(totalMarketPots));
    }

    modifier onlyMarkets {
        require(isMarket[msgSender()], "Not authorised");
        _;
    }

    ////////////////////////////////////
    //////////// ADD MARKETS ///////////
    ////////////////////////////////////

    /// @dev so only markets can move funds from deposits to marketPots and vice versa
    function addMarket(address _newMarket) external {
        require(msgSender() == factoryAddress, "Not factory");
        require(alternateReceiverBridgeAddress != address(0), "Alternate Receiver not set");
        isMarket[_newMarket] = true;
    }

    ////////////////////////////////////
    /////// GOVERNANCE- OWNER //////////
    ////////////////////////////////////
    /// @dev all functions should be onlyOwner
    // min rental event emitted by market. Nothing else need be emitted.

    /// CALLED WITHIN CONSTRUCTOR (public)

    /// @notice minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    function setMinRental(uint256 _newDivisor) public onlyOwner {
        minRentalDayDivisor = _newDivisor;
    }

    /// @dev max deposit balance, to minimise funds at risk
    function setMaxContractBalance(uint256 _newBalanceLimit) public onlyOwner {
        maxContractBalance = _newBalanceLimit;
    }

    /// @dev max bid limit, to fit within gas limits
    function setMaxBidLimit(uint256 _newBidLimit) public onlyOwner {
        maxBidCountLimit = _newBidLimit;
    }

    /// NOT CALLED WITHIN CONSTRUCTOR (external)

    /// @dev address of alternate receiver bridge, xdai side
    function setAlternateReceiverAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        alternateReceiverBridgeAddress = _newAddress;
    }

    /// @dev if true, cannot deposit, withdraw or rent any cards
    function changeGlobalPause() external onlyOwner {
        globalPause = !globalPause;
    }

    /// @dev if true, cannot make a new rental for a specific market
    function changePauseMarket(address _market) external onlyOwner {
        marketPaused[_market] = !marketPaused[_market];
    }

    ////////////////////////////////////
    ////// GOVERNANCE- UBER OWNER //////
    ////////////////////////////////////
    //// ******** DANGER ZONE ******** ////
    /// @dev uber owner required for upgrades
    /// @dev deploying and setting a new factory is effectively an upgrade
    /// @dev this is seperated so owner so can be set to multisig, or burn address to relinquish upgrade ability
    /// @dev ... while maintaining governance over other governanace functions

    function setFactoryAddress(address _newFactory) external {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newFactory != address(0));
        factoryAddress = _newFactory;
    }

    function changeUberOwner(address _newUberOwner) external {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newUberOwner != address(0));
        uberOwner = _newUberOwner;
    }

    ////////////////////////////////////
    /// DEPOSIT & WITHDRAW FUNCTIONS ///
    ////////////////////////////////////

    /// @dev it is passed the user instead of using msg.sender because might be called
    /// @dev ... via contract (fallback, newRental) or dai->xdai bot
    /// @param _user the user to credit the deposit to
    function deposit(address _user) public payable balancedBooks returns (bool) {
        require(!globalPause, "Deposits are disabled");
        require(msg.value > 0, "Must deposit something");
        require(address(this).balance <= maxContractBalance, "Limit hit");
        require(_user != address(0), "Must set an address");

        userDeposit[_user] = userDeposit[_user].add(msg.value);
        totalDeposits = totalDeposits.add(msg.value);
        emit LogDepositIncreased(_user, msg.value);
        emit LogAdjustDeposit(_user, msg.value, true);
        return true;
    }

    /// @notice withdraw a users deposit either directly or over the bridge to the mainnet
    /// @dev this is the only function where funds leave the contractthe
    /// @param _dai the amount to withdraw
    /// @param _localWithdrawal if true then withdraw to the users xDai address, otherwise to the mainnet
    function withdrawDeposit(uint256 _dai, bool _localWithdrawal) external balancedBooks {
        require(!globalPause, "Withdrawals are disabled");
        address _msgSender = msgSender();
        require(userDeposit[_msgSender] > 0, "Nothing to withdraw");
        require(block.timestamp.sub(lastRentalTime[_msgSender]) > uint256(1 days).div(minRentalDayDivisor), "Too soon");

        // step 1: collect rent on all user's Cards
        uint256 _userTotalBids = 0;
        for (uint256 i = 0; i < userBids[_msgSender].length; i++) {
            IRCMarket _market = IRCMarket(userBids[_msgSender][i].market);
            _market.collectRentSpecificCards(userBids[_msgSender][i].tokenIds);
            for (uint256 j; j < userBids[_msgSender][i].tokenIds.length; j++) {
                _userTotalBids = _userTotalBids.add(userBids[_msgSender][i].bidPrices[j]);
            }
        }

        // step 2: process withdrawal
        if (_dai > userDeposit[_msgSender]) {
            _dai = userDeposit[_msgSender];
        }
        emit LogDepositWithdrawal(_msgSender, _dai);
        emit LogAdjustDeposit(_msgSender, _dai, false);
        userDeposit[_msgSender] = userDeposit[_msgSender].sub(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        if (_localWithdrawal) {
            address _thisAddressNotPayable = _msgSender;
            address payable _recipient = address(uint160(_thisAddressNotPayable));
            (bool _success, ) = _recipient.call{ value: _dai }("");
            require(_success, "Transfer failed");
        } else {
            IAlternateReceiverBridge _alternateReceiverBridge = IAlternateReceiverBridge(alternateReceiverBridgeAddress);
            _alternateReceiverBridge.relayTokens{value: _dai}(address(this), _msgSender, _dai);
        }

        // step 3: remove bids if insufficient deposit
        if (_userTotalBids.div(minRentalDayDivisor) > userDeposit[_msgSender]) {
            uint256 i = 0;
            do {
                if (isMarketActive[userBids[_msgSender][i].market]) {
                    IRCMarket _market = IRCMarket(userBids[_msgSender][i].market);
                    _market.exitSpecificCards(userBids[_msgSender][i].tokenIds, _msgSender);
                    // not incrementing i because exit cards shortens the length of the array
                } else {
                    i++;
                }
            } while (userBids[_msgSender].length > i);
        }
    }

    ////////////////////////////////////
    //////    MARKET CALLABLE     //////
    ////////////////////////////////////
    /// only markets can call these functions

    /// @dev a rental payment is equivalent to moving from user's deposit to market pot, called by _collectRent in the market
    function payRent(address _user, uint256 _dai) external balancedBooks onlyMarkets returns (bool) {
        require(!globalPause, "Rentals are disabled");
        assert(userDeposit[_user] >= _dai); // assert because should have been reduced to user's deposit already
        userDeposit[_user] = userDeposit[_user].sub(_dai);
        marketPot[msgSender()] = marketPot[msgSender()].add(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        emit LogAdjustDeposit(_user, _dai, false);
        return true;
    }

    /// @dev a payout is equivalent to moving from market pot to user's deposit (the opposite of payRent)
    function payout(address _user, uint256 _dai) external balancedBooks onlyMarkets returns (bool) {
        require(!globalPause, "Payouts are disabled");
        assert(marketPot[msgSender()] >= _dai);
        userDeposit[_user] = userDeposit[_user].add(_dai);
        marketPot[msgSender()] = marketPot[msgSender()].sub(_dai);
        totalMarketPots = totalMarketPots.sub(_dai);
        totalDeposits = totalDeposits.add(_dai);
        emit LogAdjustDeposit(_user, _dai, true);
        return true;
    }

    /// @notice ability to add liqudity to the pot without being able to win (called by market sponsor function).
    function sponsor() external payable balancedBooks onlyMarkets returns (bool) {
        require(!globalPause, "Global Pause is Enabled");
        marketPot[msgSender()] = marketPot[msgSender()].add(msg.value);
        totalMarketPots = totalMarketPots.add(msg.value);
        return true;
    }

    /// @dev new owner pays current owner for hot potato mode
    function processHarbergerPayment(
        address _newOwner,
        address _currentOwner,
        uint256 _requiredPayment
    ) external balancedBooks onlyMarkets returns (bool) {
        require(!globalPause, "Global Pause is Enabled");
        require(userDeposit[_newOwner] >= _requiredPayment, "Insufficient deposit");
        userDeposit[_newOwner] = userDeposit[_newOwner].sub(_requiredPayment);
        userDeposit[_currentOwner] = userDeposit[_currentOwner].add(_requiredPayment);
        emit LogAdjustDeposit(_newOwner, _requiredPayment, false);
        emit LogAdjustDeposit(_currentOwner, _requiredPayment, true);
        emit LogHotPotatoPayment(_newOwner, _currentOwner, _requiredPayment);
        return true;
    }

    /// @dev tracks when the user last rented- so they cannot rent and immediately withdraw, thus bypassing minimum rental duration
    function updateLastRentalTime(address _user) external onlyMarkets returns (bool) {
        lastRentalTime[_user] = block.timestamp;
        return true;
    }

    /// @dev provides the sum total of a users bids accross all markets
    /// @dev doesn't clean the bid array first as the market does that already
    function userTotalBids(address _user) external view returns (uint256) {
        uint256 _userTotalBids = 0;
        for (uint256 i; i < userBids[_user].length; i++) {
            for (uint256 j; j < userBids[_user][i].tokenIds.length; j++) {
                _userTotalBids = _userTotalBids.add(userBids[_user][i].bidPrices[j]);
            }
        }
        return _userTotalBids;
    }

    /// @dev removes all non-active markets from the users bid array
    function cleanUserBidArray(address _user) external {
        for (uint256 i = userBids[_user].length; i > 0; i--) {
            if (!isMarketActive[userBids[_user][i.sub(1)].market]) {
                // This market isn't active, lets remove it
                userBids[_user][i.sub(1)] = userBids[_user][userBids[_user].length.sub(1)];
                userBids[_user].pop();
            }
        }
    }

    /// @dev tracks the total rental payments across all Cards, to enforce minimum rental duration
    function updateUserBid(
        address _user,
        uint256 _tokenId,
        uint256 _price
    ) external onlyMarkets returns (bool) {
        if (_price != 0) {
            require(userBidCount[_user] < maxBidCountLimit, "Max Bid Limit Reached");
        }
        bool _done = false;
        // in this case msgSender is the market
        address _msgSender = msgSender();
        // find the market
        for (uint256 i = 0; i < userBids[_user].length; i++) {
            if (userBids[_user][i].market == _msgSender) {
                // find the tokenId
                for (uint256 j = 0; j < userBids[_user][i].tokenIds.length; j++) {
                    if (userBids[_user][i].tokenIds[j] == _tokenId) {
                        if (_price == 0) {
                            //price is 0, delete record
                            if (userBids[_user][i].tokenIds.length == 1) {
                                // There's only 1 bid in this market, just delete the whole market record
                                userBids[_user][i] = userBids[_user][userBids[_user].length.sub(1)];
                                userBids[_user].pop();
                            } else {
                                // There's more than 1 bid in this market, delete the correct one
                                uint256 _lastRecord = userBids[_user][i].tokenIds.length.sub(1);
                                userBids[_user][i].tokenIds[j] = userBids[_user][i].tokenIds[_lastRecord];
                                userBids[_user][i].tokenIds.pop();
                                userBids[_user][i].bidPrices[j] = userBids[_user][i].bidPrices[_lastRecord];
                                userBids[_user][i].bidPrices.pop();
                            }
                            userBidCount[_user] = userBidCount[_user].sub(1);
                        } else {
                            //price is non-zero, update record
                            userBids[_user][i].bidPrices[j] = SafeCast.toUint128(_price);
                        }
                        _done = true;
                        break;
                    }
                }
                if (!_done) {
                    //we didn't find the tokenId, add it
                    userBids[_user][i].tokenIds.push(SafeCast.toUint128(_tokenId));
                    userBids[_user][i].bidPrices.push(SafeCast.toUint128(_price));
                    userBidCount[_user] = userBidCount[_user].add(1);
                }
                _done = true;
                break;
            }
        }
        if (!_done) {
            //we didn't find the market, add it and update the bid info
            userBids[_user].push();
            userBids[_user][userBids[_user].length.sub(1)].market = _msgSender;
            userBids[_user][userBids[_user].length.sub(1)].tokenIds.push(SafeCast.toUint128(_tokenId));
            userBids[_user][userBids[_user].length.sub(1)].bidPrices.push(SafeCast.toUint128(_price));
            userBidCount[_user] = userBidCount[_user].add(1);
            _done = true;
        }
        return _done;
    }

    /// @dev adds or removes a market to the active markets array
    function updateMarketStatus(bool _open) external onlyMarkets {
        if (_open) {
            isMarketActive[msgSender()] = true;
        } else {
            isMarketActive[msgSender()] = false;
        }
    }

    ////////////////////////////////////
    //////////    FALLBACK     /////////
    ////////////////////////////////////

    /// @dev sending ether/xdai direct is equal to a deposit
    receive() external payable {
        require(deposit(msgSender()));
    }
}
