// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;
pragma abicoder v2; // only needed for getBid(), remove once tests updated

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "hardhat/console.sol";
import "./lib/NativeMetaTransaction.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IRCOrderbook.sol";

/// @title Reality Cards Orderbook
/// @author Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCOrderbook is Ownable, NativeMetaTransaction, IRCOrderbook {
    using SafeMath for uint256;
    using SignedSafeMath for int256;

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
        uint256 minimumPriceIncreasePercent;
    }
    mapping(address => User) public user;
    mapping(address => Market) public market;
    mapping(address => uint256) public override foreclosureTime;
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
        market[_market].minimumPriceIncreasePercent = _minIncrease;
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
            index[_market][_market][i] = user[_market].bids.length.sub(1);
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
            (_nextUser.price.mul(_minIncrease.add(100))).div(100);

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
            _requiredPrice = (_nextUser.price.mul(_minIncrease.add(100))).div(
                100
            );
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
            // console.log("new bid, market isn't owner ");
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
        index[_user][_market][_token] = user[_user].bids.length.sub(1);

        // update memo value
        treasury.updateBidRate(_user, int256(_price));
        if (user[_user].bids[index[_user][_market][_token]].prev == _market) {
            address _oldOwner =
                user[_user].bids[index[_user][_market][_token]].next;
            transferCard(_market, _token, _oldOwner, _user, _price);
            treasury.updateRentalRate(
                _oldOwner,
                _user,
                user[_oldOwner].bids[index[_oldOwner][_market][_token]].price,
                _price
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
        int256 _priceChange = int256(_currUser.price).sub(int256(_price));
        treasury.updateBidRate(_user, _priceChange);
        if (_owner && _currUser.prev == _market) {
            // if owner before and after, update the price difference
            transferCard(_market, _token, _user, _user, _currUser.price);
            treasury.updateRentalRate(_user, _user, _price, _currUser.price);
        } else if (_owner && _currUser.prev != _market) {
            // if owner before and not after, remove the old price
            address _newOwner =
                user[_market].bids[index[_market][_market][_token]].next;
            uint256 _newPrice =
                user[_newOwner].bids[index[_newOwner][_market][_token]].price;
            treasury.updateRentalRate(_user, _newOwner, _price, _newPrice);
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
                _currUser.price
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
        if (bidExists(_user, _market, _token)) {
            // update rates
            Bid storage _currUser =
                user[_user].bids[index[_user][_market][_token]];
            int256 _priceChange = int256(0).sub(int256(_currUser.price));
            treasury.updateBidRate(_user, _priceChange);
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
                    _price
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
            uint256 _lastRecord = user[_user].bids.length.sub(1);
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
    function findNewOwner(uint256 _token)
        external
        override
        onlyMarkets
        returns (address _newOwner)
    {
        address _market = msgSender();
        // the market is the head of the list, the next bid is therefore the owner
        Bid storage _head = user[_market].bids[index[_market][_market][_token]];
        // delete current owner
        do {
            // TODO create a lighter weight version and only deal with ownership when new owner is settled on
            removeBidFromOrderbook(_head.next, _token);
            // delete next bid if foreclosed
        } while (foreclosureTime[_head.next] != 0);
        // TODO make sure user has minimum rental left
        _newOwner = user[_market].bids[index[_market][_market][_token]].next;
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
        address _market = msgSender();
        if (bidExists(_user, _market, _token)) {
            return
                user[_user].bids[index[_user][_market][_token]].timeHeldLimit;
        } else {
            // TODO look into collectRentAllCards failing here on orderbook tests
            //revert("Bid doesn't exist");
            return 0;
        }
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
                // console.log("collecting rent on ", _token[0]);
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
        foreclosureTime[_user] = block.timestamp;
        uint256 i = user[_user].bids.length.sub(1);
        uint256 _limit = 0;
        if (i > MAX_DELETIONS) {
            _limit = i.sub(MAX_DELETIONS);
        }
        address _market = user[_user].bids[0].market;
        uint256 _token = user[_user].bids[0].token;

        do {
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
                    _price
                );
                transferCard(_market, _token, _user, _tempNext, _price);
            }

            int256 _priceChange =
                int256(0).sub(int256(user[_user].bids[i].price));
            treasury.updateBidRate(_user, _priceChange);

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
            i--;
            // TODO finish implementing max iteration limit
        } while (user[_user].bids.length != 0);

        //TODO reset users rental rates etc
        if (user[_user].bids.length == 0) {
            //and get rid of them

            // delete user[_user];
            foreclosureTime[_user] = 0;
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
            if (
                user[_user].bids[index[_user][_market][_tokens[i]]].prev ==
                _market
            ) {
                treasury.updateRentalRate(_user, _market, _price, 0);
            }

            int256 _priceChange = int256(0).sub(int256(_price));
            treasury.updateBidRate(_user, _priceChange);

            // overwrite array element
            uint256 _index = index[_user][_market][_tokens[i]];
            uint256 _lastRecord = user[_user].bids.length.sub(1);
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
