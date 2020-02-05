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
//TODO: change front end to only approve the same amount that is being sent
//TODO: look into calculating the number of loops and DoS attacks
//TODO: I dont think dai deposited via the deposit dai function is returned in return
// all deposits?
// ^ will also need to figure out how to pass this number in the correct format because decimal
// ^ does not seem to work for more than 100 dai, it needs big number

/// @title Harber
/// @author Andrew Stanger
/// @dev ensure usingAugur is set to false upon local testing and true on kovan or mainnet
contract Harber {

    using SafeMath for uint256;

    /// NUMBER OF TOKENS
    /// @dev also equals number of markets on augur
    uint256 constant public numberOfTokens = 20;

    /// TESTING VARIABLES
    /// @dev if usingAugur false, none of the augur contracts are interacted with. Required false for ganache testing. 
    bool constant public usingAugur = false; //MUST BE TRUE IN PROUDCTION
    
    /// CONTRACT VARIABLES
    /// ERC721:
    IERC721Full public team;
    /// Augur contracts:
    IMarket[numberOfTokens] public market;
    ShareToken public completeSets;
    Cash public cash; 

    /// UINTS, ADDRESSES, BOOLS
    /// @dev my whiskey fund, for my 1% cut
    address public andrewsAddress; 
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
    /// @dev tracks the position of the current owner in the previousOwnerTracker mapping
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
    mapping (uint256 => mapping (uint256 => purchase) ) public previousOwnerTracker;  
    /// @dev used to keep hold of all the owners, for payout, similar to previousOwnerTracker except that the pointer to the current position never decrements   
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
        marketAddresses = _addressesOfMarkets; //this is to make the market addresses public so users can check the actual augur markets for themselves
        
        // external contract variables:
        team = IERC721Full(_addressOfToken);
        cash = Cash(_addressOfCashContract);
        completeSets = ShareToken(_addressOfCompleteSetsContract);

        // initialise arrays
        for (uint i = 0; i < numberOfTokens; i++)
        {
            currentOwnerIndex[i]=0;
            market[i] = IMarket(_addressesOfMarkets[i]);
        }
     
        //approve Augur contract to transfer this contract's dai
        cash.approve(_addressOfMainAugurContract,(2**256)-1);
    } 

    event LogBuy(address indexed owner, uint256 indexed price);
    event LogPriceChange(uint256 indexed newPrice);
    event LogForeclosure(address indexed prevOwner);
    event LogRentCollection(uint256 indexed collectedPerMarket);
    event LogFinalised(uint256 indexed winningOutcome, uint256 indexed daiAvailableToDistribute);
    event LogFundsReturned(uint256 indexed daiAvailableToDistribute);
    event LogReturnToPreviousOwner(uint256 indexed tokenId, address indexed previousOwner);


    ////////////// MODIFIERS //////////////
    /// @notice prevents functions from being interacted with after the end of the competition 
    /// @dev should be on all public 'ordinary course of business' functions
    modifier notResolved() {
        require(marketsResolved == false);
        _;
    }

    /// @notice collect Rent
    /// @dev should be on all public 'ordinary course of business' functions except the collect rent ones obviously.
    modifier collectRent(uint256 _tokenId) {
       _collectRent(_tokenId); 
       _;
    }

    ////////////// VIEW FUNCTIONS //////////////
    /// @dev used in testing only
    function getOwnerTrackerPrice(uint256 _tokenId, uint256 _index) public view returns (uint256)
    {
        return (previousOwnerTracker[_tokenId][_index].price);
    }

    /// @dev used in testing only
    function getOwnerTrackerAddress(uint256 _tokenId, uint256 _index) public view returns (address)
    {
        return (previousOwnerTracker[_tokenId][_index].owner);
    }

    /// @dev called in collectRent function, and various other view functions 
    function rentOwed(uint256 _tokenId) public view returns (uint256 augurFundsDue) 
    {
        return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(1 days);
    }

    /// @dev for front end only
    /// @return how much the current owner has deposited
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

    /// @dev for front end only
    /// @return how much the current user has deposited
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

    /// @dev for front end only
    /// @return estimated rental expiry time
    function rentalExpiryTime(uint256 _tokenId) public view returns (uint256) 
    {
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
    function _buyCompleteSets(uint256 _tokenId, uint256 _rentOwed) internal 
    {
        if (usingAugur == true) {
            uint256 _setsToBuy =_rentOwed.div(100);
            completeSets.publicBuyCompleteSets(market[_tokenId], _setsToBuy);
        } 
    }

    // * internal *
    /// @notice sell complete sets from Augur
    function _sellCompleteSets() internal 
    {
        if (usingAugur == true) {
            for (uint i = 0; i < numberOfTokens; i++) {
                uint256 _setsToSell =collectedPerMarket[i].div(100);
                completeSets.publicSellCompleteSets(market[i], _setsToSell);
            } 
        } 
    }

    // * internal * 
    /// @notice THIS FUNCTION HAS NOT BEEN TESTED ON AUGUR YET
    /// @notice checks if all X (x = number of tokens = number of teams) markets have resolved to either yes, no, or invalid
    /// @return true if yes, false if no
    function _haveAllAugurMarketsResolved() internal returns(bool) 
    {   
        if (usingAugur) {
            uint256 _resolvedOutcomesCount = 0;

            for (uint i = 0; i < numberOfTokens; i++) {
                // binary market has three outcomes: 0 (invalid), 1 (yes), 2 (no)
                if (market[i].getWinningPayoutNumerator(0) > 0 || market[i].getWinningPayoutNumerator(1) > 0 || market[i].getWinningPayoutNumerator(2) > 0  ) {
                    _resolvedOutcomesCount = _resolvedOutcomesCount.add(1);
                }
            }

            if (_resolvedOutcomesCount == numberOfTokens) {
                return true;
            } else {
                return false;
            }
        }
        //hard code 'yes' for testing
        else {
            return true;
        }
    }

    // * internal * 
    /// @notice THIS FUNCTION HAS NOT BEEN TESTED ON AUGUR YET
    /// @notice checks if all markets have resolved without conflicts or errors
    /// @return true if yes, false if no
    /// @dev this function will also set the winningOutcome variable
    /// @dev the two arguments this function takes are for testing only. They are not used when usingAugur is set to true
    function _haveAllAugurMarketsResolvedWithoutErrors(uint256 _hardCodedWinner, bool _hardCodedResolvedCorrectly) internal returns(bool) 
    {   
        if (usingAugur) {
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

            if (_winningOutcomesCount == 1 && _invalidOutcomesCount == 0) {
                return true;
            } else {
                return false;
            }
        }
        //if in testing mode, return the supplied arguments
        else {
            winningOutcome = _hardCodedWinner;
            return _hardCodedResolvedCorrectly;
            }
        }

    ////////////// DAI CONTRACT FUNCTIONS ////////////// 

    // * internal * 
    /// @notice common function for all outgoing DAI transfers
    function _sendCash(address _to, uint256 _amount) internal { 
        cash.transfer(_to,_amount); 
    }

    // * internal * 
    /// @notice common function for all incoming DAI transfers
    function _receiveCash(address _from, uint256 _amount) internal {  
        cash.transferFrom(_from, address(this), _amount);
    }

    // * internal * 
    /// @return DAI balance of the contract
    /// @dev this is used to know how much exists to payout to winners
    function _getContractsCashBalance() internal view returns (uint256) {
        return cash.balanceOf(address(this));
    }

    ////////////// MARKET RESOLUTION FUNCTIONS ////////////// 

    /// @notice the first of two functions which must be called, one after the other, to conclude the competition
    /// @notice winnings can be paid out (or funds returned) only when these two steps are completed
    /// @notice this function checks whether the Augur markets have resolved, and if yes, whether they resolved correct or not
    /// @dev they are split into two sections due to the presence of step1BemergencyExit and step1CcircuitBreaker
    /// @dev can be called by anyone 
    /// @dev can be called multiple times, but only once after markets have indeed resolved
    /// @dev the two arguments passed are for testing only
    function step1checkMarketsResolved(uint256 _hardCodedWinner, bool _hardCodedResolvedCorrectly) public  
    {
        require(marketsResolved == false, "step1 can only be completed once");
        // first check if all X markets have all resolved one way or the other
        if (_haveAllAugurMarketsResolved()) {
            // do a final rent collection before the contract is locked down
            collectRentAllTokens();
            // lock everything down
            marketsResolved = true;
             // now check if they all resolved without errors. It is set to false upon contract initialisation 
             // this function also sets winningOutcome if there is one
            if (_haveAllAugurMarketsResolvedWithoutErrors(_hardCodedWinner, _hardCodedResolvedCorrectly)) {
                marketsResolvedWithoutErrors = true;
            }
        }
    }

    /// @notice emergency function in case the augur markets never resolve for whatever reason
    /// @notice returns all funds to all users
    /// @notice can only be called 6 months after augur markets should have ended 
    function step1BemergencyExit() public 
    {
        require(marketsResolved == false, "step1 can only be completed once");
        require(now > (marketExpectedResolutionTime + 15778800), "Must wait 6 months for Augur Oracle");
        collectRentAllTokens();
        marketsResolved = true;
    }

    /// @notice Same as above, except that only I can call it, and I can call it whenever
    /// @notice to be clear, this only allows me to return all funds. I can not set a winner. 
    function step1CcircuitBreaker() public 
    {
        require(marketsResolved == false, "step1 can only be completed once");
        require(msg.sender == andrewsAddress, "Only owner can call this");
        collectRentAllTokens();
        marketsResolved = true;
    }

    /// @notice the second of the two functions which must be called, one after the other, to conclude the competition
    /// @dev gets funds back from Augur, gets the available funds for distribution and pays me my 1%
    /// @dev can be called by anyone, but only once 
    function step2sellCompleteSetsAndPayAndrew() public
    {
        require(marketsResolved == true, "step1 must be completed first");
        require(step2Complete == false, "step2 should only be run once");

        uint256 _balanceBefore = _getContractsCashBalance();
        _sellCompleteSets();
        uint256 _balanceAfter = _getContractsCashBalance();
        //daiAvailableToDistribute therefore does not include unused deposits
        daiAvailableToDistribute = _balanceAfter.sub(_balanceBefore);

        //only pay me if markets resolved correctly. If not I don't deserve shit
        if (marketsResolvedWithoutErrors) {
            uint256 _andrewsWellEarntMonies = daiAvailableToDistribute.div(100);
            _sendCash(andrewsAddress,_andrewsWellEarntMonies);
            daiAvailableToDistribute = daiAvailableToDistribute.sub(_andrewsWellEarntMonies);
        }

        step2Complete = true;
    }

    /// @notice the final function of the competition resolution process. Pays out winnings, or returns funds, as necessary
    /// @dev pulls dai to users
    function complete() public
    {
        require(step2Complete == true, "step2 must be completed first");

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
    function _payoutWinnings() internal
    {
        uint256 _winnersTimeHeld = timeHeld[winningOutcome][msg.sender];

        if (_winnersTimeHeld > 0) {
            timeHeld[winningOutcome][msg.sender] = 0; // otherwise they can keep paying themselves over and over
            uint256 _numerator = daiAvailableToDistribute.mul(_winnersTimeHeld);
            uint256 _winningsToTransfer = _numerator.div(totalTimeHeld[winningOutcome]);
            _sendCash(msg.sender, _winningsToTransfer);
        }
    }

    // * internal * 
    /// @notice returns all funds to users in case of invalid outcome
    /// @dev must be internal and only called by complete
    function _returnRent() internal
    {
        uint256 _rentCollected = collectedPerUser[msg.sender];

        if (_rentCollected > 0) {
            collectedPerUser[msg.sender] = 0; // otherwise they can keep paying themselves over and over
            uint256 _numerator = daiAvailableToDistribute.mul(_rentCollected);
            uint256 _rentToToReturn = _numerator.div(totalCollected);
            _sendCash(msg.sender, _rentToToReturn);
        }
    }

    /// @notice withdraw full deposit after markets have resolved
    /// @dev the other withdraw deposit functions are locked when markets have resolved so must use this one
    /// @dev ... which can only be called if markets have resolved. This function is also different in that it does 
    /// @dev ... not attempt to collect rent or transfer ownership to a previous owner
    function withdrawDepositAfterResolution() public 
    {
        require(marketsResolved == true, "step1 must be completed first");
         
        for (uint i = 0; i < numberOfTokens; i++) {

            uint256 _depositToReturn = deposits[i][msg.sender];

            if (_depositToReturn > 0) {
                deposits[i][msg.sender] = 0;
                _sendCash(msg.sender, _depositToReturn);
            }
        }
    }

    ////////////// ORDINARY COURSE OF BUSINESS FUNCTIONS //////////////

    /// @notice collects rent for all tokens
    /// @dev makes it easy for me to call whenever I want to keep people paying their rent
    function collectRentAllTokens() public notResolved() {
       for (uint i = 0; i < numberOfTokens; i++) {
            _collectRent(i);
        }
    }

    /// @notice collects rent for a specific token
    /// @dev also calculates and updates how long the current user has held the token for
    function _collectRent(uint256 _tokenId) public notResolved() {
        require(_tokenId < numberOfTokens, "This team does not exist");
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
                //normal collection
                _timeOfThisCollection = now;
            }

            //decrease deposit by rent owed and buy complete sets
            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_rentOwed);
            _buyCompleteSets(_tokenId,_rentOwed);

            //the 'important bit', where the duration the token has been held by each user is updated
            //it is essential that timeHeld and totalTimeHeld are incremented together such that the sum of
            //the first is equal to the second
            uint256 _timeHeldToIncrement = (_timeOfThisCollection.sub(timeLastCollected[_tokenId])); //just for readability
            timeHeld[_tokenId][_currentOwner] = timeHeld[_tokenId][_currentOwner].add(_timeHeldToIncrement);
            totalTimeHeld[_tokenId] = totalTimeHeld[_tokenId].add(_timeHeldToIncrement);

            //it is also essential that collectedPerMarket, collectedPerUser and totalCollected are all incremented together
            //such that the sum of the first two (individually) is equal to the third
            collectedPerMarket[_tokenId] = collectedPerMarket[_tokenId].add(_rentOwed);
            collectedPerUser[_currentOwner] = collectedPerUser[_currentOwner].add(_rentOwed);
            totalCollected = totalCollected.add(_rentOwed);
            
            emit LogRentCollection(_rentOwed);
        }
         
        timeLastCollected[_tokenId] = now;
    }
    
    /// @notice to rent a token
    function newRental(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) public collectRent(_tokenId) notResolved() {
        require(_newPrice > price[_tokenId], "Price must be higher than current price");
        require(_deposit > 0, "Must deposit something");

        // get the Dai from the user and add to their deposits balance
        _receiveCash(msg.sender, _deposit);
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_deposit);
     
        address _currentOwner = team.ownerOf(_tokenId);

        // bought by current owner (ie, it just increases the price, token ownership does not change)
        if(_currentOwner == msg.sender)
        {
            changePrice(_newPrice, _tokenId);
        }
        // bought by different user (the normal situation)
        else
        {   
            // update currentOwnerIndex and previousOwnerTracker
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].add(1); 
            previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
            previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].owner = msg.sender; 

            //update timeAcquired for the front end
            timeAcquired[_tokenId] = now;

            //transfer token to new owner
            _transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
            emit LogBuy(msg.sender, _newPrice); 
        }
    }

    /// @notice add new dai deposit to an existing rental
    function depositDai(uint256 _dai, uint256 _tokenId) public collectRent(_tokenId) notResolved() {
        _receiveCash(msg.sender, _dai);
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].add(_dai);
    }

    /// @notice increase the price of an existing rental
    function changePrice(uint256 _newPrice, uint256 _tokenId) public collectRent(_tokenId) notResolved() {
        require(_newPrice > price[_tokenId], "New price must be higher than current price"); 
        require(msg.sender == team.ownerOf(_tokenId), "Not owner");
        
        //below is the only instance when price is modifed outside of the _transferTokenTo function
        price[_tokenId] = _newPrice;
        previousOwnerTracker[_tokenId][currentOwnerIndex[_tokenId]].price = _newPrice;
        emit LogPriceChange(price[_tokenId]);
    }
    
    /// @notice withdraw deposit
    /// @dev do not need to be the current owner
    function withdrawDeposit(uint256 _dai, uint256 _tokenId) public collectRent(_tokenId) notResolved() returns (uint256) {
        // if statement needed because deposit may have just reduced to zero following _collectRent function
        if (deposits[_tokenId][msg.sender] > 0) {
            _withdrawDeposit(_dai, _tokenId);
        }
    }

    /// @notice withdraw full deposit
    /// @dev do not need to be the current owner
    function exit(uint256 _tokenId) public collectRent(_tokenId) notResolved() {
        // if statement needed because deposit may have just reduced to zero following _collectRent function
        if (deposits[_tokenId][msg.sender] > 0) {
            _withdrawDeposit(deposits[_tokenId][msg.sender],  _tokenId);
        }
    }

    /* internal */
    /// @notice actually withdraw the deposit
    function _withdrawDeposit(uint256 _dai, uint256 _tokenId) internal {
        require(deposits[_tokenId][msg.sender] >= _dai, 'Withdrawing too much');
        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].sub(_dai);
        _sendCash(msg.sender, _dai);
         
        if(deposits[_tokenId][msg.sender] == 0) {
            _revertToPreviousOwner(_tokenId);
        }
    }

    /* internal */
    /// @notice if a users deposit runs out, either return to previous owner or foreclose
    function _revertToPreviousOwner(uint256 _tokenId) internal {
        bool _reverted = false;
        
        while (_reverted == false)
        {
            assert(currentOwnerIndex[_tokenId] >=0);
            currentOwnerIndex[_tokenId] = currentOwnerIndex[_tokenId].sub(1); // ownerTraker will now point to  previous owner
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
    /// @notice return token to the contract and return price to zero
    function _foreclose(uint256 _tokenId) internal {
        address _currentOwner = team.ownerOf(_tokenId);
        //third field is price, ie price goes to zero
        _transferTokenTo(_currentOwner, address(this), 0, _tokenId);
        emit LogForeclosure(_currentOwner);
    }

    /* internal */
    /// @notice transfer ERC 721 between users
    function _transferTokenTo(address _currentOwner, address _newOwner, uint256 _newPrice, uint256 _tokenId) internal {
        team.transferFrom(_currentOwner, _newOwner, _tokenId);
        price[_tokenId] = _newPrice;
    }
}

