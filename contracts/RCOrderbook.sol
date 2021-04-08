// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "hardhat/console.sol";
import "./lib/NativeMetaTransaction.sol";
import "./interfaces/IRCTreasury.sol";

/// @notice Work in Progress... ‿︵‿︵‿︵‿ヽ(°□° )ノ︵‿︵‿︵‿︵
contract RCOrderbook is Ownable, NativeMetaTransaction {
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
    mapping(address => User) public user;
    mapping(address => bool) public isForeclosed;
    mapping(address => bool) public isMarket;

    //index of a bid record in the user array, User|Market|Token->Index
    mapping(address => mapping(address => mapping(uint256 => uint256))) index;

    uint256 public MAX_SEARCH_ITERATIONS = 100; // TODO: gas test to find actual limit
    uint256 public MAX_DELETIONS = 100;

    // consider renaming this, we may need onlyTreasury also
    modifier onlyMarkets {
        require(isMarket[msgSender()], "Not authorised");
        _;
    }

    /// @dev adds or updates a bid in the orderbook
    function addBidToOrderbook(
        address _user,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        address _prevUserAddress
    ) external onlyMarkets {
        address _market = msgSender();
        // check for empty bids we could clean

        // check _prevUser is the correct position
        Bid storage _prevUser =
            user[_prevUserAddress].bids[
                index[_prevUserAddress][_market][_token]
            ];
        Bid storage _nextUser =
            user[_prevUser.next].bids[index[_prevUser.next][_market][_token]];
        if (_prevUser.price < _price || _nextUser.price >= _price) {
            // incorrect _prevUser, have a look for the correct one
            _prevUser = _searchOrderbook(_prevUser, _market, _token, _price);
        }
        if (
            user[_user].bids.length == 0 ||
            index[_user][_market][_token] != 0 ||
            (user[_user].bids[0].market != _market &&
                user[_user].bids[0].token != _token)
        ) {
            // new bid, add it
            _addBidToOrderbook(
                _user,
                _market,
                _token,
                _price,
                _timeHeldLimit,
                _prevUser
            );
        } else {
            // old bid exists, update it
            _updateBidInOrderbook(
                _user,
                _market,
                _token,
                _price,
                _timeHeldLimit,
                _prevUser
            );
        }
    }

    function _searchOrderbook(
        Bid storage _prevUser,
        address _market,
        uint256 _token,
        uint256 _price
    ) internal view returns (Bid storage) {
        uint256 i = 0;
        Bid storage _nextUser;
        do {
            _prevUser = user[_prevUser.next].bids[
                index[_prevUser.next][_market][_token]
            ];
            _nextUser = user[_prevUser.next].bids[
                index[_prevUser.next][_market][_token]
            ];
            i++;
        } while (
            _prevUser.price < _price &&
                _nextUser.price >= _price &&
                i <= MAX_SEARCH_ITERATIONS
        );
        require(i < MAX_SEARCH_ITERATIONS, "Position in orderbook not found");
        return _prevUser;
    }

    function _addBidToOrderbook(
        address _user,
        address _market,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        Bid storage _prevUser
    ) internal {
        assert(_prevUser.price >= _price);
        Bid storage _nextUser =
            user[_prevUser.next].bids[index[_prevUser.next][_market][_token]];
        assert(_nextUser.price < _price);

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

        user[_user].totalBidRate = user[_user].totalBidRate.add(_price);
        if (user[_user].bids[index[_user][_market][_token]].prev == _market) {
            user[_user].rentalRate = user[_user].rentalRate.add(_price);
        }
    }

    function _updateBidInOrderbook(
        address _user,
        address _market,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        Bid storage _prevUser
    ) internal returns (int256 _priceChange) {
        assert(_prevUser.price >= _price);
        Bid storage _nextUser =
            user[_prevUser.next].bids[index[_prevUser.next][_market][_token]];
        assert(_nextUser.price < _price);
        Bid storage _currUser = user[_user].bids[index[_user][_market][_token]];
        bool _owner = _currUser.prev == _market;

        // extract bid from current position
        user[_currUser.next].bids[index[_currUser.next][_market][_token]]
            .next = _currUser.prev;
        user[_currUser.prev].bids[index[_currUser.prev][_market][_token]]
            .prev = _currUser.next;

        // update price
        _currUser.price = _price;
        _currUser.timeHeldLimit = _timeHeldLimit;

        // insert bid in new position
        _nextUser.prev = _user; // next record update prev link
        _prevUser.next = _user; // prev record update next link

        user[_user].totalBidRate = SafeCast.toUint256(
            int256(user[_user].totalBidRate).add(_priceChange)
        );
        if (_owner && _currUser.prev == _market) {
            // if owner before and after, update the price difference
            user[_user].rentalRate = SafeCast.toUint256(
                int256(user[_user].rentalRate).add(_priceChange)
            );
        } else if (_owner && _currUser.prev != _market) {
            // if owner before and not after, remove the old price and the difference
            _price = _price.add(SafeCast.toUint256(_priceChange.mul(-1)));
            user[_user].rentalRate = user[_user].rentalRate.sub(_price);
        } else if (!_owner && _currUser.prev == _market) {
            // if not owner before but is owner after, add price and difference
            _price = _price.add(SafeCast.toUint256(_priceChange.mul(-1)));
            user[_user].rentalRate = user[_user].rentalRate.add(_price);
        }
    }

    /// @dev removes a bid from the orderbook
    function removeBidFromOrderbook(address _user, uint256 _token)
        external
        onlyMarkets
    {
        address _market = msgSender();
        // update rates
        Bid storage _currUser = user[_user].bids[index[_user][_market][_token]];
        user[_user].totalBidRate = user[_user].totalBidRate.sub(
            _currUser.price
        );
        if (_currUser.prev == _market) {
            // user is owner, deal with it
        }

        // extract from linked list
        address _tempNext =
            user[_user].bids[index[_user][_market][_token]].next;
        address _tempPrev =
            user[_user].bids[index[_user][_market][_token]].prev;
        user[_tempNext].bids[index[_tempNext][_market][_token]]
            .next = _tempPrev;
        user[_tempPrev].bids[index[_tempPrev][_market][_token]]
            .prev = _tempNext;

        // overwrite array element
        uint256 _index = index[_user][_market][_token];
        uint256 _lastRecord = user[_user].bids.length.sub(1);
        user[_user].bids[_index] = user[_user].bids[_lastRecord];
        user[_user].bids.pop();

        // update the index to help find the record later
        index[_user][_market][_token] = 0;
        index[_user][user[_user].bids[_index].market][
            user[_user].bids[_index].token
        ] = _index;
    }

    function findNextBid(
        address _user,
        address _market,
        uint256 _token
    ) external view returns (address _newUser, uint256 _newPrice) {
        return (
            user[_user].bids[index[_user][_market][_token]].next,
            user[_user].bids[index[_user][_market][_token]].price
        );
    }

    function getBidValue(address _user, uint256 _token)
        external
        view
        returns (uint256)
    {
        address _market = msgSender();
        if (bidExists(_user, _market, _token)) {
            return user[_user].bids[index[_user][_market][_token]].price;
        } else {
            return 0;
        }
    }

    /// @notice returns the bid rate minus the given token
    function adjustedBidRate(address _user, uint256 _token)
        external
        view
        returns (uint256)
    {
        address _market = msgSender();
        if (bidExists(_user, _market, _token)) {
            return
                user[_user].totalBidRate.sub(
                    user[_user].bids[index[_user][_market][_token]].price
                );
        } else {
            return user[_user].totalBidRate;
        }
    }

    function bidExists(
        address _user,
        address _market,
        uint256 _token
    ) internal view returns (bool) {
        if (
            user[_user].bids.length == 0 ||
            index[_user][_market][_token] != 0 ||
            (user[_user].bids[0].market != _market &&
                user[_user].bids[0].token != _token)
        ) {
            return true;
        } else {
            return false;
        }
    }

    function removeUserFromOrderbook(address _user) external onlyMarkets {
        isForeclosed[_user] = true;
        uint256 i = user[_user].bids.length.sub(1);
        uint256 _limit = 0;
        if (i > MAX_DELETIONS) {
            _limit = i.sub(MAX_DELETIONS);
        }
        do {
            address _tempPrev = user[_user].bids[i].prev;
            address _tempNext = user[_user].bids[i].next;
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
        } while (user[_user].bids.length > _limit);
        if (user[_user].bids.length == 0) {
            //and get rid of them
            delete user[_user];
            isForeclosed[_user] = false;
        }
    }

    /// @dev this destroys the linked list, only use after market completion
    function removeMarketFromUser(
        address _user,
        address _market,
        uint256[] calldata _tokens
    ) external onlyMarkets {
        /// @dev loop isn't unbounded, it is limited by the max number of tokens in a market
        for (uint256 i = 0; i < _tokens.length; i++) {
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
}
