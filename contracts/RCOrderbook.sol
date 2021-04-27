// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./lib/NativeMetaTransaction.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IRCOrderbook.sol";

/// @title Reality Cards Orderbook
/// @author Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCOrderbook is Ownable, NativeMetaTransaction, IRCOrderbook {
    struct Bid {
        //pack this later
        address market;
        address next;
        address prev;
        uint256 token;
        uint256 price;
        uint256 timeHeldLimit;
    }
    struct User {
        Bid[] bids;
        uint256 totalBidRate;
        uint256 rentalRate;
    }
    struct Market {
        uint256 mode;
        uint256 tokenCount;
        uint256 minimumPriceIncreasePercent;
        uint256 minimumRentalDuration;
    }
    mapping(address => User) public user;
    mapping(address => Market) public market;
    mapping(address => bool) public isMarket;
    mapping(address => mapping(uint256 => address)) ownerOf;

    //index of a bid record in the user array, User|Market|Token->Index
    mapping(address => mapping(address => mapping(uint256 => uint256))) index;

    uint256 public MAX_SEARCH_ITERATIONS = 100; // TODO: gas test to find actual limit
    uint256 public MAX_DELETIONS = 100;
    address public factoryAddress;
    address public treasuryAddress;
    address public uberOwner;
    IRCTreasury treasury;

    // consider renaming this, we may need onlyTreasury also
    modifier onlyMarkets {
        require(isMarket[msgSender()], "Not authorised");
        _;
    }
    modifier onlyTreasury {
        require(msgSender() == address(treasury), "Not authorised");
        _;
    }

    constructor(address _factoryAddress, address _treasuryAddress) {
        factoryAddress = _factoryAddress;
        treasuryAddress = _treasuryAddress;
        treasury = IRCTreasury(treasuryAddress);
        uberOwner = msg.sender;
    }

    function changeUberOwner(address _newUberOwner) external override {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newUberOwner != address(0));
        uberOwner = _newUberOwner;
    }

    function setFactoryAddress(address _newFactory) external override {
        require(msgSender() == uberOwner, "Extremely Verboten");
        require(_newFactory != address(0));
        factoryAddress = _newFactory;
    }

    function addMarket(
        address _market,
        uint256 _tokenCount,
        uint256 _minIncrease
    ) external override {
        require(msgSender() == factoryAddress);
        isMarket[_market] = true;
        market[_market].tokenCount = _tokenCount;
        market[_market].minimumPriceIncreasePercent = _minIncrease;
        market[_market].minimumRentalDuration =
            1 days /
            treasury.minRentalDayDivisor();
        for (uint256 i; i < _tokenCount; i++) {
            // create new record
            Bid memory _newBid;
            _newBid.market = _market;
            _newBid.token = i;
            _newBid.prev = _market;
            _newBid.next = _market;
            _newBid.price = 0;
            _newBid.timeHeldLimit = type(uint256).max;
            user[_market].bids.push(_newBid);
            // TODO market record index == tokenId
            index[_market][_market][i] = user[_market].bids.length - (1);
        }
    }

    /// @dev adds or updates a bid in the orderbook
    function addBidToOrderbook(
        address _user,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        address _prevUserAddress
    ) external override onlyMarkets {
        // TODO check for empty bids we could clean

        address _market = msgSender();
        if (_prevUserAddress == address(0)) {
            _prevUserAddress = _market;
        } else {
            require(
                user[_prevUserAddress].bids[
                    index[_prevUserAddress][_market][_token]
                ]
                    .price >= _price,
                "Location too low"
            );
        }
        Bid storage _prevUser =
            user[_prevUserAddress].bids[
                index[_prevUserAddress][_market][_token]
            ];

        if (bidExists(_user, _market, _token)) {
            // old bid exists, update it
            _updateBidInOrderbook(
                _user,
                _market,
                _token,
                _price,
                _timeHeldLimit,
                _prevUser
            );
        } else {
            // new bid, add it
            _newBidInOrderbook(
                _user,
                _market,
                _token,
                _price,
                _timeHeldLimit,
                _prevUser
            );
        }
    }

    /// @dev finds the correct location in the orderbook for a given bid
    /// @dev returns an adjusted (lowered) bid price if necessary.
    function _searchOrderbook(
        Bid storage _prevUser,
        address _market,
        uint256 _token,
        uint256 _price
    ) internal view returns (Bid storage, uint256) {
        uint256 _minIncrease = market[_market].minimumPriceIncreasePercent;
        Bid storage _nextUser =
            user[_prevUser.next].bids[index[_prevUser.next][_market][_token]];
        uint256 _requiredPrice =
            (_nextUser.price * (_minIncrease + (100))) / (100);

        uint256 i = 0;
        while (
            // break loop if match price above AND above price below (so if either is false, continue, hence OR )
            // if match previous then must be greater than next to continue
            (_price != _prevUser.price || _price <= _nextUser.price) &&
            // break loop if price x% above below
            _price < _requiredPrice &&
            // break loop if hits max iterations
            i < MAX_SEARCH_ITERATIONS
        ) {
            _prevUser = _nextUser;
            _nextUser = user[_prevUser.next].bids[
                index[_prevUser.next][_market][_token]
            ];
            _requiredPrice = (_nextUser.price * (_minIncrease + (100))) / (100);
            i++;
        }
        require(i < MAX_SEARCH_ITERATIONS, "Position in orderbook not found");

        // if previous price is zero it must be the market and this is a new owner
        // .. then don't reduce their price, we already checked they are 10% higher
        // .. than the previous owner.
        if (_prevUser.price != 0 && _prevUser.price < _price) {
            _price = _prevUser.price;
        }
        return (_prevUser, _price);
    }

    /// @dev add a new bid to the orderbook
    function _newBidInOrderbook(
        address _user,
        address _market,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        Bid storage _prevUser
    ) internal {
        if (ownerOf[_market][_token] != _market) {
            (_prevUser, _price) = _searchOrderbook(
                _prevUser,
                _market,
                _token,
                _price
            );
        }

        Bid storage _nextUser =
            user[_prevUser.next].bids[index[_prevUser.next][_market][_token]];

        // create new record
        Bid memory _newBid;
        _newBid.market = _market;
        _newBid.token = _token;
        _newBid.prev = _nextUser.prev;
        _newBid.next = _prevUser.next;
        _newBid.price = _price;
        _newBid.timeHeldLimit = _timeHeldLimit;

        // insert in linked list
        _nextUser.prev = _user; // next record update prev link
        _prevUser.next = _user; // prev record update next link
        user[_user].bids.push(_newBid);

        // update the index to help find the record later
        index[_user][_market][_token] = user[_user].bids.length - (1);

        // update memo value
        treasury.increaseBidRate(_user, _price);
        if (user[_user].bids[index[_user][_market][_token]].prev == _market) {
            address _oldOwner =
                user[_user].bids[index[_user][_market][_token]].next;
            transferCard(_market, _token, _oldOwner, _user, _price);
            treasury.updateRentalRate(
                _oldOwner,
                _user,
                user[_oldOwner].bids[index[_oldOwner][_market][_token]].price,
                _price,
                block.timestamp
            );
        }
    }

    /// @dev updates a bid that is already in the orderbook
    function _updateBidInOrderbook(
        address _user,
        address _market,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        Bid storage _prevUser
    ) internal {
        // TODO no need to unlink and relink if bid doesn't change position in orderbook
        // unlink current bid
        Bid storage _currUser = user[_user].bids[index[_user][_market][_token]];
        user[_currUser.next].bids[index[_currUser.next][_market][_token]]
            .prev = _currUser.prev;
        user[_currUser.prev].bids[index[_currUser.prev][_market][_token]]
            .next = _currUser.next;
        bool _owner = _currUser.prev == _market;

        // find new position
        (_prevUser, _price) = _searchOrderbook(
            _prevUser,
            _market,
            _token,
            _price
        );
        Bid storage _nextUser =
            user[_prevUser.next].bids[index[_prevUser.next][_market][_token]];

        // update price, save old price for rental rate adjustment later
        (_currUser.price, _price) = (_price, _currUser.price);
        _currUser.timeHeldLimit = _timeHeldLimit;

        // relink bid
        _currUser.next = _prevUser.next;
        _currUser.prev = _nextUser.prev;
        _nextUser.prev = _user; // next record update prev link
        _prevUser.next = _user; // prev record update next link

        // update memo values
        treasury.increaseBidRate(_user, _currUser.price);
        treasury.decreaseBidRate(_user, _price);
        if (_owner && _currUser.prev == _market) {
            // if owner before and after, update the price difference
            transferCard(_market, _token, _user, _user, _currUser.price);
            treasury.updateRentalRate(
                _user,
                _user,
                _price,
                _currUser.price,
                block.timestamp
            );
        } else if (_owner && _currUser.prev != _market) {
            // if owner before and not after, remove the old price
            address _newOwner =
                user[_market].bids[index[_market][_market][_token]].next;
            uint256 _newPrice =
                user[_newOwner].bids[index[_newOwner][_market][_token]].price;
            treasury.updateRentalRate(
                _user,
                _newOwner,
                _price,
                _newPrice,
                block.timestamp
            );
            transferCard(_market, _token, _user, _newOwner, _newPrice);
        } else if (!_owner && _currUser.prev == _market) {
            // if not owner before but is owner after, add new price
            address _oldOwner = _currUser.next;
            uint256 _oldPrice =
                user[_oldOwner].bids[index[_oldOwner][_market][_token]].price;
            treasury.updateRentalRate(
                _oldOwner,
                _user,
                _oldPrice,
                _currUser.price,
                block.timestamp
            );
            transferCard(_market, _token, _oldOwner, _user, _currUser.price);
        }
    }

    /// @dev removes a single bid from the orderbook
    function removeBidFromOrderbook(address _user, uint256 _token)
        public
        override
        onlyMarkets
    {
        address _market = msgSender();
        // update rates
        Bid storage _currUser = user[_user].bids[index[_user][_market][_token]];
        treasury.decreaseBidRate(_user, _currUser.price);
        if (_currUser.prev == _market) {
            // user is owner, deal with it
            uint256 _price =
                user[_currUser.next].bids[
                    index[_currUser.next][_market][_token]
                ]
                    .price;
            transferCard(_market, _token, _user, _currUser.next, _price);
            treasury.updateRentalRate(
                _user,
                _currUser.next,
                _currUser.price,
                _price,
                block.timestamp
            );
        }
        // extract from linked list
        address _tempNext = _currUser.next;
        address _tempPrev = _currUser.prev;
        user[_tempNext].bids[index[_tempNext][_market][_token]]
            .prev = _tempPrev;
        user[_tempPrev].bids[index[_tempPrev][_market][_token]]
            .next = _tempNext;

        // overwrite array element
        uint256 _index = index[_user][_market][_token];
        uint256 _lastRecord = user[_user].bids.length - (1);
        // no point overwriting itself
        if (_index != _lastRecord) {
            user[_user].bids[_index] = user[_user].bids[_lastRecord];
        }
        user[_user].bids.pop();

        // update the index to help find the record later
        index[_user][_market][_token] = 0;
        if (user[_user].bids.length != 0 && _index != _lastRecord) {
            index[_user][user[_user].bids[_index].market][
                user[_user].bids[_index].token
            ] = _index;
        }
    }

    /// @dev to assist troubleshooting during testing
    function printOrderbook(address _market, uint256 _token) public view {
        Bid storage _currUser =
            user[_market].bids[index[_market][_market][_token]];
        console.log(" start of orderbook ");
        do {
            console.log(_currUser.next);
            _currUser = user[_currUser.next].bids[
                index[_currUser.next][_market][_token]
            ];
        } while (_currUser.next != _market);
        console.log(" end of orderbook ");
    }

    /// @dev to assist troubleshooting during testing
    function printUserBids(address _user) public view {
        console.log("printing bids for ", _user);
        uint256 i;
        do {
            console.log(" bid 0 ", user[_user].bids[i].token);
            i++;
        } while (i < user[_user].bids.length);
        console.log(" done printing bids ");
    }

    /// @dev find the next valid owner of a given card
    function findNewOwner(uint256 _token, uint256 _timeOwnershipChanged)
        external
        override
        onlyMarkets
        returns (address _newOwner)
    {
        address _market = msgSender();
        // the market is the head of the list, the next bid is therefore the owner
        Bid storage _head = user[_market].bids[index[_market][_market][_token]];
        address _oldOwner = _head.next;
        uint256 _oldPrice =
            user[_oldOwner].bids[index[_oldOwner][_market][_token]].price;
        uint256 minimumTimeToOwnTo =
            block.timestamp + market[_market].minimumRentalDuration;
        uint256 _newPrice;
        // delete current owner
        do {
            _newPrice = _removeBidFromOrderbookIgnoreOwner(_head.next, _token);
            // delete next bid if foreclosed
        } while (
            treasury.foreclosureTimeUser(_head.next, _newPrice) <
                minimumTimeToOwnTo
        );

        _newOwner = user[_market].bids[index[_market][_market][_token]].next;
        treasury.updateRentalRate(
            _oldOwner,
            _newOwner,
            _oldPrice,
            _newPrice,
            _timeOwnershipChanged
        );
        transferCard(_market, _token, _oldOwner, _newOwner, _newPrice);
    }

    /// @dev removes a single bid from the orderbook, doesn't update ownership
    function _removeBidFromOrderbookIgnoreOwner(address _user, uint256 _token)
        internal
        returns (uint256 _newPrice)
    {
        address _market = msgSender();
        // update rates
        Bid storage _currUser = user[_user].bids[index[_user][_market][_token]];
        treasury.decreaseBidRate(_user, _currUser.price);

        // extract from linked list
        address _tempNext = _currUser.next;
        address _tempPrev = _currUser.prev;
        user[_tempNext].bids[index[_tempNext][_market][_token]]
            .prev = _tempPrev;
        user[_tempPrev].bids[index[_tempPrev][_market][_token]]
            .next = _tempNext;

        // return next users price to check they're eligable later
        _newPrice = user[_tempNext].bids[index[_tempNext][_market][_token]]
            .price;

        // overwrite array element
        uint256 _index = index[_user][_market][_token];
        uint256 _lastRecord = user[_user].bids.length - 1;
        // no point overwriting itself
        if (_index != _lastRecord) {
            user[_user].bids[_index] = user[_user].bids[_lastRecord];
        }
        user[_user].bids.pop();

        // update the index to help find the record later
        index[_user][_market][_token] = 0;
        if (user[_user].bids.length != 0 && _index != _lastRecord) {
            index[_user][user[_user].bids[_index].market][
                user[_user].bids[_index].token
            ] = _index;
        }
    }

    /// @dev currently not used anywhere
    function findNextBid(
        address _user,
        address _market,
        uint256 _token
    ) external view override returns (address _newUser, uint256 _newPrice) {
        Bid storage _currUser = user[_user].bids[index[_user][_market][_token]];
        Bid storage _nextUser =
            user[_currUser.next].bids[index[_currUser.next][_market][_token]];
        // TODO check bid is valid before returing it

        return (_nextUser.next, _nextUser.price);
    }

    function getBidValue(address _user, uint256 _token)
        external
        view
        override
        returns (uint256)
    {
        address _market = msgSender();
        if (bidExists(_user, _market, _token)) {
            return user[_user].bids[index[_user][_market][_token]].price;
        } else {
            return 0;
        }
    }

    /// @dev just to pass old tests, not needed otherwise
    function getBid(
        address _market,
        address _user,
        uint256 _token
    ) external view returns (Bid memory) {
        if (bidExists(_user, _market, _token)) {
            Bid memory _bid = user[_user].bids[index[_user][_market][_token]];
            return _bid;
        } else {
            Bid memory _newBid;
            _newBid.market = address(0);
            _newBid.token = _token;
            _newBid.prev = address(0);
            _newBid.next = address(0);
            _newBid.price = 0;
            _newBid.timeHeldLimit = 0;
            return _newBid;
        }
    }

    function getTimeHeldlimit(address _user, uint256 _token)
        external
        view
        override
        onlyMarkets
        returns (uint256)
    {
        return
            user[_user].bids[index[_user][msgSender()][_token]].timeHeldLimit;
    }

    function setTimeHeldlimit(
        address _user,
        uint256 _token,
        uint256 _timeHeldLimit
    ) external override onlyMarkets {
        user[_user].bids[index[_user][msgSender()][_token]]
            .timeHeldLimit = _timeHeldLimit;
    }

    /// @dev temporary function to use current tests, shouldn't be required
    /// @dev with new collect rent per user model.
    function collectRentOwnedCards(address _user) external override {
        address _market;
        uint256[] memory _token = new uint256[](1);
        for (uint256 i; i < user[_user].bids.length; i++) {
            _market = user[_user].bids[i].market;
            _token[0] = user[_user].bids[i].token;
            if (ownerOf[_market][_token[0]] == _user) {
                IRCMarket _rcmarket = IRCMarket(_market);
                _rcmarket.collectRentSpecificCards(_token);
            }
        }
    }

    function bidExists(
        address _user,
        address _market,
        uint256 _token
    ) public view override returns (bool) {
        if (user[_user].bids.length != 0) {
            //some bids exist
            if (index[_user][_market][_token] != 0) {
                // this bid exists
                return true;
            } else {
                // check bid isn't index 0
                if (
                    user[_user].bids[0].market == _market &&
                    user[_user].bids[0].token == _token
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    function removeUserFromOrderbook(address _user)
        external
        override
        onlyTreasury
    {
        uint256 i = user[_user].bids.length;
        uint256 _limit = 0;
        if (i > MAX_DELETIONS) {
            _limit = i - MAX_DELETIONS;
        }
        address _market = user[_user].bids[i - 1].market;
        uint256 _token = user[_user].bids[i - 1].token;

        do {
            i--;
            index[user[_user].bids[i].market][_user][
                user[_user].bids[i].token
            ] = 0;
            address _tempPrev = user[_user].bids[i].prev;
            address _tempNext = user[_user].bids[i].next;

            /// @dev ideally this isn't needed once we update the rent collection and the tests to cope
            if (_tempPrev == user[_user].bids[i].market) {
                _market = user[_user].bids[i].market;
                _token = user[_user].bids[i].token;
                uint256 _price =
                    user[_tempNext].bids[index[_tempNext][_market][_token]]
                        .price;
                treasury.updateRentalRate(
                    _user,
                    _tempNext,
                    user[_user].bids[i].price,
                    _price,
                    block.timestamp
                );
                transferCard(_market, _token, _user, _tempNext, _price);
            }

            treasury.decreaseBidRate(_user, user[_user].bids[i].price);

            user[_tempNext].bids[
                index[_tempNext][user[_user].bids[i].market][
                    user[_user].bids[i].token
                ]
            ]
                .prev = _tempPrev;
            user[_tempPrev].bids[
                index[_tempPrev][user[_user].bids[i].market][
                    user[_user].bids[i].token
                ]
            ]
                .next = _tempNext;
            user[_user].bids.pop();
        } while (user[_user].bids.length > _limit);

        //TODO reset users rental rates etc
        if (user[_user].bids.length == 0) {
            //and get rid of them
            // delete user[_user];
        }
    }

    // just reduce rental rates for owners for now
    function closeMarket() external override onlyMarkets {
        address _market = msg.sender;

        for (uint256 i = 0; i < market[_market].tokenCount; i++) {
            // reduce owners rental rate
            address _owner =
                user[_market].bids[index[_market][_market][i]].next;
            uint256 _price = user[_owner].bids[index[_owner][_market][i]].price;
            treasury.updateRentalRate(
                _owner,
                _market,
                _price,
                0,
                block.timestamp
            );

            // store first and last bids for later
            address _firstBid = _owner;
            address _lastBid =
                user[_market].bids[index[_market][_market][i]].prev;

            // detach market from rest of list
            user[_market].bids[index[_market][_market][i]].prev = _market;
            user[_market].bids[index[_market][_market][i]].next = _market;
            user[_firstBid].bids[index[_market][_firstBid][i]].prev = address(
                this
            );
            user[_lastBid].bids[index[_market][_lastBid][i]].next = address(
                this
            );

            // insert bids in the waste pile
            Bid memory _newBid;
            _newBid.market = _market;
            _newBid.token = i;
            _newBid.prev = _lastBid;
            _newBid.next = _firstBid;
            _newBid.price = 0;
            _newBid.timeHeldLimit = 0;
            user[address(this)].bids.push(_newBid);
        }
    }

    /// @dev this destroys the linked list, only use after market completion
    function removeMarketFromUser(
        address _user,
        address _market,
        uint256[] calldata _tokens
    ) external override onlyMarkets {
        /// @dev loop isn't unbounded, it is limited by the max number of tokens in a market
        for (uint256 i = 0; i < _tokens.length; i++) {
            // reduce bidRate, if owner then reduce rentalRate
            uint256 _price =
                user[_user].bids[index[_user][_market][_tokens[i]]].price;
            // if (
            //     user[_user].bids[index[_user][_market][_tokens[i]]].prev ==
            //     _market
            // ) {
            //     treasury.updateRentalRate(
            //         _user,
            //         _market,
            //         _price,
            //         0,
            //         block.timestamp
            //     );
            // }

            treasury.decreaseBidRate(_user, _price);

            // overwrite array element
            uint256 _index = index[_user][_market][_tokens[i]];
            uint256 _lastRecord = user[_user].bids.length - (1);
            user[_user].bids[_index] = user[_user].bids[_lastRecord];
            user[_user].bids.pop();

            //update the index to help find the record later
            index[_user][_market][_tokens[i]] = 0;
            index[_user][user[_user].bids[_index].market][
                user[_user].bids[_index].token
            ] = _index;
        }
    }

    function transferCard(
        address _market,
        uint256 _token,
        address _oldOwner,
        address _newOwner,
        uint256 _price
    ) internal {
        // console.log("old owner ", _oldOwner);
        // console.log(" token ", _token);
        // console.log("new owner ", _newOwner);
        ownerOf[_market][_token] = _newOwner;
        IRCMarket _rcmarket = IRCMarket(_market);
        _rcmarket.transferCard(_oldOwner, _newOwner, _token, _price);
    }
}
