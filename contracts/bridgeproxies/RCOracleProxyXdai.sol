pragma solidity 0.5.13;

import '../interfaces/IRCOracleProxyMainnet.sol';
import '../interfaces/IBridgeContract.sol';
import "@openzeppelin/contracts/ownership/Ownable.sol";

/// @title Reality Cards Oracle Proxy- xDai side
/// @author Andrew Stanger
contract RCOracleProxyXdai is Ownable
{
    IBridgeContract public bridge;

    address public oracleProxyMainnetAddress;
    address public factoryAddress;
    
    mapping (address => bytes32) public questionIds;
    mapping (address => bool) public marketFinalized;
    mapping (address => uint256) public winningOutcome;

    // CONSTRUCTOR

    constructor(address _bridgeXdaiAddress, address _factoryAddress) public {
        setBridgeXdaiAddress(_bridgeXdaiAddress);
        setFactoryAddress(_factoryAddress);
    }
    
    // OWNED FUNCTIONS
    
    /// @dev not set in constructor, address not known at deployment
    function setOracleProxyMainnetAddress(address _newAddress) onlyOwner external {
        oracleProxyMainnetAddress = _newAddress;
    }

    function setBridgeXdaiAddress(address _newAddress) onlyOwner public {
        bridge = IBridgeContract(_newAddress);
    }

    function setFactoryAddress(address _newAddress) onlyOwner public {
        factoryAddress = _newAddress;
    }
    
    // SENDING DATA TO THE MAINNET PROXY
    
    function sendQuestionToBridge(address _marketAddress, string memory _question, uint32 _oracleResolutionTime) public {
        require(msg.sender == factoryAddress, "Not factory");
        bytes4 _methodSelector = IRCOracleProxyMainnet(address(0)).postQuestionToOracle.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _question, _oracleResolutionTime);
        bridge.requireToPassMessage(oracleProxyMainnetAddress,data,200000);
    }
    
    // RECEIVING DATA FROM THE MAINNET PROXY
    
    function setWinner(address _marketAddress, uint256 _winningOutcome) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == oracleProxyMainnetAddress, "Not proxy");
        marketFinalized[_marketAddress] = true;
        winningOutcome[_marketAddress] = _winningOutcome;
    }
    
    // CALLED FROM MARKET CONTRACTS
    
    function isFinalized(address _marketAddress) external view returns(bool) {
        return(marketFinalized[_marketAddress]);
    }
    
    function getWinner(address _marketAddress) external view returns(uint256) {
        require(marketFinalized[_marketAddress], "Not finalised");
        return winningOutcome[_marketAddress];
    }
}