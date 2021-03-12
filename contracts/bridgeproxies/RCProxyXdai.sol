// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IRCProxyMainnet.sol";
import "../interfaces/IBridge.sol";
import "../interfaces/IRCMarket.sol";
import "../interfaces/ITreasury.sol";
import "../interfaces/IRealitio.sol";

/// @title Reality Cards Proxy- xDai side
/// @author Andrew Stanger & Marvin Kruse
/// @notice If you have found a bug, please contact andrew@realitycards.io- no hack pls!!
contract RCProxyXdai is Ownable {
    using SafeMath for uint256;
    ////////////////////////////////////
    //////// VARIABLES /////////////////
    ////////////////////////////////////

    ///// CONTRACT VARIABLES /////
    IBridge public bridge;
    IRealitio public realitio;

    ///// GOVERNANCE VARIABLES /////
    address public proxyMainnetAddress;
    address public factoryAddress;
    address public treasuryAddress;

    ///// ORACLE VARIABLES /////
    mapping(address => bytes32) public questionIds;
    mapping(address => bool) public questionFinalised;
    address public arbitrator;
    uint32 public timeout;

    ///// NFT UPGRADE VARIABLES /////
    mapping(address => bool) public isMarket;
    mapping(uint256 => NFT) public upgradedNftId;
    struct NFT {
        string tokenURI;
        address owner;
        bool set;
    }

    ///// DAI->XDAI BRIDGE VARIABLES /////
    uint256 public constant MAINNET_BRIDGE_GAS_COST = 200000;
    uint256 public validatorCount;
    mapping(address => bool) public isValidator;
    mapping(uint256 => Deposit) public deposits;
    mapping(uint256 => mapping(address => bool)) public hasConfirmedDeposit;
    /// @dev so only the float can be withdrawn and no more
    uint256 public floatSize;
    struct Deposit {
        address user;
        uint256 amount;
        uint256 confirmations;
        bool confirmed;
        bool executed;
    }

    ////////////////////////////////////
    //////// EVENTS ////////////////////
    ////////////////////////////////////

    event LogFloatIncreased(address indexed funder, uint256 amount);
    event LogFloatWithdrawn(address indexed recipient, uint256 amount);
    event LogDepositConfirmed(uint256 indexed nonce);
    event LogDepositExecuted(uint256 indexed nonce);
    event LogQuestionPostedToOracle(address indexed marketAddress, bytes32 indexed questionId);

    ////////////////////////////////////
    ////////// CONSTRUCTOR /////////////
    ////////////////////////////////////

    constructor(
        address _bridgeXdaiAddress,
        address _factoryAddress,
        address _treasuryAddress,
        address _realitioAddress,
        address _arbitratorAddress
    ) {
        // general
        setBridgeXdaiAddress(_bridgeXdaiAddress);
        setFactoryAddress(_factoryAddress);
        setTreasuryAddress(_treasuryAddress);
        // oracle
        setArbitrator(_arbitratorAddress);
        setRealitioAddress(_realitioAddress);
        setTimeout(86400); // 24 hours
    }

    ////////////////////////////////////
    //////////// ADD MARKETS ///////////
    ////////////////////////////////////

    /// @dev so only RC NFTs can be upgraded
    function addMarket(address _newMarket) external {
        require(msg.sender == factoryAddress, "Not factory");
        isMarket[_newMarket] = true;
    }

    ////////////////////////////////////
    /////// GOVERNANCE - SETUP /////////
    ////////////////////////////////////

    /// @dev address of mainnet oracle proxy, called by the mainnet side of the arbitrary message bridge
    /// @dev not set in constructor, address not known at deployment
    function setProxyMainnetAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        proxyMainnetAddress = _newAddress;
    }

    /// @dev address of arbitrary message bridge, xdai side
    function setBridgeXdaiAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        bridge = IBridge(_newAddress);
    }

    /// @dev address of RC factory contract, so only factory can post questions
    function setFactoryAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        factoryAddress = _newAddress;
    }

    /// @dev address of RC treasury contract
    function setTreasuryAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        treasuryAddress = _newAddress;
    }

    ////////////////////////////////////
    /////// GOVERNANCE - ORACLE ////////
    ////////////////////////////////////

    /// @dev admin override of the Oracle, if not yet settled
    function setAmicableResolution(address _marketAddress, uint256 _winningOutcome) external onlyOwner {
        questionFinalised[_marketAddress] = true;
        IRCMarket market = IRCMarket(_marketAddress);
        market.setWinner(_winningOutcome);
    }

    /// @dev address reality.eth contracts
    function setRealitioAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        realitio = IRealitio(_newAddress);
    }

    /// @dev address of arbitrator, in case of continued disputes on reality.eth
    function setArbitrator(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Must set an address");
        arbitrator = _newAddress;
    }

    /// @dev how long reality.eth waits for disputes before finalising
    function setTimeout(uint32 _newTimeout) public onlyOwner {
        timeout = _newTimeout;
    }

    ////////////////////////////////////
    ///// GOVERNANCE - DAI BRIDGE //////
    ////////////////////////////////////

    /// @dev impossible to withdraw user funds, only added float
    function withdrawFloat(uint256 _amount) external onlyOwner {
        // will throw an error if goes negative because safeMath
        floatSize = floatSize.sub(_amount);
        address _thisAddressNotPayable = owner();
        address payable _recipient = address(uint160(_thisAddressNotPayable));
        (bool _success, ) = _recipient.call{ value: _amount }("");
        require(_success, "Transfer failed");
        emit LogFloatWithdrawn(msg.sender, _amount);
    }

    /// @dev modify validators for dai deposits
    function setValidator(address _validatorAddress, bool _add) external onlyOwner {
        require(_validatorAddress != address(0), "Must set an address");
        if (_add) {
            if (!isValidator[_validatorAddress]) {
                isValidator[_validatorAddress] = true;
                validatorCount = validatorCount.add(1);
            }
        } else {
            if (isValidator[_validatorAddress]) {
                isValidator[_validatorAddress] = false;
                validatorCount = validatorCount.sub(1);
            }
        }
    }

    ////////////////////////////////////
    ///// CORE FUNCTIONS - ORACLE //////
    ////////////////////////////////////

    /// @dev called by factory upon market creation (thus impossible to be called twice), posts question to reality.eth
    function postQuestionToOracle(
        address _marketAddress,
        string calldata _question,
        uint32 _oracleResolutionTime
    ) external {
        require(msg.sender == factoryAddress, "Not factory");
        bytes32 _questionId = realitio.askQuestion(2, _question, arbitrator, timeout, _oracleResolutionTime, 0);
        questionIds[_marketAddress] = _questionId;
        emit LogQuestionPostedToOracle(_marketAddress, _questionId);
    }

    /// @notice has the oracle finalised
    function isFinalized(address _marketAddress) public view returns (bool) {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);
        return _isFinalized;
    }

    /// @dev sets the winning outcome
    /// @dev market.setWinner() will revert if done twice, because wrong state
    function getWinnerFromOracle(address _marketAddress) external {
        require(isFinalized(_marketAddress), "Oracle not finalised");
        questionFinalised[_marketAddress] = true;
        bytes32 _questionId = questionIds[_marketAddress];
        bytes32 _winningOutcome = realitio.resultFor(_questionId);
        // call the market
        IRCMarket market = IRCMarket(_marketAddress);
        market.setWinner(uint256(_winningOutcome));
    }

    ////////////////////////////////////
    /// CORE FUNCTIONS - NFT UPGRADES //
    ////////////////////////////////////

    function saveCardToUpgrade(
        uint256 _tokenId,
        string calldata _tokenUri,
        address _owner
    ) external {
        require(isMarket[msg.sender], "Not market");
        // assert because should be impossible to call this twice because upgraded card returned to market
        assert(!upgradedNftId[_tokenId].set);
        upgradedNftId[_tokenId].tokenURI = _tokenUri;
        upgradedNftId[_tokenId].owner = _owner;
        upgradedNftId[_tokenId].set = true;
        postCardToUpgrade(_tokenId);
    }

    /// @dev card is upgraded in a different function so it can be called again if bridge fails
    /// @dev no harm if called again after successful posting because can't mint nft with same tokenId twice
    function postCardToUpgrade(uint256 _tokenId) public {
        require(upgradedNftId[_tokenId].set, "Nft not set");
        bytes4 _methodSelector = IRCProxyMainnet(address(0)).upgradeCard.selector;
        bytes memory data =
            abi.encodeWithSelector(_methodSelector, _tokenId, upgradedNftId[_tokenId].tokenURI, upgradedNftId[_tokenId].owner);
        bridge.requireToPassMessage(proxyMainnetAddress, data, MAINNET_BRIDGE_GAS_COST);
    }

    ////////////////////////////////////
    //// CORE FUNCTIONS - DAI BRIDGE ///
    ////////////////////////////////////

    /// @dev add a float, so no need to wait for arrival of xdai from ARB
    receive() external payable {
        floatSize = floatSize.add(msg.value);
        emit LogFloatIncreased(msg.sender, msg.value);
    }

    /// @dev called by off chain validator, in response to deposit on mainnet
    function confirmDaiDeposit(
        address _user,
        uint256 _amount,
        uint256 _nonce
    ) external {
        require(isValidator[msg.sender], "Not a validator");

        // If the deposit is new, create it
        if (deposits[_nonce].user == address(0)) {
            Deposit memory newDeposit = Deposit(_user, _amount, 0, false, false);
            deposits[_nonce] = newDeposit;
        }

        // Only valid if these match
        require(deposits[_nonce].user == _user, "Addresses don't match");
        require(deposits[_nonce].amount == _amount, "Amounts don't match");

        // Add 1 confirmation, if this hasn't been done already
        if (!hasConfirmedDeposit[_nonce][msg.sender]) {
            hasConfirmedDeposit[_nonce][msg.sender] = true;
            deposits[_nonce].confirmations = deposits[_nonce].confirmations.add(1);
        }

        // Confirm if enough confirms and pass over for execution
        if (!deposits[_nonce].confirmed && deposits[_nonce].confirmations >= (validatorCount.div(2)).add(1)) {
            deposits[_nonce].confirmed = true;
            executeDaiDeposit(_nonce);
            emit LogDepositConfirmed(_nonce);
        }
    }

    /// @dev deposits xDai into the Treasury (if allowed) otherwise send to user
    function executeDaiDeposit(uint256 _nonce) public {
        require(deposits[_nonce].confirmed, "Not confirmed");
        require(!deposits[_nonce].executed, "Already executed");
        uint256 _amount = deposits[_nonce].amount;
        address _user = deposits[_nonce].user;
        if (address(this).balance >= _amount) {
            deposits[_nonce].executed = true;
            emit LogDepositExecuted(_nonce);
            ITreasury treasury = ITreasury(treasuryAddress);
            // if Treasury will allow the deposit and globalPause is off, send it there
            if (address(treasury).balance.add(_amount) <= treasury.maxContractBalance() && !treasury.globalPause()) {
                assert(treasury.deposit{ value: _amount }(_user));
                // otherwise, just send to the user
            } else {
                address payable _recipient = address(uint160(_user));
                (bool _success, ) = _recipient.call{ value: _amount }("");
                require(_success, "Transfer failed");
            }
        }
    }
}
