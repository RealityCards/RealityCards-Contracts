// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;
/*
██╗      █████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗  ██╗ ██████╗ █████╗ ██████╗ ██████╗ ███████╗
██║     ██╔══██╗██║   ██║████╗  ██║██╔════╝██║  ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
██║     ███████║██║   ██║██╔██╗ ██║██║     ███████║██║     ███████║██████╔╝██║  ██║███████╗
██║     ██╔══██║██║   ██║██║╚██╗██║██║     ██╔══██║██║     ██╔══██║██╔══██╗██║  ██║╚════██║
███████╗██║  ██║╚██████╔╝██║ ╚████║╚██████╗██║  ██║╚██████╗██║  ██║██║  ██║██████╔╝███████║
╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝
 */
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/IRCMarket.sol';
import './lib/NativeMetaTransaction.sol';
import 'hardhat/console.sol';

/// @title Launch Cards Claim Tokens
/// @author Konstantin Degtiarenko
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!

contract LCClaim is NativeMetaTransaction {
    using SafeERC20 for IERC20;

    /*╔═════════════════════════════════╗
      ║             VARIABLES           ║
      ╚═════════════════════════════════╝*/

    /// @dev
    mapping(address => bool) public tokensClaimed;
    /// @dev token contract
    IERC20 public erc20;
    /// @dev market contract
    IRCMarket public market;
    /// @dev tokens per second
    uint256 public tokensPerSecond;
    /// @dev contract owner
    address public owner;
    /// @dev claim started
    bool public claimStarted;
    /// @dev claim finished
    bool public claimFinished;
    ///@dev emergency timeout 4 weeks
    uint32 constant timeoutPeriod = 2419200;
    /// @dev creation time
    uint32 public createdAt;

    /*╔═════════════════════════════════╗
      ║             EVENTS              ║
      ╚═════════════════════════════════╝*/

    event LogUserClaimed(uint256 indexed amount, address indexed user);

    constructor(address _tokenAddress, address _marketAddress) {
        require(_tokenAddress != address(0), 'Must set token address');
        require(_marketAddress != address(0), 'Must set market address');

        erc20 = IERC20(_tokenAddress);
        market = IRCMarket(_marketAddress);
        owner = msgSender();
        createdAt = uint32(block.timestamp);
    }

    function setDistribution() external {
        require(
            IRCMarket.States.CLOSED == market.state(),
            'Market already started'
        );

        tokensPerSecond =
            erc20.balanceOf(address(this)) /
            (market.marketLockingTime() - market.marketOpeningTime());
    }

    function claim() external {
        require(!claimFinished, 'Claim period is finished');
        require(!tokensClaimed[msgSender()], 'Already claimed');
        require(
            IRCMarket.States.WITHDRAW == market.state(),
            'Market is not finished'
        );
        uint256 timeHeld = market.timeHeld(
            market.winningOutcome(),
            msgSender()
        );
        require(timeHeld > 0, 'Address did not participate');

        tokensClaimed[msgSender()] = true;
        erc20.safeTransfer(msgSender(), tokensPerSecond * timeHeld);

        emit LogUserClaimed(tokensPerSecond * timeHeld, msgSender());
    }

    function timeoutWithdraw() external {
        require(msgSender() == owner, 'Only owner');
        require(
            block.timestamp > createdAt + timeoutPeriod,
            'Timeout period is not finished'
        );
        claimFinished = true;
        erc20.safeTransfer(owner, erc20.balanceOf(address(this)));
    }
}
