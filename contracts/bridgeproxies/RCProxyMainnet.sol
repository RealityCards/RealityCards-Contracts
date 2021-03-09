// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    /// @dev contract variables
    IBridge public bridge;
    IAlternateReceiverBridge public alternateReceiverBridge;
    IERC20Dai public dai;
    IERC721 public nfthub;

    /// @dev governance variables
    address public proxyXdaiAddress;
    address public nftHubAddress;
    
    /// @dev dai deposits
    uint256 internal depositNonce;
    bool depositsEnabled = true;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(address _bridgeMainnetAddress, address _nftHubAddress, address _alternateReceiverAddress, address _daiAddress) {
        setBridgeMainnetAddress(_bridgeMainnetAddress);
        setNftHubAddress(_nftHubAddress);
        setAlternateReceiverAddress(_alternateReceiverAddress);
        setDaiAddress(_daiAddress); 
    }

    ////////////////////////////////////
    //////////// EVENTS ////////////////
    ////////////////////////////////////

    event DaiDeposited(address indexed user, uint256 amount, uint256 nonce);

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
        bridge = IBridge(_newAddress);
    }

    /// @dev address of alternate receiver bridge, mainnet side
    function setNftHubAddress(address _newAddress) onlyOwner public {
        nfthub = IERC721(_newAddress);
    }

    /// @dev address of alternate receiver bridge, mainnet side
    function setAlternateReceiverAddress(address _newAddress) onlyOwner public {
        alternateReceiverBridge = IAlternateReceiverBridge(_newAddress);
    }

    /// @dev address of dai contract, must also approve the ARB
    function setDaiAddress(address _newAddress) onlyOwner public {
        dai = IERC20Dai(_newAddress);
        dai.approve(address(alternateReceiverBridge), 2**256 - 1);
    }

    ////////////////////////////////////
    //// GOVERNANCE - NFT UPGRADES /////
    ////////////////////////////////////

    /// @dev admin can create NFTs
    /// @dev for situations where bridge failed
    function upgradeCardAdmin(uint256 _newTokenId, string calldata _tokenUri, address _owner) onlyOwner external {
        nfthub.mintNft(_newTokenId, _tokenUri, _owner);
    }  

    ////////////////////////////////////
    ///// GOVERNANCE - DAI BRIDGE //////
    ////////////////////////////////////

    function enableOrDisableDeposits() onlyOwner external {
        depositsEnabled = depositsEnabled ? false : true;
    }

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    /// @notice mints NFT with metadata as sent by proxy
    function upgradeCard(uint256 _newTokenId, string calldata _tokenUri, address _owner) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == proxyXdaiAddress, "Not proxy");
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
        require(dai.transferFrom(_sender, address(this), _amount), "Token transfer failed");
        alternateReceiverBridge.relayTokens(address(this), proxyXdaiAddress, _amount);
        emit DaiDeposited(_sender, _amount, depositNonce++);
    }
}
