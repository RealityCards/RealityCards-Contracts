pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import '../interfaces/IRCOracleProxyMainnet.sol';
import '../interfaces/IBridgeContract.sol';

/// @title Reality Cards Oracle Proxy- xDai side
/// @author Andrew Stanger
contract RCOracleProxyXdai is Ownable
{
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    // contract variables
    IBridgeContract public bridge;

    // governance variables
    address public oracleProxyMainnetAddress;
    address public factoryAddress;
    
    // market resolution variables
    mapping (address => bytes32) public questionIds;
    mapping (address => bool) public marketFinalized;
    mapping (address => uint256) public winningOutcome;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(address _bridgeXdaiAddress, address _factoryAddress) public {
        setBridgeXdaiAddress(_bridgeXdaiAddress);
        setFactoryAddress(_factoryAddress);
    }
    
    ////////////////////////////////////
    ////////// GOVERNANCE //////////////
    ////////////////////////////////////
    
    /// @dev address of mainnet oracle proxy, called by the mainnet side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    function setOracleProxyMainnetAddress(address _newAddress) onlyOwner external {
        oracleProxyMainnetAddress = _newAddress;
    }

    /// @dev address of arbitrary message bridge, xdai side
    function setBridgeXdaiAddress(address _newAddress) onlyOwner public {
        bridge = IBridgeContract(_newAddress);
    }

    /// @dev address of RC factory contract, so only factory can post questions
    function setFactoryAddress(address _newAddress) onlyOwner public {
        factoryAddress = _newAddress;
    }
    
    ////////////////////////////////////
    ///////// CORE FUNCTIONS ///////////
    ////////////////////////////////////

    /// @dev called by factory upon market creation, posts question to Oracle via arbitrary message bridge
    function sendQuestionToBridge(address _marketAddress, string memory _question, uint32 _oracleResolutionTime) public {
        require(msg.sender == factoryAddress, "Not factory");
        bytes4 _methodSelector = IRCOracleProxyMainnet(address(0)).postQuestionToOracle.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _question, _oracleResolutionTime);
        bridge.requireToPassMessage(oracleProxyMainnetAddress,data,200000);
    }
    
    /// @dev called by mainnet oracle proxy via the arbitrary message bridge, sets the winning outcome
    function setWinner(address _marketAddress, uint256 _winningOutcome) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == oracleProxyMainnetAddress, "Not proxy");
        marketFinalized[_marketAddress] = true;
        winningOutcome[_marketAddress] = _winningOutcome;
    }
    
    /// @dev called by market contracts to check if winner known
    function isFinalized(address _marketAddress) external view returns(bool) {
        return(marketFinalized[_marketAddress]);
    }
    
    /// @dev called by market contracts to get the winner
    function getWinner(address _marketAddress) external view returns(uint256) {
        require(marketFinalized[_marketAddress], "Not finalised");
        return winningOutcome[_marketAddress];
    }
}