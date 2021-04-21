// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.3;

interface IRCProxyXdai {
    function setWinner(address _marketAddress, uint256 _winningOutcome)
        external;

    function postQuestionToOracle(
        address _marketAddress,
        string calldata _question,
        uint32 _oracleResolutionTime
    ) external;

    function isFinalized(address _marketAddress) external view returns (bool);

    function getWinner(address _marketAddress) external view returns (uint256);

    function saveCardToUpgrade(
        uint256,
        string calldata,
        address
    ) external;

    function addMarket(address) external;

    function confirmDaiDeposit(
        address _user,
        uint256 _amount,
        uint256 _nonce
    ) external;

    function setAmicableResolution(
        address _marketAddress,
        uint256 _winningOutcome
    ) external;
}
