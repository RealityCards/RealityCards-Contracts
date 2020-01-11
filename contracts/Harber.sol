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
    function balanceOf(address _ownesr) external view returns (uint256);
    function faucet(uint256 _amount) external;
    function transfer(address _to, uint256 _amount) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
}

//TODO: have not yet tested the new check winner functions
//TODO: replace completesets with OICash

contract Harber {
    
    using SafeMath for uint256;

    // NUMBER OF TOKENS
    //Also equals number of markets on augur
    uint256 constant numberOfTokens = 20; // needs to be 5 for ganache testing

    //TESTING VARIABLES
    bool constant usingAugur = true; //if false, none of the augur contracts are interacted with. Required false for ganache testing. Must be true in production :)
    uint256 public a = 0;
    uint256 public b = 0;
    uint256 public c = 0;
    // these are in lieu of interacting with ERC20 token contract, for tests
    mapping (address => uint256) public winningsSentToUser;
    mapping (address => uint256) public depositReturnedToUser;
    
    // CONTRACT VARIABLES
    IERC721Full public team; // ERC721 NFT.
    //Augur contracts:
    IMarket[numberOfTokens] market;
    ShareToken completeSets;
    Cash cash; 

    // UINTS ADDRESSES, BOOLS
    address public andrewsAddress; // my whiskey fund, for my cut (TBD)
    address[numberOfTokens] public marketAddresses; // the addresses of the various Augur binary markets. One market for each token. Initiated in the constructor and does not change.
    uint256[numberOfTokens] public price; //in dai-wei (so $100 = 100000000000000000000)
    uint256[numberOfTokens] public collectedAndSentToAugur; // amount collected for each token, ie the sum of all owners' rent per token. Used to know how many complete
    // sets to sell for each market (since there is one market per token) 
    uint256 public totalCollected; // an easy way to track the above across all tokens. It is used for a) if there is an invalid outcome and it pays everyone back the amount of: ((total funds available * amount paid by user) / totalCollected). totalCollected is slightly higher than total funds available due to augur fees. And b) upon market resolution, it sells complete sets of Augur equal to totalCollected.
    uint256[numberOfTokens] public timeLastCollected; // used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    uint256[numberOfTokens] public timeAcquired; // when a token was bought. used only for front end
    uint256[numberOfTokens] public currentOwnerIndex; // tracks the position of the current owner in the previousOwnerTracker mapping
    uint256[numberOfTokens] public numberOfOwners; //used to cycle through ownerTracker during finalse & payout. Since you can't find the size of a mapping. If the value is 5, it means there are 5 owners. Ie it is not doing programming counting. 
  
    // winning outcome variables
    bool public marketsResolved = false;
    bool public doneAndDusted = false;
    uint256 public winningOutcome = 99; //start with invalid winning outcome
    uint256 public marketExpectedResolutionTime; //so the function to manually set the winner can only be called long after it should have resolved via Augur. Must be public so others can verify it is accurate. 

    //  STRUCTS
    struct purchase {
        address owner;
        uint price;
    }
    
    // MAPPINGS
    mapping (uint256 => mapping (uint256 => purchase) ) public previousOwnerTracker; //keeps track of all previous owners of a token, including the price, so that if the current owner's deposit runs out, ownership can be reverted to a previous owner with the previous price. Index 0 is NOT used, this tells the contract to foreclose. This does NOT keep a reliable list of all owners, if it reverts to a previous owner then the next owner will overwrite the owner that was in that slot. The variable currentOwnerIndex is used to track the location of the current owner. 
    mapping (uint256 => mapping (uint256 => address) ) public ownerTracker; //used to keep hold of all the owners, for payout, similar to previousOwnerTracker except that the pointer to the current position never decrements
    mapping (uint256 => mapping (address => uint256) ) public timeHeld; //this is the key variable that tracks the total amount of time each user has held it for. It is key because this is used to determine the proportion of the pot to be sent to each winning address
    mapping (uint256 => uint256) public totalTimeHeld; //for the payout, what is the total time each token is owned for, excluding foreclosed state (ie owned by me). Winning addresses are sent totalFunds * (timeHeld/totalTimeHeld)
    mapping (uint256 => mapping (address => uint256) ) public deposits; //keeps track of all the deposits for each token, for each owner. Unused deposits are not returned automatically when there is a new buyer. They can be withdrawn manually however. Unused deposits are returned automatically upon resolution of the market
    mapping (address => uint256) public testDaiBalances;
    mapping (uint256 => mapping (address => bool)) public everOwned; //this is required to prevent the ownerTracker variable being incremented unless a completely new user buys the token. 
    mapping (address => uint256) public rentPaid; //keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome. Only required in this instance. 

    // ENUMS
    enum ownedState { Foreclosed, Owned }
    ownedState[numberOfTokens] public state;

    ////////////// CONSTRUCTOR //////////////
    constructor(address _andrewsAddress, address _addressOfToken, address _addressOfCashContract, address[numberOfTokens] memory _addressesOfMarkets, address _addressOfCompleteSetsContract, address _addressOfMainAugurContract, uint _marketExpectedResolutionTime) public {
        //initialise ERC721s
        team = IERC721Full(_addressOfToken);
        // team.setup(msg.sender);
        andrewsAddress = _andrewsAddress;
        marketAddresses = _addressesOfMarkets; //this is to make the market addresses public so users can check the actual augur markets for themselves

        for (uint i=0; i<numberOfTokens; i++)
        {
            currentOwnerIndex[i]=0;
            numberOfOwners[i]=0;
            state[i] = ownedState.Foreclosed;
            market[i] = IMarket(_addressesOfMarkets[i]);
        }

        //initialise Augur contract variables (markets variables initialised above)
        cash = Cash(_addressOfCashContract);
        completeSets = ShareToken(_addressOfCompleteSetsContract);
        marketExpectedResolutionTime = _marketExpectedResolutionTime;
        
        //approve augur contract to transfer this contract's dai
        if (usingAugur == true) {
            cash.approve(_addressOfMainAugurContract,(2**256)-1);
        }
    } 

    event LogBuy(address indexed owner, uint256 indexed price);
    event LogPriceChange(uint256 indexed newPrice);
    event LogForeclosure(address indexed prevOwner);
    event LogRentCollection(uint256 indexed collected);
    event LogFinalised(uint256 indexed winningOutcome, uint256 indexed daiAvailableToDistribute);
    event LogReturnToPreviousOwner(uint256 indexed tokenId, address indexed previousOwner);


    ////////////// MODIFIERS //////////////
    modifier onlyOwner(uint256 _tokenId) {
        require(msg.sender == team.ownerOf(_tokenId), "Not owner");
        _;
    }

    modifier notResolved() {
        require(marketsResolved == false);
        _;
    }

    modifier collectRent(uint256 _tokenId) {
       _collectRent(_tokenId); 
       _;
    }

    ////////////// VIEW FUNCTIONS //////////////
    function getTestDaiBalance() public view returns (uint256)
    {
        return(testDaiBalances[msg.sender]);
    }

    function getOwnerTrackerPrice(uint256 _tokenId, uint256 _index) public view returns (uint256)
    {
        return (previousOwnerTracker[_tokenId][_index].price);
    }

    function getOwnerTrackerAddress(uint256 _tokenId, uint256 _index) public view returns (address)
    {
        return (previousOwnerTracker[_tokenId][_index].owner);
    }

    function rentOwed(uint256 _tokenId) public view returns (uint256 augurFundsDue) 
    {
        //the tests are written assuming price = annual rental price. Final version should be price =daily rental price
        if (usingAugur) {
            return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(1 days);
        }
        else {
            return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(365 days);
        }
    }

    function rentOwedWithTimestamp(uint256 _tokenId) public view returns (uint256 augurFundsDue, uint256 timestamp) 
    {
        return (rentOwed(_tokenId), now);
    }
    function foreclosed(uint256 _tokenId) public view returns (bool) 
    {
        // returns whether it is in foreclosed state or not
        // depending on whether deposit covers patronage due
        // useful helper function when price should be zero, but contract doesn't reflect it yet.
        uint256 _rentOwed = rentOwed(_tokenId);
        if(_rentOwed >= deposits[_tokenId][msg.sender]) {
            return true;
        } else {
            return false;
        }
    }

    // this is only used to calculate foreclosure time
    function liveDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) 
    {
        uint256 _rentOwed = rentOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);
        if(_rentOwed >= deposits[_tokenId][_currentOwner]) {
            return 0;
        } else {
            return deposits[_tokenId][_currentOwner].sub(_rentOwed);
        }
    }

    //this is my version of the above function. It shows how much each user can withdraw- whether or not they are the current owner. 
    function userDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) 
    {
        uint256 _rentOwed = rentOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender)
        {
            if(_rentOwed >= deposits[_tokenId][msg.sender]) 
        {
            return 0;
        } else {
            return deposits[_tokenId][msg.sender].sub(_rentOwed);
        }
        } else {
            return deposits[_tokenId][msg.sender];
        }
    }

    function rentalExpiryTime(uint256 _tokenId) public view returns (uint256) 
    {
        uint256 pps = price[_tokenId].div(24 hours);
        if (pps == 0)
        {
            return now; //if price is so low that pps = 0 just return current time as a fallback
        }
        else
        {
            return now + liveDepositAbleToWithdraw(_tokenId).div(pps);
        }
    }

    ////////////// AUGUR FUNCTIONS //////////////
    function getTestDai() public 
    {
        if (usingAugur == true) {
            //instead of the user getting testDai to his account, it is generated here and and allocated to the user
            cash.faucet(100000000000000000000);
            testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100000000000000000000;
        }
        else {
            testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100;
        }
    }

    // * internal * 
    function buyCompleteSets(uint256 _tokenId, uint256 _rentOwed) internal 
    {
        if (usingAugur == true)
        {
            uint256 _setsToBuy =_rentOwed.div(100);
            completeSets.publicBuyCompleteSets(market[_tokenId], _setsToBuy);
        } 
    }

    // * internal *
    function sellCompleteSets() internal 
    {
        assert (marketsResolved);
        if (usingAugur == true)
        {
            for (uint i=0; i<numberOfTokens; i++) {
                uint256 _setsToSell =collectedAndSentToAugur[i].div(100);
                completeSets.publicSellCompleteSets(market[i], _setsToSell);
            } 
        } 
    }

    // * internal * 
    // checks if all X (x = number of tokens = number of teams) markets have resolved to either yes, no, or invalid
    function haveAllAugurMarketsResolved() internal returns(bool) 
    {   
        if (usingAugur) {
            uint256 _resolvedOutcomesCount = 0;

            for (uint i=0; i<numberOfTokens; i++) {
                // binary market has three outcomes: 0 (invalid), 1 (yes), 2 (no)
                if (market[i].getWinningPayoutNumerator(0) > 0 || market[i].getWinningPayoutNumerator(1) > 0 || market[i].getWinningPayoutNumerator(2) > 0  ) {
                    _resolvedOutcomesCount = _resolvedOutcomesCount + 1;
                }
            }

            if (_resolvedOutcomesCount == numberOfTokens) {
                marketsResolved = true;
                return true;
            } else {
                return false;
            }
        }
        //hard code 'yes' for testing
        else {
            marketsResolved = true;
            return true;
        }
    }

    // * internal * 
    // zero errors = all markets resolved 'no' except one that resolved 'yes'
    // this function will also set the winningOutcome variable
    // the reason there are two functions (haveAllAugurMarketsResolved and haveAllAugurMarketsResolvedWithoutErrors) is simply to ensure that the contract does not interpret
    // a delay in one of the market's resolving as an 'error' and refunding everyone prematurely
    // the two arguments this function takes are for testing only. They are not used when usingAugur is set to true
    function haveAllAugurMarketsResolvedWithoutErrors(uint256 _hardCodedWinner, bool _hardCodedInvalid) internal returns(bool) 
    {   
        if (usingAugur) {
            _hardCodedWinner = 69420; //just to make it obvious that this is not a relevant variable at this point

            uint256 _winningOutcomesCount = 0;
            uint256 _losingOutcomesCount = 0;
            uint256 _invalidOutcomesCount = 0;

            //cycle through all the markets for a positive value on outcome 0 (invalid) or 1 (yes) or 2 (no). 
            //return true if there is 1 winner and 0 invalid and [number of tokens - 1] losers. Anything else, return false. 
            for (uint i=0; i<numberOfTokens; i++) {
                if (market[i].getWinningPayoutNumerator(0) > 0) {
                    _invalidOutcomesCount = _invalidOutcomesCount + 1;
                }
                if (market[i].getWinningPayoutNumerator(1) > 0) {
                    winningOutcome = i; // <- the winning outcome (a global variable) is set here
                    _winningOutcomesCount = _winningOutcomesCount + 1;
                }
                if (market[i].getWinningPayoutNumerator(2) > 0) {
                    _losingOutcomesCount = _losingOutcomesCount + 1;
                }
            }

            if (_winningOutcomesCount == 1 && _invalidOutcomesCount == 0 && _losingOutcomesCount == (numberOfTokens - 1)) {
                return true;
            } else {
                return false;
            }
        }
        //if in testing mode, return the supplied arguments
        else {
            winningOutcome = _hardCodedWinner;
            return _hardCodedInvalid;
            }
        }
    function sendCash(address _to, uint256 _amount, uint256 _reason) internal {  
        if (usingAugur) {
            cash.transfer(_to,_amount);
        } else {
            // using different variables if the cash is sent for different reasons. Allows for more granular testing. 
            if (_reason == 0) { //0 = returned unused deposits at market resolution, or calling withdraw deposit, or calling exit
                depositReturnedToUser[_to] = depositReturnedToUser[_to].add(_amount);
            } else { //1 = winnings paid out or invalid outcome
                winningsSentToUser[_to] = winningsSentToUser[_to].add(_amount);
            }
            
        }
    }

    function getCashBalance(address _addressToCheck) internal view returns (uint256) {
        if (usingAugur) {
            return cash.balanceOf(_addressToCheck);
        } else {
            return totalCollected;
        }
    }

    ////////////// MARKET RESOLUTION FUNCTIONS ////////////// 

    //this can be called by anyone, at any time. 
    function getWinner(uint256 _hardCodedWinner, bool _hardCodedInvalid) notResolved() public 
    // the two arguments are testing variables. They are ignored when usingAugur is set to true. 
    // it is required to test the correct response to different winners. 
    {
        // final rent collection before it is locked down
        for (uint i=0; i < numberOfTokens; i++) {
            _collectRent(i);
        }

        //first check if all X markets have all resolved one way or the other
        bool _haveAllAugurMarketsResolved = haveAllAugurMarketsResolved();

        if (_haveAllAugurMarketsResolved) {

            //now check if they all resolved without errors. If yes, normal payout. If no, return all funds to all users. 
            bool _haveAllAugurMarketsResolvedWithoutErrors = haveAllAugurMarketsResolvedWithoutErrors(_hardCodedWinner, _hardCodedInvalid);
            if (_haveAllAugurMarketsResolvedWithoutErrors) {
                finaliseAndPayout();
            }
            else {
                invalidMarketFinaliseAndPayout();
            }
        }
    }

    // Sets the winner as invalid, which returns all funds to all users. Anyone can call this. Emergency function in case the augur markets never resolve for whatever reason,
    // (or perhaps the markets resolve, but this contract cant see due to a bug in the relevant function)
    // can only be called 6 months after augur markets should have ended
    function emergencyExit() notResolved() public 
    {
        require (now > (marketExpectedResolutionTime + 15778800), "Must wait 6 months for Augur Oracle");
        //final rent collection before it is locked down
        for (uint i=0; i < numberOfTokens; i++) {
            _collectRent(i);
        }
        marketsResolved = true;
        invalidMarketFinaliseAndPayout(); //returns all rent to all users
    }

    // * internal * 
    function finaliseAndPayout() internal
    {
        require (marketsResolved == true, "Winner not known");
        require (doneAndDusted == false, "Already paid out");
        //return unused deposits
        returnDeposits();
        // get the dai back from Augur
        sellCompleteSets();
        // the Dai returned to distribute will not be known in advance due to fees, so I cannot hard code the figure to payout to winners. So I will just get the dai balance of the contract. 
        uint256 _daiAvailableToDistribute = getCashBalance(address(this));
        
        //do the payout
        for (uint i=0; i < numberOfOwners[winningOutcome]; i++)
        {   
            address _winnersAddress = ownerTracker[winningOutcome][i];
            uint _winnersTimeHeld = timeHeld[winningOutcome][_winnersAddress];
            uint256 _numerator = _daiAvailableToDistribute.mul(_winnersTimeHeld);
            uint256 _winningsToTransfer = _numerator.div(totalTimeHeld[winningOutcome]);
            sendCash(_winnersAddress,_winningsToTransfer, 1);
        }
        doneAndDusted = true;
        emit LogFinalised(winningOutcome,_daiAvailableToDistribute);
    }

    // This will ONLY be called if the market returns invalid (or if setWinnerPublic is triggered), in which case everyone's funds will be returned
    // * internal * 
    function invalidMarketFinaliseAndPayout() internal
    {
        require (marketsResolved == true, "Winner not known");
        require (doneAndDusted == false, "Already paid out");
        //return unused deposits
        returnDeposits();
        // get the dai back from Augur
        sellCompleteSets();
        // the Dai returned to distribute will not be known in advance due to fees, so I cannot hard code the figure to payout to winners. So I will just get the dai balance of the contract. 
        uint256 _daiAvailableToDistribute = getCashBalance(address(this));

        for (uint i=0; i < numberOfTokens; i++) 
        {  
            for (uint j=0; j < numberOfOwners[i]; j++)
            {  
                address _usersAddress = ownerTracker[i][j];
                uint256 _numerator = _daiAvailableToDistribute.mul(rentPaid[_usersAddress]);
                uint256 _fundsToReturn = _numerator.div(totalCollected);
                rentPaid[_usersAddress] = 0; //same address could be across multiple tokens, don't want to pay the user more than once
                if (_fundsToReturn > 0) {
                    sendCash(_usersAddress,_fundsToReturn,1);
                }
            }
        }
        doneAndDusted = true;
        emit LogFinalised(winningOutcome,_daiAvailableToDistribute);
    }

    //return all unused deposits upon resolution
    // * internal * 
    function returnDeposits() internal
    {
        for (uint i=0; i < numberOfTokens; i++) 
        {  
            for (uint j=0; j < numberOfOwners[i]; j++)
            {  
                address _thisUsersAddress = ownerTracker[i][j];
                uint256 _depositToReturn = deposits[i][_thisUsersAddress];
                deposits[i][_thisUsersAddress] = 0;

                if (_depositToReturn > 0) {
                    sendCash(_thisUsersAddress,_depositToReturn, 0);
                }
            }
        }
    }

    ////////////// ORDINARY COURSE OF BUSINESS FUNCTIONS //////////////

    function _collectRent(uint256 _tokenId) notResolved() public {
        // determine rent to pay
        if (state[_tokenId] == ownedState.Owned) {
            
            uint256 _rentOwed = rentOwed(_tokenId);
            address _currentOwner = team.ownerOf(_tokenId);
            uint256 _timeOfThisCollection;
            
            if (_rentOwed >= deposits[_tokenId][_currentOwner]) {
                // run out of deposit. Calculate time it was actually paid for, then revert to previous owner 
                _timeOfThisCollection = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(deposits[_tokenId][_currentOwner]).div(_rentOwed)));
                _rentOwed = deposits[_tokenId][_currentOwner]; // take what's left     
                _revertToPreviousOwner(_tokenId);
                
            } else  {
                //normal collection
                _timeOfThisCollection = now;
            }

            //update the ownerTracker and numberOfOwners variables. only for new owners.
            if (everOwned[_tokenId][_currentOwner] == false) {
                everOwned[_tokenId][_currentOwner] = true;
                ownerTracker[_tokenId][numberOfOwners[_tokenId]] = _currentOwner;
                numberOfOwners[_tokenId] = numberOfOwners[_tokenId] + 1;
            }

            //update the rentPaid mapping. Only used for invalid outcome, so everyone can be paid back
            rentPaid[_currentOwner] = rentPaid[_currentOwner].add(_rentOwed);

            //the 'important bit', where the duration the token has been held by each user is updated
            uint256 _timeHeldToIncrement = (_timeOfThisCollection.sub(timeLastCollected[_tokenId])); //just for readability
            timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add(_timeHeldToIncrement);

            //totalTimeHeld should not increment when forelosed (or it would pay me a reward as I am the default owner), but this is taken care of because this entire function only runs if not foreclosed
            totalTimeHeld[_tokenId] = totalTimeHeld[_tokenId].add(_timeHeldToIncrement);

            timeLastCollected[_tokenId] = now;
            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_rentOwed);
            collectedAndSentToAugur[_tokenId] = collectedAndSentToAugur[_tokenId].add(_rentOwed);
            totalCollected = totalCollected.add(_rentOwed);

            buyCompleteSets(_tokenId,_rentOwed);
            
            emit LogRentCollection(_rentOwed);
        }
    }
    
    function buy(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) public collectRent(_tokenId) notResolved() {
        require(_tokenId < numberOfTokens, "This team does not exist");
        require(_newPrice > price[_tokenId], "Price must be higher than current price");
        require(_deposit > 0, "Must deposit something");
        require(testDaiBalances[msg.sender] >= _deposit, "Not enough DAI");
        
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_deposit);
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_deposit);
        
        address _currentOwner = team.ownerOf(_tokenId);

        //bought by current owner (ie, it just increases the price, token ownership does not change)
        if(_currentOwner == msg.sender)
        {
            previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        }
        //bought by different user (the normal situation)
        else
        {
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId] + 1; 
            // currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].add(1);
            //^^ the above line causes VM errors, I need to figure out why
            previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
            previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].owner = msg.sender; 
        }

        if(state[_tokenId] == ownedState.Foreclosed) 
        {
            state[_tokenId] = ownedState.Owned;
            timeLastCollected[_tokenId] = now;
        }
        
        //does the below even if owner hasn't changed. this is ok. 
        timeAcquired[_tokenId] = now;
        _transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId); 
        emit LogBuy(msg.sender, _newPrice);
    }

    function depositDai(uint256 _dai, uint256 _tokenId) public collectRent(_tokenId) notResolved() {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_dai);
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_dai);
    }

    function changePrice(uint256 _newPrice, uint256 _tokenId) public onlyOwner(_tokenId) collectRent(_tokenId) notResolved() {
        require(state[_tokenId] != ownedState.Foreclosed, "Foreclosed");
        require(_newPrice > price[_tokenId], "New price must be higher than current price"); //This is to prevent griefing- buying it then immediately dropping the price really low. The original project did not suffer from this problem because when you bought it, you had to pay the purchase price to the previous user, not so in mine. 
        
        price[_tokenId] = _newPrice;
        previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        emit LogPriceChange(price[_tokenId]);
    }
    
    function withdrawDeposit(uint256 _dai, uint256 _tokenId) public onlyOwner(_tokenId) collectRent(_tokenId) notResolved() returns (uint256) {
        _withdrawDeposit(_dai, _tokenId);
    }

    function exit(uint256 _tokenId) public onlyOwner(_tokenId) collectRent(_tokenId) notResolved() {
        _withdrawDeposit(deposits[_tokenId][msg.sender],  _tokenId);
    }

    /* internal */
    function _withdrawDeposit(uint256 _dai, uint256 _tokenId) internal {
        require(deposits[_tokenId][msg.sender] >= _dai, 'Withdrawing too much');

        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].sub(_dai);
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].add(_dai);
        //return the dai
        sendCash(msg.sender, _dai, 0);

        if(deposits[_tokenId][msg.sender] == 0) {
            _revertToPreviousOwner(_tokenId);
        }
    }

    /* internal */
    function _revertToPreviousOwner(uint256 _tokenId) internal {
        bool _reverted = false;
        while (_reverted == false)
        {
            assert(currentOwnerIndex[_tokenId] >=0);
            //change below to use safemath
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId] - 1; // ownerTraker will now point to  previous owner
            uint256 _index = currentOwnerIndex[_tokenId]; //just for readability
            address _previousOwner = previousOwnerTracker[_tokenId][_index].owner;

            if (_index == 0) 
            //no previous owners. price -> zero, foreclose
            {
                _foreclose(_tokenId);
                _reverted = true;
            }
            else if (deposits[_tokenId][_previousOwner] > 0)
            // previous owner still has a deposit, transfer to them, update the price to what it used to be
            {
                address _currentOwner = team.ownerOf(_tokenId);
                uint256 _oldPrice = previousOwnerTracker[_tokenId][_index].price;
                _transferTokenTo(_currentOwner, _previousOwner, _oldPrice, _tokenId);
                _reverted = true;
                emit LogReturnToPreviousOwner(_tokenId,_previousOwner);
            }
        }       
    }

    /* internal */
    function _foreclose(uint256 _tokenId) internal {
        // the contract becomes owner of token (aka foreclose)
        address _currentOwner = team.ownerOf(_tokenId);
        //third field is price, ie price goes to zero
        _transferTokenTo(_currentOwner, address(this), 0, _tokenId);
        state[_tokenId] = ownedState.Foreclosed;
        emit LogForeclosure(_currentOwner);
    }

    /* internal */
    function _transferTokenTo(address _currentOwner, address _newOwner, uint256 _newPrice, uint256 _tokenId) internal {
        team.transferFrom(_currentOwner, _newOwner, _tokenId);
        price[_tokenId] = _newPrice;
    }
}

// require (1 ==2, "STFU");

