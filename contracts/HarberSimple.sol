pragma solidity ^0.5.0;

contract HarberSimple {
    
    uint256 public constant version = 21;

    function getVersion() public pure returns(uint256)
    {
        return (version);
    }

}