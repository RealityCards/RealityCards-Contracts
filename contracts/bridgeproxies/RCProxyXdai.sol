pragma solidity 0.5.13;

import "hardhat/console.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import '../interfaces/IRCProxyMainnet.sol';
import '../interfaces/IBridgeContract.sol';
import '../interfaces/IRCMarket.sol';

/// @title Reality Cards Proxy- xDai side
/// @author Andrew Stanger
contract RCProxyXdai is Ownable
{
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev contract variables
    IBridgeContract public bridge;

    /// @dev governance variables
    address public oracleProxyMainnetAddress;
    address public factoryAddress;
    
    /// @dev market resolution variables
    mapping (address => bool) public marketFinalized;
    mapping (address => uint256) public winningOutcome;

    /// @dev so only markets can upgrade NFTs
    mapping (address => bool) public isMarket;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(address _bridgeXdaiAddress, address _factoryAddress) public {
        setBridgeXdaiAddress(_bridgeXdaiAddress);
        setFactoryAddress(_factoryAddress);
    }

    ////////////////////////////////////
    //////////// ADD MARKETS ///////////
    ////////////////////////////////////

    /// @dev so only RC NFTs can be upgraded
    function addMarket(address _newMarket) external returns(bool) {
        require(msg.sender == factoryAddress, "Not factory");
        isMarket[_newMarket] = true;
        return true;
    }
    
    ////////////////////////////////////
    ////////// GOVERNANCE //////////////
    ////////////////////////////////////
    
    /// @dev address of mainnet oracle proxy, called by the mainnet side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    function setProxyMainnetAddress(address _newAddress) onlyOwner external {
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

    /// @dev admin override of the Oracle, if not yet settled, for amicable resolution, or bridge fails
    function setAmicableResolution(address _marketAddress, uint256 _winningOutcome) onlyOwner public {
        require(!marketFinalized[_marketAddress], "Event finalised");
        marketFinalized[_marketAddress] = true;
        winningOutcome[_marketAddress] = _winningOutcome;
    }
    
    ////////////////////////////////////
    ///// CORE FUNCTIONS - ORACLE //////
    ////////////////////////////////////

    /// @dev called by factory upon market creation, posts question to Oracle via arbitrary message bridge
    function sendQuestionToBridge(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external {
        require(msg.sender == factoryAddress, "Not factory");
        bytes4 _methodSelector = IRCProxyMainnet(address(0)).postQuestionToOracle.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _marketAddress, _question, _oracleResolutionTime);
        bridge.requireToPassMessage(oracleProxyMainnetAddress,data,200000);
    }
    
    /// @dev called by mainnet oracle proxy via the arbitrary message bridge, sets the winning outcome
    function setWinner(address _marketAddress, uint256 _winningOutcome) external {
        require(!marketFinalized[_marketAddress], "Event finalised");
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

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    function upgradeNft(uint256 _tokenId, string calldata _tokenUri, address _owner) external {
        require(isMarket[msg.sender], "Not market");
        bytes4 _methodSelector = IRCProxyMainnet(address(0)).upgradeNft.selector;
        bytes memory data = abi.encodeWithSelector(_methodSelector, _tokenId, _tokenUri, _owner);
        bridge.requireToPassMessage(oracleProxyMainnetAddress,data,200000);
    }
}