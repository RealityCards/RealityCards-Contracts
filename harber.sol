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
       //address[] ownershipChangeAddresses;
       uint[] ownershipChangeBlockNumbers;
    }
    
    constructor () public {
        Team memory manu;
        manu.name = 'Manchester United';
        manu.currentOwner = noOwner;
        manu.currentPrice = 0;
        
        // Team memory liverpool = Team ('Liverpool', noOwner, 0, new uint[](2)  );
        teamList[0] = manu;
        // teamList[1] = liverpool;
    }
    
    function getTeamDetails (uint _teamId) view public returns (string memory, address, uint, uint[] memory)
    {
        Team memory team = teamList[_teamId];
        return (team.name, team.currentOwner, team.currentPrice, team.ownershipChangeBlockNumbers);
    }
    
    
    
    
    
}