# Reality Cards

In private beta at: www.realitycards.io (if you would like a token, please contact me [here](https://t.me/andrewstanger)). 

Reality Cards is a prediction market based on ERC721 NFTs, on the Ethereum blockchain. 

*If you think Manchester United will win the Premier League- instead of simply putting money on Manchester United, rent the Manchester United token instead.*

At the end of the season/competition/tournament, all holders of the winning NFT will receive a split of the total rental payments in proportion to how long they have held the token. Token ownership changes via modified Harberger Tax rules. Tokens are fully ERC721 compliant (and can be viewed in any ERC721 wallet) with the exception that only the contract can modify the owner. 

This project began as a fork of Simon de la Rouviere's project [ThisArtworkIsAlwaysOnSale](https://thisartworkisalwaysonsale.com/). It began life as my (Andrew Stanger's) final project for the Nov 2019 - Jan 2020 Consensys Academy Bootcamp.

## How does it work?

To continue the example of the English Premier League. There are 20 teams and therefore 20 unique NFTs. Each token is originally unowned, and has a daily rental price of zero. If someone wishes to rent the Manchester United NFT they must set a daily rental price (1 DAI for example) and deposit some DAI to fund the rent. From this point, the user owns the token and the contract will start to track how long they have owned it for. The user's deposit will be deducted over time in line with the rental price they have set. 

At any time, a new user can 'buy' the token off the current owner by repeating the above, the only restriction being that the new rental price must be higher than its current price. Unlike traditional Harberger Tax rules, the new owner does *not* need to pay anything to the previous owner. 

If a user's deposit balance runs out, then token ownership reverts to the previous owner, assuming they have a remaining deposit balance. The rental price will also revert to whatever it was when that user purchased it. If a user's deposit balance runs out and there are no previous owners, or no previous owners with deposits left, the token will become unowned again and the price will revert to zero. 

Upon market resolution, all holders of the winning NFT will receive a split of the total rental payments from all 20 tokens in proportion to how long they have held the winning token. 

Users are free to withdraw any unused deposits at any time. 

## Example flow

To continue again the example of the English Premier League. The Premier League lasts 9 months. There are 20 teams.

All prices given are the cost to rent the token for one day. The following are assumed to happen at the start of each month:

* Month 1: Vitalik rents the Manchester United token and sets a price of 1 DAI. He deposits 90 DAI. 
* Month 2: Gavin rents the Manchester United token and takes ownership off Vitalik by setting a higher price, of 2 DAI. He deposits 60 DAI. Vitalik has 60 DAI remaining of his deposit (90 DAI less 30 days of 1 DAI per day rent). 
* Month 3: Gavin's deposit runs out (30 days * 2 DAI =60) and so ownership reverts to Vitalik, and the price reverts to 1 DAI
* Month 5: Vitalik's deposit runs out and there are no previous owners so the token becomes unowned and remains unowned until market resolution

Upon market resolution:
* Vitalik has paid 90 DAI in rent and owned the contract for 3 months
* Gavin has paid 60 DAI rent and owned the contract for 1 month
* Total rent paid for the the Manchester United token is 150 DAI and it was owned for 4 months.

Let us assume a total of 850 DAI was paid in rent among all the other 19 tokens. There is now 1000 DAI in the contract. 

Assuming Manchester United wins, Vitalik will receive winnings of 750 DAI (1000 * (3 months / 4 months ) ) and Gavin will receive winnings of 250 DAI (1000 * (1 months / 4 months ) ). There are currently no fees, so 100% of rent is returned to winners.

## What is going on behind the scenes?

A 'question' is created on the oracle service realit.io when the contract is created. At the end of the event, the contract queries realit.io to find out who won, and then pays out accordingly. Dai paid in rent is held by the contract for the duration, it is not sent anywhere. 

## Has this project been audited?

Yes, see [here](https://www.ditcraft.io/audits/realitycards).

## I have more questions

Please see the FAQ on the site [here](https://www.realitycards.io/faq). We have a telegram group [here](https://t.me/realitycards). If you wish to get in touch with me directly, please add me on telegram [here](https://t.me/andrewstanger).
