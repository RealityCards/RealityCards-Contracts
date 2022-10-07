// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;
/*
██████╗ ███████╗ █████╗ ██╗     ██╗████████╗██╗   ██╗ ██████╗ █████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██║     ██║╚══██╔══╝╚██╗ ██╔╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
██████╔╝█████╗  ███████║██║     ██║   ██║    ╚████╔╝ ██║     ███████║██████╔╝██║  ██║███████╗
██╔══██╗██╔══╝  ██╔══██║██║     ██║   ██║     ╚██╔╝  ██║     ██╔══██║██╔══██╗██║  ██║╚════██║
██║  ██║███████╗██║  ██║███████╗██║   ██║      ██║   ╚██████╗██║  ██║██║  ██║██████╔╝███████║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝      ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝ 
*/
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "./interfaces/IRCOrderbook.sol";
import "./interfaces/IRCFactory.sol";
import "./interfaces/ITimeKeeper.sol";

/// @title Reality Cards, Rent Collector
/// @author Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RentCollector is AccessControl {
    IRCFactory public factory;
    IRCTreasury public treasury;
    IRCOrderbook public orderbook;
    uint256 marketCount;
    ITimeKeeper public timeKeeper;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        marketCount = 10;
    }

    // we need a timestamp for the view functions
    function setTimekeeper(address _timeKeeper) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
        timeKeeper = ITimeKeeper(_timeKeeper);
    }

    function setContracts(address _factory) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
        factory = IRCFactory(_factory);
        treasury = factory.treasury();
        orderbook = factory.orderbook();
    }

    function setNumberOfMarkets(uint256 _marketCount) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
        marketCount = _marketCount;
    }

    function collectRentIfExpired() external {
        collectRentAlways();
    }

    function collectRentAlways() public {
        address[] memory markets = new address[](marketCount);
        (markets, , , ) = factory.getMarketInfo(
            IRCMarket.Mode(0),
            1,
            marketCount,
            0
        );
        for (uint256 i = 0; i < markets.length; i++) {
            if (markets[i] == address(0)) {
                break;
            }
            IRCMarket _market = IRCMarket(markets[i]);
            uint256 numberOfCards = _market.numberOfCards();
            for (uint256 j = 0; j < numberOfCards; j++) {
                _market.collectRent(j);
            }
        }
    }

    function timekeeperTime() external view returns (uint256) {
        return timeKeeper.latestTimestamp();
    }

    function expectedForeclosureTime(address _marketAddress, uint256 _card)
        external
        view
        returns (uint256)
    {
        IRCMarket _market = IRCMarket(_marketAddress);
        address _owner = _market.ownerOf(_card);
        return treasury.foreclosureTimeUser(_owner, 0, 0);
    }

    function cardTimeLastCollected(address _marketAddress, uint256 _card)
        public
        view
        returns (uint256)
    {
        IRCMarket _market = IRCMarket(_marketAddress);
        uint256 timeLastCollected = _market.timeLastCollected(_card);
        return timeLastCollected;
    }

    function cardTimeLimitTimestamp(address _marketAddress, uint256 _card)
        external
        view
        returns (uint256)
    {
        IRCMarket _market = IRCMarket(_marketAddress);
        address _owner = _market.ownerOf(_card);
        uint256 timeLastCollected = cardTimeLastCollected(
            _marketAddress,
            _card
        );
        IRCOrderbook.Bid memory bid = orderbook.getBid(
            address(_market),
            _owner,
            _card
        );
        return timeLastCollected + bid.timeHeldLimit;
    }

    function hasCardExpired() external view returns (bool) {
        address[] memory markets = new address[](marketCount);
        uint256 latestTime = timeKeeper.latestTimestamp();
        (markets, , , ) = factory.getMarketInfo(
            IRCMarket.Mode(0),
            1,
            marketCount,
            0
        );
        for (uint256 i = 0; i < markets.length; i++) {
            if (markets[i] == address(0)) {
                break;
            }
            IRCMarket _market = IRCMarket(markets[i]);
            uint256 numberOfCards = _market.numberOfCards();
            for (uint256 j = 0; j < numberOfCards; j++) {
                address _owner = _market.ownerOf(j);
                if (_owner == address(_market)) {
                    // card unowned, or doesn't exist yet
                    break;
                }
                // has user foreclosed?
                uint256 foreclosureTime = treasury.foreclosureTimeUser(
                    _owner,
                    0,
                    0
                );
                if (foreclosureTime < latestTime) {
                    return true;
                }
                // has card hit time limit?
                uint256 timeLastCollected = _market.timeLastCollected(i);
                IRCOrderbook.Bid memory bid = orderbook.getBid(
                    address(_market),
                    _owner,
                    i
                );
                uint256 timeLimitTimestamp = timeLastCollected +
                    bid.timeHeldLimit;
                if (timeLimitTimestamp < latestTime) {
                    return true;
                }
            }
        }
        return false;
    }
}
