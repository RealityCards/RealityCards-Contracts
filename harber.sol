pragma solidity >=0.4.22 <0.6.0;

contract harber {
    
    address public augurMarket = 0x800c4073ab02dA14B161C1bc1Da074c241F9B377;
    uint blockNumberToResolve = 6000000;
    address noOwner = 0x0000000000000000000000000000000000000000;
    uint augurAccount;

    event taxCollected(uint indexed taxOwed, uint indexed augurAccount);
    
    mapping (uint => Team) teamList;
    
    struct Team {
        string name;
        address currentOwner;
        uint currentPrice;
        uint timeLastCollected;
        uint balance;
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

    function collectTax (uint _teamId) public {
    	// for now we will have 100% tax per day
    	Team storage team = teamList[_teamId];
    	uint secondsInADay =  60 * 60 * 24;
    	uint timeSinceLastCollected = now - team.timeLastCollected;
    	uint taxOwed = (team.currentPrice * timeSinceLastCollected) / secondsInADay;

    	if (taxOwed < team.balance) {
    		team.balance = team.balance - taxOwed;
    		augurAccount = augurAccount + taxOwed;
    		team.timeLastCollected = now;
    	}
    	else
    	{
    		augurAccount = augurAccount + team.balance;
    		team.balance = 0;
    		team.timeLastCollected = now;
    		// foreclose(teamId)
    	}
    	emit taxCollected(taxOwed,augurAccount);
    	
    }

    function getAugurBalance () view public returns (uint)
    {
    	return augurAccount;
    }
    
    function getTeamDetails (uint _teamId) view public returns (string memory, address, uint, uint, uint)
    {
        Team memory team = teamList[_teamId];
        return (team.name, team.currentOwner, team.currentPrice, team.timeLastCollected, team.balance);
    }
    
    function buyTeam (uint _teamId, uint _price) payable public {
        Team storage team = teamList[_teamId];
    	require(team.currentPrice < _price, "Price must be higher than previous price");
    	require(msg.value > 0, "You must deposit something");
        team.currentOwner = msg.sender;
        team.balance = team.balance + msg.value;
        team.currentPrice = _price;
        team.timeLastCollected = now;
        teamList[_teamId] = team; 

    }
    
    
}