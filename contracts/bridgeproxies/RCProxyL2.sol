// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IRCProxyL1.sol";
import "../interfaces/IBridge.sol";
import "../interfaces/IRCMarket.sol";
import "../interfaces/IRCTreasury.sol";
import "../interfaces/IRealitio.sol";

/// @title Reality Cards Proxy- xDai side
/// @author Andrew Stanger, Marvin Kruse & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCProxyL2 is Ownable {
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    IBridge public bridge;
    IRealitio public realitio;
    IERC20 public erc20;

    ///// GOVERNANCE VARIABLES /////
    address public proxyMainnetAddress;
    address public factoryAddress;
    address public treasuryAddress;

    ///// ORACLE VARIABLES /////
    mapping(address => bytes32) public questionIds;
    mapping(address => bool) public questionFinalised;
    address public arbitrator;
    uint32 public timeout;

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogFloatIncreased(address indexed funder, uint256 amount);
    event LogFloatWithdrawn(address indexed recipient, uint256 amount);
    event LogDepositConfirmed(uint256 indexed nonce);
    event LogDepositExecuted(uint256 indexed nonce);
    event LogQuestionPostedToOracle(
        address indexed marketAddress,
        bytes32 indexed questionId
    );

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(
        address _bridgeL2Address,
        address _factoryAddress,
        address _treasuryAddress,
        address _realitioAddress,
        address _arbitratorAddress
    ) {
        // general
        setBridgeL2Address(_bridgeL2Address);
        setFactoryAddress(_factoryAddress);
        setTreasuryAddress(_treasuryAddress);
        // oracle
        setArbitrator(_arbitratorAddress);
        setRealitioAddress(_realitioAddress);
        setTimeout(86400); // 24 hours
    }

    ////////////////////////////////////
    /////// GOVERNANCE - SETUP /////////
    ////////////////////////////////////

    /// @dev address of mainnet oracle proxy, called by the mainnet side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    function setProxyL1Address(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        proxyMainnetAddress = _newAddress;
    }

    /// @dev address of arbitrary message bridge, Layer2 side
    function setBridgeL2Address(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        bridge = IBridge(_newAddress);
    }

    /// @dev address of RC factory contract, so only factory can post questions
    function setFactoryAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        factoryAddress = _newAddress;
    }

    /// @dev address of RC treasury contract
    function setTreasuryAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        treasuryAddress = _newAddress;
    }

    ////////////////////////////////////
    /////// GOVERNANCE - ORACLE ////////
    ////////////////////////////////////

    /// @dev admin override of the Oracle, if not yet settled
    /// @dev doesn't check market state, so can close market early
    function setAmicableResolution(
        address _marketAddress,
        uint256 _winningOutcome
    ) external onlyOwner {
        questionFinalised[_marketAddress] = true;
        IRCMarket market = IRCMarket(_marketAddress);
        market.setWinner(_winningOutcome);
    }

    /// @dev address reality.eth contracts
    function setRealitioAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        realitio = IRealitio(_newAddress);
    }

    /// @dev address of arbitrator, in case of continued disputes on reality.eth
    function setArbitrator(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        arbitrator = _newAddress;
    }

    /// @dev how long reality.eth waits for disputes before finalising
    function setTimeout(uint32 _newTimeout) public onlyOwner {
        timeout = _newTimeout;
    }

    ////////////////////////////////////
    ///// CORE FUNCTIONS - ORACLE //////
    ////////////////////////////////////

    /// @dev called by factory upon market creation (thus impossible to be called twice), posts question to reality.eth
    function postQuestionToOracle(
        address _marketAddress,
        string calldata _question,
        uint32 _oracleResolutionTime
    ) external {
        require(msg.sender == factoryAddress, "Not factory");
        bytes32 _questionId =
            realitio.askQuestion(
                2,
                _question,
                arbitrator,
                timeout,
                _oracleResolutionTime,
                0
            );
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    /// @notice has the oracle finalised
    function isFinalized(address _marketAddress) public view returns (bool) {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        return _isFinalized;
    }

    /// @dev sets the winning outcome
    /// @dev market.setWinner() will revert if done twice, because wrong state
    function getWinnerFromOracle(address _marketAddress) external {
        require(isFinalized(_marketAddress), "Oracle not finalised");
        IRCMarket market = IRCMarket(_marketAddress);
        // check market state to prevent market closing early
        require(
            uint256(market.marketLockingTime()) <= block.timestamp,
            "Market not finished"
        );
        questionFinalised[_marketAddress] = true;
        bytes32 _questionId = questionIds[_marketAddress];
        bytes32 _winningOutcome = realitio.resultFor(_questionId);
        // call the market
        market.setWinner(uint256(_winningOutcome));
    }
}
