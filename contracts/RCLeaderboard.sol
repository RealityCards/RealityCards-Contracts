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
    IRCMarket public override market;
    bytes32 public constant MARKET = keccak256("MARKET");
    bytes32 public constant FACTORY = keccak256("FACTORY");

    // Leaderboard tracking
    struct Leaderboard {
        address next;
        address prev;
        address market;
        uint256 card;
        uint256 timeHeld;
    }
    mapping(address => Leaderboard[]) public leaderboard;
    mapping(address => mapping(address => mapping(uint256 => uint256))) leaderboardIndex;
    mapping(address => mapping(uint256 => uint256)) public leaderboardLength;
    mapping(address => uint256) public NFTsToAward;

    /*╔═════════════════════════════════╗
      ║         CONSTRUCTOR             ║
      ╚═════════════════════════════════╝*/

    constructor(IRCTreasury _treasury) {
        treasury = _treasury;
    }

    modifier onlyMarkets() {
        require(
            treasury.checkPermission(MARKET, msgSender()),
            "Not authorised"
        );
        _;
    }
    modifier onlyFactory() {
        require(
            treasury.checkPermission(FACTORY, msgSender()),
            "Extremely Verboten"
        );
        _;
    }

    /*╔═════════════════════════════════╗
      ║      Leaderboard Tracking       ║
      ╚═════════════════════════════════╝*/

    /// @notice adds a new market to the leaderboard
    function addMarket(
        address _market,
        uint256 _cardCount,
        uint256 _NFTsToAward
    ) external override onlyFactory {
        NFTsToAward[_market] = _NFTsToAward;
        for (uint64 i = 0; i < _cardCount; i++) {
            // create new record for each card that becomes the head&tail of the linked list
            Leaderboard memory _newRecord;
            _newRecord.card = i;
            _newRecord.next = _market;
            _newRecord.prev = _market;
            _newRecord.timeHeld = type(uint256).max;
            leaderboardIndex[_market][_market][i] = leaderboard[_market].length;
            leaderboard[_market].push(_newRecord);
        }
    }

    /// @dev given a user and a card will determine if they need to be added
    /// @dev .. to the leaderboard and then call the appropriate functions.
    function updateLeaderboard(
        address _user,
        uint256 _card,
        uint256 _timeHeld
    ) external override onlyMarkets {
        address _market = msgSender();

        if (leaderboardLength[_market][_card] < NFTsToAward[_market]) {
            // leaderboard isn't full, just add them
            if (userIsOnLeaderboard(_user, _market, _card)) {
                // user is already on the leaderboard, remove them first
                removeFromLeaderboard(_user, _market, _card);
            }
            addToLeaderboard(_user, _market, _card, _timeHeld);
        } else {
            address lastUserOnLeaderboard = leaderboard[_market][
                leaderboardIndex[_market][_market][_card]
            ].prev;
            uint256 minimumTimeOnLeaderboard = leaderboard[
                lastUserOnLeaderboard
            ][leaderboardIndex[lastUserOnLeaderboard][_market][_card]].timeHeld;
            if (_timeHeld > minimumTimeOnLeaderboard) {
                // user deserves to be on leaderboard
                if (userIsOnLeaderboard(_user, _market, _card)) {
                    // user is already on the leaderboard, remove them first
                    removeFromLeaderboard(_user, _market, _card);
                } else {
                    // bump the last user off the leaderboard to make space
                    removeFromLeaderboard(
                        lastUserOnLeaderboard,
                        _market,
                        _card
                    );
                }
                // now add them in the correct position
                addToLeaderboard(_user, _market, _card, _timeHeld);
            }
        }
    }

    /// @dev add a user to the leaderboard
    function addToLeaderboard(
        address _user,
        address _market,
        uint256 _card,
        uint256 _timeHeld
    ) internal {
        Leaderboard memory _currRecord = leaderboard[_market][
            leaderboardIndex[_market][_market][_card]
        ];
        address _nextUser = _currRecord.next;
        while (
            _timeHeld >
            leaderboard[_nextUser][leaderboardIndex[_nextUser][_market][_card]]
                .timeHeld &&
            _nextUser != _market
        ) {
            _currRecord = leaderboard[_nextUser][
                leaderboardIndex[_nextUser][_market][_card]
            ];
            _nextUser = _currRecord.next;
        }

        address _prevUser = leaderboard[_nextUser][
            leaderboardIndex[_nextUser][_market][_card]
        ].prev;

        // create new record
        Leaderboard memory _newRecord;
        _newRecord.card = _card;
        _newRecord.market = _market;
        _newRecord.next = _nextUser;
        _newRecord.prev = _prevUser;
        _newRecord.timeHeld = _timeHeld;

        // insert in linked list
        leaderboard[_nextUser][leaderboardIndex[_nextUser][_market][_card]]
            .prev = _user;
        leaderboard[_prevUser][leaderboardIndex[_prevUser][_market][_card]]
            .next = _user;
        leaderboard[_user].push(_newRecord);

        //update the index to help find the record later
        leaderboardIndex[_user][_market][_card] = leaderboard[_user].length - 1;

        leaderboardLength[_market][_card]++;
    }

    /// @dev remove a user from the leaderboard
    function removeFromLeaderboard(
        address _user,
        address _market,
        uint256 _card
    ) internal {
        uint256 _index = leaderboardIndex[_user][_market][_card];
        address _nextUser = leaderboard[_user][_index].next;
        address _prevUser = leaderboard[_user][_index].prev;

        // unlink from list
        leaderboard[_nextUser][leaderboardIndex[_nextUser][_market][_card]]
            .prev = _prevUser;
        leaderboard[_prevUser][leaderboardIndex[_prevUser][_market][_card]]
            .next = _nextUser;

        // overwrite array element
        uint256 _lastRecord = leaderboard[_user].length - 1;
        // no point overwriting itself
        if (_index != _lastRecord) {
            leaderboard[_user][_index] = leaderboard[_user][_lastRecord];
        }
        leaderboard[_user].pop();

        // update the index to help find the record later
        leaderboardIndex[_user][_market][_card] = 0;
        if (leaderboard[_user].length != 0 && _index != _lastRecord) {
            leaderboardIndex[_user][leaderboard[_user][_index].market][
                leaderboard[_user][_index].card
            ] = _index;
        }

        leaderboardLength[_market][_card]--;
    }

    /// @dev check if a user is on the leaderboard
    function userIsOnLeaderboard(
        address _user,
        address _market,
        uint256 _card
    ) internal view returns (bool) {
        if (leaderboard[_user].length != 0) {
            // user is on a leaderboard
            if (leaderboardIndex[_user][_market][_card] != 0) {
                // user is on the leaderboard with this card
                return true;
            } else {
                if (
                    leaderboard[_user][0].market == _market &&
                    leaderboard[_user][0].card == _card
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    function claimNFT(address _user, uint256 _card)
        external
        override
        onlyMarkets
    {
        address _market = msgSender();
        require(
            userIsOnLeaderboard(_user, _market, _card),
            "Not in leaderboard"
        );
        removeFromLeaderboard(_user, _market, _card);
    }

    function printLeaderboard(address _market, uint256 _card) public view {
        Leaderboard memory _currRecord = leaderboard[_market][
            leaderboardIndex[_market][_market][_card]
        ];
        address _nextUser = _currRecord.next;
        console.log("Market address ", _market);
        while (_nextUser != _market) {
            console.log("Printing orderbook ", _nextUser);
            _currRecord = leaderboard[_nextUser][
                leaderboardIndex[_nextUser][_market][_card]
            ];
            _nextUser = _currRecord.next;
        }
        console.log(" done printing orderbook");
    }

    /*
         ▲  
        ▲ ▲ 
              */
}
