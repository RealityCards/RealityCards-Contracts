pragma solidity ^0.5.0;
import "./interfaces/IERC721Full.sol";
import "./utils/SafeMath.sol";


contract Harber {
    
    using SafeMath for uint256;
    

    uint256 constant numberOfOutcomes = 2; //TEST with two teams
    uint256[numberOfOutcomes] public price; //in wei
    // uint[numberOfOutcomes] balance;
    IERC721Full public team; // ERC721 NFT.
    
    uint256 public totalCollected; // total into my whiskey fund
    uint256[numberOfOutcomes] public currentCollected; // amount currently collected for owner  
    uint256[numberOfOutcomes] public timeLastCollected; // 
    uint256[numberOfOutcomes] public deposit;
    address payable public andrewsAddress;
    uint256 public augurFund;
    
    mapping (uint256 => mapping (address => bool) ) public owners;
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;

    uint256[numberOfOutcomes] public timeAcquired;

    enum ownedState { Foreclosed, Owned }
    ownedState[numberOfOutcomes] public state;

    constructor(address payable _andrewsAddress, address _addressOfToken) public {
        team = IERC721Full(_addressOfToken);
        team.setup();
        andrewsAddress = _andrewsAddress;
        state[0] = ownedState.Foreclosed;
        state[1] = ownedState.Foreclosed;
    } 

    event LogBuy(address indexed owner, uint256 indexed price);
    event LogPriceChange(uint256 indexed newPrice);
    event LogForeclosure(address indexed prevOwner);
    event LogCollection(uint256 indexed collected);
    
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
        if(_collection >= deposit[_tokenId]) {
            return true;
        } else {
            return false;
        }
    }

    // same function as above, basically
    function depositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) {
        uint256 _collection = augurFundsOwed(_tokenId);
        if(_collection >= deposit[_tokenId]) {
            return 0;
        } else {
            return deposit[_tokenId].sub(_collection);
        }
    }

    /*
    now + deposit/patronage per second 
    now + depositAbleToWithdraw/(price*nume/denom/365).
    */
    function foreclosureTime(uint256 _tokenId) public view returns (uint256) {
        // patronage per second
        uint256 pps = price[_tokenId].div(365 days);
        return now + depositAbleToWithdraw(_tokenId).div(pps); // zero division if price is zero.
    }

    /* actions */
    function _collectAugurFunds(uint256 _tokenId) public {
        // determine patronage to pay
        if (state[_tokenId] == ownedState.Owned) {
            uint256 _collection = augurFundsOwed(_tokenId);
            
            // should foreclose and stake stewardship
            if (_collection >= deposit[_tokenId]) {
                // up to when was it actually paid for?
                timeLastCollected[_tokenId] = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(deposit[_tokenId]).div(_collection)));
                _collection = deposit[_tokenId]; // take what's left.

                _foreclose(_tokenId);
            } else  {
                // just a normal collection
                timeLastCollected[_tokenId] = now;
                currentCollected[_tokenId] = currentCollected[_tokenId].add(_collection);
            }
            
            deposit[_tokenId] = deposit[_tokenId].sub(_collection);
            totalCollected = totalCollected.add(_collection);
            augurFund = augurFund.add(_collection);
            emit LogCollection(_collection);
        }
    }
    
    // note: anyone can deposit
    function depositWei(uint256 _tokenId) public payable collectAugurFunds(_tokenId) {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        deposit[_tokenId] = deposit[_tokenId].add(msg.value);
    }
    
    //this function will need heavy modificaiton. the user will not actually need to pay whatever the price is
    function buy(uint256 _newPrice, uint256 _tokenId) public payable collectAugurFunds(_tokenId) {
        require(_newPrice > 0, "Price is zero");
        require(msg.value > price[_tokenId], "Not enough"); // >, coz need to have at least something for deposit
        address _currentOwner = team.ownerOf(_tokenId);

        if (state[_tokenId] == ownedState.Owned) {
            uint256 _totalToPayBack = price[_tokenId];
            if(deposit[_tokenId] > 0) {
                _totalToPayBack = _totalToPayBack.add(deposit[_tokenId]);
            }  
    
            // pay previous owner their price + deposit back.
            address payable _payableCurrentOwner = address(uint160(_currentOwner));
            _payableCurrentOwner.transfer(_totalToPayBack);
        } else if(state[_tokenId] == ownedState.Foreclosed) {
            state[_tokenId] = ownedState.Owned;
            timeLastCollected[_tokenId] = now;
        }
        
        deposit[_tokenId] = msg.value.sub(price[_tokenId]);
        transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
        emit LogBuy(msg.sender, _newPrice);
    }

    function changePrice(uint256 _newPrice, uint256 _tokenId) public onlyOwner(_tokenId) collectAugurFunds(_tokenId) {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        require(_newPrice != 0, "Incorrect Price");
        
        price[_tokenId] = _newPrice;
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
        _withdrawDeposit(deposit[_tokenId],  _tokenId);
    }

    /* internal */

    function _withdrawDeposit(uint256 _wei, uint256 _tokenId) internal {
        // note: can withdraw whole deposit, which puts it in immediate to be foreclosed state.
        require(deposit[_tokenId] >= _wei, 'Withdrawing too much');

        deposit[_tokenId] = deposit[_tokenId].sub(_wei);
        msg.sender.transfer(_wei); // msg.sender == patron

        if(deposit[_tokenId] == 0) {
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