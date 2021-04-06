// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "hardhat/console.sol";

/// @notice Currently not using this, was a failed attempt at improvements.
contract RCOrderbook is Ownable {

    using SafeMath for uint256;

    struct Bid { //pack this later
        address market;
        address next;
        address prev;
        uint256 token;
        uint256 price;
        uint256 timeHeldLimit;
    }
    mapping(address => Bid[]) public user;

    //index of a bid record in the user array, User|Market|Token->Index
    mapping(address => mapping (address => mapping(uint256 => uint256))) index;

    function addBidToOrderbook(address _user, address _market, uint256 _token, uint256 _price, uint256 _timeHeldLimit, address _prevUser) external {
        // check for empty bids we could clean

        // check _prevUser is the correct position

        // now add the bid
        _addBidToOrderbook(_user, _market, _token, _price, _timeHeldLimit, _prevUser);
    }
    
    function _addBidToOrderbook(address _user, address _market, uint256 _token, uint256 _price, uint256 _timeHeldLimit, address _prevUser) internal {
        if ( user[_user][index[_user][_market][_token]].price == 0 ){
            // create new record
            Bid memory _newBid;
            _newBid.market = _market;
            _newBid.prev = _prevUser;
            _newBid.next = user[_prevUser][index[_prevUser][_market][_token]].next;
            _newBid.price = _price;
            _newBid.timeHeldLimit = _timeHeldLimit;

            // insert in linked list
            address _tempNext = user[_prevUser][index[_prevUser][_market][_token]].next;
            user[_tempNext][index[_tempNext][_market][_token]].prev = _user; // next record update prev link
            user[_prevUser][index[_prevUser][_market][_token]].next = _user; // prev record update next link
            user[_user].push(_newBid);

            //update the index to help find the record later
            index[_user][_market][_token] = user[_user].length.sub(1);
        } else {
            // just update the record
            user[_user][index[_user][_market][_token]].price = _price;
            user[_user][index[_user][_market][_token]].timeHeldLimit = _timeHeldLimit;
        }
    }

    function removeBidFromOrderbook(address _user, address _market, uint256 _token) external {
        // extract from linked list
        address tempNext = user[_user][index[_user][_market][_token]].next;
        address tempPrev = user[_user][index[_user][_market][_token]].prev;
        user[tempNext][index[tempNext][_market][_token]].next = tempPrev;
        user[tempPrev][index[tempPrev][_market][_token]].prev = tempNext;

        // clear array element
        uint256 _index = index[_user][_market][_token];
        uint256 _lastRecord = user[_user].length.sub(1);
        user[_user][_index] = user[_user][_lastRecord];
        user[_user].pop();

        //update the index to help find the record later
        index[_user][_market][_token] = 0;
        index[_user][user[_user][_index].market][user[_user][_index].token] = _index;
    }

    function findNextBid(address _user, address _market, uint256 _token) external view returns(address _newUser, uint256 _newPrice){
        return (user[_user][index[_user][_market][_token]].next,user[_user][index[_user][_market][_token]].price);        
    }

    function removeUserFromOrderbook(address _user) external {
        for (uint256 i = user[_user].length; i > 0; i--){ // uh oh, unbounded loop alert
            address _tempPrev = user[_user][i].prev;
            address _tempNext = user[_user][i].next;
            user[_tempNext][index[_tempNext][user[_user][i].market][user[_user][i].token]].prev = _tempPrev;
            user[_tempPrev][index[_tempPrev][user[_user][i].market][user[_user][i].token]].prev = _tempNext;
        }
        //and get rid of them
        delete user[_user];
    }

    /// @dev this isn't strictly necessary, it's just cleaning up when a market has closed.
    function removeMarketFromUser(address _user, address _market, uint256[] calldata _tokens) external {
        for(uint256 i = 0; i < _tokens.length; i++){

        }
    }
    
}
