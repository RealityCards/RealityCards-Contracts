// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "hardhat/console.sol";
import "./lib/NativeMetaTransaction.sol";
//import "./lib/SafeMath32.sol";
//import "./lib/SafeMath64.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IAlternateReceiverBridge.sol";

/// @title Reality Cards Treasury
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCTreasury is Ownable, NativeMetaTransaction {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    //using SafeMath32 for uint32;
    //using SafeMath64 for uint64;

    // VARIABLES

    /// @dev address of the alternate Receiver Bridge for withdrawals to mainnet
    address public alternateReceiverBridgeAddress;
    /// @dev address of the Factory so only the Factory can add new markets
    address public factoryAddress;
    /// @dev so only markets can use certain functions
    mapping(address => bool) public isMarket;
    /// @dev sum of all deposits
    uint256 public totalDeposits;
    /// @dev the rental payments made in each market
    mapping(address => uint256) public marketPot;
    /// @dev sum of all market pots
    uint256 public totalMarketPots;
    /// @dev a quick check if the market is active or not
    mapping(address => bool) public isMarketActive;

    // DC new stuff
    /// @param rentalRate the daily cost of the cards the user current owns
    /// @param totalBids the sum total of all placed bids
    /// @param forclosureTime The time the user will foreclose with current ownership
    /// @param safeForclosureTime The time a user could foreclose if they gained ownership of their bids
    struct User {
        // lets pack this struct later, leaving it as uint256 for rapid development and testing
        uint256 deposit;
        uint256 rentalRate;
        uint256 totalBids;
        uint256 foreclosureTime; // we could calculate this from rentalRate
        uint256 safeForclosureTime; // we could calculate this from totalBids
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

    // GOVERNANCE VARIABLES
    /// @dev only parameters that need to be are here, the rest are in the Factory
    /// @dev minimum rental duration (1 day divisor: i.e. 24 = 1 hour, 48 = 30 mins)
    uint256 public minRentalDayDivisor;
    /// @dev max deposit balance, to minimise funds at risk
    uint256 public maxContractBalance;
    /// @dev the maximum number of bids a user is allowed
    uint256 public maxBidCountLimit;

    // SAFETY
    /// @dev if true, cannot deposit, withdraw or rent any cards across all events
    bool public globalPause;
    /// @dev if true, cannot rent any cards for specific market
    mapping(address => bool) public marketPaused;

    // UBER OWNER
    /// @dev high level owner who can change the factory address
    address public uberOwner;

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

    // ADD MARKETS

    /// @dev so only markets can move funds from deposits to marketPots and vice versa
    function addMarket(address _newMarket) external {
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
    function setAlternateReceiverAddress(address _newAddress)
        external
        onlyOwner
    {
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

    // GOVERNANCE- UBER OWNER

    // ******** DANGER ZONE ******** //
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

    // DEPOSIT & WITHDRAW FUNCTIONS

    /// @dev it is passed the user instead of using msg.sender because might be called
    /// @dev ... via contract (fallback, newRental) or dai->xdai bot
    /// @param _user the user to credit the deposit to
    function deposit(address _user)
        public
        payable
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

        // step 1: collect rent on all cards a user Owns
        for (uint256 i = 0; i < user[_msgSender].marketOwned.length; i++) {
            IRCMarket _market = IRCMarket(user[_msgSender].marketOwned[i]);
            _market.collectRentSpecificCards(
                user[_msgSender].tokens[user[_msgSender].marketOwned[i]]
                    .tokensOwned
            );
        }

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
            user[_msgSender].rentalRate.div(minRentalDayDivisor) >
            user[_msgSender].deposit
        ) {
            uint256 i = 0;
            do {
                if (isMarketActive[user[_msgSender].marketBids[i]]) {
                    IRCMarket _market =
                        IRCMarket(user[_msgSender].marketBids[i]);
                    _market.exitSpecificCards(
                        user[_msgSender].tokens[user[_msgSender].marketBids[i]]
                            .tokenBids,
                        _msgSender
                    );
                    // not incrementing i because exit cards shortens the length of the array
                } else {
                    i++;
                }
            } while (user[_msgSender].marketBids.length > i);
        }
    }

    //   MARKET CALLABLE

    // only markets can call these functions

    /// @dev a rental payment is equivalent to moving from user's deposit to market pot, called by _collectRent in the market
    function payRent(address _user, uint256 _dai)
        external
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
    ) external balancedBooks onlyMarkets returns (bool) {
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
        onlyMarkets
        returns (bool)
    {
        user[_user].lastRentalTime = block.timestamp;
        return true;
    }

    /// @dev provides the sum total of a users bids accross all markets
    /// @dev doesn't clean the bid array first as the market does that already
    function userTotalBids(address _user) external view returns (uint256) {
        return user[_user].totalBids;
    }

    /// @dev removes the given market from a users records
    function cleanUserBids(address _user, address _market) public {
        require(!isMarketActive[_market]);

        // TO:DO remove any bids or ownership records

        // move the last market in the array to the position of the one being deleted
        address lastMarket =
            user[_user].marketBids[user[_user].marketBids.length.sub(1)];
        user[_user].marketBids[
            user[_user].marketBidsIndex[_market]
        ] = lastMarket;

        // update the index of the market we just moved
        user[_user].marketBidsIndex[lastMarket] = user[_user].marketBidsIndex[
            _market
        ];

        // remove the last market and its index record
        user[_user].marketBids.pop();
        user[_user].marketBidsIndex[_market] = 0;
    }

    // update the totalBids and the bid record for an underbidder
    function updateUserBids(
        address _user,
        uint256 _price,
        uint256 _tokenId,
        bool _add // is this update an addition
    ) external onlyMarkets {
        address _market = msgSender();
        if (_add) {
            // we are adding a new bid
            user[_user].totalBids = user[_user].totalBids.add(_price);

            if (
                user[_user].marketBidsIndex[_market] == 0 &&
                user[_user].totalBids == 0
            ) {
                //this is the users first bid in this market
                user[_user].marketBidsIndex[_market] = user[_user]
                    .marketBids
                    .length; //index market
                user[_user].marketBids.push(_market); //add to array
            }
            user[_user].tokens[_market].tokenBidsIndex[_tokenId] = user[_user]
                .tokens[_market]
                .tokenBids
                .length; //index token
            user[_user].tokens[_market].tokenBids.push(_tokenId); //add to array
        } else {
            // we are removing the bid
            user[_user].totalBids = user[_user].totalBids.sub(_price);

            user[_user].tokens[_market].tokenBids[
                user[_user].tokens[_market].tokenBidsIndex[_tokenId]
            ] = user[_user].tokens[_market].tokenBids[
                user[_user].tokens[_market].tokenBids.length.sub(1)
            ];
            user[_user].tokens[_market].tokenBids.pop();
            user[_user].tokens[_market].tokenBidsIndex[_tokenId] = 0;
            if (user[_user].tokens[_market].tokenBids.length == 0) {
                user[_user].marketBids[
                    user[_user].marketBidsIndex[_market]
                ] = user[_user].marketBids[
                    user[_user].marketBids.length.sub(1)
                ];
                user[_user].marketBids.pop();
                user[_user].marketBidsIndex[_market] = 0;
            }
        }
    }

    // update the rentalRate and ownership for the owner
    function updateOwnership(
        address _oldOwner,
        address _newOwner,
        uint256 _oldPrice,
        uint256 _newPrice,
        uint256 _tokenId
    ) external onlyMarkets {
        address _market = msgSender();
        user[_newOwner].rentalRate = user[_newOwner].rentalRate.add(_newPrice);
        if (!isMarket[_newOwner]) {
            if (
                user[_newOwner].marketOwnedIndex[_market] == 0 &&
                user[_newOwner].totalBids == 0
            ) {
                //this is the users first bid in this market
                user[_newOwner].marketOwnedIndex[_market] = user[_newOwner]
                    .marketOwned
                    .length; //index market
                user[_newOwner].marketOwned.push(_market); //add to array
            }
            user[_newOwner].tokens[_market].tokensOwnedIndex[_tokenId] = user[
                _newOwner
            ]
                .tokens[_market]
                .tokensOwned
                .length; //index token
            user[_newOwner].tokens[_market].tokensOwned.push(_tokenId); //add to array
        }
        if (!isMarket[_oldOwner]) {
            console.log("old rental rate ", user[_oldOwner].rentalRate);
            console.log("old rental price ", _oldPrice);
            user[_oldOwner].rentalRate = user[_oldOwner].rentalRate.sub(
                _oldPrice
            );

            user[_oldOwner].tokens[_market].tokensOwned[
                user[_oldOwner].tokens[_market].tokensOwnedIndex[_tokenId]
            ] = user[_oldOwner].tokens[_market].tokensOwned[
                user[_oldOwner].tokens[_market].tokensOwned.length.sub(1)
            ];
            user[_oldOwner].tokens[_market].tokensOwned.pop();
            user[_oldOwner].tokens[_market].tokensOwnedIndex[_tokenId] = 0;
            if (user[_oldOwner].tokens[_market].tokenBids.length == 0) {
                user[_oldOwner].marketOwned[
                    user[_oldOwner].marketOwnedIndex[_market]
                ] = user[_oldOwner].marketOwned[
                    user[_oldOwner].marketOwned.length.sub(1)
                ];
                user[_oldOwner].marketOwned.pop();
                user[_oldOwner].marketOwnedIndex[_market] = 0;
            }
        }
    }

    // if only the price has changed for an underbider
    // TO:DO rename this and/or updateUserBids to clarify the difference
    function updateUserTotalBids(
        address _user,
        uint256 _price,
        bool _add // is this update an addition
    ) external onlyMarkets {
        if (_add) {
            user[_user].totalBids = user[_user].totalBids.add(_price);
        } else {
            user[_user].totalBids = user[_user].totalBids.sub(_price);
        }
    }

    // if only the price has changed for the owner
    function updateUserRentalRate(address _user, int256 _priceChange)
        external
        onlyMarkets
    {
        user[_user].totalBids = SafeCast.toUint256(
            int256(user[_user].totalBids).add(_priceChange)
        );
        user[_user].rentalRate = SafeCast.toUint256(
            int256(user[_user].rentalRate).add(_priceChange)
        );
    }

    /// @dev adds or removes a market to the active markets array
    function updateMarketStatus(bool _open) external onlyMarkets {
        if (_open) {
            isMarketActive[msgSender()] = true;
        } else {
            isMarketActive[msgSender()] = false;
        }
    }

    function userDeposit(address _user) external view returns (uint256) {
        return user[_user].deposit;
    }

    //   FALLBACK

    /// @dev sending ether/xdai direct is equal to a deposit
    receive() external payable {
        require(deposit(msgSender()));
    }
}
