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

//TODO : if im not going to implement proper augur local testing, at least get a local cash contract, so much cleaner, and i dont need to mess about with _daiAvailableToDistribute split between two verisons
//TODO : ensure that andrewsaddress is set correctly. It is different in dev
//TODO : add some more events 
//TODO : I seemed to get errors via front ened when i bought for 100000000 and 50 daik deposit, then switched to anew user and bought for 100000001 and 50 dai, investigate
//TODO: it seems when testing via front end that the amount sent to augur was well above the 'total parongage collected' on the very first _collect (ie when adding deposit), investigate. I just tried a second time and yes itsa problem. as test, check that whatever is sent to buy sets matches the variable that the front end is checking (actually it appears to be out by 2 decimal places)
//TODO: see the screenshot in the harber folder of ownerTracker (which I got via debug at the end of debugging returndeposits function) it does not look right, there are 0000 addresses and things out of order

contract Harber {
    
    using SafeMath for uint256;

    // NUMBER OF TOKENS
    // this needs to INCLUDE the invalid outcome. So it will always be 1 higher than the number of teams. But if it is too high, the getWinner function will try and check if a team that does not exist has won, which will cause a revert, preventing the contract from determining the winner. So it must be accurate. 
    uint256 constant numberOfTokens = 5; 

    //TESTING VARIABLES
    bool usingAugur = false;
    uint256 testingVariable = 0;
    uint256 a = 0;
    uint256 b = 0;
    uint256 c = 0;
    mapping (address => uint256) public winngsSentToUser;
    mapping (address => uint256) public depositReturnedToUser;
    // uint256 public fundsInAugur
    
    // CONTRACT VARIABLES
    IERC721Full public team; // ERC721 NFT.
    //Augur contracts:
    IMarket market;
    ShareToken completeSets;
    Cash cash; 

    // UINTS ADDRESSES, BOOLS
    address andrewsAddress; // I am the original owner of tokens, and ownership reverts to me should the sale foreclose. Also, only I have the ability to SET the winner (which is an emergency ability if the decentralised approach fails- and can only be done if a month has passed aafter the augur resolution should have passed).
    address marketAddress; // the address of the Augur market. It is set in the constructor. Does not change. 
    uint256[numberOfTokens] public price; //in wei
    uint256[numberOfTokens] public collectedAndSentToAugur; // amount collected for each token, ie the sum of all owners' rent  
    uint256 public totalCollected; // an easy way to track the above
    uint256[numberOfTokens] public timeLastCollected; // used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    uint256[numberOfTokens] public timeAcquired; // used only for front end
    uint256[numberOfTokens] public currentOwnerIndex; // tracks the position of the current owner in the previousOwnerTracker mapping
    uint256[numberOfTokens] public numberOfOwners; //used to cycle through ownerTracker during finalse & payout. Since you can't find the size of a mapping. If the value is 5, it means there are 5 owners. Ie it is not doing programming counting. 
    
    // winning outcome variables
    bool public marketResolved = false;
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
    mapping (uint256 => mapping (address => uint256) ) public deposits; //keeps track of all the deposits for each token, for each owner. Unused deposits are not returned automatically when there is a new buyer. Unused deposits are returned automatically upon resolution of the market (TODO)
    mapping (address => uint256) public testDaiBalances;
    mapping (uint256 => mapping (address => bool)) public everOwned; //this is required to prevent the ownerTracker variable being incremented unless a completely new user buys the token. 

    // ENUMS
    enum ownedState { Foreclosed, Owned }
    ownedState[numberOfTokens] public state;

    ////////////// CONSTRUCTOR //////////////
    constructor(address _andrewsAddress, address _addressOfToken, address _addressOfCashContract, address _addressOfMarket, address _addressOfCompleteSetsContract, address _addressOfMainAugurContract, uint _marketExpectedResolutionTime) public {
        //initialise ERC721s
        team = IERC721Full(_addressOfToken);
        team.setup();
        andrewsAddress = _andrewsAddress;

        //currentOwnerIndex is incremented before being used first so the 0 index will never contain a price/address. A zero index is used in the _revertToPreviousOwner function to commence foreclosure
        for (uint i=0; i<numberOfTokens; i++)
        {
            currentOwnerIndex[i]=0;
            numberOfOwners[i]=0;
            state[i] = ownedState.Foreclosed;
        }

        //initialise Augur contract variables
        cash = Cash(_addressOfCashContract);
        market = IMarket(_addressOfMarket);
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
    event LogCollection(uint256 indexed collected);
    
    ////////////// MODIFIERS //////////////
    modifier onlyOwner(uint256 _tokenId) {
        require(msg.sender == team.ownerOf(_tokenId), "Not owner");
        _;
    }

    modifier notResolved() {
        require(marketResolved == false);
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
        return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(365 days);
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

    ////////////// AUGUR FUNCTIONS //////////////
    function getTestDai() public 
    {
        if (usingAugur == true) {
            //instead of the user getting testDai to his account, it is generated here and and allocated to the user
            cash.faucet(100000000000000000000);
        }

        //tests assume 100, else use 100000000000000000000
        testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100;
    }

    function buyCompleteSets(uint256 _rentOwed) internal 
    {
        if (usingAugur == true)
        {
            completeSets.publicBuyCompleteSets(market, _rentOwed);
        } 
    }

    function sellCompleteSets(uint256 _sets) internal 
    {
        //change below to assert in production. 
        assert (marketResolved);

        if (usingAugur == true)
        {
            completeSets.publicSellCompleteSets(market, _sets);
        } 
    }

    //i have not tested this on the front end/kovan since i refactored
    function getWinnerFromAugur(uint256 _outcomeToTest) internal view returns(bool) 
    {
        if (market.getWinningPayoutNumerator(_outcomeToTest) > 0)
        {
            return true;
        }
        else 
        {
            return false;
        }
    }

    ////////////// MARKET RESOLUTION FUNCTIONS ////////////// 

    //this can be called by anyone, at any time. getWinningPayoutNumerator will always return with 0 unless the market is resolved. 
    // of extreme importance here is that the teams that each integer refers to within augur is the same as within my contract. Ie if ID 1 refers to Manchester United within my contract, but ID 1 is equal to Liverpool within the Augur market, the wrong winner will be selected. This can either be dealt with manually or programmatically, either way it needs to happen within the setup() of the ERC721s
    // it is also imperative that numberOfTokens is set correctly. If getWinningPayoutNumerator is called with a token ID that does not exist, it will revert. 
    function getWinner() notResolved() public 
    {
        for (uint i=0; i < numberOfTokens; i++)
        {
            bool _isWinner = getWinnerFromAugur(i);
            if (_isWinner)
            {
                winningOutcome = i;
                //final rent collection before it is locked down
                for (uint i=1; i < numberOfTokens; i++) {
                    _collectRent(i);
                }
                marketResolved = true;
                //check if market resolved invalid
                if (winningOutcome == 0) {
                    invalidMarketFinaliseAndPayout();
                }
                else {
                    finaliseAndPayout();
                }
            }
        }
    }

    //this function is used for testing, and in production is kept unless the above function fails. It can ONLY be called well after the market should have resolved on Augur, otherwise I could influence the outcome
    function setWinner(uint256 _winner) notResolved() public 
    {
        // only I can call this- MAKE SURE IT IS UNCOMMENTED IN PRODUCTION!
        // require (msg.sender == andrewsAddress, "Imposter detected"); 
        // can only be called if a month has passed and the Augur market still not resolved
        require (now > (marketExpectedResolutionTime + 2592000), "Wait for decentralised resolution first");
        winningOutcome = _winner;
        //final rent collection before it is locked down
        for (uint i=1; i < numberOfTokens; i++) {
             _collectRent(i);
        }
        marketResolved = true;
        //check if market resolved invalid
        if (winningOutcome == 0) {
            invalidMarketFinaliseAndPayout();
        }
        else {
            finaliseAndPayout();
        }
    }

    //return all unused deposits upon resolution
    // * internal * 
    function returnDeposits() internal
    {
        for (uint i=1; i < numberOfTokens; i++) //not counting from zero, 0 = invalid
        {  
            for (uint j=0; j < numberOfOwners[i]; j++)
            {  
                address _thisUsersAddress = ownerTracker[i][j];
                uint256 _depositToReturn = deposits[i][_thisUsersAddress];
                deposits[i][_thisUsersAddress] = 0;

                if (_depositToReturn > 0) {
                    if (usingAugur) {
                        cash.transfer(_thisUsersAddress,_depositToReturn);
                    } else {
                        depositReturnedToUser[_thisUsersAddress] = depositReturnedToUser[_thisUsersAddress] + _depositToReturn;
                    }
                }
            }
        }
    }

    // * internal * 
    function finaliseAndPayout() internal
    {
        require (marketResolved == true, "Winner not known");
        require (doneAndDusted == false, "Already paid out");
        uint256 _daiAvailableToDistribute;
        //return unused deposits
        returnDeposits();
        // get the dai back from Augur
        sellCompleteSets(totalCollected);
        // the Dai returned to distribute will not be known in advance due to fees, so I cannot hard code the figure to payout to winners. So I will just get the dai balance of the contract. 
        if (usingAugur) {
            _daiAvailableToDistribute = cash.balanceOf(address(this));
        }
        else {
             _daiAvailableToDistribute = totalCollected;
        }
        
        //do the payout
        for (uint i=0; i < numberOfOwners[winningOutcome]; i++)
        {   
            address _winnersAddress = ownerTracker[winningOutcome][i];
            uint _winnersTimeHeld = timeHeld[winningOutcome][_winnersAddress];
            uint256 _numerator = _daiAvailableToDistribute.mul(_winnersTimeHeld);
            uint256 _winningsToTransfer = _numerator.div(totalTimeHeld[winningOutcome]);
            if (usingAugur) {
                cash.transfer(_winnersAddress,_winningsToTransfer);
            } else {
                winngsSentToUser[_winnersAddress] = _winningsToTransfer;
            }
        }
        doneAndDusted = true;
    }

    // This will ONLY be called if the market returns invalid, in which case everyone will be returned funds in proportion to how long they have held each token. It is not possible to pay back the actual funds sent, since the relevant data is not tracked by the contract. It would be prohibitive in gas costs to track this for a situation that should never occur.  
    // * internal * 
    function invalidMarketFinaliseAndPayout() internal
    {
        require (marketResolved == true, "Winner not known");
        require (doneAndDusted == false, "Already paid out");
        sellCompleteSets(totalCollected);
        if (usingAugur) {
            uint256 _daiAvailableToDistribute = cash.balanceOf(address(this));
        }
        else {
            uint256 _daiAvailableToDistribute = totalCollected;
        }
        //TOD: transfer function
    }

    ////////////// ORDINARY COURSE OF BUSINESS FUNCTIONS //////////////

    function _collectRent(uint256 _tokenId) notResolved() public {
        // determine patronage to pay
        if (state[_tokenId] == ownedState.Owned) {
            
            uint256 _rentOwed = rentOwed(_tokenId);
            address _currentOwner = team.ownerOf(_tokenId);
            uint256 _timeOfThisCollection;
            testingVariable =totalTimeHeld[_tokenId];
            
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

            uint256 _timeHeldToIncrement = (_timeOfThisCollection.sub(timeLastCollected[_tokenId])); //just for readability
            timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add(_timeHeldToIncrement);

            //totalTimeHeld should not increment when forelosed (or it would pay me a reward as I am the default owner), but this is taken care of because this entire function only runs if not foreclosed
            totalTimeHeld[_tokenId] = totalTimeHeld[_tokenId].add(_timeHeldToIncrement);

            timeLastCollected[_tokenId] = now;
            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_rentOwed);
            collectedAndSentToAugur[_tokenId] = collectedAndSentToAugur[_tokenId].add(_rentOwed);
            totalCollected = totalCollected.add(_rentOwed);

            buyCompleteSets(_rentOwed);
            
            emit LogCollection(_rentOwed);
        }
    }
    
    function buy(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) public collectRent(_tokenId) notResolved() {
        require(_tokenId != 0, "Cannot bet on invalid outcome");
        require(_tokenId < numberOfTokens, "This team does not exist");
        require(_newPrice > price[_tokenId], "Price must be higher than current price");
        require(_deposit > 0, "Must deposit something");
        require(testDaiBalances[msg.sender] >= _deposit, "Not enough DAI");
        
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_deposit);
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_deposit);
        
        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender)
        {
            previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        }
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
        if (usingAugur) {
                cash.transfer(msg.sender,_dai);
            } else {
                depositReturnedToUser[msg.sender] = depositReturnedToUser[msg.sender] + _dai;
            }

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
            }
        }       
    }

    /* internal */
    function _foreclose(uint256 _tokenId) internal {
        // I become steward of artwork (aka foreclose)
        address _currentOwner = team.ownerOf(_tokenId);
        //third field is price, ie price goes to zero
        _transferTokenTo(_currentOwner, andrewsAddress, 0, _tokenId);
        state[_tokenId] = ownedState.Foreclosed;
        emit LogForeclosure(_currentOwner);
    }

    /* internal */
    function _transferTokenTo(address _currentOwner, address _newOwner, uint256 _newPrice, uint256 _tokenId) internal {
        team.transferFrom(_currentOwner, _newOwner, _tokenId);
        price[_tokenId] = _newPrice;
    }
}

