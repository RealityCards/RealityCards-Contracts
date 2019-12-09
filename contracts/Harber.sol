pragma solidity ^0.5.0;
import "./interfaces/IERC721Full.sol";
import "./utils/SafeMath.sol";

interface IMarket 
{
    function getWinningPayoutNumerator(uint256 _outcome) external view returns (uint256);
}

interface ShareToken 

{
    function publicBuyCompleteSets(IMarket _market, uint256 _amount) external returns (bool)  ;
    function publicSellCompleteSets(IMarket _market, uint256 _amount) external returns (uint256 _creatorFee, uint256 _reportingFee) ;
}

interface Cash 
{
    function approve(address _spender, uint256 _amount) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function faucet(uint256 _amount) external;
    function transfer(address _to, uint256 _amount) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
}

contract Harber {
    
    using SafeMath for uint256;
    uint256 public constant version = 24;

    uint256 constant numberOfOutcomes = 2; //TEST with two teams
    uint256[numberOfOutcomes] public price; //in wei
    IERC721Full public team; // ERC721 NFT.
    
    //Augur contracts
    Cash public cash;
    
    uint256 public totalCollected; // total into my whiskey fund
    uint256[numberOfOutcomes] public currentCollected; // amount currently collected for owner  
    uint256[numberOfOutcomes] public timeLastCollected; // 
    uint256[numberOfOutcomes] public purchaseIndex;
    address payable public andrewsAddress;
    uint256 public augurFund;
    uint256 public peen = 2;


    struct purchase {
        address owner;
        uint price;
    }
    
    mapping (uint256 => mapping (address => bool) ) public owners;
    mapping (uint256 => mapping (uint256 => purchase) ) public ownerTracker;
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;
    mapping (uint256 => mapping (address => uint256) ) public deposits;
    mapping (address => uint256) public testDaiBalances;

    uint256[numberOfOutcomes] public timeAcquired;

    enum ownedState { Foreclosed, Owned }
    ownedState[numberOfOutcomes] public state;

    constructor(address payable _andrewsAddress, address _addressOfToken, address _addressOfCashContract) public {
        team = IERC721Full(_addressOfToken);
        team.setup();
        andrewsAddress = _andrewsAddress;
        state[0] = ownedState.Foreclosed;
        state[1] = ownedState.Foreclosed;

        //this variable is incremented before being used first so it needs to roll over to zero 
        purchaseIndex[0]=0;
        purchaseIndex[0] = purchaseIndex[0] -1;
        purchaseIndex[1]=0;
        purchaseIndex[1] = purchaseIndex[1] -1;

        //Augur specific:
        cash = Cash(_addressOfCashContract);
    } 

    event LogBuy(address indexed owner, uint256 indexed price);
    event LogPriceChange(uint256 indexed newPrice);
    event LogForeclosure(address indexed prevOwner);
    event LogCollection(uint256 indexed collected);
    event testEmit(uint256 indexed thing1, uint256 thing2);
    
    modifier onlyOwner(uint256 _tokenId) {
        require(msg.sender == team.ownerOf(_tokenId), "Not owner");
        _;
    }

    modifier collectAugurFunds(uint256 _tokenId) {
       _collectAugurFunds(_tokenId); 
       _;
    }

    /* public view functions */
    // function getTimeHeld(uint256 _tokenId, address _adress) public view returns (uint256)
    // {
    //     return timeHeld[_tokenId][_address];
    // }

    function getVersion() public pure returns(uint256)
    {
        return (version);
    }

    function getTestDai() public 
    {
        //// PUBLIC NETWORK VERSION
        // cash.faucet(100000000000000000000);
        // testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100000000000000000000;

        //// GANACHE VERSION
        testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100;
    }

    function getTestDaiBalance() public view returns (uint256)
    {
        return(testDaiBalances[msg.sender]);
    }

    function getOwnerTrackerPrice(uint256 _tokenId, uint256 _index) public view returns (uint256)
    {
        return (ownerTracker[_tokenId][_index].price);
    }

    function getOwnerTrackerAddress(uint256 _tokenId, uint256 _index) public view returns (address)
    {
        return (ownerTracker[_tokenId][_index].owner);
    }

    function getPrice(uint256 _tokenId) public view returns (uint256)
    {
        return price[_tokenId];
    }

    function augurFundsOwed(uint256 _tokenId) public view returns (uint256 augurFundsDue) {
        return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(365 days);
    }

    function augurFundsOwedWithTimestamp(uint256 _tokenId) public view returns (uint256 augurFundsDue, uint256 timestamp) {
        return (augurFundsOwed(_tokenId), now);
    }


    function foreclosed(uint256 _tokenId) public view returns (bool) {
        // returns whether it is in foreclosed state or not
        // depending on whether deposit covers patronage due
        // useful helper function when price should be zero, but contract doesn't reflect it yet.
        uint256 _collection = augurFundsOwed(_tokenId);
        if(_collection >= deposits[_tokenId][msg.sender]) {
            return true;
        } else {
            return false;
        }
    }

    // this is only used to calculate foreclosure time
    function liveDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) {
        uint256 _collection = augurFundsOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);
        if(_collection >= deposits[_tokenId][_currentOwner]) {
            return 0;
        } else {
            return deposits[_tokenId][_currentOwner].sub(_collection);
        }
    }

    //this is my version of the above function. It shows how much each user can withdraw- whether or not they are the current owner. 
    function userDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) {
        uint256 _collection = augurFundsOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender)
        {
            if(_collection >= deposits[_tokenId][msg.sender]) 
        {
            return 0;
        } else {
            return deposits[_tokenId][msg.sender].sub(_collection);
        }
        } else {
            return deposits[_tokenId][msg.sender];
        }
    }

    function rentalExpiryTime(uint256 _tokenId) public view returns (uint256) {
        // patronage per second
        
        uint256 pps = price[_tokenId].div(365 days);
        // peen = pps;
        // require(pps > 1000000000000, "pps is not greater than 0");
        if (pps == 0)
        {
            return now; //if price is so low that pps = 0 just return current time as a fallback
        }
        else
        {
            return now + liveDepositAbleToWithdraw(_tokenId).div(pps);
        }
    }

    /* actions */
    function _collectAugurFunds(uint256 _tokenId) public {
        // determine patronage to pay
        // require(1 > 2, "STFU");
        if (state[_tokenId] == ownedState.Owned) {
            
            uint256 _collection = augurFundsOwed(_tokenId);
            address _currentOwner = team.ownerOf(_tokenId);
            
            // should foreclose and stake stewardship
            if (_collection >= deposits[_tokenId][_currentOwner]) {
                // up to when was it actually paid for?
                timeLastCollected[_tokenId] = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(deposits[_tokenId][_currentOwner]).div(_collection)));
                _collection = deposits[_tokenId][_currentOwner]; // take what's left
                
                _foreclose(_tokenId);
                

            } else  {
                // just a normal collection
                timeLastCollected[_tokenId] = now;
                currentCollected[_tokenId] = currentCollected[_tokenId].add(_collection);
            }

            
            
            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_collection);
            
            totalCollected = totalCollected.add(_collection);
            augurFund = augurFund.add(_collection);
             
            emit LogCollection(_collection);
        }
    }
    
    // note: anyone can deposit
    function depositWei(uint256 _tokenId) public payable collectAugurFunds(_tokenId) {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(msg.value);
    }
    
    function buy(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) public collectAugurFunds(_tokenId) {
        emit testEmit(_newPrice,price[_tokenId]);

        require(_newPrice > price[_tokenId], "Price must be higher than current price");
        require(_deposit > 0, "Must deposit something");
        require(testDaiBalances[msg.sender] >= _deposit, "Not enough DAI");
        
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_deposit);
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_deposit);
        price[_tokenId] = _newPrice;

        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender)
        {
            ownerTracker[_tokenId][purchaseIndex[_tokenId]].price = _newPrice;
        }
        else
        {
            purchaseIndex[_tokenId] = purchaseIndex[_tokenId] + 1;
            transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
            ownerTracker[_tokenId][purchaseIndex[_tokenId]].price = _newPrice;
            ownerTracker[_tokenId][purchaseIndex[_tokenId]].owner = msg.sender; 
        }

        if(state[_tokenId] == ownedState.Foreclosed) 
        {
            state[_tokenId] = ownedState.Owned;
            timeLastCollected[_tokenId] = now;
        }

        emit LogBuy(msg.sender, _newPrice);
    }

    function changePrice(uint256 _newPrice, uint256 _tokenId) public onlyOwner(_tokenId) collectAugurFunds(_tokenId) {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        require(_newPrice > price[_tokenId], "New price must be higher than current price"); //This is to prevent griefing- buying it then immediately dropping the price really low. The original project did not suffer from this problem because when you bought it, you had to pay the purchase price to the previous user, not so in mine. 
        
        price[_tokenId] = _newPrice;
        ownerTracker[_tokenId][purchaseIndex[_tokenId]].price = _newPrice;
        emit LogPriceChange(price[_tokenId]);
    }
    
    function withdrawDeposit(uint256 _wei, uint256 _tokenId) public onlyOwner(_tokenId) collectAugurFunds(_tokenId) returns (uint256) {
        _withdrawDeposit(_wei, _tokenId);
    }

    function withdrawAugurFunds() public {
        require(msg.sender == andrewsAddress, "Not andrew");
        andrewsAddress.transfer(augurFund);
        augurFund = 0;
    }

    function exit(uint256 _tokenId) public onlyOwner(_tokenId) collectAugurFunds(_tokenId) {
        _withdrawDeposit(deposits[_tokenId][msg.sender],  _tokenId);
    }

    /* internal */

    function _withdrawDeposit(uint256 _wei, uint256 _tokenId) internal {
        // note: can withdraw whole deposit, which puts it in immediate to be foreclosed state.
        require(deposits[_tokenId][msg.sender] >= _wei, 'Withdrawing too much');

        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].sub(_wei);
        msg.sender.transfer(_wei); // msg.sender == patron

        if(deposits[_tokenId][msg.sender] == 0) {
            _foreclose(_tokenId);
        }
    }

    function _foreclose(uint256 _tokenId) internal {
        // become steward of artwork (aka foreclose)
        address _currentOwner = team.ownerOf(_tokenId);
        //final field is price, ie price goes to zero
        transferTokenTo(_currentOwner, address(this), 0, _tokenId);
        state[_tokenId] = ownedState.Foreclosed;
        currentCollected[_tokenId] = 0;

        emit LogForeclosure(_currentOwner);
    }

    function transferTokenTo(address _currentOwner, address _newOwner, uint256 _newPrice, uint256 _tokenId) internal {
        // note: it would also tabulate time held in stewardship by smart contract
        
        timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add((timeLastCollected[_tokenId].sub(timeAcquired[_tokenId])));
       
        team.transferFrom(_currentOwner, _newOwner, _tokenId);
        
        price[_tokenId] = _newPrice;
        timeAcquired[_tokenId] = now;
        owners[_tokenId][_newOwner] = true;
    }
}

                // require(1 > 2, "STFU");
