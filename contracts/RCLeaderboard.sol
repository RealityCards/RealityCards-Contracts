// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "hardhat/console.sol";
import "./interfaces/IRealitio.sol";
import "./interfaces/IRCFactory.sol";
import "./interfaces/IRCLeaderboard.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "./lib/NativeMetaTransaction.sol";

/// @title Reality Cards Market
/// @author Andrew Stanger & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCLeaderboard is NativeMetaTransaction, IRCLeaderboard {
    /*╔═════════════════════════════════╗
      ║            VARIABLES            ║
      ╚═════════════════════════════════╝*/

    IRCTreasury public override treasury;
    bytes32 public constant MARKET = keccak256("MARKET");

    // Leaderboard tracking
    struct Leaderboard {
        address next;
        address prev;
        uint256 card;
    }
    mapping(address => Leaderboard[]) public leaderboard;
    mapping(address => mapping(uint256 => uint256)) leaderboardIndex;
    mapping(uint256 => uint256) public leaderboardLength;
    uint256 public NFTsToAward;

    mapping(uint256 => mapping(address => uint256)) public timeHeld;

    /*╔═════════════════════════════════╗
      ║         CONSTRUCTOR             ║
      ╚═════════════════════════════════╝*/

    constructor(IRCTreasury _treasury) {
        treasury = _treasury;
    }

    modifier onlyMarkets {
        require(
            treasury.checkPermission(MARKET, msgSender()),
            "Not authorised"
        );
        _;
    }

    /*╔═════════════════════════════════╗
      ║      Leaderboard Tracking       ║
      ╚═════════════════════════════════╝*/

    /// @dev given a user and a card will determine if they need to be added
    /// @dev .. to the leaderboard and then call the appropriate functions.
    function updateLeaderboard(address _user, uint256 _card)
        external
        override
        onlyMarkets
    {
        if (leaderboardLength[_card] < NFTsToAward) {
            // leaderboard isn't full, just add them
            addToLeaderboard(_user, _card);
        } else {
            address lastUserOnLeaderboard = leaderboard[address(this)][_card]
            .prev;
            uint256 minimumTimeOnLeaderboard = timeHeld[_card][
                lastUserOnLeaderboard
            ];
            if (timeHeld[_card][_user] > minimumTimeOnLeaderboard) {
                // user deserves to be on leaderboard
                if (userIsOnLeaderboard(_user, _card)) {
                    // user is already on the leaderboard, remove them first
                    removeFromLeaderboard(_user, _card);
                } else {
                    // bump the last user off the leaderboard to make space
                    removeFromLeaderboard(lastUserOnLeaderboard, _card);
                }
                // now add them in the correct position
                addToLeaderboard(_user, _card);
            }
        }
    }

    /// @dev add a user to the leaderboard
    function addToLeaderboard(address _user, uint256 _card) internal {
        Leaderboard memory _currRecord = leaderboard[address(this)][_card];
        uint256 _userTimeHeld = timeHeld[_card][_user];
        address _nextUser = _currRecord.next;
        while (_userTimeHeld < timeHeld[_card][_nextUser]) {
            _currRecord = leaderboard[_nextUser][
                leaderboardIndex[_nextUser][_card]
            ];
        }
        address _prevUser = leaderboard[_nextUser][
            leaderboardIndex[_nextUser][_card]
        ]
        .prev;

        // create new record
        Leaderboard memory _newRecord;
        _newRecord.card = _card;
        _newRecord.next = _nextUser;
        _newRecord.prev = _prevUser;

        // insert in linked list
        leaderboard[_nextUser][leaderboardIndex[_nextUser][_card]].prev = _user;
        leaderboard[_prevUser][leaderboardIndex[_prevUser][_card]].next = _user;
        leaderboard[_user].push(_newRecord);

        //update the index to help find the record later
        leaderboardIndex[_user][_card] = leaderboard[_user].length - 1;

        leaderboardLength[_card]++;
    }

    /// @dev remove a user from the leaderboard
    function removeFromLeaderboard(address _user, uint256 _card) internal {
        address _nextUser = leaderboard[_user][leaderboardIndex[_user][_card]]
        .next;
        address _prevUser = leaderboard[_user][leaderboardIndex[_user][_card]]
        .prev;

        // unlink from list
        leaderboard[_nextUser][leaderboardIndex[_nextUser][_card]]
        .prev = _prevUser;
        leaderboard[_prevUser][leaderboardIndex[_prevUser][_card]]
        .next = _nextUser;

        // overwrite array element
        uint256 _index = leaderboardIndex[_user][_card];
        uint256 _lastRecord = leaderboard[_user].length - 1;
        // no point overwriting itself
        if (_index != _lastRecord) {
            leaderboard[_user][leaderboardIndex[_user][_card]] = leaderboard[
                _user
            ][_lastRecord];
        }
        leaderboard[_user].pop();

        // update the index to help find the record later
        leaderboardIndex[_user][_card] = 0;
        if (leaderboard[_user].length != 0 && _index != _lastRecord) {
            leaderboardIndex[_user][leaderboard[_user][_index].card] = _index;
        }
        leaderboardLength[_card]--;
    }

    /// @dev check if a user is on the leaderboard
    function userIsOnLeaderboard(address _user, uint256 _card)
        internal
        view
        returns (bool)
    {
        if (leaderboard[_user].length != 0) {
            // user is on a leaderboard
            if (leaderboardIndex[_user][_card] != 0) {
                // user is on the leaderboard with this card
                return true;
            } else {
                if (leaderboard[_user][0].next != address(0)) {
                    return true;
                }
            }
        }
        return false;
    }

    /*
         ▲  
        ▲ ▲ 
              */
}
