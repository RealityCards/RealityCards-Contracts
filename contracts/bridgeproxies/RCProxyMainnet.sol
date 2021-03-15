// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IRCProxyXdai.sol";
import "../interfaces/IBridge.sol";
import "../interfaces/IAlternateReceiverBridge.sol";
import "../interfaces/IERC20Dai.sol";
import "../interfaces/IERC721.sol";

/// @title Reality Cards Proxy- Mainnet side
/// @author Andrew Stanger, Marvin Kruse & Daniel Chilvers
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCProxyMainnet is Ownable {
    using SafeMath for uint256;

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
    bool internal depositsEnabled = true;

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(
        address _bridgeMainnetAddress,
        address _nftHubAddress,
        address _alternateReceiverAddress,
        address _daiAddress
    ) {
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

    /// @notice address of xdai oracle proxy, called by the xdai side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    /// @param _newAddress the new address to set
    function setProxyXdaiAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        proxyXdaiAddress = _newAddress;
    }

    /// @notice to set the address of arbitrary message bridge, mainnet side
    /// @param _newAddress the new address to set
    function setBridgeMainnetAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        bridge = IBridge(_newAddress);
    }

    /// @notice to set the address of the NftHub
    /// @param _newAddress the new address to set
    function setNftHubAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        nfthub = IERC721(_newAddress);
    }

    /// @notice the address of alternate receiver bridge, mainnet side
    /// @param _newAddress the new address to set
    function setAlternateReceiverAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        alternateReceiverBridge = IAlternateReceiverBridge(_newAddress);
    }

    /// @notice to set the address of dai contract
    /// @dev must also approve the ARB
    /// @param _newAddress the new address to set
    function setDaiAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        dai = IERC20Dai(_newAddress);
        dai.approve(address(alternateReceiverBridge), type(uint256).max);
    }

    ////////////////////////////////////
    //// GOVERNANCE - NFT UPGRADES /////
    ////////////////////////////////////

    /// @dev admin can create NFTs
    /// @dev for situations where bridge failed
    function upgradeCardAdmin(
        uint256 _newTokenId,
        string calldata _tokenUri,
        address _owner
    ) external onlyOwner {
        require(_owner != address(0), "Must set an address");
        nfthub.mintNft(_newTokenId, _tokenUri, _owner);
    }

    ////////////////////////////////////
    ///// GOVERNANCE - DAI BRIDGE //////
    ////////////////////////////////////

    /// @notice toggles depsoits allowed or not
    function changeDepositsEnabled() external onlyOwner {
        depositsEnabled = !depositsEnabled;
    }

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    /// @notice mints NFT with metadata as sent by proxy
    function upgradeCard(
        uint256 _newTokenId,
        string calldata _tokenUri,
        address _owner
    ) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == proxyXdaiAddress, "Not proxy");
        require(_owner != address(0), "Must set an address");
        nfthub.mintNft(_newTokenId, _tokenUri, _owner);
    }

    ////////////////////////////////////
    //// CORE FUNCTIONS - DAI BRIDGE ///
    ////////////////////////////////////

    /// @notice Deposit Dai to the Treasury
    /// @dev user deposit assuming prior approval
    /// @param _amount the value to send in wei
    function depositDai(uint256 _amount) external {
        _depositDai(msg.sender, _amount);
    }

    /// @notice Deposit Dai without prior approval
    function permitAndDepositDai(
        address holder,
        address spender,
        uint256 nonce,
        uint256 expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 _amount
    ) external {
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
