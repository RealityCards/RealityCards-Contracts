pragma solidity 0.5.13;

interface IRCOracleProxyMainnet
{
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external;
    function number() external returns(uint);
}