// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "hardhat/console.sol";

/// @notice Work in Progress... ‿︵‿︵‿︵‿ヽ(°□° )ノ︵‿︵‿︵‿︵
contract RCOrderbook is Ownable {
    using SafeMath for uint256;

    struct Bid {
        //pack this later
        address market;
        address next;
        address prev;
        uint256 token;
        uint256 price;
        uint256 timeHeldLimit;
    }
    mapping(address => Bid[]) public user;
    mapping(address => bool) public isForeclosed;

    //index of a bid record in the user array, User|Market|Token->Index
    mapping(address => mapping(address => mapping(uint256 => uint256))) index;

    uint256 public MAX_SEARCH_ITERATIONS = 100; // TODO: gas test to find actual limit
    uint256 public MAX_DELETIONS = 100;

    function addBidToOrderbook(
        address _user,
        address _market,
        uint256 _token,
        uint256 _price,
        uint256 _timeHeldLimit,
        address _prevUser
    ) external {
        // check for empty bids we could clean

        // check _prevUser is the correct position
        address _nextUser =
            user[_prevUser][index[_prevUser][_market][_token]].next;
        if (
            user[_prevUser][index[_prevUser][_market][_token]].price < _price ||
            user[_nextUser][index[_nextUser][_market][_token]].price >= _price
        ) {
            // incorrect _prevUser, have a look for the correct one
            _prevUser = _searchOrderbook(_prevUser, _market, _token, _price);
        }
        // now add the bid
        _addBidToOrderbook(
            _user,
            _market,
            _token,
            _price,
            _timeHeldLimit,
            _prevUser
        );
    }

    function _searchOrderbook(
        address _prevUser,
        address _market,
        uint256 _token,
        uint256 _price
    ) internal view returns (address) {
        uint256 i = 0;
        address _nextUser;
        do {
            _prevUser = user[_prevUser][index[_prevUser][_market][_token]].next;
            _nextUser = user[_prevUser][index[_prevUser][_market][_token]].next;
            i++;
        } while (
            user[_prevUser][index[_prevUser][_market][_token]].price < _price &&
                user[_nextUser][index[_nextUser][_market][_token]].price >=
                _price &&
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
        address _prevUser
    ) internal {
        assert(
            user[_prevUser][index[_prevUser][_market][_token]].price >= _price
        );
        address _nextUser =
            user[_prevUser][index[_prevUser][_market][_token]].next;
        assert(
            user[_nextUser][index[_nextUser][_market][_token]].price < _price
        );

        if (user[_user][index[_user][_market][_token]].price == 0) {
            // create new record
            Bid memory _newBid;
            _newBid.market = _market;
            _newBid.prev = _prevUser;
            _newBid.next = _nextUser;
            _newBid.price = _price;
            _newBid.timeHeldLimit = _timeHeldLimit;

            // insert in linked list
            address _tempNext =
                user[_prevUser][index[_prevUser][_market][_token]].next;
            user[_tempNext][index[_tempNext][_market][_token]].prev = _user; // next record update prev link
            user[_prevUser][index[_prevUser][_market][_token]].next = _user; // prev record update next link
            user[_user].push(_newBid);

            // update the index to help find the record later
            index[_user][_market][_token] = user[_user].length.sub(1);
        } else {
            // price or timeHeldLimit has changed but position in orderbook hasn't
            // .. just update whatever has changed
            user[_user][index[_user][_market][_token]].price = _price;
            user[_user][index[_user][_market][_token]]
                .timeHeldLimit = _timeHeldLimit;
        }
    }

    function updateBidInOrderbook(
        address _user,
        address _market,
        uint256 _token,
        uint256 _price,
        address _prevUser
    ) external {
        // check _prevUser is the correct position
        address _nextUser =
            user[_prevUser][index[_prevUser][_market][_token]].next;
        if (
            user[_prevUser][index[_prevUser][_market][_token]].price < _price ||
            user[_nextUser][index[_nextUser][_market][_token]].price >= _price
        ) {
            // incorrect _prevUser, have a look for the correct one
            _prevUser = _searchOrderbook(_prevUser, _market, _token, _price);
            _nextUser = user[_prevUser][index[_prevUser][_market][_token]].next;
        }
        assert(
            user[_prevUser][index[_prevUser][_market][_token]].price >= _price
        );
        assert(
            user[_nextUser][index[_nextUser][_market][_token]].price < _price
        );

        // extract bid from current position
        address _tempNext = user[_user][index[_user][_market][_token]].next;
        address _tempPrev = user[_user][index[_user][_market][_token]].prev;
        user[_tempNext][index[_tempNext][_market][_token]].next = _tempPrev;
        user[_tempPrev][index[_tempPrev][_market][_token]].prev = _tempNext;

        // update price
        user[_user][index[_user][_market][_token]].price = _price;

        // insert bid in new position
        user[_nextUser][index[_nextUser][_market][_token]].prev = _user; // next record update prev link
        user[_prevUser][index[_prevUser][_market][_token]].next = _user; // prev record update next link
    }

    function removeBidFromOrderbook(
        address _user,
        address _market,
        uint256 _token
    ) external {
        // extract from linked list
        address _tempNext = user[_user][index[_user][_market][_token]].next;
        address _tempPrev = user[_user][index[_user][_market][_token]].prev;
        user[_tempNext][index[_tempNext][_market][_token]].next = _tempPrev;
        user[_tempPrev][index[_tempPrev][_market][_token]].prev = _tempNext;

        // overwrite array element
        uint256 _index = index[_user][_market][_token];
        uint256 _lastRecord = user[_user].length.sub(1);
        user[_user][_index] = user[_user][_lastRecord];
        user[_user].pop();

        //update the index to help find the record later
        index[_user][_market][_token] = 0;
        index[_user][user[_user][_index].market][
            user[_user][_index].token
        ] = _index;
    }

    function findNextBid(
        address _user,
        address _market,
        uint256 _token
    ) external view returns (address _newUser, uint256 _newPrice) {
        return (
            user[_user][index[_user][_market][_token]].next,
            user[_user][index[_user][_market][_token]].price
        );
    }

    function removeUserFromOrderbook(address _user) external {
        uint256 i = user[_user].length.sub(1);
        uint256 _limit = 0;
        if (i > MAX_DELETIONS) {
            _limit = i.sub(MAX_DELETIONS);
        }
        do {
            address _tempPrev = user[_user][i].prev;
            address _tempNext = user[_user][i].next;
            user[_tempNext][
                index[_tempNext][user[_user][i].market][user[_user][i].token]
            ]
                .prev = _tempPrev;
            user[_tempPrev][
                index[_tempPrev][user[_user][i].market][user[_user][i].token]
            ]
                .next = _tempNext;
        } while (user[_user].length > _limit);
        if (user[_user].length == 0) {
            //and get rid of them
            delete user[_user];
            isForeclosed[_user] = false;
        }
    }

    function removeMarketFromUser(
        address _user,
        address _market,
        uint256[] calldata _tokens
    ) external {
        /// @dev loop isn't unbounded, it is limited by the max number of tokens in a market
        for (uint256 i = 0; i < _tokens.length; i++) {
            // overwrite array element
            uint256 _index = index[_user][_market][_tokens[i]];
            uint256 _lastRecord = user[_user].length.sub(1);
            user[_user][_index] = user[_user][_lastRecord];
            user[_user].pop();

            //update the index to help find the record later
            index[_user][_market][_tokens[i]] = 0;
            index[_user][user[_user][_index].market][
                user[_user][_index].token
            ] = _index;
        }
    }
}
