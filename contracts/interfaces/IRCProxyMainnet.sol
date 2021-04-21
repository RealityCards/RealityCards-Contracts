// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.3;

interface IRCProxyMainnet {
    function postQuestionToOracle(
        address _marketAddress,
        string calldata _question,
        uint32 _oracleResolutionTime
    ) external;

    function upgradeCard(
        uint256,
        string calldata,
        address
    ) external;

    function depositDai(uint256 _amount) external;

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
    ) external;
}
