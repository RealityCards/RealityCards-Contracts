pragma solidity 0.5.13;

import '../interfaces/IRealitio.sol';
import '../interfaces/IRCOracleProxyXdai.sol';
import '../interfaces/IBridgeContract.sol';

////////////////////

contract RCOracleProxyMainnet 
{
    IRealitio public realitio;
    IBridgeContract public bridge; 

    address public oracleProxyXdaiAddress;
    
    mapping (address => bytes32) public questionIds;

    // CONSTRUCTOR

    constructor(address _bridgeMainnetAddress, address _realitioAddress) public {
        bridge = IBridgeContract(_bridgeMainnetAddress);
        realitio = IRealitio(_realitioAddress);
    }
    
    // INITIALISATION
    
    function setOracleProxyXdaiAddress(address _newAddress) external {
        oracleProxyXdaiAddress = _newAddress;
    }
    
    // POSTING QUESTION TO THE ORACLE
    
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external {
        // hard coded values
        // string memory _question = 'TEST PLEASE IGNORE 1␟"1","2"␟politics␟en_US';
        uint256 _template_id = 2;
        address _arbitrator = 0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D;
        // uint32 _timeout = 86400;
        uint32 _timeout = 30;
        uint256 _nonce = 0;
        
        // post to Oracle
        bytes32 _questionId = realitio.askQuestion(_template_id, _question, _arbitrator, _timeout, _oracleResolutionTime, _nonce);
        questionIds[_marketAddress] = _questionId;
    }
    
    // GETTING THE WINNER FROM THE ORACLE
    function getWinnerFromOracle(address _marketAddress) external returns(bool) {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        
        // if finalised, send result over to xDai proxy
        if (_isFinalized) {
            bytes32 _winningOutcome = realitio.resultFor(_questionId);
            _sendWinnerToXdaiProxy(_marketAddress, uint256(_winningOutcome));
        }
        
        return _isFinalized;
    }  
    
    // SENDING DATA TO THE XDAI PROXY
    function _sendWinnerToXdaiProxy(address _marketAddress, uint256 _winningOutcome) public {
        bytes4 _methodSelector = IRCOracleProxyXdai(address(0)).setWinner.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _winningOutcome);
        bridge.requireToPassMessage(oracleProxyXdaiAddress,data,200000);
    } 
    
}
