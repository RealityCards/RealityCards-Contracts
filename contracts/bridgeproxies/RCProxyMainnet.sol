pragma solidity 0.5.13;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import '../interfaces/IRealitio.sol';
import '../interfaces/IRCProxyXdai.sol';
import '../interfaces/IBridgeContract.sol';

/// @title Reality Cards Oracle Proxy- Mainnet side
/// @author Andrew Stanger
contract RCProxyMainnet is Ownable, ERC721Full
{
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev contract variables
    IRealitio public realitio;
    IBridgeContract public bridge; 

    /// @dev governance variables
    address public oracleProxyXdaiAddress;
    address public arbitrator;
    uint32 public timeout;
    
    /// @dev market resolution variables
    mapping (address => bytes32) public questionIds;

    /// @dev nft upgrade variables
    uint256 public nftCount;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(address _bridgeMainnetAddress, address _realitioAddress) ERC721Full("RealityCards", "RC")  public {
        setBridgeMainnetAddress(_bridgeMainnetAddress);
        setRealitioAddress(_realitioAddress);
        setArbitrator(0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D); // kleros
        setTimeout(86400); // 24 hours
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
    function setOracleProxyXdaiAddress(address _newAddress) onlyOwner external {
        oracleProxyXdaiAddress = _newAddress;
    }

    /// @dev address of arbitrary message bridge, mainnet side
    function setBridgeMainnetAddress(address _newAddress) onlyOwner public {
        bridge = IBridgeContract(_newAddress);
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
    function upgradeNftAdmin(string calldata _tokenUri, address _owner) onlyOwner external {
        _mint(_owner, nftCount);
        _setTokenURI(nftCount, _tokenUri);
        nftCount = nftCount + 1; 
    }  
    
    ////////////////////////////////////
    ///// CORE FUNCTIONS - ORACLE //////
    ////////////////////////////////////
    
    ///@notice called by xdai proxy via bridge, posts question to Oracle
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == oracleProxyXdaiAddress, "Not proxy");
        bytes32 _questionId = realitio.askQuestion(2, _question, arbitrator, timeout, _oracleResolutionTime, 0);
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    /// @dev can be called by anyone, reads winner from Oracle and sends to xdai proxy via bridge
    function getWinnerFromOracle(address _marketAddress) external returns(bool) {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        // if finalised, send result over to xDai proxy
        if (_isFinalized) {
            bytes32 _winningOutcome = realitio.resultFor(_questionId);
            bytes4 _methodSelector = IRCProxyXdai(address(0)).setWinner.selector;
            bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _winningOutcome);
            bridge.requireToPassMessage(oracleProxyXdaiAddress,data,200000);
        }
        return _isFinalized;
    }

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    function upgradeNft(string calldata _tokenUri, address _owner) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == oracleProxyXdaiAddress, "Not proxy");
        _mint(_owner, nftCount);
        _setTokenURI(nftCount, _tokenUri);
        nftCount = nftCount + 1; 
    }  
}
