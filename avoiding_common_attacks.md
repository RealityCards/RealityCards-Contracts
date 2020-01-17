# AVOIDING COMMON ATTACKS

### Re-entrancy
The only external contracts that are called are Augur and Dai contracts that are assumed to be safe. 

Plus, in all instances when DAI is sent (via the _sendCash function) the relevant variable is reduced prior to the cash being sent.

### Transaction Ordering and Timestamp Dependence
The contract is not susceptible to this. 

### Integer Overflow and Underflow
Safe math is used throughout. 

### Denial of Service
This was a major problem and the code had to be subtanitally rewritten to solve it. The problem was that there are various unbounded mappings that need to be looped over during the payout phase- ownerTracker being the primary example, which it is written to every time a new user buys a token. This opens a possible attack of stuffing the variable so full of users that the contract can never pay out winnings at the end due to hitting block limits. harber_tests3 was written specifically to determine the gas costs of looping over this mapping with a large number of users. It was found that > ~200 users and the gas costs required to payout winnings exceeded the block limit. 

The solution was two fold. First, the function to payout winnings to users (and the emergency function which returned all funds to users) were split into six different functions, each of which are public and can be called one at a time.  Secondly, (and most importantly) the two of these six that involved looping over a mapping of unbounded size were rewritten so that the loops could be done in chunks. 

For example, say the size of the mapping was 1000, due to 1000 users using the app. Then it was possible to only process 100 of these users, wait for the tx to confirm, then do another 100, etc, until all 1000 could be done. This means that no matter how large the variables get, the functions can always be sucessfully completed given enough transactions. 

### Force Sending Ether
The contract is not susceptible to this. It does not use ether for its normal logic, it uses Dai. At no point does the contract check its ether balance. 
