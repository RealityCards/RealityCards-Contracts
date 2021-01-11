pragma solidity 0.5.13;

interface IRCProxyXdai {
    function setWinner(address _marketAddress, uint256 _winningOutcome) external;
    function sendQuestionToBridge(address _marketAddress, string calldata _question, uint32 _oracleResolutionTime) external;
    function isFinalized(address _marketAddress) external view returns(bool);
    function getWinner(address _marketAddress) external view returns(uint256); 
    function upgradeCard(uint256, string calldata, address) external;
    function addMarket(address) external returns (bool);
}