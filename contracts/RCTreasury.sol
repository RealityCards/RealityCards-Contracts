// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "hardhat/console.sol";
import "./lib/NativeMetaTransaction.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IAlternateReceiverBridge.sol";
import "./interfaces/IRCOrderbook.sol";
import "./interfaces/IRCNftHubXdai.sol";

/// @title Reality Cards Treasury
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCTreasury is Ownable, NativeMetaTransaction, IRCTreasury {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    //using SafeMath32 for uint32;
    //using SafeMath64 for uint64;

    // VARIABLES

    /// @dev address of the alternate Receiver Bridge for withdrawals to mainnet
    address public override alternateReceiverBridgeAddress;
    /// @dev address of the Factory so only the Factory can add new markets
    address public override factoryAddress;
    /// @dev address of the orderbook so only the orderbook can update bids
    address public orderbookAddress;
    /// @dev orderbook instance to remove users bids on foreclosure
    IRCOrderbook orderbook;
    /// @dev so only markets can use certain functions
    mapping(address => bool) public override isMarket;
    /// @dev sum of all deposits
    uint256 public override totalDeposits;
    /// @dev the rental payments made in each market
    mapping(address => uint256) public override marketPot;
    /// @dev sum of all market pots
    uint256 public override totalMarketPots;
    /// @dev a quick check if the market is active or not
    mapping(address => bool) public override isMarketActive;

    // DC new stuff
    /// @param rentalRate the daily cost of the cards the user current owns
    /// @param bidRate the sum total of all placed bids
    /// @param forclosureTime The time the user will foreclose with current ownership
    /// @param safeForclosureTime The time a user could foreclose if they gained ownership of their bids
    struct User {
        // lets pack this struct later, leaving it as uint256 for rapid development and testing
        uint256 deposit;
        uint256 rentalRate;
        uint256 bidRate;
        uint256 foreclosureTime; // we could calculate this from rentalRate
        uint256 safeForclosureTime; // we could calculate this from bidRate
        uint256 lastRentCalc;
        uint256 lastRentalTime;
        address[] marketBids; //a list of markets this user has bids in
        address[] marketOwned; //a list of markets this user is an owner in
        mapping(address => uint256) marketBidsIndex;
        mapping(address => uint256) marketOwnedIndex;
        mapping(address => Bids) tokens; //map market to info about token bids
    }
    struct Bids {
        uint256[] tokenBids;
        uint256[] tokensOwned;
        mapping(uint256 => uint256) tokenBidsIndex;
        mapping(uint256 => uint256) tokensOwnedIndex;
    }
    mapping(address => User) public user;
    uint256 test;

    // GOVERNANCE VARIABLES
    /// @dev only parameters that need to be are here, the rest are in the Factory
    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    uint256 public override minRentalDayDivisor;
    /// @dev max deposit balance, to minimise funds at risk
    uint256 public override maxContractBalance;
    /// @dev the maximum number of bids a user is allowed
    uint256 public maxBidCountLimit;

    // SAFETY
    /// @dev if true, cannot deposit, withdraw or rent any cards across all events
    bool public override globalPause;
    /// @dev if true, cannot rent any cards for specific market
    mapping(address => bool) public override marketPaused;

    // UBER OWNER
    /// @dev high level owner who can change the factory address
    address public override uberOwner;

    IRCNftHubXdai public nfthub; // JS/TODO: This variable is never initialized!

    // EVENTS

    event LogDepositIncreased(
        address indexed sentBy,
        uint256 indexed daiDeposited
    );
    event LogDepositWithdrawal(
        address indexed returnedTo,
        uint256 indexed daiWithdrawn
    );
    event LogAdjustDeposit(
        address indexed user,
        uint256 indexed amount,
        bool increase
    );
    event LogHotPotatoPayment(address from, address to, uint256 amount);

    // CONSTRUCTOR

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

    // MODIFIERS

    modifier balancedBooks {
        _;
        // using >= not == because forced Ether send via selfdestruct will not trigger a deposit via the fallback
        assert(address(this).balance >= totalDeposits.add(totalMarketPots));
    }

    modifier onlyMarkets {
        require(isMarket[msgSender()], "Not authorised");
        _;
    }

    modifier rentCollect(address _user) {
        collectRentUser(_user);
        _;
    }

    modifier collectRentUserAndSettleCard(uint256 card) {
        _collectRentUserAndSettleCard(card);
        _;
    }

    // ADD MARKETS

    /// @dev so only markets can move funds from deposits to marketPots and vice versa
    function addMarket(address _newMarket) external override {
        require(msgSender() == factoryAddress, "Not factory");
        require(
            alternateReceiverBridgeAddress != address(0),
            "Alternate Receiver not set"
        );
        isMarket[_newMarket] = true;
    }

    // GOVERNANCE- OWNER

    /// @dev all functions should be onlyOwner
    // min rental event emitted by market. Nothing else need be emitted.

    /// CALLED WITHIN CONSTRUCTOR (public)

    /// @notice minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    function setMinRental(uint256 _newDivisor) public override onlyOwner {
        minRentalDayDivisor = _newDivisor;
    }

    /// @dev max deposit balance, to minimise funds at risk
    function setMaxContractBalance(uint256 _newBalanceLimit)
        public
        override
        onlyOwner
    {
        maxContractBalance = _newBalanceLimit;
    }

    /// @dev max bid limit, to fit within gas limits
    function setMaxBidLimit(uint256 _newBidLimit) public override onlyOwner {
        maxBidCountLimit = _newBidLimit;
    }

    /// NOT CALLED WITHIN CONSTRUCTOR (external)

    /// @dev address of alternate receiver bridge, xdai side
    function setAlternateReceiverAddress(address _newAddress)
        external
        override
        onlyOwner
    {
        require(_newAddress != address(0), "Must set an address");
        alternateReceiverBridgeAddress = _newAddress;
    }

    /// @dev if true, cannot deposit, withdraw or rent any cards
    function changeGlobalPause() external override onlyOwner {
        globalPause = !globalPause;
    }

    /// @dev if true, cannot make a new rental for a specific market
    function changePauseMarket(address _market) external override onlyOwner {
        marketPaused[_market] = !marketPaused[_market];
    }

    // GOVERNANCE- UBER OWNER

    // ******** DANGER ZONE ******** //
    /// @dev uber owner required for upgrades
    /// @dev deploying and setting a new factory is effectively an upgrade
    /// @dev this is seperated so owner so can be set to multisig, or burn address to relinquish upgrade ability
    /// @dev ... while maintaining governance over other governanace functions

    function setFactoryAddress(address _newFactory) external override {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newFactory != address(0));
        factoryAddress = _newFactory;
    }

    function setOrderbookAddress(address _newOrderbook) external {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newOrderbook != address(0));
        orderbookAddress = _newOrderbook;
        orderbook = IRCOrderbook(orderbookAddress);
    }

    function changeUberOwner(address _newUberOwner) external override {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newUberOwner != address(0));
        uberOwner = _newUberOwner;
    }

    // DEPOSIT & WITHDRAW FUNCTIONS

    /// @dev it is passed the user instead of using msg.sender because might be called
    /// @dev ... via contract (fallback, newRental) or dai->xdai bot
    /// @param _user the user to credit the deposit to
    function deposit(address _user)
        public
        payable
        override
        balancedBooks
        returns (bool)
    {
        require(!globalPause, "Deposits are disabled");
        require(msg.value > 0, "Must deposit something");
        require(address(this).balance <= maxContractBalance, "Limit hit");
        require(_user != address(0), "Must set an address");

        user[_user].deposit = user[_user].deposit.add(msg.value);
        totalDeposits = totalDeposits.add(msg.value);
        emit LogDepositIncreased(_user, msg.value);
        emit LogAdjustDeposit(_user, msg.value, true);
        return true;
    }

    /// @notice withdraw a users deposit either directly or over the bridge to the mainnet
    /// @dev this is the only function where funds leave the contractthe
    /// @param _dai the amount to withdraw
    /// @param _localWithdrawal if true then withdraw to the users xDai address, otherwise to the mainnet
    function withdrawDeposit(uint256 _dai, bool _localWithdrawal)
        external
        override
        balancedBooks
    {
        require(!globalPause, "Withdrawals are disabled");
        address _msgSender = msgSender();
        require(user[_msgSender].deposit > 0, "Nothing to withdraw");
        require(
            block.timestamp.sub(user[_msgSender].lastRentalTime) >
                uint256(1 days).div(minRentalDayDivisor),
            "Too soon"
        );
        //console.log("withdrawing deposit ", _msgSender);
        // step 1: collect rent on all cards a user Owns
        // for (uint256 i = 0; i < user[_msgSender].marketOwned.length; i++) {
        //     IRCMarket _market = IRCMarket(user[_msgSender].marketOwned[i]);
        //     _market.collectRentSpecificCards(
        //         user[_msgSender].tokens[user[_msgSender].marketOwned[i]]
        //             .tokensOwned
        //     );
        // }
        orderbook.collectRentOwnedCards(_msgSender);

        // step 2: process withdrawal
        if (_dai > user[_msgSender].deposit) {
            _dai = user[_msgSender].deposit;
        }
        emit LogDepositWithdrawal(_msgSender, _dai);
        emit LogAdjustDeposit(_msgSender, _dai, false);
        user[_msgSender].deposit = user[_msgSender].deposit.sub(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        if (_localWithdrawal) {
            address _thisAddressNotPayable = _msgSender;
            address payable _recipient =
                address(uint160(_thisAddressNotPayable));
            (bool _success, ) = _recipient.call{value: _dai}("");
            require(_success, "Transfer failed");
        } else {
            IAlternateReceiverBridge _alternateReceiverBridge =
                IAlternateReceiverBridge(alternateReceiverBridgeAddress);
            _alternateReceiverBridge.relayTokens{value: _dai}(
                address(this),
                _msgSender,
                _dai
            );
        }

        // step 3: remove bids if insufficient deposit
        if (
            user[_msgSender].bidRate != 0 &&
            user[_msgSender].bidRate.div(minRentalDayDivisor) >
            user[_msgSender].deposit
        ) {
            orderbook.removeUserFromOrderbook(_msgSender);
        }
    }

    //   MARKET CALLABLE

    // only markets can call these functions

    /// @dev a rental payment is equivalent to moving from user's deposit to market pot, called by _collectRent in the market
    function payRent(address _user, uint256 _dai)
        external
        override
        balancedBooks
        onlyMarkets
        returns (bool)
    {
        require(!globalPause, "Rentals are disabled");
        assert(user[_user].deposit >= _dai); // assert because should have been reduced to user's deposit already
        user[_user].deposit = user[_user].deposit.sub(_dai);
        marketPot[msgSender()] = marketPot[msgSender()].add(_dai);
        totalMarketPots = totalMarketPots.add(_dai);
        totalDeposits = totalDeposits.sub(_dai);
        emit LogAdjustDeposit(_user, _dai, false);
        return true;
    }

    /// @dev a payout is equivalent to moving from market pot to user's deposit (the opposite of payRent)
    function payout(address _user, uint256 _dai)
        external
        override
        balancedBooks
        onlyMarkets
        returns (bool)
    {
        require(!globalPause, "Payouts are disabled");
        assert(marketPot[msgSender()] >= _dai);
        user[_user].deposit = user[_user].deposit.add(_dai);
        marketPot[msgSender()] = marketPot[msgSender()].sub(_dai);
        totalMarketPots = totalMarketPots.sub(_dai);
        totalDeposits = totalDeposits.add(_dai);
        emit LogAdjustDeposit(_user, _dai, true);
        return true;
    }

    /// @notice ability to add liqudity to the pot without being able to win (called by market sponsor function).
    function sponsor()
        external
        payable
        override
        balancedBooks
        onlyMarkets
        returns (bool)
    {
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
    ) external override balancedBooks onlyMarkets returns (bool) {
        require(!globalPause, "Global Pause is Enabled");
        require(
            user[_newOwner].deposit >= _requiredPayment,
            "Insufficient deposit"
        );
        user[_newOwner].deposit = user[_newOwner].deposit.sub(_requiredPayment);
        user[_currentOwner].deposit = user[_currentOwner].deposit.add(
            _requiredPayment
        );
        emit LogAdjustDeposit(_newOwner, _requiredPayment, false);
        emit LogAdjustDeposit(_currentOwner, _requiredPayment, true);
        emit LogHotPotatoPayment(_newOwner, _currentOwner, _requiredPayment);
        return true;
    }

    /// @dev tracks when the user last rented- so they cannot rent and immediately withdraw, thus bypassing minimum rental duration
    function updateLastRentalTime(address _user)
        external
        override
        onlyMarkets
        returns (bool)
    {
        user[_user].lastRentalTime = block.timestamp;
        return true;
    }

    /// @dev provides the sum total of a users bids accross all markets
    /// @dev doesn't clean the bid array first as the market does that already
    function userTotalBids(address _user)
        external
        view
        override
        returns (uint256)
    {
        return user[_user].bidRate;
    }

    /// @dev adds or removes a market to the active markets array
    function updateMarketStatus(bool _open) external override onlyMarkets {
        if (_open) {
            isMarketActive[msgSender()] = true;
        } else {
            isMarketActive[msgSender()] = false;
        }
    }

    function userDeposit(address _user)
        external
        view
        override
        returns (uint256)
    {
        return user[_user].deposit;
    }

    // orderbook callable

    function updateRentalRate(
        address _oldOwner,
        address _newOwner,
        uint256 _oldPrice,
        uint256 _newPrice
    ) external override {
        // TODO only orderbook callable
        // Must add before subtract, to avoid underflow in the case a user is only updating their price.
        user[_newOwner].rentalRate = user[_newOwner].rentalRate.add(_newPrice);
        user[_oldOwner].rentalRate = user[_oldOwner].rentalRate.sub(_oldPrice);
    }

    function updateBidRate(address _user, int256 _priceChange)
        external
        override
    {
        // TODO only orderbook callable
        user[_user].bidRate = SafeCast.toUint256(
            int256(user[_user].bidRate).add(_priceChange)
        );
    }

    //// Rent calc helpers

    function rentOwedUser(address _user) public view returns (uint256 rentDue) {
        return
            user[_user]
                .rentalRate
                .mul(block.timestamp.sub(user[_user].lastRentCalc))
                .div(1 days);
    }

    function collectRentUser(address _user)
        public
        returns (uint256 newTimeLastCollectedOnForeclosure)
    {
        uint256 rentOwedByUser = rentOwedUser(_user);

        if (rentOwedByUser > 0 && rentOwedByUser > user[_user].deposit) {
            // The User has run out of deposit already.
            uint256 previousCollectionTime = user[_user].lastRentCalc;

            /*
            timeTheirDepsitLasted = timeSinceLastUpdate * (usersDeposit/rentOwed)
                                  = (now - previousCollectionTime) * (usersDeposit/rentOwed)
            */
            uint256 timeUsersDepositLasts =
                (block.timestamp.sub(previousCollectionTime))
                    .mul(user[_user].deposit)
                    .div(rentOwedByUser);
            /*
            Users last collection time = previousCollectionTime + timeTheirDepsitLasted
            */
            newTimeLastCollectedOnForeclosure = previousCollectionTime.add(
                timeUsersDepositLasts
            );
            user[_user].lastRentCalc = newTimeLastCollectedOnForeclosure;
            user[_user].deposit = 0;
        } else {
            // User has enough deposit to pay rent.
            user[_user].lastRentCalc = block.timestamp;
            user[_user].deposit = user[_user].deposit.sub(rentOwedByUser);
        }
    }

    function _increaseMarketBalance(IRCMarket market, uint256 rentCollected)
        internal
    {
        // JS/TODO: implement this function
    }

    // JS/TODO: Add a concept of depth (currently only 1 user deep). Only update the current user, or loop through and update many users (in the case that card forecloses)
    function _collectRentUserAndSettleCard(uint256 card)
        public
        returns (bool didTokenForeclose)
    {
        // JS/TODO: if the card has NO current owner, return early (no need to collect rent on - non-existant user)
        address cardOwner = nfthub.ownerOf(card);
        uint256 newTimeLastCollectedOnForeclosure = collectRentUser(cardOwner);

        IRCMarket market = IRCMarket(nfthub.marketTracker(card));

        didTokenForeclose = newTimeLastCollectedOnForeclosure > 0;
        if (didTokenForeclose) {
            // JS/TODO: handle case of transferring card to next eligible user in order-book
            //  if eligible newOwner exists {
            //    set time token last rent collect to 'newTimeLastCollectedOnForeclosure'
            //  else {
            //    set time token last rent collect to 'now'
            //  }
        } else {
            uint256 cardRentalRate = market.tokenPrice(card);
            uint256 cardTimeLastCollected = market.tokenPrice(card);
            uint256 rentDueForCard =
                cardRentalRate
                    .mul(block.timestamp.sub(cardTimeLastCollected))
                    .div(1 days);

            if (rentDueForCard > 0) {
                _increaseMarketBalance(market, rentDueForCard);
            }

            market.updateCard(card, cardOwner, rentDueForCard, block.timestamp);
        }
    }

    //   FALLBACK

    /// @dev sending ether/xdai direct is equal to a deposit
    receive() external payable {
        require(deposit(msgSender()));
    }
}
