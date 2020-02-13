pragma solidity 0.5.13;
import "./interfaces/IERC721Full.sol";
import "./utils/SafeMath.sol";

/// @title Augur Markets interface
/// @notice Gets the winner of each market from Augur
interface IMarket 
{
    function getWinningPayoutNumerator(uint256 _outcome) external view returns (uint256);
}

/// @title Augur ShareToken interface
/// @notice used for buying and selling complete sets
interface ShareToken 
{
    function publicBuyCompleteSets(IMarket _market, uint256 _amount) external returns (bool)  ;
    function publicSellCompleteSets(IMarket _market, uint256 _amount) external returns (uint256 _creatorFee, uint256 _reportingFee) ;
}

/// @title Dai contract interface
/// @notice Various cash functions
interface Cash 
{
    function approve(address _spender, uint256 _amount) external returns (bool);
    function balanceOf(address _ownesr) external view returns (uint256);
    function faucet(uint256 _amount) external;
    function transfer(address _to, uint256 _amount) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
}

//TODO: replace completesets with OICash
//TODO: update design pattens to take into account the recent changes
//TODO: change front end to only approve the same amount that is being sent
//TODO: add test where someone calls exit and they are not the current owner
//TODO: add tests where current owner calls newRental twice
// ^ will also need to figure out how to pass this number in the correct format because decimal
// ^ does not seem to work for more than 100 dai, it needs big number

/// @title Harber
/// @author Andrew Stanger
contract Harber {

    using SafeMath for uint256;

    /// NUMBER OF TOKENS
    /// @dev also equals number of markets on augur
    uint256 constant public numberOfTokens = 20;

    /// CONTRACT VARIABLES
    /// ERC721:
    IERC721Full public team;
    /// Augur contracts:
    IMarket[numberOfTokens] public market;
    ShareToken public completeSets;
    Cash public cash; 

    /// UINTS, ADDRESSES, BOOLS
    /// @dev my whiskey fund, for my 1% cut
    address private andrewsAddress; 
    /// @dev the addresses of the various Augur binary markets. One market for each token. Initiated in the constructor and does not change.
    address[numberOfTokens] public marketAddresses; 
    /// @dev in attodai (so $100 = 100000000000000000000)
    uint256[numberOfTokens] public price; 
    /// @dev amount collected for each token, ie the sum of all owners' rent per token. Used to know how many complete
    /// @dev ...sets to sell for each market (since there is one market per token)
    uint256[numberOfTokens] public collectedPerMarket; 
    /// @dev an easy way to track the above across all tokens. It should always increment at the same time as the above increments. 
    uint256 public totalCollected; 
    /// @dev used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    uint256[numberOfTokens] public timeLastCollected; 
    /// @dev when a token was bought. used only for front end 'owned since' section. Rent collection only needs timeLastCollected.
    uint256[numberOfTokens] public timeAcquired; 
    /// @dev tracks the position of the current owner in the ownerTracker mapping
    uint256[numberOfTokens] public currentOwnerIndex; 
  
    /// WINNING OUTCOME VARIABLES
    /// @dev start with invalid winning outcome
    uint256 public winningOutcome = 42069; 
    //// @dev so the function to manually set the winner can only be called long after 
    /// @dev ...it should have resolved via Augur. Must be public so others can verify it is accurate. 
    uint256 public marketExpectedResolutionTime; 

    /// MARKET RESOLUTION VARIABLES
    /// @dev step1:
    bool public marketsResolved = false; // must be false for step1, true for step2
    bool public marketsResolvedWithoutErrors = false; // set in step 1. If true, normal payout. If false, return all funds
    /// @dev step 2:
    bool public step2Complete = false; // must be false for step2, true for complete
    /// @dev step 3:
    bool public step3Complete = false; // must be false for step2, true for complete
    /// @dev complete:
    uint256 public daiAvailableToDistribute;
    
    ///  STRUCTS
    struct purchase {
        address owner;
        uint256 price;
    }
    
    /// MAPPINGS
    /// @dev keeps track of all previous owners of a token, including the price, so that if the current owner's deposit runs out,
    /// @dev ...ownership can be reverted to a previous owner with the previous price. Index 0 is NOT used, this tells the contract to foreclose.
    /// @dev this does NOT keep a reliable list of all owners, if it reverts to a previous owner then the next owner will overwrite the owner that was in that slot.
    /// @dev the variable currentOwnerIndex is used to track the location of the current owner. 
    mapping (uint256 => mapping (uint256 => purchase) ) public ownerTracker;  
    /// @dev how many seconds each user has held each token for, for determining winnings  
    mapping (uint256 => mapping (address => uint256) ) public timeHeld;
    /// @dev sums all the timeHelds for each token. Not required, but saves on gas when paying out. Should always increment at the same time as timeHeld
    mapping (uint256 => uint256) public totalTimeHeld; 
    /// @dev keeps track of all the deposits for each token, for each owner. Unused deposits are not returned automatically when there is a new buyer. 
    /// @dev they can be withdrawn manually however. Unused deposits are returned automatically upon resolution of the market
    mapping (uint256 => mapping (address => uint256) ) public deposits; 
    /// @dev keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome. Only required in this instance. 
    mapping (address => uint256) public collectedPerUser;

    ////////////// CONSTRUCTOR //////////////
    constructor(address _andrewsAddress, address _addressOfToken, address _addressOfCashContract, address[numberOfTokens] memory _addressesOfMarkets, address _addressOfCompleteSetsContract, address _addressOfMainAugurContract, uint _marketExpectedResolutionTime) public 
    {
        marketExpectedResolutionTime = _marketExpectedResolutionTime;
        andrewsAddress = _andrewsAddress;
        marketAddresses = _addressesOfMarkets; // this is to make the market addresses public so users can check the actual augur markets for themselves
        
        // external contract variables:
        team = IERC721Full(_addressOfToken);
        cash = Cash(_addressOfCashContract);
        completeSets = ShareToken(_addressOfCompleteSetsContract);

        // initialise arrays
        for (uint i = 0; i < numberOfTokens; i++) {
            currentOwnerIndex[i]=0;
            market[i] = IMarket(_addressesOfMarkets[i]);
        }
     
        // approve Augur contract to transfer this contract's dai
        cash.approve(_addressOfMainAugurContract,(2**256)-1);
    } 

    event LogNewRental(address indexed newOwner, uint256 indexed newPrice, uint256 indexed tokenId);
    event LogPriceChange(uint256 indexed newPrice, uint256 indexed tokenId);
    event LogForeclosure(address indexed prevOwner, uint256 indexed tokenId);
    event LogRentCollection(uint256 indexed rentCollected, uint256 indexed tokenId);
    event LogReturnToPreviousOwner(uint256 indexed tokenId, address indexed previousOwner);
    event LogDepositWithdrawal(uint256 indexed daiWithdrawn, uint256 indexed tokenId, address indexed returnedTo);
    event LogDepositIncreased(uint256 indexed daiDeposited, uint256 indexed tokenId, address indexed sentBy);
    event LogExit(uint256 indexed tokenId);
    event LogStep1Complete(bool indexed didAugurMarketsResolve, uint256 indexed winningOutcome, bool indexed didAugurMarketsResolveCorrectly);
    event LogStep2Complete(uint256 indexed daiAvailableToDistribute);
    event LogWinningsPaid(address indexed paidTo, uint256 indexed amountPaid);
    event LogRentReturned(address indexed returnedTo, uint256 indexed amountReturned);
    event LogAndrewPaid(uint256 indexed additionsToWhiskeyFund);

    ////////////// MODIFIERS //////////////
    /// @notice prevents functions from being interacted with after the end of the competition 
    /// @dev should be on all public/external 'ordinary course of business' functions
    modifier notResolved() {
        require(marketsResolved == false);
        _;
    }

    /// @notice checks the team exists
    modifier tokenExists(uint256 _tokenId) {
        require(_tokenId  >= 0 && _tokenId < numberOfTokens, "This token does not exist");
       _;
    }

    /// @notice what it says on the tin
    modifier amountNotZero(uint256 _dai) {
        require(_dai  > 0, "Amount must be above zero");
       _;
    }

    ////////////// VIEW FUNCTIONS //////////////
    /// @dev used in testing only
    function getOwnerTrackerPrice(uint256 _tokenId, uint256 _index) public view returns (uint256) {
        return (ownerTracker[_tokenId][_index].price);
    }

    /// @dev used in testing only
    function getOwnerTrackerAddress(uint256 _tokenId, uint256 _index) public view returns (address) {
        return (ownerTracker[_tokenId][_index].owner);
    }

    /// @dev called in collectRent function, and various other view functions 
    function rentOwed(uint256 _tokenId) public view returns (uint256 augurFundsDue) {
        return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(1 days);
    }

    /// @dev for front end only
    /// @return how much the current owner has deposited
    function liveDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) {
        uint256 _rentOwed = rentOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);
        if(_rentOwed >= deposits[_tokenId][_currentOwner]) {
            return 0;
        } else {
            return deposits[_tokenId][_currentOwner].sub(_rentOwed);
        }
    }

    /// @dev for front end only
    /// @return how much the current user has deposited (note: user not owner)
    function userDepositAbleToWithdraw(uint256 _tokenId) public view returns (uint256) {
        uint256 _rentOwed = rentOwed(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);

        if(_currentOwner == msg.sender) {
            if(_rentOwed >= deposits[_tokenId][msg.sender]) {
                return 0;
            } else {
                return deposits[_tokenId][msg.sender].sub(_rentOwed);
            }
        } else {
            return deposits[_tokenId][msg.sender];
        }
    }

    /// @dev for front end only
    /// @return estimated rental expiry time
    function rentalExpiryTime(uint256 _tokenId) public view returns (uint256) {
        uint256 pps;
        pps = price[_tokenId].div(1 days);
        if (pps == 0) {
            return now; //if price is so low that pps = 0 just return current time as a fallback
        }
        else {
            return now + liveDepositAbleToWithdraw(_tokenId).div(pps);
        }
    }

    ////////////// AUGUR FUNCTIONS //////////////
    // * internal * 
    /// @notice buy complete sets from Augur
    function _buyCompleteSets(uint256 _tokenId, uint256 _rentOwed) internal {
        uint256 _setsToBuy =_rentOwed.div(100);
        completeSets.publicBuyCompleteSets(market[_tokenId], _setsToBuy);
    }

    // * internal *
    /// @notice sell complete sets from Augur
    function _sellCompleteSets() internal {
            for (uint i = 0; i < numberOfTokens; i++) {
                uint256 _setsToSell =collectedPerMarket[i].div(100);
                completeSets.publicSellCompleteSets(market[i], _setsToSell);
            } 
    }

    // * internal * 
    /// @notice THIS FUNCTION HAS NOT BEEN TESTED ON AUGUR YET
    /// @notice checks if all X (x = number of tokens = number of teams) markets have resolved to either yes, no, or invalid
    /// @return true if yes, false if no
    function _haveAllAugurMarketsResolved() internal returns(bool) {   
        uint256 _resolvedOutcomesCount = 0;

        for (uint i = 0; i < numberOfTokens; i++) {
            // binary market has three outcomes: 0 (invalid), 1 (yes), 2 (no)
            if (market[i].getWinningPayoutNumerator(0) > 0 || market[i].getWinningPayoutNumerator(1) > 0 || market[i].getWinningPayoutNumerator(2) > 0  ) {
                _resolvedOutcomesCount = _resolvedOutcomesCount.add(1);
            }
        }
        // returns true if all resolved, false otherwise
        return (_resolvedOutcomesCount == numberOfTokens);
    }

    // * internal * 
    /// @notice THIS FUNCTION HAS NOT BEEN TESTED ON AUGUR YET
    /// @notice checks if all markets have resolved without conflicts or errors
    /// @return true if yes, false if no
    /// @dev this function will also set the winningOutcome variable
    function _haveAllAugurMarketsResolvedWithoutErrors() internal returns(bool) {   
        uint256 _winningOutcomesCount = 0;
        uint256 _invalidOutcomesCount = 0;

        for (uint i = 0; i < numberOfTokens; i++) {
            if (market[i].getWinningPayoutNumerator(0) > 0) {
                _invalidOutcomesCount = _invalidOutcomesCount.add(1);
            }
            if (market[i].getWinningPayoutNumerator(1) > 0) {
                winningOutcome = i; // <- the winning outcome (a global variable) is set here
                _winningOutcomesCount = _winningOutcomesCount.add(1);
            }
        }

        return (_winningOutcomesCount == 1 && _invalidOutcomesCount == 0);
    }

    ////////////// DAI CONTRACT FUNCTIONS ////////////// 

    // * internal * 
    /// @notice common function for all outgoing DAI transfers
    function _sendCash(address _to, uint256 _amount) internal { 
        require(cash.transfer(_to,_amount)); 
    }

    // * internal * 
    /// @notice common function for all incoming DAI transfers
    function _receiveCash(address _from, uint256 _amount) internal {  
        require(cash.transferFrom(_from, address(this), _amount));
    }

    // * internal * 
    /// @return DAI balance of the contract
    /// @dev this is used to know how much exists to payout to winners
    function _getContractsCashBalance() internal view returns (uint256) {
        return cash.balanceOf(address(this));
    }

    ////////////// MARKET RESOLUTION FUNCTIONS ////////////// 

    /// @notice the first of three functions which must be called, one after the other, to conclude the competition
    /// @notice winnings can be paid out (or funds returned) only when these two steps are completed
    /// @notice this function checks whether the Augur markets have resolved, and if yes, whether they resolved correct or not
    /// @dev they are split into two sections due to the presence of step1BemergencyExit and step1CcircuitBreaker
    /// @dev can be called by anyone 
    /// @dev can be called multiple times, but only once after markets have indeed resolved
    /// @dev the two arguments passed are for testing only
    function step1checkMarketsResolved() external {
        require(marketsResolved == false, "Step1 can only be completed once");
        // first check if all X markets have all resolved one way or the other
        if (_haveAllAugurMarketsResolved()) {
            // do a final rent collection before the contract is locked down
            collectRentAllTokens();
            // lock everything down
            marketsResolved = true;
            // now check if they all resolved without errors. It is set to false upon contract initialisation 
            // this function also sets winningOutcome if there is one
            if (_haveAllAugurMarketsResolvedWithoutErrors()) {
                marketsResolvedWithoutErrors = true;
            }
            emit LogStep1Complete(true, winningOutcome, marketsResolvedWithoutErrors);
        }
    }

    /// @notice emergency function in case the augur markets never resolve for whatever reason
    /// @notice returns all funds to all users
    /// @notice can only be called 6 months after augur markets should have ended 
    function step1BemergencyExit() external  {
        require(marketsResolved == false, "Step1 can only be completed once");
        require(now > (marketExpectedResolutionTime + 15778800), "Must wait 6 months for Augur Oracle");
        collectRentAllTokens();
        marketsResolved = true;
        emit LogStep1Complete(false, winningOutcome, false);
    }

    /// @notice Same as above, except that only I can call it, and I can call it whenever
    /// @notice to be clear, this only allows me to return all funds. I can not set a winner. 
    function step1CcircuitBreaker() external {
        require(marketsResolved == false, "Step1 can only be completed once");
        require(msg.sender == andrewsAddress, "Only owner can call this");
        collectRentAllTokens();
        marketsResolved = true;
        emit LogStep1Complete(false, winningOutcome, false);
    }

    /// @notice the second of the three functions which must be called, one after the other, to conclude the competition
    /// @dev gets funds back from Augur, gets the available funds for distribution
    /// @dev can be called by anyone, but only once 
    function step2sellCompleteSets() external {
        require(marketsResolved == true, "Must wait for market resolution");
        require(step2Complete == false, "Step2 should only be run once");
        step2Complete = true;

        uint256 _balanceBefore = _getContractsCashBalance();
        _sellCompleteSets();
        uint256 _balanceAfter = _getContractsCashBalance();
        // daiAvailableToDistribute therefore does not include unused deposits
        daiAvailableToDistribute = _balanceAfter.sub(_balanceBefore);
        emit LogStep2Complete(daiAvailableToDistribute);
    }

    /// @notice the final of the three functions which must be called, one after the other, to conclude the competition
    /// @notice pays me my 1% if markets resolved correctly. If not I don't deserve shit
    /// @dev this was originally included within step3 but it was modifed so that ineraction with Dai contract happened at the end
    function step3payAndrew() external {
        require(step2Complete == true, "Must wait for market resolution");
        require(step3Complete == false, "Step3 should only be run once");       
        step3Complete = true;

        if (marketsResolvedWithoutErrors) {
            uint256 _andrewsWellEarntMonies = daiAvailableToDistribute.div(100);
            daiAvailableToDistribute = daiAvailableToDistribute.sub(_andrewsWellEarntMonies);
            _sendCash(andrewsAddress,_andrewsWellEarntMonies);
            emit LogAndrewPaid(_andrewsWellEarntMonies);
        }     
    }

    /// @notice the final function of the competition resolution process. Pays out winnings, or returns funds, as necessary
    /// @dev users pull dai into their account. Replaces previous push vesion which required looping over unbounded mapping.
    function complete() external {
        require(step3Complete == true, "Step3 must be completed first");

        if (marketsResolvedWithoutErrors) {
                _payoutWinnings();
            }
            else {
                _returnRent();
            }
    }

     // * internal * 
    /// @notice pays winnings to the winners
    /// @dev must be internal and only called by complete
    function _payoutWinnings() internal {
        uint256 _winnersTimeHeld = timeHeld[winningOutcome][msg.sender];

        if (_winnersTimeHeld > 0) {
            timeHeld[winningOutcome][msg.sender] = 0; // otherwise they can keep paying themselves over and over
            uint256 _numerator = daiAvailableToDistribute.mul(_winnersTimeHeld);
            uint256 _winningsToTransfer = _numerator.div(totalTimeHeld[winningOutcome]);
            _sendCash(msg.sender, _winningsToTransfer);
            emit LogWinningsPaid(msg.sender, _winningsToTransfer);
        }
    }

    // * internal * 
    /// @notice returns all funds to users in case of invalid outcome
    /// @dev must be internal and only called by complete
    function _returnRent() internal {
        uint256 _rentCollected = collectedPerUser[msg.sender];

        if (_rentCollected > 0) {
            collectedPerUser[msg.sender] = 0; // otherwise they can keep paying themselves over and over
            uint256 _numerator = daiAvailableToDistribute.mul(_rentCollected);
            uint256 _rentToToReturn = _numerator.div(totalCollected);
            _sendCash(msg.sender, _rentToToReturn);
            emit LogRentReturned(msg.sender, _rentToToReturn);
        }
    }

    /// @notice withdraw full deposit after markets have resolved
    /// @dev the other withdraw deposit functions are locked when markets have resolved so must use this one
    /// @dev ... which can only be called if markets have resolved. This function is also different in that it does 
    /// @dev ... not attempt to collect rent or transfer ownership to a previous owner
    function withdrawDepositAfterResolution() external {
        require(marketsResolved == true, "step1 must be completed first");
         
        for (uint i = 0; i < numberOfTokens; i++) {

            uint256 _depositToReturn = deposits[i][msg.sender];

            if (_depositToReturn > 0) {
                deposits[i][msg.sender] = 0;
                _sendCash(msg.sender, _depositToReturn);
                emit LogDepositWithdrawal(_depositToReturn, i, msg.sender);
            }
        }
    }

    ////////////// ORDINARY COURSE OF BUSINESS FUNCTIONS //////////////

    /// @notice collects rent for all tokens
    /// @dev makes it easy for me to call whenever I want to keep people paying their rent, thus cannot be internal
    /// @dev cannot be external because it is called within the step1 functions, therefore public
    function collectRentAllTokens() public notResolved() {
       for (uint i = 0; i < numberOfTokens; i++) {
            _collectRent(i);
        }
    }

    /// @notice collects rent for a specific token
    /// @dev also calculates and updates how long the current user has held the token for
    /// @dev called frequently internally, so cant be external. 
    /// @dev is not a problem if called externally, but making internal to save gas
    function _collectRent(uint256 _tokenId) internal notResolved() {
        //only collect rent if the token is owned (ie, if owned by the contract this implies unowned)
        if (team.ownerOf(_tokenId) != address(this)) {
            
            uint256 _rentOwed = rentOwed(_tokenId);
            address _currentOwner = team.ownerOf(_tokenId);
            uint256 _timeOfThisCollection;
            
            if (_rentOwed >= deposits[_tokenId][_currentOwner]) {
                // run out of deposit. Calculate time it was actually paid for, then revert to previous owner 
                _timeOfThisCollection = timeLastCollected[_tokenId].add(((now.sub(timeLastCollected[_tokenId])).mul(deposits[_tokenId][_currentOwner]).div(_rentOwed)));
                _rentOwed = deposits[_tokenId][_currentOwner]; // take what's left     
                _revertToPreviousOwner(_tokenId);
                
            } else  {
                // normal collection
                _timeOfThisCollection = now;
            }

            // decrease deposit by rent owed
            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_rentOwed);

            // the 'important bit', where the duration the token has been held by each user is updated
            // it is essential that timeHeld and totalTimeHeld are incremented together such that the sum of
            // the first is equal to the second
            uint256 _timeHeldToIncrement = (_timeOfThisCollection.sub(timeLastCollected[_tokenId])); //just for readability
            timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add(_timeHeldToIncrement);
            totalTimeHeld[_tokenId] = totalTimeHeld[_tokenId].add(_timeHeldToIncrement);

            // it is also essential that collectedPerMarket, collectedPerUser and totalCollected are all incremented together
            // such that the sum of the first two (individually) is equal to the third
            collectedPerMarket[_tokenId] = collectedPerMarket[_tokenId].add(_rentOwed);
            collectedPerUser[_currentOwner] = collectedPerUser[_currentOwner].add(_rentOwed);
            totalCollected = totalCollected.add(_rentOwed);

            _buyCompleteSets(_tokenId,_rentOwed);
            emit LogRentCollection(_rentOwed, _tokenId);
        }

        // timeLastCollected is updated regardless of whether the token is owned, so that the clock starts ticking
        // ... when the first owner buys it, because this function is run before ownership changes upon calling
        // ... newRental
        timeLastCollected[_tokenId] = now;
    }
    
    /// @notice to rent a token
    function newRental(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) external tokenExists(_tokenId) amountNotZero(_deposit) notResolved() {
        require(_newPrice > price[_tokenId], "Price must be higher than current price");

        _collectRent(_tokenId);
        address _currentOwner = team.ownerOf(_tokenId);

        if (_currentOwner == msg.sender) {
            // bought by current owner (ie, token ownership does not change, so it is as if the current owner
            // ... called changePrice and depositDai seperately)
            _changePrice(_newPrice, _tokenId);
            _depositDai(_deposit, _tokenId);
        } else {   
            // bought by different user (the normal situation)
            // deposits are updated via depositDai function if _currentOwner = msg.sender 
            // therefore deposits only updated inside this else section
            deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_deposit);
            // update currentOwnerIndex and ownerTracker
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].add(1); 
            ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
            ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].owner = msg.sender; 
            // update timeAcquired for the front end
            timeAcquired[_tokenId] = now;
            _transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
            _receiveCash(msg.sender, _deposit);
            emit LogNewRental(msg.sender, _newPrice, _tokenId); 
        }
    }

    /// @notice add new dai deposit to an existing rental
    /// @dev it is possible a user's deposit could be reduced to zero following _collectRent
    /// @dev they would then increase their deposit despite no longer owning it
    /// @dev this is ok, they can withdraw via withdrawDeposit. 
    function depositDai(uint256 _dai, uint256 _tokenId) external amountNotZero(_dai) tokenExists(_tokenId) notResolved() {
        _collectRent(_tokenId);
        _depositDai(_dai, _tokenId);
    }

    /// @dev depositDai is split into two, because it needs to be called direct from newRental
    /// @dev ... without collecing rent first (otherwise it would be collected twice, possibly causing logic errors)
    function _depositDai(uint256 _dai, uint256 _tokenId) internal {
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_dai);
        _receiveCash(msg.sender, _dai);
        emit LogDepositIncreased(_dai, _tokenId, msg.sender);
    }

    /// @notice increase the price of an existing rental
    /// @dev can't be external because also called within newRental
    function changePrice(uint256 _newPrice, uint256 _tokenId) public tokenExists(_tokenId) notResolved() {
        require(_newPrice > price[_tokenId], "New price must be higher than current price"); 
        require(msg.sender == team.ownerOf(_tokenId), "Not owner");
        _collectRent(_tokenId);
        _changePrice(_newPrice, _tokenId);
    }

    /// @dev changePrice is split into two, because it needs to be called direct from newRental
    /// @dev ... without collecing rent first (otherwise it would be collected twice, possibly causing logic errors)
    function _changePrice(uint256 _newPrice, uint256 _tokenId) internal {
        // below is the only instance when price is modifed outside of the _transferTokenTo function
        price[_tokenId] = _newPrice;
        ownerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        emit LogPriceChange(price[_tokenId], _tokenId);
    }
    
    /// @notice withdraw deposit
    /// @dev do not need to be the current owner
    function withdrawDeposit(uint256 _dai, uint256 _tokenId) external amountNotZero(_dai) tokenExists(_tokenId) notResolved() returns (uint256) {
        _collectRent(_tokenId);
        // if statement needed because deposit may have just reduced to zero following _collectRent 
        if (deposits[_tokenId][msg.sender] > 0) {
            _withdrawDeposit(_dai, _tokenId);
            emit LogDepositWithdrawal(_dai, _tokenId, msg.sender);
        }
    }

    /// @notice withdraw full deposit
    /// @dev do not need to be the current owner
    function exit(uint256 _tokenId) external tokenExists(_tokenId) notResolved() {
        _collectRent(_tokenId);
        // if statement needed because deposit may have just reduced to zero following _collectRent modifier
        if (deposits[_tokenId][msg.sender] > 0) {
            _withdrawDeposit(deposits[_tokenId][msg.sender],  _tokenId);
            emit LogExit(_tokenId);
        }
    }

    /* internal */
    /// @notice actually withdraw the deposit and call _revertToPreviousOwner if necessary
    function _withdrawDeposit(uint256 _dai, uint256 _tokenId) internal {
        require(deposits[_tokenId][msg.sender] >= _dai, 'Withdrawing too much');
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].sub(_dai);
        address _currentOwner = team.ownerOf(_tokenId);
        if(_currentOwner == msg.sender && deposits[_tokenId][msg.sender] == 0) {
            _revertToPreviousOwner(_tokenId);
        }
        _sendCash(msg.sender, _dai);
    }

    /* internal */
    /// @notice if a users deposit runs out, either return to previous owner or foreclose
    function _revertToPreviousOwner(uint256 _tokenId) internal {
        bool _reverted = false;
        bool _toForeclose = false;
        uint256 _index;
        address _previousOwner;

        while (_reverted == false) {
            assert(currentOwnerIndex[_tokenId] >=0);
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].sub(1); // currentOwnerIndex will now point to  previous owner
            _index = currentOwnerIndex[_tokenId]; // just for readability
            _previousOwner = ownerTracker[_tokenId][_index].owner;

            //if no previous owners. price -> zero, foreclose
            //if previous owner still has a deposit, transfer to them, update the price to what it used to be
            if (_index == 0) {
                _toForeclose = true;
                _reverted = true;
            } else if (deposits[_tokenId][_previousOwner] > 0) {
                _reverted = true;
            }         
        }   

        if (_toForeclose) {
                _foreclose(_tokenId);
            } else {
                address _currentOwner = team.ownerOf(_tokenId);
                uint256 _oldPrice = ownerTracker[_tokenId][_index].price;
                _transferTokenTo(_currentOwner, _previousOwner, _oldPrice, _tokenId);
                emit LogReturnToPreviousOwner(_tokenId, _previousOwner);
            }
    }

    /* internal */
    /// @notice return token to the contract and return price to zero
    function _foreclose(uint256 _tokenId) internal {
        address _currentOwner = team.ownerOf(_tokenId);
        // third field is price, ie price goes to zero
        _transferTokenTo(_currentOwner, address(this), 0, _tokenId);
        emit LogForeclosure(_currentOwner, _tokenId);
    }

    /* internal */
    /// @notice transfer ERC 721 between users
    /// @dev there is no event emitted as this is handled in ERC721.sol
    function _transferTokenTo(address _currentOwner, address _newOwner, uint256 _newPrice, uint256 _tokenId) internal {
        require(_currentOwner != address(0) && _newOwner != address(0) , "Cannot send to/from zero address");
        team.transferFrom(_currentOwner, _newOwner, _tokenId);
        price[_tokenId] = _newPrice;
    }
}

