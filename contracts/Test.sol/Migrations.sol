pragma solidity 0.6.6;
import "@openzeppelin/contracts/access/Ownable.sol";

contract TEST is Ownable {
    
    address public owner;
    uint public last_completed_migration;

}
