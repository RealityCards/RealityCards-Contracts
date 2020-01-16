This document intends to specify exactly what each variable, and function, is meant to do, and steps I have taken to ensure it does exactly that.

TODO: tests on kovan version

-   Ensure deposits variable is never more than the dai balance of the contract

-   Try and change price/withdraw deposit if not owner

MODIFIERS

notCompleted

-   This locks down the entire contract when the winnings have been paid out to all users. 

-   It should be on every public function

collectRent

-   This should be on all 'ordinary course of business' public functions (except _collectRent itself, obviously)

-   Rent is also required to be collected upon market resolution, but the function collectRentAllTokens is used instead of this modifier.

FUNCTIONS

Functions that are only used in tests and/or the front end are not listed.

There are five non-view functions that interact with external contracts (either Augur or Dai contract). They should all be internal

1.  _buyCompleteSets

2.  _sellCompleteSets

3.  _haveAllAugurMarketsResolved

4.  _haveAllAugurMarketsResolvedWithoutErrors

5.  _sendCash

There are five 'market resolution' functions that will be successfully run a maximum of once. Complete and emergencyExit should be public, the others internal and called only by these first two

1.  Complete

2.  emergencyExit

3.  _finaliseAndPayout

4.  _invalidMarketFinaliseAndPayout

5.  _returnDeposits

There are six 'ordinary course of business' public functions

1.  collectRentAllTokens

2.  _collectRent

3.  Buy

4.  changePrice

5.  depositDai

6.  withdrawDeposit

7.  exit

There are four 'ordinary course of business' internal functions which the above 7 use

1.  _withdrawDeposit

2.  _revertToPreviousOwner

3.  _foreclose

4.  _transferTokenTo

Constructor

-   This initialises the following contract variables:

-   Team which points to the ERC 721 contract

-   Market which is an array of size numberOfTokens pointing to the various market contracts

-   Cash which points to the Dai contract

-   completeSets which points to the ShareToken Augur contract (where the buy/sell complete sets functions are located)

-   These non contract variables are also initialised

-   currentOwnerIndex which is an array of size numberOfTokens, initially set to zero

-   numberOfOwners which is an array of size numberOfTokens, initially set to zero

-   marketExpectedResolutionTime where the expected timestamp of when the markets should begin to resolve. This must be set, to prevent people calling emergencyExit prematurely

View Functions

rentOwed

-   Returns the rent owed but not paid for a specific token. 

-   Takes the difference in seconds between now and when the most recent collection was made. This is then divided by the number of seconds in a day, resulting in the number of days since the last collection. This is then multiplied by the price. The price is the daily rental price.

-   Excluding view functions, it is only called in the collectRent function

-   Relies on the variable timeLastCollected being accurate, see the relevant section

Functions that interact with Augur- all internal

buyCompleteSets

-   Takes the rentOwed, divides it by 100 (because 1 complete set costs 100 wei-dai) and buys complete sets from augur

-   Only called by one function- collectRents. The function must be internal to ensure this remains the case

-   This will fail if the contract does not have rentOwed Dai

-   It is only called at the very end of the collectRent function. This function will reduce rentOwed to the maximum of whatever deposit the user has. So deposits needs to be accurate to the dai the contract holds at all times- see the deposits section

sellCompleteSets

-   This is only called once, upon market resolution, within the finaliseAndPayout (or invalidFinaliseAndPayout) function. Must be internal to ensure this is the case

-   For each token, collectedAndSentToAugur divided by 100 (as per buyCompleteSets) is sold. It is essential that this variable matches the actual sets bought. See collectedAndSentToAugur section.

haveAllAugurMarketsResolved

-   Should be internal and called only once by getWinner

-   Checks that each market on Augur has resolved. getWinner will only complete if this function returns true. 

-   Via a for loop, such that it checks all tokens (via the market variable), it calls the getWinningPayoutNumerator function within each Augur Market contract. Harber uses only binary markets, such that there are only three outcomes: 0 (invalid), 1 (option 1), 2 (option 2). This function checks that, for each token the market has resolved to one of these three options.

-   The local variable _resolvedOutcomesCount is initialised to zero, and incremented every time the market for that token has resolved to one of these options.

-   If _resolvedOutcomesCount = numberOfTokens return true. 

-   If there are three teams, numberOfTokens = 3. _resolvedOutcomesCount will be incremented three times, and equal 3. So = is correct, not <=

haveAllAugurMarketsResolvedWithoutErrors

-   Should be internal and called only once by getWinner 

-   This function should check all markets (via the market variable) and make sure that a) none resolve invalid, b) only one returns a 'Yes'. If this is the case, return true, else return false.

-   The flow of the function is similar to haveAllAugurMarketsResolved. Local uints are declared that count how each market resolves.

-   When it has cycled through all the markets, the below should be the case, in which case it returns true, else false. 

-   _winningOutcomesCount should = 1

-   _losingOutcomesCount should = numberOfTokens less 1

-   If three teams. This should increment twice. 

-   _invalidOutcomesCount should = 0

-   This function also sets the winningOutcome variable.

sendCash

-   Very simple function, consolidates all the instances of sending Dai to users. Should be internal and called by these functions only:

-   finaliseAndPayout

-   invalidMarketFinaliseAndPayout

-   returnDeposits

-   _withdrawDeposit

-   It uses the cash variable, whose type is the Dai Contract. It is initialised in the constructor.

Market resolution functions

complete

-   This must be manually called to complete the competition. It is not called from anywhere within the contract. Must be public. 

-   It should do the following

-   Do a final rent collection

-   Calls _collectRent

-   Check that all X markets (where X = numberOfTokens) markets have resolved

-   Calls _haveAllAugurMarketsResolved

-   Check that all X markets (where X = numberOfTokens) markets have resolved correctly. 

-   Calls _haveAllAugurMarketsResolvedWithoutErrors

-   If _haveAllAugurMarketsResolved returns false- the function should do nothing

-   If _haveAllAugurMarketsResolved returns true and _haveAllAugurMarketsResolvedWithoutErrors returns false, the function should call _invalidMarketFinaliseAndPayout - i.e. it should return all payments to users, with zero winners. This should not happen in the normal course of business

-   If _haveAllAugurMarketsResolved returns true and _haveAllAugurMarketsResolvedWithoutErrors returns true, the function should call _finaliseAndPayout - i.e. calculate winnings and pay them out. 

-   It is ok to call this function multiple times, until such time that _haveAllAugurMarketsResolved returns true. It should then do the appropriate payouts, and then not be run again. This is achieved via the notCompleted modifier.

emergencyExit

-   An 'emergency; function for one of the following two cases:

-   The Augur markets never resolve. 

-   The function _haveAllAugurMarketsResolved does not work as intended

-   It is not called from anywhere within the contract. Must be public. 

-   Returns all Dai to all users- cannot payout to the appropriate winner, because the contract does not know who the winner is

-   This should do the same as the complete function except:

-   It should always call _invalidMarketFinaliseAndPayout

-   It can only be called if 6 months have passed after the Augur markets should have ended. The variable marketExpectedResolutionTime must be set correctly!!

_finaliseAndPayout

-   Can only be called by complete, must be internal

-   It should do the following

-   Return all unused deposits to users

-   Calls _returnDeposits

-   Gets all the Dai back from Augur

-   Calls _sellCompleteSets

-   Sends 1% of the Dai to me

-   Of the balance, calculates how much each winner should be paid, and makes the payment

-   Sets doneAndDusted to be true so the entire contract is locked down

-   It is not known in advance how much will be returned from Augur, due to varying fees, therefore it is not possible to use a previously defined variable to determine the total amount to pay out. Instead, the cash balance of the contract is used. 

-   The variable winningOutcome needs to be set for this function to work. It is set in haveAllAugurMarketsResolvedWithoutErrors which is called by complete before this function is called

-   After paying me, the function cycles through the ownerTracker variable, for the specific winning token. This variable keeps track of the addresses of all owners of each token, i.e. it uses a for loop, going from zero to the value of the variable numberOfOwners for the winning token.

-   This is done twice:

-   The first time calculates the total time the token has been held by all owners (the denominator in the payout calculation). For each owner of the winning token:

-   Gets the address from ownerTracker

-   Gets the length of time they have held the token from timeHeld

-   Adds the value to local variable _totalWinnersTimeHeld 

-   The second time calculates the amount to pay, and does the payout. For each owner of the winning token:

-   Gets the address from ownerTracker

-   Gets the length of time they have held the token from timeHeld

-   Calculates totalDai * ( timeHeld / _totalWinnersTimeHeld) and sends the result to the user

-   For example. if totalDai = 100, timeHeld for that user is 100 seconds and totalTimeHeld among all users is 1000 seconds, the user will be sent 10 Dai. 

-   It is essential that the contract has sufficient Dai to payout or it will fail. 

-   The tests include checks that the sum of timeHeld per user is always equal to totalTimeHeld. If the former is higher, there will not be enough Dai. Further, these variables are always incremented together, so there is no instance where they can be different. 

-   Solidity rounds down when dividing (as per the documentation) so the sum of the actual payments made should be marginally lower than the total Dai to pay.

_invalidMarketFinaliseAndPayout

-   Same as _finaliseAndPayout (calls both _returnDeposits and _sellCompleteSets) but the payout is different and no payment is made to me (I don't deserve any if it gets to this point).

-   Must be internal. Only called by complete or emergencyExit

-   The function cycles through the ownerTracker variable, for all tokens. This variable keeps track of the addresses of all owners of each token.

-   The for loop structure first cycles through all the tokens. It then cycles through all the owners of each token. 

-   (uint i=0; i < numberOfTokens; i++) uses < and not <= as explained in numberOfTokens section

-   (uint j=0; j < numberOfOwners[i]; j++) uses < and not <= as explained in numberOfOwners section NOT DONE YET

-   For each owner of every token:

-   Gets the address from ownerTracker

-   Gets how much they have paid in rent from rentPaid

-   Gets the total amount paid from all users from totalCollected

-   Calculates totalDai * (rentPaid / totalCollected) and sends to the user

-   rentPaid does not track how much each user paid in rent for each token. It is not an array of size numberOfTokens. If a user pays rent on multiple tokens, this variable will include the sum of all amounts, it will not list the different amounts separately. The point is that rentPaid must be reduced to zero every time a payment is made, because the for loops WILL return to the same value if the user has paid rent on two tokens.

_returnDeposits

-   Should return all unused deposits to all users. 

-   Should only be called once. It is internal and only called from _invalidMarketFinaliseAndPayout or _finaliseAndPayout which themselves can only be called once, see the relevant sections.

-   Uses the same for loop structure as _invalidMarketFinaliseAndPayout to cycle through all owners of each token individually

-   The relevant Dai has not been sent to Augur, therefore there is no need to check the Dai balance of the contract, and can simply use the deposits variable to return the relevant funds.

-   It is essential that the sum of the unused deposits as per the deposits variable is correct and not more than the Dai amount in the contract at the time the function is run. See the deposits section for how this is ensured

Ordinary course of business functions- public

_collectRent

-   This function should do the following:

-   Calculate the rent owed for that token (passed as an argument)

-   Achieved via the _rentOwed function

-   Check if the user can afford the rent

-   Compare the rentOwed with the user's deposit

-   If rentOwed is greater than deposit, rentOwed is reduced to the value of the deposit, otherwise it is not modified

-   Pay the rent (take from the user's deposit and send to Augur)

-   call buyCompleteSets and pass the rent owed amount

-   Update rentPaid so that all payments can be returned to users in the event of an invalid outcome

-   See rentPaid section

-   Update timeHeld so that the correct winnings can be made to each owner of the winning token

-   See timeHeld section

-   The idea is that it should be called, via a modifier, for every single non-view public function. 

-   This function should be called whenever any other public, non view function is called, ie. whenever the contract is interacted with in any way

-   For 'ordinary course of business' functions (which are: buy, changePrice, depositDai, withdrawDeposit, exit this function is called via the collectRent modifier, which collects rent only for the specific token that is being interacted with. To attempt to collect the rent for all tokens would increase gas for users and create a bad UX. 

-   For the 'market resolution' functions (which are: emergencyExit and complete) it is a called via the collectRentAllTokens functions which collects rent for every token.

Buy

-   This function should transfer ownership to a new user, after ensuring the following

-   The user sends some Dai as a deposit NOT DONE

-   The price is higher than the current price

-   Should have modifiers: notCompleted and collectRent

-   The function should, in all instances, take Dai from the user and increase their corresponding deposit balance NOT DONE

-   Then:

-   If the current owner calls the function, simply call the changePrice function.

-   If someone other than the current owner calls the function: 

-   Update the ownerTracker and numberOfOwners variables.

-   Update the previousOwnerTracker and currentOwnerIndex variables.

-   Update timeAcquired variable

-   Update deposits See the relevant sections in the Variables section.

-   All of the above are outlined in the Variables section.

-   Transfer the token to the new owner via the _transferTokenTo function.

depositDai

-   Public, should do what it says on the tin

-   Should have modifiers: notCompleted and collectRent

changePrice

-   Public, should do what it says on the tin

-   Can only be called by current owner of the token

-   Should have modifiers: notCompleted and collectRent

-   This function is the only function where the price is changed, apart from buy, and revertToPreviousOwner

withdrawDeposit

-   Public, should do what it says on the tin

-   Should have modifiers: notCompleted and collectRent

exit

-   Public, should withdraw entire deposit and foreclose. I.e. have identical functionality to withdrawDeposit if the full deposit balance was trying to be withdrawn

-   Should have modifiers: notCompleted and collectRent

Ordinary course of business functions- internal

_withdrawDeposit

-   Internal, called either by exit or withdrawDeposit

-   Reduces the deposit amount by the amount of the withdrawal, and then makes the withdrawal

-   If the deposit zero falls to zero, call returnToPreviousOwner

returnToPreviousOwner

-   Should check if the previous owner has a deposit. If no, go back to the previous owner again. Keep repeating this until a previous owner with a deposit is found, or it runs out of previous owners

-   To check if a previous owner has a deposit

-   Decrement currentOwnerIndex and check the the deposit balance of address previousOwnerTracker[currentOwnerIndex] 

-   If a positive balance, call _transferTokenTo

-   To check if there is a previous owner

-   Decrement currentOwnerIndex and check whether it is equal to zero

Foreclose

-   Should return ownership of the token to the contract and set its price to zero. 

-   Called only by returnToPreviousOwner

_transferTokenTo

-   Transfers the ERC721 token and updates the price

-   It is the only situation in which the price is updated, EXCEPT for the changePrice function

-   It must be internal and called only by these functions:

-   Buy, foreclose and _revertToPreviousOwner

KEY VARIABLES

Overview of key variables:

-   collectedPerMarket, collectedPerUser and totalCollected. 

-   collectedPerMarket tracks how much has been sent to each Augur market so that the appropriate amount can be requested back via sellCompleteSets

-   collectedPerUser tracks how much each user has paid so that the appropriate amount can be sent back if there is an invalid outcome

-   totalCollected is the sum of either of the above two (they should both be the same)

-   timeLastCollected

-   used to calculate rent owed

-   previousOwnerTracker and currentOwnerIndex

-   The former keeps track of all previous owners, so that the contract knows who to return ownership to if the current owner runs out of deposit

-   The latter points to the position of the current owner in the former

-   ownerTracker 

-   The former keeps track of all owners of a token, so it knows who to pay out to

-   timeHeld and totalTimeHeld

-   The former tracks how long each user has held each token for, to determine each user's share of the winnings. The latter sums all the timeHelds for each token

numberOfTokens

-   The number of teams/outcomes. It is a constant and should never change. Various functions use this variable in for loops [for (uint i=0; i<numberOfTokens; i++)]. These loops use less than- not less than or equal- therefore, when this function is set, do not use programmer counting. So if there are three teams, numberOfTokens should equal 3, not 2 as implied by programmer counting. The loop will run three times- on 0, 1, and 2. 

-   100% of such loops should be written this way.

deposits

-   Tracks the deposits for each user, per token. 

-   It must always equal or be less than the DAI the contract has, or buyCompleteSets will fail or returnDeposits will fail

-   It is reduced in these instances only:

-   In the collectRent function, just before complete sets are bought. The rentOwed amount is deducted. When the completeSets are bought the dai balance will reduce by the same amount

-   In the withdrawDeposit function, by the amount to withdraw, at the same time the dai is sent to the user [THIS IS NOT CURRENTLY THE CASE]

-   It is increased in these instances only:

-   In the buy function, it is increased by the amount of the dai sent to the contract [THIS IS NOT CURRENTLY THE CASE]

-   In the depositDai function, it is increased by the amount of the dai sent to the contract [THIS IS NOT CURRENTLY THE CASE]

-   There are four instances, as above, when the variable is changed. In all four instances this corresponds to a change in the contract's Dai balance, thus ensuring this variable will never be lower than the contract's DAI balance.

collectedPerMarket, collectedPerUser and totalCollected. 

-   collectedPerMarket tracks how much has been sent to each Augur market so that the appropriate amount can be requested back via sellCompleteSets

-   It must be equal or less than the actual amount of Dai sent to Augur, or the sellCompleteSets function will fail. It is easily verified that this is the case because this variable is only modified immediately before buyCompleteSets is called. It is increased by rentOwed, the exact same variable that is used to buy complete sets.

-   collectedPerUser tracks how much each user has paid so that the appropriate amount can be sent back if there is an invalid outcome

-   The above risk does not exist since this variable is not being used to get funds back from Augur

-   totalCollected is the sum of either of the above two (they should both be the same)

-   This forms the denominator when there is an invalid outcome and rent is returned to the user

market

-   A variable of type 'Market', the augur contract for each market. 

-   Array, with size = numberOfTokens. Set in the constructor. It is essential that the addresses passed to the constructor match the relevant markets. 

-   This variable is referenced in the following functions:

-   buyCompleteSets

-   sellCompleteSets

-   haveAllAugurMarketsResolved

-   haveAllAugurMarketsResolvedWithoutErrors

previousOwnerTracker and currentOwnerIndex

-   These variables work in tandem. previousOwnerTracker contains an array of all the previous owners of a token as well as the price at that point, and currentOwnerIndex tracks the position of the current owner within this mapping.

-   The contract needs to know, at all times, who the previous owner of a token is, and its price at that point, so that if the current owner withdraws their deposit, it can revert to the previous owner and the previous price.

-   Whenever a new address and price is added to previousOwnerTracker, currentOwnerIndex must be incremented, so it points to the current owner within the mapping. 

-   currentOwnerIndex must be incremented first, only then the current owner and price is added to previousOwnerTracker[currentOwnerIndex]. Therefore, previousOwnerTracker[0] will always be empty

-   Whenever token ownership reverts to a previous owner, currentOwnerIndex must be decremented.

-   previousOwnerTracker is not modified in this instance. The previous 'current owner' ie the address in slot (currentOwnerIndex + 1) will now be written over if there is a new owner. This is fine. previousOwnerTracker is there to keep track of previous owners that the token may one day revert to, it does not need to keep track of previous owners who have zero deposit left. 

-   Example: contract starts with empty previousOwnerTracker and currentOwnerIndex of zero. 

-   Buyer A buys the token with a price of X. currentOwnerIndex is incremented to 1. Address A and price X is added to previousOwnerTracker[currentOwnerIndex] or previousOwnerTracker[1]. 

-   Buyer B buys the token for price Y. currentOwnerIndex is incremented to 2. Address B and price Y is added to previousOwnerTracker[2]. 

-   Buyer B then withdraws all his deposit. currentOwnerIndex is decremented to 1, token ownership reverts to the address and price at previousOwnerTracker[1] which is address A and price X. 

-   Buyer C buys the token at price Z. currentOwnerIndex is incremented to 2. Address C and price Z is added to previousOwnerTracker[2], overwriting B's address and a price of Y that was previously in this slot.

-   Below lists all the actual instances in the code of these variables being modified or read:

-   In the buy function. Whenever this function is called, it checks if the new owner is equal to the current owner. 

-   If yes, call the changePrice function

-   If no, then currentOwnerIndex is incremented  and THEN msg.sender is added to previousOwnerTracker[currentOwnerIndex].owner and _newPrice is added to previousOwnerTracker[currentOwnerIndex].price

-   In the changePrice function. There is no need to modify currentOwnerIndex. However, the new price is added to previousOwnerTracker[currentOwnerIndex].price

-   In the _revertToPreviousOwner function.

-   First, currentOwnerIndex is decremented 

-   Second, check if currentOwnerIndex is now equal to zero. If so, this means there are no previous owners- foreclose. 

-   If currentOwnerIndex is not zero, transfer ownership to previousOwnerTracker[currentOwnerIndex].owner and change the price to previousOwnerTracker[currentOwnerIndex].price

numberOfOwners and ownerTracker

-   These variables work in tandem and are very similar to previousOwnerTracker and currentOwnerIndex

-   The only difference is that these variables track all the owners of each token. With each new owner, numberOfOwners is incremented and the new owner added to ownerTracker. Unlike previousOwnerTracker, numberOfOwners is never decremented

-   numberOfOwners should count how many different owners there are for each token. If user gCleveland owns the same token on two non consecutive occasions, ownerTracker should only list him once. It should not use programming counting, i.e. if there are two owners, numberOfOwners should equal 2. 

-   To rephrase- in all instances of there being a new owner of a token, the address be added to ownerTracker[numberOfOwners] and numberOfOwners should increment

-   Notice that this is the opposite order with previousOwnerTracker and currentOwnerIndex where currentOwnerIndex is incremented before previousOwnerTracker[currentOwnerIndex] is added to. This is because previousOwnerTracker[0] is used to tell the contract to foreclose the token. Not relevant in this instance. So, ownerTracker[0] will include the address of the first owner, whereas previousOwnerTracker[0] is always empty

-   It is used when paying out, in the following three functions:

-   _finaliseAndPayout

-   _invalidMarketFinaliseAndPayout

-   _returnDeposits

-   In the above cases, this is the relevant for loop 

-   for (uint i=0; i < numberOfOwners[token]; i++) { address _usersAddress = ownerTracker[i][token] }

-   < is correct as opposed to <= because we are starting from zero and numberOfOwners does not use programming counting

-   Example. Contract starts with empty ownerTracker and numberOfOwners of zero. 

-   A buys, his address is added to ownerTracker[numberOfOwners] =  ownerTracker[0] and numberOfOwners is incremented to 1.

-   B buys, his address is added to ownerTracker[numberOfOwners] =  ownerTracker[1] and numberOfOwners is incremented to 2

-   For loop needs to be run twice, i = 0 and i = 1. 

-   It is modified only in the buy function:

-   When called, the contract checks everOwned variable to see if this user has ever owned this token before

-   If yes, do nothing, as the use will already be included in ownerTracker

-   If no, add the new user to ownerTracker and increment numberOfOwners, in that order.

timeHeld and _timeOfThisCollection

-   timeHeld should  track the how long each user has held each token for. Should NOT track how long the contract itself has owned it for, this should count as 'unowned'.

-   It is used only in _finaliseAndPayout function. It has two uses here:

-   The value of all timeHelds for the winning token are summed to calculate the total time held among all the users who rented the correct token, which forms the denominator of the equation given below

-   It is also the numerator of the equation totalDai * ( timeHeld / _totalWinnersTimeHeld). This amount is then sent to each winner.

-   It is modified only in _collectRent. It is appropriate to update timeHeld at the same moment that rent is paid. If rent is paid for the last 100 seconds, then timeHeld should be incremented by this amount

-   _collectRent's code is only run if the token is not foreclosed, otherwise it is skipped. This is how the contract does not count time held by the contract itself

-   Specifically, timeHeld is incremented by the difference, in seconds, between _timeOfThisCollection and timeLastCollected. So timeHeld will only be correct if these variables are correct.

-   _timeOfThisCollection is a local variable within the collectRent function. If the amount required to pay in rent is above or equal to the available deposit, _timeOfThisCollection will equal the current timestamp. 

-   Otherwise it will equal when it was paid up to, by calculating the following:

-   (current time - time last collected) * (amount available to pay / amount owed)

-   Amount available to pay will always be lower than amount owed so _timeOfThisCollection will end up being in the past

-   timeLastCollected is mentioned in its own section

everOwned

-   A mapping which keeps track of whether or not each user has ever owned a specific token. It is used only within the buy function to ensure that ownerTracker is updated only when there is a new owner (as opposed to a previous owner buying it back off someone else)

Price

-   Keeps track of the current price of each token. Array, size equal to numberOfTokens

-   The variable is updated with the current price whenever the function _transferTokenTo is called. So there is no need to set the price anywhere else IF there is a token transfer. So this variable should only be modified in instances where the price changes but there is no new owner

-   This is only in changePrice function

doneAndDusted

-   Bool, set to false at contract initiation. 

-   Most importantly, ensures that payouts are not done twice. 

-   Further, this bool puts a lock on various 'normal course of business' functions after payouts are done. This is not essential, but it prevents users wasting money by renting tokens after the competition has closed.

-   Used via the notCompleted modifier

-   It is set to true when the following payout related functions are run:

-   _finaliseAndPayout

-   _invalidMarketFinaliseAndPayout

-   The modifier should be set on every single public function. There are no functions that should be accessible after payouts have been made. 

-   This does mean that token ownership can never change after payouts have been made, the final owner will be stuck with it forever. Perhaps this can be altered in a future version.

timeLastCollected

-   As it says on the tin, keeps track of the the timestamp of most recent rental payment for each token. This information is needed for two reasons

1.  So that timeHeld can be incremented properly in the collectRent function

2.  To calculate how much rent is needed 

-   See the rentOwed function

-   It is set to the current timestamp whenever collectRent is called. It is the only part of this function that is run even if the token is currently unowned. This is correct- the new owner should only start paying from the time they began to own it.

timeAcquired

-   This should keep a record of the timestamp when each new user first purchases each token. It is required only for the front end, when it displays how long the token was purchased for. 

-   It is simply set to now whenever the buy function is called by a new user