pragma solidity 0.5.13;

interface IRCProxyMainnet
{
    function postQuestionToOracle(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external;
    function upgradeNft(uint256,string calldata, address) external;
}