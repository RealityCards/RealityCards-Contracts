// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import '../interfaces/IRealitio.sol';
import '../interfaces/IRCProxyXdai.sol';
import '../interfaces/IBridge.sol';
import '../interfaces/IAlternateReceiverBridge.sol';
import '../interfaces/IERC20Dai.sol';
import '../interfaces/IERC721.sol';

/// @title Reality Cards Proxy- Mainnet side
/// @author Andrew Stanger & Marvin Kruse
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCProxyMainnet is Ownable
{
    using SafeMath for uint256;

    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev contract variables
    IRealitio public realitio;
    IBridge public bridge;
    IAlternateReceiverBridge public alternateReceiverBridge;
    IERC20Dai public dai;
    IERC721 public nfthub;

    /// @dev governance variables
    address public proxyXdaiAddress;
    address public arbitrator;
    uint32 public timeout;
    
    /// @dev market resolution variables
    mapping (address => bytes32) public questionIds;
    uint256 constant public REALITIO_TEMPLATE_ID = 2;
    uint256 constant public REALITIO_NONCE = 0;
    uint256 constant public XDAI_BRIDGE_GAS_COST = 400000;

    /// @dev dai deposits
    uint256 internal depositNonce;
    bool internal depositsEnabled = true;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(address _bridgeMainnetAddress, address _realitioAddress, address _nftHubAddress, address _alternateReceiverAddress, address _daiAddress, address _arbitratorAddress) {
        setBridgeMainnetAddress(_bridgeMainnetAddress);
        setRealitioAddress(_realitioAddress);
        setNftHubAddress(_nftHubAddress);
        setAlternateReceiverAddress(_alternateReceiverAddress);
        setDaiAddress(_daiAddress); 
        setArbitrator(_arbitratorAddress);
        setTimeout(86400); // 24 hours
    }

    ////////////////////////////////////
    //////////// EVENTS ////////////////
    ////////////////////////////////////

    event LogQuestionPostedToOracle(address indexed marketAddress, bytes32 indexed questionId);
    event DaiDeposited(address indexed user, uint256 amount, uint256 nonce);

    ////////////////////////////////////
    /////// GOVERNANCE - SETUP /////////
    ////////////////////////////////////
    
    /// @dev address of xdai oracle proxy, called by the xdai side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    function setProxyXdaiAddress(address _newAddress) onlyOwner external {
        require(_newAddress != address(0), "Must set an address");
        proxyXdaiAddress = _newAddress;
    }

    /// @dev address of arbitrary message bridge, mainnet side
    function setBridgeMainnetAddress(address _newAddress) onlyOwner public {
        require(_newAddress != address(0), "Must set an address");
        bridge = IBridge(_newAddress);
    }

    /// @dev address of alternate receiver bridge, mainnet side
    function setNftHubAddress(address _newAddress) onlyOwner public {
        require(_newAddress != address(0), "Must set an address");
        nfthub = IERC721(_newAddress);
    }

    /// @dev address of alternate receiver bridge, mainnet side
    function setAlternateReceiverAddress(address _newAddress) onlyOwner public {
        require(_newAddress != address(0), "Must set an address");
        alternateReceiverBridge = IAlternateReceiverBridge(_newAddress);
    }

    /// @dev address of dai contract, must also approve the ARB
    function setDaiAddress(address _newAddress) onlyOwner public {
        require(_newAddress != address(0), "Must set an address");
        dai = IERC20Dai(_newAddress);
        dai.approve(address(alternateReceiverBridge), type(uint256).max);
    }

    ////////////////////////////////////
    /////// GOVERNANCE - ORACLE ////////
    ////////////////////////////////////

    /// @dev address reality.eth contracts
    function setRealitioAddress(address _newAddress) onlyOwner public {
        require(_newAddress != address(0), "Must set an address");
        realitio = IRealitio(_newAddress);
    }

    /// @dev address of arbitrator, in case of continued disputes on reality.eth
    function setArbitrator(address _newAddress) onlyOwner public {
        require(_newAddress != address(0), "Must set an address");
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
        bytes32 _questionId = realitio.askQuestion(REALITIO_TEMPLATE_ID, _question, arbitrator, timeout, _oracleResolutionTime, REALITIO_NONCE);
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    ////////////////////////////////////
    //// GOVERNANCE - NFT UPGRADES /////
    ////////////////////////////////////

    /// @dev admin can create NFTs
    /// @dev for situations where bridge failed
    function upgradeCardAdmin(uint256 _newTokenId, string calldata _tokenUri, address _owner) onlyOwner external {
        require(_owner != address(0), "Must set an address");
        nfthub.mintNft(_newTokenId, _tokenUri, _owner);
    }  

    ////////////////////////////////////
    ///// GOVERNANCE - DAI BRIDGE //////
    ////////////////////////////////////

    function changeDepositsEnabled() onlyOwner external {
        depositsEnabled = !depositsEnabled;
    }
    
    ////////////////////////////////////
    ///// CORE FUNCTIONS - ORACLE //////
    ////////////////////////////////////
    
    ///@notice called by xdai proxy via bridge, posts question to Oracle
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == proxyXdaiAddress, "Not proxy");
        require(questionIds[_marketAddress] == 0, "Already posted");
        bytes32 _questionId = realitio.askQuestion(REALITIO_TEMPLATE_ID, _question, arbitrator, timeout, _oracleResolutionTime, REALITIO_NONCE);
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    /// @notice has the oracle finalised 
    function isFinalized(address _marketAddress) public view returns(bool) {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        return _isFinalized;
    }

    /// @dev can be called by anyone, reads winner from Oracle and sends to xdai proxy via bridge
    /// @dev can be called more than once in case bridge fails, xdai proxy will reject a second successful call
    function getWinnerFromOracle(address _marketAddress) external {
        require(isFinalized(_marketAddress), "Oracle not finalised");
        bytes32 _questionId = questionIds[_marketAddress];
        bytes32 _winningOutcome = realitio.resultFor(_questionId);
        bytes4 _methodSelector = IRCProxyXdai(address(0)).setWinner.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _winningOutcome);
        bridge.requireToPassMessage(proxyXdaiAddress,data,XDAI_BRIDGE_GAS_COST);
    }

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    /// @notice mints NFT with metadata as sent by proxy
    function upgradeCard(uint256 _newTokenId, string calldata _tokenUri, address _owner) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == proxyXdaiAddress, "Not proxy");
        require(_owner != address(0), "Must set an address");
        nfthub.mintNft(_newTokenId, _tokenUri, _owner);
    }  

    ////////////////////////////////////
    //// CORE FUNCTIONS - DAI BRIDGE ///
    ////////////////////////////////////

    /// @dev user deposit assuming prior approval
    function depositDai(uint256 _amount) external {
        _depositDai(msg.sender, _amount); 
    }

    /// @dev user deposit without prior approval
    function permitAndDepositDai(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s, uint256 _amount) external {
        require(allowed, "only possible if allowance is set");
        dai.permit(holder, spender, nonce, expiry, allowed, v, r, s);
        _depositDai(holder, _amount);
    }

    /// @dev send Dai to xDai proxy and emit event for offchain validator 
    function _depositDai(address _sender, uint256 _amount) internal {
        require(depositsEnabled, "Deposits disabled");
        emit DaiDeposited(_sender, _amount, depositNonce.add(1));
        require(dai.transferFrom(_sender, address(this), _amount), "Token transfer failed");
        alternateReceiverBridge.relayTokens(address(this), proxyXdaiAddress, _amount);
    }
}
