pragma solidity 0.5.13;

import "hardhat/console.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '../interfaces/IRealitio.sol';
import '../interfaces/IRCProxyXdai.sol';
import '../interfaces/IBridgeContract.sol';
import '../interfaces/IAlternateReceiverBridge.sol';
import '../interfaces/IERC20Dai.sol';

/// @title Reality Cards Proxy- Mainnet side
/// @author Andrew Stanger
contract RCProxyMainnet is Ownable, ERC721Full
{
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev contract variables
    IRealitio public realitio;
    IBridgeContract public bridge;
    IAlternateReceiverBridge public alternateReceiverBridge;
    IRCProxyXdai public proxyXdai;
    IERC20Dai public dai;

    /// @dev governance variables
    address public proxyXdaiAddress;
    address public arbitrator;
    uint32 public timeout;
    
    /// @dev market resolution variables
    mapping (address => bytes32) public questionIds;

    /// @dev contractURI for opensea 
    string public contractURI;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(address _bridgeMainnetAddress, address _realitioAddress, address _xDaiProxyAddress, address _alternateReceiverAddress) ERC721Full("RealityCards", "RC")  public {
        setBridgeMainnetAddress(_bridgeMainnetAddress);
        setRealitioAddress(_realitioAddress);
        setAlternateReceiverAddress(_alternateReceiverAddress);
        setXdaiProxyAddress(_xDaiProxyAddress);
        setArbitrator(0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D); // kleros
        setTimeout(86400); // 24 hours
        contractURI = "https://cdn.realitycards.io/contractmetadata.json";
    }

    ////////////////////////////////////
    //////////// EVENTS ////////////////
    ////////////////////////////////////

    event LogQuestionPostedToOracle(address indexed marketAddress, bytes32 indexed questionId);

    ////////////////////////////////////
    /////// GOVERNANCE - SETUP /////////
    ////////////////////////////////////
    
    /// @dev address of xdai oracle proxy, called by the xdai side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    function setProxyXdaiAddress(address _newAddress) onlyOwner external {
        proxyXdaiAddress = _newAddress;
    }

    /// @dev address of arbitrary message bridge, mainnet side
    function setBridgeMainnetAddress(address _newAddress) onlyOwner public {
        bridge = IBridgeContract(_newAddress);
    }

    /// @dev address of alternate receiver bridge, mainnet side
    function setAlternateReceiverAddress(address _newAddress) onlyOwner public {
        alternateReceiverBridge = IAlternateReceiverBridge(_newAddress);
    }

    /// @dev address of xdai proxy contract
    function setXdaiProxyAddress(address _newAddress) onlyOwner public {
        proxyXdai = IRCProxyXdai(_newAddress);
    }

    ////////////////////////////////////
    /////// GOVERNANCE - ORACLE ////////
    ////////////////////////////////////

    /// @dev address reality.eth contracts
    function setRealitioAddress(address _newAddress) onlyOwner public {
        realitio = IRealitio(_newAddress);
    }

    /// @dev address of arbitrator, in case of continued disputes on reality.eth
    function setArbitrator(address _newAddress) onlyOwner public {
        arbitrator = _newAddress;
    }

    /// @dev how long reality.eth waits for disputes before finalising
    function setTimeout(uint32 _newTimeout) onlyOwner public {
        timeout = _newTimeout;
    }

    /// @dev admin can post question if not already posted
    /// @dev for situations where bridge failed
    function postQuestionToOracleAdmin(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) onlyOwner external {
        require(questionIds[_marketAddress] == 0, "Already posted");
        bytes32 _questionId = realitio.askQuestion(2, _question, arbitrator, timeout, _oracleResolutionTime, 0);
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    ////////////////////////////////////
    //// GOVERNANCE - NFT UPGRADES /////
    ////////////////////////////////////

    /// @dev admin can create NFTs
    /// @dev for situations where bridge failed
    function upgradeCardAdmin(uint256 _newTokenId, string calldata _tokenUri, address _owner) onlyOwner external {
        _mint(_owner, _newTokenId);
        _setTokenURI(_newTokenId, _tokenUri);
    }  
    
    ////////////////////////////////////
    ///// CORE FUNCTIONS - ORACLE //////
    ////////////////////////////////////
    
    ///@notice called by xdai proxy via bridge, posts question to Oracle
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == proxyXdaiAddress, "Not proxy");
        bytes32 _questionId = realitio.askQuestion(2, _question, arbitrator, timeout, _oracleResolutionTime, 0);
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    /// @dev can be called by anyone, reads winner from Oracle and sends to xdai proxy via bridge
    /// @dev can be called more than once, not a problem, xdai proxy will reject a second call
    function getWinnerFromOracle(address _marketAddress) external returns(bool) {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        // if finalised, send result over to xDai proxy
        if (_isFinalized) {
            bytes32 _winningOutcome = realitio.resultFor(_questionId);
            bytes4 _methodSelector = IRCProxyXdai(address(0)).setWinner.selector;
            bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _winningOutcome);
            bridge.requireToPassMessage(proxyXdaiAddress,data,200000);
        }
        return _isFinalized;
    }

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    function upgradeCard(uint256 _newTokenId, string calldata _tokenUri, address _owner) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == proxyXdaiAddress, "Not proxy");
        _mint(_owner, _newTokenId);
        _setTokenURI(_newTokenId, _tokenUri);
    }  

    ////////////////////////////////////
    //// CORE FUNCTIONS - DAI BRIDGE ///
    ////////////////////////////////////

    function depositDai(uint256 _amount) external {
        _depositDai(_amount, msg.sender);
    }

    function permitAndDepositDai(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s, uint256 _amount) external {
        require(allowed, "only possible if allowance is set");
        dai.permit(holder, spender, nonce, expiry, allowed, v, r, s);
        _depositDai(_amount, holder);
    }

    function _depositDai(uint256 _amount, address _sender) internal {
        require(dai.allowance(_sender, address(alternateReceiverBridge)) >= _amount, "Token allowance not high enough");
        require(alternateReceiverBridge.withinLimit(_amount), "deposit not within bridge limits");

        // Send the amount of tokens via the alternate receiver bridge
        alternateReceiverBridge.relayTokens(_sender, address(proxyXdai), _amount);        

        // Call xDai proxy through the AMB
        bytes4 _methodSelector = IRCProxyXdai(address(0)).daiTransferred.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _sender, _amount);
        bridge.requireToPassMessage(oracleProxyXdaiAddress,data,300000);
    }
}
