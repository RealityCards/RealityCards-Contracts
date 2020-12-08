pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";
import '../interfaces/IRealitio.sol';
import '../interfaces/IRCOracleProxyXdai.sol';
import '../interfaces/IBridgeContract.sol';
import "@openzeppelin/contracts/ownership/Ownable.sol";

/// @title Reality Cards Oracle Proxy- xDai side
/// @author Andrew Stanger
contract RCOracleProxyMainnet is Ownable
{
    IRealitio public realitio;
    IBridgeContract public bridge; 

    address public oracleProxyXdaiAddress;
    address public arbitrator;
    uint32 public timeout;
    
    mapping (address => bytes32) public questionIds;

    // CONSTRUCTOR

    constructor(address _bridgeMainnetAddress, address _realitioAddress) public {
        setBridgeMainnetAddress(_bridgeMainnetAddress);
        setRealitioAddress(_realitioAddress);
        setArbitrator(0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D); //kleros
        setTimeout(86400); // 24 hours
    }

    // OWNED FUNCTIONS
    
    /// @dev not set in constructor, address not known at deployment
    function setOracleProxyXdaiAddress(address _newAddress) onlyOwner external {
        oracleProxyXdaiAddress = _newAddress;
    }

    function setBridgeMainnetAddress(address _newAddress) onlyOwner public {
        bridge = IBridgeContract(_newAddress);
    }

    function setRealitioAddress(address _newAddress) onlyOwner public {
        realitio = IRealitio(_newAddress);
    }

    function setArbitrator(address _newAddress) onlyOwner public {
        arbitrator = _newAddress;
    }

    function setTimeout(uint32 _newTimeout) onlyOwner public {
        timeout = _newTimeout;
    }

    /// @dev admin can post question if not already posted
    /// @dev for situations where bridge failed
    function postQuestionToOracleAdmin(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) onlyOwner external {
        require(questionIds[_marketAddress] == 0, "Already posted");
        // hard coded values
        uint256 _template_id = 2;
        uint256 _nonce = 0;
        // post to Oracle
        bytes32 _questionId = realitio.askQuestion(_template_id, _question, arbitrator, timeout, _oracleResolutionTime, _nonce);
        questionIds[_marketAddress] = _questionId;
    }
    
    // POSTING QUESTION TO THE ORACLE
    
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == oracleProxyXdaiAddress, "Not proxy");
        // hard coded values
        uint256 _template_id = 2;
        uint256 _nonce = 0;
        // post to Oracle
        bytes32 _questionId = realitio.askQuestion(_template_id, _question, arbitrator, timeout, _oracleResolutionTime, _nonce);
        questionIds[_marketAddress] = _questionId;
    }
    
    // GETTING THE WINNER FROM THE ORACLE AND PASSING TO XDAI PROXY

    /// @dev can be called by anyone
    function getWinnerFromOracle(address _marketAddress) external returns(bool) {

        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        
        // if finalised, send result over to xDai proxy
        if (_isFinalized) {
            bytes32 _winningOutcome = realitio.resultFor(_questionId);
            bytes4 _methodSelector = IRCOracleProxyXdai(address(0)).setWinner.selector;
            bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _winningOutcome);
            bridge.requireToPassMessage(oracleProxyXdaiAddress,data,200000);
        }
        
        return _isFinalized;
    }  
    
}
