pragma solidity 0.5.13;

import '../interfaces/IRealitio.sol';
import '../interfaces/IRCOracleProxyXdai.sol';
import '../interfaces/IBridgeContract.sol';

////////////////////

contract RCOracleProxyMainnet 
{
    address public RCBridgeProxyXdaiAddress;
    address public bridgeMainnetAddress = 0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e;
    IBridgeContract bridgeContractInstance = IBridgeContract(bridgeMainnetAddress);
    
    mapping (address => bytes32) public questionIds;
    mapping (address => bool) public marketFinalised;
    
    // INITIALISATION
    
    function setRCBridgeProxyXdaiAddress(address _newAddress) external {
        RCBridgeProxyXdaiAddress = _newAddress;
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
        IRealitio _realitioInstance = IRealitio(0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47);
        bytes32 _questionId = _realitioInstance.askQuestion(_template_id, _question, _arbitrator, _timeout, _oracleResolutionTime, _nonce);
        questionIds[_marketAddress] = _questionId;
    }
    
    // GETTING THE WINNER FROM THE ORACLE
    function getWinnerFromOracle(address _marketAddress) external returns(bool) {
        IRealitio _realitioInstance = IRealitio(0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47);
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = _realitioInstance.isFinalized(_questionId);
        
        // if finalised, send result over to xDai proxy
        if (_isFinalized) {
            bytes32 _winningOutcome = _realitioInstance.resultFor(_questionId);
            _sendWinnerToXdaiProxy(_marketAddress, uint256(_winningOutcome));
        }
        
        return _isFinalized;
    }  
    
    // SENDING DATA TO THE XDAI PROXY
    function _sendWinnerToXdaiProxy(address _marketAddress, uint256 _winningOutcome) public {
        bytes4 _methodSelector = IRCOracleProxyXdai(address(0)).setWinner.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _winningOutcome);
        bridgeContractInstance.requireToPassMessage(RCBridgeProxyXdaiAddress,data,200000);
    } 
    
}
