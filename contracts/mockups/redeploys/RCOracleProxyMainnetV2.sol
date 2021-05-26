// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "../../interfaces/IRealitio.sol";
import "../../interfaces/IRCProxyL2.sol";
import "../../interfaces/IBridge.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// a mockup to test changing the proxy, this is as per the original but always returns winner of 69
contract RCProxyL1V2 is Ownable {
    IRealitio public realitio;
    IBridge public bridge;

    address public oracleProxyXdaiAddress;
    address public arbitrator;
    uint32 public timeout;

    mapping(address => bytes32) public questionIds;

    // CONSTRUCTOR

    constructor(address _bridgeMainnetAddress, address _realitioAddress) {
        setBridgeXdaiAddress(_bridgeMainnetAddress);
        setRealitioAddress(_realitioAddress);
        setArbitrator(0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D); //kleros
        setTimeout(86400); // 24 hours
    }

    // OWNED FUNCTIONS

    /// @dev not set in constructor, address not known at deployment
    function setProxyL2Address(address _newAddress) external onlyOwner {
        oracleProxyXdaiAddress = _newAddress;
    }

    function setBridgeXdaiAddress(address _newAddress) public onlyOwner {
        bridge = IBridge(_newAddress);
    }

    function setRealitioAddress(address _newAddress) public onlyOwner {
        realitio = IRealitio(_newAddress);
    }

    function setArbitrator(address _newAddress) public onlyOwner {
        arbitrator = _newAddress;
    }

    function setTimeout(uint32 _newTimeout) public onlyOwner {
        timeout = _newTimeout;
    }

    // POSTING QUESTION TO THE ORACLE

    function postQuestionToOracle(
        address _marketAddress,
        string calldata _question,
        uint32 _oracleResolutionTime
    ) external {
        require(msg.sender == address(bridge), "Not bridge");
        require(bridge.messageSender() == oracleProxyXdaiAddress, "Not proxy");
        // hard coded values
        uint256 _template_id = 2;
        uint256 _nonce = 0;
        // post to Oracle
        bytes32 _questionId =
            realitio.askQuestion(
                _template_id,
                _question,
                arbitrator,
                timeout,
                _oracleResolutionTime,
                _nonce
            );
        questionIds[_marketAddress] = _questionId;
    }

    // GETTING THE WINNER FROM THE ORACLE AND PASSING TO XDAI PROXY

    /// @dev can be called by anyone
    function getWinnerFromOracle(address _marketAddress)
        external
        returns (bool)
    {
        bytes32 _questionId = questionIds[_marketAddress];
        bool _isFinalized = realitio.isFinalized(_questionId);

        // if finalised, send result over to xDai proxy
        if (_isFinalized) {
            bytes32 _winningOutcome = bytes32(uint256(69));
            bytes4 _methodSelector = IRCProxyL2(address(0)).setWinner.selector;
            bytes memory data =
                abi.encodeWithSelector(
                    _methodSelector,
                    _marketAddress,
                    _winningOutcome
                );
            bridge.requireToPassMessage(oracleProxyXdaiAddress, data, 200000);
        }

        return _isFinalized;
    }
}
