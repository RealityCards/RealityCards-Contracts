pragma solidity ^0.5.0;
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

//TODO: have not yet tested the new check winner functions
//TODO: replace completesets with OICash
//TODO: change rent and depositDai and withdrawDai funcitons to actually transfer Dai form the user's address
//TODO: replace all + 1s with safemath
//TODO: do some research into gas costs if some of these variables are thousands of entries long and consider attempts to prevent this
//TODO: write new tests so that you can get rid of the 100 and the 365 days nonsense

/// @title Harber
/// @author Andrew Stanger
/// @dev ensure usingAugur is set to false upon local testing and true on kovan or mainnet
contract Harber {

    using SafeMath for uint256;

    // NUMBER OF TOKENS
    //Also equals number of markets on augur
    uint256 constant numberOfTokens = 20;

    // TESTING VARIABLES
    // if usingAugur false, none of the augur contracts are interacted with. Required false for ganache testing. // must be true in production :)
    bool constant usingAugur = false; 
    // below are in lieu of interacting with ERC20 token contract, for tests
    mapping (address => uint256) public winningsSentToUser;
    mapping (address => uint256) public depositReturnedToUser;
    // harber_tests1 was written for 100 wei dai and annual rental prices
    // other tests and production use 100 dai and daily rental prices
    bool constant usingTests1 =false;
    
    // CONTRACT VARIABLES
    IERC721Full public team; // ERC721 NFT.
    //Augur contracts:
    IMarket[numberOfTokens] market;
    ShareToken completeSets;
    Cash cash; 

    // UINTS ADDRESSES, BOOLS
    address public andrewsAddress; // my whiskey fund, for my 1% cut
    address[numberOfTokens] public marketAddresses; // the addresses of the various Augur binary markets. One market for each token. Initiated in the constructor and does not change.
    uint256[numberOfTokens] public price; //in dai-wei (so $100 = 100000000000000000000)
    uint256[numberOfTokens] public collectedPerMarket; // amount collected for each token, ie the sum of all owners' rent per token. Used to know how many complete
    // sets to sell for each market (since there is one market per token) 
    uint256 public totalCollected; // an easy way to track the above across all tokens.
    uint256[numberOfTokens] public timeLastCollected; // used to determine the rent due. Rent is due for the period (now - timeLastCollected), at which point timeLastCollected is set to now.
    uint256[numberOfTokens] public timeAcquired; // when a token was bought. used only for front end
    uint256[numberOfTokens] public currentOwnerIndex; // tracks the position of the current owner in the previousOwnerTracker mapping
    uint256[numberOfTokens] public numberOfOwners; //used to cycle through ownerTracker during finalse & payout. Since you can't find the size of a mapping. If the value is 5, it means there are 5 owners. Ie it is not doing programming counting. 
  
    // winning outcome variables
    uint256 winningOutcome = 42069; //start with invalid winning outcome
    uint256 public marketExpectedResolutionTime; //so the function to manually set the winner can only be called long after it should have resolved via Augur. Must be public so others can verify it is accurate. 

    // Market resolution variables
    // step1:
    bool marketsResolved = false; // must be false for step1, true for step2
    bool marketsResolvedWithoutErrors = false; // set in step 1. If true, normal payout. If false, return all funds
    // step 2:
    uint256 loopsRequired =0; // for returnDeposits and returnAllFunds functions
    bool loopsRequiredComplete = false; // must be false for step2, true for step3
    // step 3:
    uint256 returnDepositsLoopsCompleted = 0;
    bool returnDepositsComplete = false; // must be false for step3, true for step4
    // step 4:
    bool sellCompleteSetsComplete = false; // must be false for step4, true for step5
    // step 5:
    uint256 daiAvailableToDistribute = 0;
    bool getDaiAvailableToDistributeComplete = false; // must be false for step5, true for step6
    // step 6:
    uint256 payoutWinningsLoopsCompleted = 0;
    uint256 returnAllFundsLoopsCompleted = 0;
    bool doneAndDusted = false; // must be false for step6
    
    //  STRUCTS
    struct purchase {
        address owner;
        uint256 price;
    }
    
    // MAPPINGS
    mapping (uint256 => mapping (uint256 => purchase) ) public previousOwnerTracker; //keeps track of all previous owners of a token, including the price, so that if the current owner's deposit runs out, ownership can be reverted to a previous owner with the previous price. Index 0 is NOT used, this tells the contract to foreclose. This does NOT keep a reliable list of all owners, if it reverts to a previous owner then the next owner will overwrite the owner that was in that slot. The variable currentOwnerIndex is used to track the location of the current owner. 
    mapping (uint256 => mapping (uint256 => address) ) public ownerTracker; //used to keep hold of all the owners, for payout, similar to previousOwnerTracker except that the pointer to the current position never decrements
    mapping (uint256 => mapping (address => uint256) ) public timeHeld; //this is the key variable that tracks the total amount of time each user has held it for. It is key because this is used to determine the proportion of the pot to be sent to each winning address
    mapping (uint256 => uint256) public totalTimeHeld; //sums all the timeHelds for each token. Not required, but saves on gas when paying out
    mapping (uint256 => mapping (address => uint256) ) public deposits; //keeps track of all the deposits for each token, for each owner. Unused deposits are not returned automatically when there is a new buyer. They can be withdrawn manually however. Unused deposits are returned automatically upon resolution of the market
    mapping (address => uint256) public testDaiBalances;
    mapping (uint256 => mapping (address => bool)) public everOwned; //this is required to prevent the ownerTracker variable being incremented unless a completely new user buys the token. 
    mapping (address => uint256) public collectedPerUser; //keeps track of all the rent paid by each user. So that it can be returned in case of an invalid market outcome. Only required in this instance. 

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
    event LogRentCollection(uint256 indexed collectedPerMarket);
    event LogFinalised(uint256 indexed winningOutcome, uint256 indexed daiAvailableToDistribute);
    event LogFundsReturned(uint256 indexed daiAvailableToDistribute);
    event LogReturnToPreviousOwner(uint256 indexed tokenId, address indexed previousOwner);


    ////////////// MODIFIERS //////////////
    /// @notice prevents functions from being interacted with after the end of the competition 
    /// @dev should be on all public functions
    modifier notResolved() {
        require(marketsResolved == false);
        _;
    }

    /// @notice collect Rent
    /// @dev should be on all 'ordinary course of business' functions
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
        //the tests are written assuming price = annual rental price. Final version should be price =daily rental price
        if (usingAugur) {
            return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(1 days);
        }
        else {
            if(usingTests1) {
                return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(365 days);
            }
            else {
                return price[_tokenId].mul(now.sub(timeLastCollected[_tokenId])).div(1 days);
            }
        }
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
    /// @return how much the current user (regardless of whether or not they own it) has deposited
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
        if (usingAugur) {
            pps = price[_tokenId].div(24 hours);
        }
        else {
            if(usingTests1) {
                pps = price[_tokenId].div(365 days);
            }
        }
        if (pps == 0)
        {
            return now; //if price is so low that pps = 0 just return current time as a fallback
        }
        else
        {
            return now + liveDepositAbleToWithdraw(_tokenId).div(pps);
        }
    }

    /// @dev for front end and testing only
    /// @return test dai balance
    function getTestDaiBalance() public view returns (uint256) 
    {
        return testDaiBalances[msg.sender];
    }

    ////////////// AUGUR FUNCTIONS //////////////
    /// @notice get test Dai to allow a user to rent tokens
    /// @dev only a relevant function on kovan, that is why safeMath is not required
    /// @dev instead of the user getting testDai to his account, it is generated here and and allocated to the user
    function getTestDai() public 
    {
        if (usingAugur == true) {
            cash.faucet(100000000000000000000);
            testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100000000000000000000;
        }
        else {
            if(usingTests1) {
                testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100;
            }
            else {
                testDaiBalances[msg.sender]= testDaiBalances[msg.sender] + 100000000000000000000;
            }
        }
    }

    // * internal * 
    /// @notice buy complete sets from Augur
    function _buyCompleteSets(uint256 _tokenId, uint256 _rentOwed) internal 
    {
        if (usingAugur == true)
        {
            uint256 _setsToBuy =_rentOwed.div(100);
            completeSets.publicBuyCompleteSets(market[_tokenId], _setsToBuy);
        } 
    }

    // * internal *
    /// @notice buy complete sets from Augur
    function _sellCompleteSets() internal 
    {
        if (usingAugur == true)
        {
            for (uint i=0; i<numberOfTokens; i++) {
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

            for (uint i=0; i<numberOfTokens; i++) {
                // binary market has three outcomes: 0 (invalid), 1 (yes), 2 (no)
                if (market[i].getWinningPayoutNumerator(0) > 0 || market[i].getWinningPayoutNumerator(1) > 0 || market[i].getWinningPayoutNumerator(2) > 0  ) {
                    _resolvedOutcomesCount = _resolvedOutcomesCount + 1;
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
    /// @dev the reason there are two functions (haveAllAugurMarketsResolved and haveAllAugurMarketsResolvedWithoutErrors) is simply to ensure that the contract does not interpret
    /// @dev ... a delay in one of the market's resolving as an 'error' and refunding everyone prematurely
    /// @dev the two arguments this function takes are for testing only. They are not used when usingAugur is set to true
    function _haveAllAugurMarketsResolvedWithoutErrors(uint256 _hardCodedWinner, bool _hardCodedResolvedCorrectly) internal returns(bool) 
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
                    _invalidOutcomesCount = _invalidOutcomesCount.add(1);
                }
                if (market[i].getWinningPayoutNumerator(1) > 0) {
                    winningOutcome = i; // <- the winning outcome (a global variable) is set here
                    _winningOutcomesCount = _winningOutcomesCount.add(1);
                }
                if (market[i].getWinningPayoutNumerator(2) > 0) {
                    _losingOutcomesCount = _losingOutcomesCount.add(1);
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
            return _hardCodedResolvedCorrectly;
            }
        }

    // * internal * 
    /// @notice common function for all DAI transfers
    /// @param _reason param is for testing only
    function _sendCash(address _to, uint256 _amount, uint256 _reason) internal {  
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

    // * internal * 
    /// @return DAI balance of the contract
    /// @dev if usingAugur = false, totalCollected is returned instead
    function getContractsCashBalance() internal view returns (uint256) {
        if (usingAugur) {
            return cash.balanceOf(address(this));
        } else {
            return totalCollected;
        }
    }

    ////////////// MARKET RESOLUTION FUNCTIONS ////////////// 

    /// @notice calls all six completion functions
    /// @dev all functions can be called individually to protect against denial of service attacks
    /// @dev this function is therefore not required, it exists for convenince. 
    function complete(uint256 _numberOfLoopsToDo,uint256 _hardCodedWinner, bool _hardCodedResolvedCorrectly) public  
    {
        step1checkMarketsResolved(_hardCodedWinner,_hardCodedResolvedCorrectly);
        step2getLoopsRequired();
        step3returnDeposits(_numberOfLoopsToDo);
        step4sellCompleteSets();
        step5getDaiAvailableToDistribute();
        step6complete(_numberOfLoopsToDo);
    }

    /// @notice calls all six completion functions but returns all funds instead of paying to winners
    /// @dev all functions can be called individually to protect against denial of service attacks
    /// @dev this function is therefore not required, it exists for convenince.
    function emergencyExit(uint256 _numberOfLoopsToDo) public  
    {
        step1BemergencyExit();
        step2getLoopsRequired();
        step3returnDeposits(_numberOfLoopsToDo);
        step4sellCompleteSets();
        step5getDaiAvailableToDistribute();
        step6complete(_numberOfLoopsToDo);
    }

    /// @notice the first of six functions which must be called, one after the other, to conclude the competition
    /// @notice this function checks whether the Augur markets have resolved, and if yes, whether they resolved correct or not
    /// @dev these six functions are done seperately because if they were done at once, the gas cost could easily cross the block limit
    /// @dev can be called by anyone 
    /// @dev can be called multiple times, but only once after markets have indeed resolved
    /// @dev the two arguments passed are for testing only
    function step1checkMarketsResolved(uint256 _hardCodedWinner, bool _hardCodedResolvedCorrectly) public  
    {
        require(marketsResolved == false, "This function should only be completed once");
        // first check if all X markets have all resolved one way or the other
        if (_haveAllAugurMarketsResolved()) {
            // do a final rent collection before the contract is locked down
            collectRentAllTokens();
            // lock everything down
            marketsResolved = true;
             // now check if they all resolved without errors. 
            if (_haveAllAugurMarketsResolvedWithoutErrors(_hardCodedWinner, _hardCodedResolvedCorrectly)) {
                marketsResolvedWithoutErrors = true;
            }
        }
    }

    /// @notice Emergency function in case the augur markets never resolve for whatever reason
    /// @notice can only be called 6 months after augur markets should have ended 
    /// @dev marketsResolvedWithoutErrors will remain false so if this is called, all funds are returned
    function step1BemergencyExit() public 
    {
        require(marketsResolved == false, "This function should only be completed once");
        require (now > (marketExpectedResolutionTime + 15778800), "Must wait 6 months for Augur Oracle");
        //do a final rent collection before the contract is locked down
        collectRentAllTokens();
        // lock everything down
        marketsResolved = true;
    }

    /// @notice the second of six functions which must be called, one after the other, to conclude the competition
    /// @dev this function gets the required number of loops needed in the returnDeposits and returnAllFunds functions. We get it once only to save gas. 
    /// @dev can be called by anyone, but only once
    function step2getLoopsRequired() public
    {
        require(marketsResolved == true, "Markets must resolve first");
        // the below is not actually necessary for this function but nobody likes a combo breaker
        require(loopsRequiredComplete == false, "This function should only be completed once"); 

        //get the total number of loops required for returnDeposits or returnAllFunds
        uint256 _loopsRequired = 0;
        for (uint i=0; i < numberOfTokens; i++) 
        {  
            for (uint j=0; j < numberOfOwners[i]; j++)
            {  
                _loopsRequired = _loopsRequired.add(1);
            }
        }

        loopsRequired = _loopsRequired;
        loopsRequiredComplete = true;
    }

    /// @notice the third of six functions which must be called, one after the other, to conclude the competition
    /// @notice returns unused deposits to all users
    /// @dev the _numberOfLoopsToDo argument allows this function to be completed over multiple txs, protecting against denial of service attacks
    /// @dev trying to return all deposits to all users at once could easily hit the block limit
    /// @dev can be called by anyone, but only once (all the way through)
    function step3returnDeposits(uint256 _numberOfLoopsToDo) public
    {
        require(loopsRequiredComplete == true, "Must call getLoopsRequired first");
        require(returnDepositsComplete == false, "Deposits already returned");

        uint256 _currentLoop = 0;
        uint256 _startAtLoop = returnDepositsLoopsCompleted;
        uint256 _endAtLoop = returnDepositsLoopsCompleted.add(_numberOfLoopsToDo);

        for (uint i=0; i < numberOfTokens; i++) 
        {  
            for (uint j=0; j < numberOfOwners[i]; j++)
            { 
                if (_currentLoop >= _startAtLoop && _currentLoop < _endAtLoop) {
                    address _thisUsersAddress = ownerTracker[i][j];
                    uint256 _depositToReturn = deposits[i][_thisUsersAddress];
                    deposits[i][_thisUsersAddress] = 0;

                    if (_depositToReturn > 0) {
                        _sendCash(_thisUsersAddress,_depositToReturn, 0);
                    }

                    returnDepositsLoopsCompleted = returnDepositsLoopsCompleted.add(1);
                }
                _currentLoop = _currentLoop.add(1);
            }
        }

        if (_endAtLoop>=loopsRequired) {
            returnDepositsComplete = true;
        }
    }

    /// @notice the fourth of six functions which must be called, one after the other, to conclude the competition
    /// @dev gets funds back from Augur
    /// @dev can be called by anyone, but only once 
    function step4sellCompleteSets() public
    {
        require(returnDepositsComplete == true, "Must return deposits first");
        require(sellCompleteSetsComplete == false, "Cant sell complete sets twice");

        _sellCompleteSets();

        sellCompleteSetsComplete = true;
    }

    /// @notice the fifth of six functions which must be called, one after the other, to conclude the competition
    /// @notice gets the available funds for distribution and pays me my 1%
    /// @dev the figure cannot be hard coded in advance because of Augur fees 
    /// @dev can be called by anyone, but only once
    function step5getDaiAvailableToDistribute() public
    {
        require(sellCompleteSetsComplete == true, "Must sell complete sets first");
        require(getDaiAvailableToDistributeComplete == false, "Cant call this twice");

        daiAvailableToDistribute = getContractsCashBalance();

        //only pay me if markets resolved correctly. If not I don't deserve shit
        if (marketsResolvedWithoutErrors) {
            uint256 _andrewsWellEarntMonies = daiAvailableToDistribute.div(100);
            _sendCash(andrewsAddress,_andrewsWellEarntMonies, 3);
            daiAvailableToDistribute = daiAvailableToDistribute.sub(_andrewsWellEarntMonies);
        }

        getDaiAvailableToDistributeComplete = true;
    }

    /// @notice the final of six functions which must be called, one after the other, to conclude the competition
    /// @notice determines whether markets resolved correctly- if yes, payout winnings, if not, return all funds
    /// @dev can be called by anyone, but only once (all the way through)
    /// @dev _numberOfLoopsToDo and _hardCodedWinner are testing variables only
    function step6complete(uint256 _numberOfLoopsToDo) public
    {
        require(getDaiAvailableToDistributeComplete == true, "Must call getDaiAvailableToDistribute first");
        require(doneAndDusted == false, "Winnings already paid or funds returned"); 

        if (marketsResolvedWithoutErrors) {
                _payoutWinnings(_numberOfLoopsToDo);
            }
            else {
                _returnAllFunds(_numberOfLoopsToDo);
            }
    }

    // * internal * 
    /// @notice pays winnings to the winners
    /// @dev must be internal and only called by step6complete
    function _payoutWinnings(uint256 _numberOfLoopsToDo) internal
    {
        uint256 _currentLoop = 0;
        uint256 _startAtLoop = payoutWinningsLoopsCompleted;
        uint256 _endAtLoop = payoutWinningsLoopsCompleted.add(_numberOfLoopsToDo);

        for (uint i=0; i < numberOfOwners[winningOutcome]; i++)
        {   
            if (_currentLoop >= _startAtLoop && _currentLoop < _endAtLoop) {   
                address _winnersAddress = ownerTracker[winningOutcome][i];
                uint256 _winnersTimeHeld = timeHeld[winningOutcome][_winnersAddress];
                uint256 _numerator = daiAvailableToDistribute.mul(_winnersTimeHeld);
                uint256 _winningsToTransfer = _numerator.div(totalTimeHeld[winningOutcome]);

                if (_winningsToTransfer > 0) {
                    _sendCash(_winnersAddress,_winningsToTransfer, 1);
                }

                payoutWinningsLoopsCompleted = payoutWinningsLoopsCompleted.add(1);
            }
            _currentLoop = _currentLoop.add(1);
        }

        if (_endAtLoop>=numberOfOwners[winningOutcome]) {
            doneAndDusted = true;
        }
        emit LogFinalised(winningOutcome,daiAvailableToDistribute);
    }

    // * internal * 
    /// @notice returns all funds to users in case of invalid outcome
    /// @dev must be internal and only called by step6complete or emergencyExit
    function _returnAllFunds(uint256 _numberOfLoopsToDo) internal
    {
        uint256 _currentLoop = 0;
        uint256 _startAtLoop = returnAllFundsLoopsCompleted;
        uint256 _endAtLoop = returnAllFundsLoopsCompleted.add(_numberOfLoopsToDo);

        for (uint i=0; i < numberOfTokens; i++) 
        {  
            for (uint j=0; j < numberOfOwners[i]; j++)
            { 
                if (_currentLoop >= _startAtLoop && _currentLoop < _endAtLoop) {
                    address _usersAddress = ownerTracker[i][j];
                    uint256 _numerator = daiAvailableToDistribute.mul(collectedPerUser[_usersAddress]);
                    uint256 _fundsToReturn = _numerator.div(totalCollected);
                    collectedPerUser[_usersAddress] = 0; //same address could be across multiple tokens, don't want to pay the user more than once

                    if (_fundsToReturn > 0) {
                        _sendCash(_usersAddress,_fundsToReturn,1);
                    }

                    returnAllFundsLoopsCompleted = returnAllFundsLoopsCompleted.add(1);
                }
                _currentLoop = _currentLoop.add(1);
            }
        }

        if (_endAtLoop>=loopsRequired) {
            doneAndDusted = true;
        }
        emit LogFundsReturned(daiAvailableToDistribute);
    }

    ////////////// ORDINARY COURSE OF BUSINESS FUNCTIONS //////////////

    /// @notice collects rent for all tokens
    /// @dev originally a modifier but changed to a function to make it easy for me to call whenever I want to keep people paying their rent
    function collectRentAllTokens() public notResolved() {
       for (uint i=0; i < numberOfTokens; i++) {
            _collectRent(i);
        }
    }

    /// @notice collects rent for a specific token
    /// @dev also updates calculates and updates how long the current user has held the token for
    function _collectRent(uint256 _tokenId) public notResolved() {
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

            //decrease deposit by rent owed
            deposits[_tokenId][_currentOwner] = deposits[_tokenId][_currentOwner].sub(_rentOwed);

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

            _buyCompleteSets(_tokenId,_rentOwed);
            
            emit LogRentCollection(_rentOwed);
        }

        timeLastCollected[_tokenId] = now;
    }
    
    /// @notice to rent a token
    // *** this function needs to be modified to actually send the Dai from the user to the contract
    function newRental(uint256 _newPrice, uint256 _tokenId, uint256 _deposit) public collectRent(_tokenId) notResolved() {
        require(_tokenId < numberOfTokens, "This team does not exist");
        require(_newPrice > price[_tokenId], "Price must be higher than current price");
        require(_deposit > 0, "Must deposit something");

        // the below is a testing require only, a new one will be required to ensure the 
        // ...user is actually paying the deposit they say they are
        require(testDaiBalances[msg.sender] >= _deposit, "Not enough DAI");
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_deposit);
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

            // update the ownerTracker and numberOfOwners variables. only for new owners.
        if (everOwned[_tokenId][msg.sender] == false) {
            everOwned[_tokenId][msg.sender] = true;
            ownerTracker[_tokenId][numberOfOwners[_tokenId]] = msg.sender;
            numberOfOwners[_tokenId] = numberOfOwners[_tokenId].add(1);
        }

            //update timeAcquired for the front end
            timeAcquired[_tokenId] = now;

            //transfer token to new owner
            _transferTokenTo(_currentOwner, msg.sender, _newPrice, _tokenId);
            emit LogBuy(msg.sender, _newPrice); 
        }
    }

    /// @notice add new dai deposit to an existing rental
    // *** this will also need to be adjusted to work with the dai contract properly
    function depositDai(uint256 _dai, uint256 _tokenId) public collectRent(_tokenId) notResolved() {
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].sub(_dai);
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
        _withdrawDeposit(_dai, _tokenId);
    }

    /// @notice withdraw full deposit
    /// @dev do not need to be the current owner
    function exit(uint256 _tokenId) public collectRent(_tokenId) notResolved() {
        _withdrawDeposit(deposits[_tokenId][msg.sender],  _tokenId);
    }

    /* internal */
    /// @notice actually withdraw the deposit
    function _withdrawDeposit(uint256 _dai, uint256 _tokenId) internal {
        require(deposits[_tokenId][msg.sender] >= _dai, 'Withdrawing too much');

        deposits[_tokenId][msg.sender] = deposits[_tokenId][msg.sender].sub(_dai);
        testDaiBalances[msg.sender] = testDaiBalances[msg.sender].add(_dai);
        //return the dai
        _sendCash(msg.sender, _dai, 0);

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

