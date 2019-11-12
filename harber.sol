pragma solidity >=0.4.22 <0.6.0;

contract harber {
    
    address public augurMarket = 0x800c4073ab02dA14B161C1bc1Da074c241F9B377;
    uint blockNumberToResolve = 6000000;
    address noOwner = 0x0000000000000000000000000000000000000000;
    
    mapping (uint => Team) teamList;
    
    struct Team {
        string name;
        address currentOwner;
        uint currentPrice;
        // address[] ownershipChangeAddress;
        // uint[] ownershipChangeBlockNumber;
    }
    
    constructor () public {
        Team memory manu;
        manu.name = 'Manchester United';
        manu.currentOwner = noOwner;
        manu.currentPrice = 0;
        teamList[0] = manu;
        Team memory liverpool;
        manu.name = 'Liverpool';
        manu.currentOwner = noOwner;
        manu.currentPrice = 0;
        teamList[1] = liverpool;
    }
    
    function getTeamDetails (uint _teamId) view public returns (string memory, address, uint)
    {
        Team memory team = teamList[_teamId];
        return (team.name, team.currentOwner, team.currentPrice);
    }
    
    function buyTeam (uint _teamId, uint _price) payable public {
        Team storage team = teamList[_teamId];
        require(team.currentPrice < _price);
        team.currentOwner = msg.sender;
        team.currentPrice = _price;
        // team.ownershipChangeBlockNumber.push(block.number);
        // team.ownershipChangeAddress.push(msg.sender);
        teamList[_teamId] = team; 

    }
    
    
}