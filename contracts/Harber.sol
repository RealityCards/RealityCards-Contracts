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
    uint256 public constant version = 21;

    uint256 constant numberOfOutcomes = 2; //TEST with two teams
    uint256[numberOfOutcomes] public price; //in wei
    IERC721Full public team; // ERC721 NFT.
    
    //Augur contracts
    Cash public cash;
    
    uint256 public totalCollected; // total into my whiskey fund
    uint256[numberOfOutcomes] public currentCollected; // amount currently collected for owner  
    uint256[numberOfOutcomes] public timeLastCollected; // 
    uint256[numberOfOutcomes] public deposit;
    address payable public andrewsAddress;
    uint256 public augurFund;
    
    mapping (uint256 => mapping (address => bool) ) public owners;
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;
    mapping (uint256 => mapping (address => uint256) ) public userDeposits;
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

        //Augur specific:
        cash = Cash(_addressOfCashContract);
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

    function getVersion() public pure returns(uint256)
    {
        return (version);
    }

    function getTestDai() public 
    {
        ////comment out the below line when using local testing
        // cash.faucet(100000000000000000000);
        testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100000000000000000000;
    }

    // function getTestDaiDelegate() public 
    // {
    //     address(cash).delegatecall(abi.encodeWithSignature("faucet(uint256)",97000000000000000000));
    // }

    function getTestDaiBalance() public view returns (uint)
    {
        ////below line = my original plan of actually sending the user dai 
        // return(cash.balanceOf(msg.sender));

        ////im now keeping their dai in this contract
        return(testDaiBalances[msg.sender]);
    }

    // function transferDaiToContract() public returns (uint)
    // {
    //     // string memory _callValue = "transfer"+ address(this) + ")";
    //     // address(cash).delegatecall(bytes4(keccak256("transfer(address,uint256)")),address(this),100000000000000000000);
    //     address(cash).delegatecall(abi.encodeWithSignature("transfer(address,uint256)",address(this),123));
    // }

    // function approve1() public
    // {
    //     cash.approve(address(this),(2**256)-1);
    //     // cash.approve(0xe2020A4a6B0a5D6C74c358e09B2b4758b5Cdb91C,(2**256)-1);
    // }

    // function approve2() public
    // {
    //     // cash.approve(address(this),(2**256)-1);
    //     cash.approve(0xe2020A4a6B0a5D6C74c358e09B2b4758b5Cdb91C,(2**256)-1);
    // }

    function getPrice(uint256 _tokenId) public view returns (uint256)
    {
        return price[_tokenId];
    }
    
    function getUserDepositBalance(uint256 _tokenId) public view returns (uint256)
    {
        return userDeposits[_tokenId][msg.sender];
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

    function userDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) {
        uint256 _collection = augurFundsOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender)
        {
            if(_collection >= deposit[_tokenId]) 
        {
            return 0;
        } else {
            return userDeposits[_tokenId][msg.sender].sub(_collection);
        }
        } else {
            return userDeposits[_tokenId][msg.sender];
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
        // return pps;
    }

    /* actions */
    function _collectAugurFunds(uint256 _tokenId) public {
        // determine patronage to pay
        // if (state[_tokenId] == ownedState.Owned) {
        //     uint256 _collection = augurFundsOwed(_tokenId);
            
        //     // should foreclose and stake stewardship
        //     if (_collection >= deposit[_tokenId]) {
        //         // up to when was it actually paid for?
        //         timeLastCollected[_tokenId] = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(deposit[_tokenId]).div(_collection)));
        //         _collection = deposit[_tokenId]; // take what's left.

        //         _foreclose(_tokenId);
        //     } else  {
        //         // just a normal collection
        //         timeLastCollected[_tokenId] = now;
        //         currentCollected[_tokenId] = currentCollected[_tokenId].add(_collection);
        //     }
            
        //     deposit[_tokenId] = deposit[_tokenId].sub(_collection);
        //     userDeposits[_tokenId][msg.sender] = userDeposits[_tokenId][msg.sender].sub(_collection);
        //     totalCollected = totalCollected.add(_collection);
        //     augurFund = augurFund.add(_collection);
        //     emit LogCollection(_collection);
        // }
    }
    
    // note: anyone can deposit
    function depositWei(uint256 _tokenId) public payable collectAugurFunds(_tokenId) {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        deposit[_tokenId] = deposit[_tokenId].add(msg.value);
    }
    
    //this function has been modified from the original so that you no longer pay the current owner back the price that they set. Therefore, your entire msg.value becomes your deposit
    function buy(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) public collectAugurFunds(_tokenId) {
        require(_newPrice > price[_tokenId], "Price must be higher than current price");
        require(_deposit > 0, "Must deposit something");
        require(testDaiBalances[msg.sender] >= _deposit, "Not enough DAI");

        // approve();
        // cash.transferFrom(msg.sender,address(this),_deposit);

        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_deposit);
        userDeposits[_tokenId][msg.sender] = userDeposits[_tokenId][msg.sender].add(_deposit);
        price[_tokenId] = _newPrice;

        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender)
        {
            deposit[_tokenId] = deposit[_tokenId].add(_deposit);
        }
        else
        {
            deposit[_tokenId] = _deposit;
            transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
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