interface IAlternateReceiverBridge {
    function relayTokens(address _sender, address _receiver, uint256 _amount) external;
    function withinLimit(uint256 _amount) external view returns (bool);
}