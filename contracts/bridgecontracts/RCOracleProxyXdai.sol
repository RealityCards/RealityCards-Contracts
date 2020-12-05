pragma solidity 0.5.13;

import '../interfaces/IRCOracleProxyMainnet.sol';
import '../interfaces/IBridgeContract.sol';

////////////////////

// Who will win the 2024 US General Election?␟"Someone else","Joe Biden","Neither or no election"␟politics␟en_US';

contract RCOracleProxyXdai
{
    address public RCBridgeProxyMainnetAddress;
    address public bridgeXdaiAddress = 0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59;
    IBridgeContract bridgeContractInstance = IBridgeContract(bridgeXdaiAddress);
    
    mapping (address => bytes32) public questionIds;
    mapping (address => bool) public marketFinalised;
    mapping (address => uint256) public winningOutcome;
    
    // INITIALISATION
    
    function setRCBridgeProxyMainnetAddress(address _newAddress) external {
        RCBridgeProxyMainnetAddress = _newAddress;
    }
    
    // SENDING DATA TO THE MAINNET PROXY
    
    function sendQuestionToMainnetBridge(address _marketAddress, string memory _question, uint32 _oracleResolutionTime) public {
        bytes4 _methodSelector = IRCOracleProxyMainnet(address(0)).postQuestionToOracle.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _question, _oracleResolutionTime);
        bridgeContractInstance.requireToPassMessage(RCBridgeProxyMainnetAddress,data,200000);
    }
    
    // RECEIVING DATA FROM THE MAINNET PROXY
    
    function setWinner(address _marketAddress, uint256 _winningOutcome) external {
        // require(msg.sender == bridgeXdaiAddress, "Not bridge");
        // require(bridgeContractInstance.messageSender() == RCBridgeProxyMainnetAddress, "Not proxy");
        marketFinalised[_marketAddress] = true;
        winningOutcome[_marketAddress] = _winningOutcome;
    }
    
    // CALLED FROM MARKET CONTRACTS
    
    function isFinalized(address _marketAddress) external view returns(bool) {
        return(marketFinalised[_marketAddress]);
    }
    
    function getWinner(address _marketAddress) external view returns(uint256) {
        require(marketFinalised[_marketAddress], "Not finalised");
        return winningOutcome[_marketAddress];
    }
}
