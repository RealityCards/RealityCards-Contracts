pragma solidity 0.5.13;

import '../interfaces/IRCOracleProxyMainnet.sol';
import '../interfaces/IBridgeContract.sol';

////////////////////

// Who will win the 2024 US General Election?␟"Someone else","Joe Biden","Neither or no election"␟politics␟en_US';

contract RCOracleProxyXdai
{
    IBridgeContract public bridge;

    address public oracleProxyMainnetAddress;
    
    mapping (address => bytes32) public questionIds;
    mapping (address => bool) public marketFinalized;
    mapping (address => uint256) public winningOutcome;

    // CONSTRUCTOR

    constructor(address _bridgeXdaiAddress) public {
        bridge = IBridgeContract(_bridgeXdaiAddress);
    }
    
    // INITIALISATION
    
    function setOracleProxyMainnetAddress(address _newAddress) external {
        oracleProxyMainnetAddress = _newAddress;
    }
    
    // SENDING DATA TO THE MAINNET PROXY
    
    function sendQuestionToMainnetBridge(address _marketAddress, string memory _question, uint32 _oracleResolutionTime) public {
        bytes4 _methodSelector = IRCOracleProxyMainnet(address(0)).postQuestionToOracle.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _question, _oracleResolutionTime);
        bridge.requireToPassMessage(oracleProxyMainnetAddress,data,200000);
    }
    
    // RECEIVING DATA FROM THE MAINNET PROXY
    
    function setWinner(address _marketAddress, uint256 _winningOutcome) external {
        // require(msg.sender == bridgeXdaiAddress, "Not bridge");
        // require(bridge.messageSender() == oracleProxyMainnetAddress, "Not proxy");
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
