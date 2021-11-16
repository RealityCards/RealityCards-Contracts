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
import "hardhat/console.sol";
import "./interfaces/IRCLeaderboard.sol";
import "./interfaces/IRCTreasury.sol";
import "./interfaces/IRCMarket.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

/// @title Reality Cards Giveaway
/// @author Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCGiveaway is VRFConsumerBase {
    struct RequestDetails {
        bytes32 requestId;
        uint256 adjustedTotalTime;
        address userAddress;
        uint256 randomness;
        bool requestReturned;
        bool potenitalWinner;
    }

    RequestDetails[] public requestArray;
    mapping(bytes32 => uint256) public requestArrayIndex;
    mapping(address => bytes32) public userAddressToRequestId;
    uint256 public processedRequestCounter;
    uint256 public unaccountedRentalTime;
    uint256 public winningOutcome;

    bytes32 internal keyHash;
    uint256 internal fee;
    address public winner;
    uint256 public backlogLoopLimit;
    bool public giveawayOpen;

    IRCMarket market;
    IRCTreasury treasury;

    event diceRolled(address user);
    event userResultKnown(address user);
    event userFinalResult(address user, bool result);

    constructor(address _treasury)
        VRFConsumerBase(
            0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9, // VRF Coordinator
            0xa36085F69e2889c224210F603D836748e7dC0088 // LINK Token
        )
    {
        keyHash = 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4;
        fee = 0.1 * 10**18; // 0.1 LINK (Varies by network)

        backlogLoopLimit = 10;
        treasury = IRCTreasury(_treasury);
    }

    function openGiveaway(address _market) external {
        // TODO add permissions
        require(!giveawayOpen, "giveaway already open");
        market = IRCMarket(_market);
        require(market.state() == IRCMarket.States(3), "market not finished");
        winningOutcome = market.winningOutcome();
        (unaccountedRentalTime, , , , , , ) = market.card(winningOutcome);
    }

    function rollTheDice() public {
        require(giveawayOpen, "giveaway not open");
        uint256 userRentalTime = market.timeHeld(winningOutcome, msg.sender);
        require(userRentalTime > 0, "User has no rental time on card");
        require(
            LINK.balanceOf(address(this)) >= fee,
            "Not enough LINK - fill contract with faucet"
        );
        require(
            userAddressToRequestId[msg.sender] == bytes32(0),
            "You can only roll the dice once"
        );
        bytes32 requestId = requestRandomness(keyHash, fee);

        // save the mappings to help find records later
        requestArrayIndex[requestId] = requestArray.length;
        userAddressToRequestId[msg.sender] = requestId;

        // add the request details to the end of the array
        RequestDetails memory newRequest;
        newRequest.requestId = requestId;
        newRequest.userAddress = msg.sender;
        newRequest.adjustedTotalTime = unaccountedRentalTime;
        newRequest.requestReturned = false;
        newRequest.potenitalWinner = false;
        requestArray.push(newRequest);

        // reduce the unaccount rental time ready for the next dice roll
        unaccountedRentalTime -= userRentalTime;

        processBacklog();
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        uint256 index = requestArrayIndex[requestId];
        requestArray[index].requestReturned = true;
        requestArray[index].randomness = randomness;

        uint256 adjustedTotalTime = requestArray[index].adjustedTotalTime;
        address user = requestArray[index].userAddress;

        uint256 userRentalTime = market.timeHeld(winningOutcome, msg.sender);
        uint256 randomResult = (randomness % adjustedTotalTime) + 1;
        if (randomResult < userRentalTime) {
            // We have a potential winner
            requestArray[index].potenitalWinner = true;
            if (processedRequestCounter == index) {
                // We have the winner
                winner = user;
                processedRequestCounter++;
                emit userResultKnown(user);
            }
        } else {
            emit userResultKnown(user);
        }
        processBacklog();
    }

    function checkTheResult() public {
        bytes32 requestId = userAddressToRequestId[msg.sender];
        uint256 index = requestArrayIndex[requestId];
        require(
            requestArray[index].requestReturned == true,
            "Result not known yet"
        );

        bool result = msg.sender == winner;
        emit userFinalResult(msg.sender, result);
    }

    function processBacklog() public {
        // if the randomness comes back in the wrong order we might have multiple winners to check
        // they must be checked sequentially.
        uint256 loopCounter;
        while (processedRequestCounter < requestArray.length) {
            if (!requestArray[processedRequestCounter].requestReturned) {
                // stop processing if we find a request hasn't been returned
                break;
            }
            if (requestArray[processedRequestCounter].potenitalWinner) {
                // This is a potential winner
                address user = requestArray[processedRequestCounter]
                    .userAddress;
                if (winner == address(0)) {
                    // we found the winner
                    winner = user;
                }
                emit userResultKnown(user);
            }
            // no need to do anything for losers, just move on.
            processedRequestCounter++;
            loopCounter++;
            if (loopCounter == backlogLoopLimit) {
                break;
            }
        }
    }

    function viewResult(address _user) public view returns (bool result) {
        bytes32 requestId = userAddressToRequestId[_user];
        uint256 index = requestArrayIndex[requestId];
        require(
            requestArray[index].requestReturned == true,
            "Result not known yet"
        );

        result = _user == winner;
    }

    function withdrawLink() external {}
}
