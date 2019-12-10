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
    
    // CONTRACT VARIABLES
    IERC721Full public team; // ERC721 NFT.
    Cash public cash; //Augur contracts

    // UINTS AND ADDRESSES
    address payable public andrewsAddress; // I am the original owner of tokens, and ownership reverts to me should the sale foreclose. I.e.  I am default owner if there is nobody else that wants it
    uint256 public constant version = 24;
    uint256 constant numberOfOutcomes = 2; //TEST with two teams
    uint256[numberOfOutcomes] public price; //in wei
    uint256 public totalCollected; // total collected across all tokens, ie sum of  currentCollected and = amount to send to  augur
    uint256[numberOfOutcomes] public currentCollected; // amount currently collected for each token, ie the sum of all owner's patronage  
    uint256[numberOfOutcomes] public timeLastCollected; 
    uint256[numberOfOutcomes] public timeAcquired;
    uint256[numberOfOutcomes] public currentOwnerIndex; // tracks the position of the current owner in the ownerTracker mapping
    uint256 public testingVariable = 0;

    //  STRUCTS
    struct purchase {
        address owner;
        uint price;
    }
    
    // MAPPINGS
    mapping (uint256 => mapping (address => bool) ) public owners;
    mapping (uint256 => mapping (uint256 => purchase) ) public ownerTracker; //keeps track of all owners of a token, including the price, so that if the current owner's deposit runs out, ownership can  be reverted to a previous owner. Index 0 is NOT used, this tells the contract to foreclose
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;
    mapping (uint256 => mapping (address => uint256) ) public deposits; //keeps track of all the deposits for each token, for each owner. Consider lumping this in with ownerTracker
    mapping (address => uint256) public testDaiBalances;

    // ENUMS
    enum ownedState { Foreclosed, Owned }
    ownedState[numberOfOutcomes] public state;

    constructor(address payable _andrewsAddress, address _addressOfToken, address _addressOfCashContract) public {
        team = IERC721Full(_addressOfToken);
        team.setup();
        andrewsAddress = _andrewsAddress;
        state[0] = ownedState.Foreclosed;
        state[1] = ownedState.Foreclosed;

        //this variable is incremented before being used first so the 0 index will never contain a price/address. A zero index is used in the _revertToPreviousOwner  function to commence foreclosure
        currentOwnerIndex[0]=0;
        currentOwnerIndex[1]=0;

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
        uint256 pps = price[_tokenId].div(365 days);
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
        if (state[_tokenId] == ownedState.Owned) {
            
            uint256 _collection = augurFundsOwed(_tokenId);
            address _currentOwner = team.ownerOf(_tokenId);
            
            // run out of deposit. Revert to Previous owner. 
            if (_collection >= deposits[_tokenId][_currentOwner]) {
                // up to when was it actually paid for?
                timeLastCollected[_tokenId] = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(deposits[_tokenId][_currentOwner]).div(_collection)));
                _collection = deposits[_tokenId][_currentOwner]; // take what's left     
                _revertToPreviousOwner(_tokenId);
                
            } else  {
                // just a normal collection
                timeLastCollected[_tokenId] = now;
                currentCollected[_tokenId] = currentCollected[_tokenId].add(_collection);
            }

            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_collection);
            
            totalCollected = totalCollected.add(_collection);
             
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
            ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        }
        else
        {
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId] + 1; 
            // currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].add(1);
            //^^ the above line causes VM errors, I need to figure out why
            _transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
            ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
            ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].owner = msg.sender; 
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
        ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        emit LogPriceChange(price[_tokenId]);
    }
    
    function withdrawDeposit(uint256 _wei, uint256 _tokenId) public onlyOwner(_tokenId) collectAugurFunds(_tokenId) returns (uint256) {
        _withdrawDeposit(_wei, _tokenId);
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

    function _revertToPreviousOwner(uint256 _tokenId) internal {
        bool _reverted = false;
        while (_reverted == false)
        {
            testingVariable = testingVariable + 1;
            require(testingVariable < 10, "pls");
            assert(currentOwnerIndex[_tokenId] >=0);
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId] - 1;
            uint256 _index = currentOwnerIndex[_tokenId]; //just for readability
            address _previousOwner = ownerTracker[_tokenId][_index].owner;

            if (_index == 0) 
            //no previous owners. price -> zero, owned by me
            {
                require(1 > 2, "STFU");
                _foreclose(_tokenId);
                _reverted = true;
            }
            else if (deposits[_tokenId][_previousOwner] > 0)
            // previous owner still has a deposit, transfer to them, update thep rice to what it used to be
            {
                require(1 > 2, "STFU");
                address _currentOwner = team.ownerOf(_tokenId);
                uint256 _oldPrice = ownerTracker[_tokenId][_index].price;
                _transferTokenTo(_currentOwner, msg.sender, _oldPrice, _tokenId);
                _reverted = true;
            }
        }       
    }

    function _foreclose(uint256 _tokenId) internal {
        // I become steward of artwork (aka foreclose)
        address _currentOwner = team.ownerOf(_tokenId);
        //third field is price, ie price goes to zero
        _transferTokenTo(_currentOwner, andrewsAddress, 0, _tokenId);
        state[_tokenId] = ownedState.Foreclosed;
        currentCollected[_tokenId] = 0;

        emit LogForeclosure(_currentOwner);
    }

    function _transferTokenTo(address _currentOwner, address _newOwner, uint256 _newPrice, uint256 _tokenId) internal {
        // note: it would also tabulate time held in stewardship by smart contract
        
        timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add((timeLastCollected[_tokenId].sub(timeAcquired[_tokenId])));
       
        team.transferFrom(_currentOwner, _newOwner, _tokenId);
        
        price[_tokenId] = _newPrice;
        timeAcquired[_tokenId] = now;
        owners[_tokenId][_newOwner] = true;
    }
}

                // require(1 > 2, "STFU");
