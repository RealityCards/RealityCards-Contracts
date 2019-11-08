pragma solidity >=0.4.22 <0.6.0;

contract harber {
    
    mapping (uint => Team) teamList;
    
    struct Team {
        string name;
        address currentOwner;
        uint currentPrice;
       // address augurMarket;
       // uint blockNumberToResolve;
     //    address[] ownershipChangeAddresses;
     //   uint[] ownershipChangeBlockNumbers
    }
    
    constructor () public {
        Team memory manu = Team ('Manchester United', 0x0000000000000000000000000000000000000000, 0 );
        Team memory liverpool = Team ('Liverpool', 0x0000000000000000000000000000000000000000, 0 );
        teamList[0] = manu;
        teamList[1] = liverpool;
    }
    
    function getTeamDetails (uint _teamId) view public returns (string memory, address, uint)
    {
        Team memory team = teamList[_teamId];
        return (team.name, team.currentOwner, team.currentPrice);
    }
}