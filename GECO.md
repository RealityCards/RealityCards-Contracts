## Project Overview
![harber.io](https://i.imgur.com/TLvMZOC.png)
### Project name
Harber
### Team members 
Andrew Stanger- [LinkedIn](https://www.linkedin.com/in/andrew-stanger-351a3a170/) 
### What project are you building 
Harber is an entirely new form of prediction market. It is completely unlike the existing prediction market solutions (Augur, Gnosis Sight, Omen etc) in that it creates a market in outcomes using NFTs- you no longer put money on a team, you *own* the team. 

![](https://i.imgur.com/BWo1Re2.png)
### Why did you decide to build it 
My experience of existing prediction markets is that they are confusing (with concepts such as 'shares' and 'complete sets') and not very *fun*. To put it another way- the UX could be improved.

I created Harber to solve both problems. There are no shares or sets- even the concept of 'odds' is abstracted away. Instead we have NFTs- one per outcome- each with their own rental price. That's it. And this is what makes using Harber *fun*- with NFTs come scarcity, and *collectibles*. With Harber, only one person can own each outcome at any one time. You think Donald Trump will be re-elected? Then rent the Donald Trump NFT. It will be in your ERC721 wallet and *nobody elses*. 

And unlike NFTs in (almost) every other NFT project- the value of each NFT is *not* defined simply by what the next owner is willing to pay you for it. With Harber, you can get paid for owning an NFT without needing to sell it- and you can get paid for NFTs that you used to own in the past, but don't any more. 

*With Harber, the entire UX of using a prediction market is transformed.* 

### How long will it take 
I have already been working on this project full time (with no funding) for four months, and as such Phase 1 of this project (a description of the two phases is given below) is already 90% complete (both backend and frontend), and can be completed in less than a month. I estimate Phase 2 to take an additional two months (it is my strong desire for it to be ready before the Olympics). 

However, for both Phase 1 and 2 I am concerned that the main bottleneck will be legal. Am I creating a gambling product? Do I need to obtain a licence? I am in great need of legal advice which I cannot afford without funding.
### How much funding are you requesting  
$9k for personal living expenses and freelancer costs. Additional funding may be required for legal advice, and/or licencing costs. I am unable to estimate these costs myself- I seek the advice of Gnosis' legal advisors. 

### How did you hear about the GECO
Friederike Ernst's presentation titled 'A prediction market is not a prediction market is not a prediction market' at EthCC in Paris, Feb 2020. 
## Your Proposal 

### Phase 1- Harberger Tax rules

Phase 1 is the 'main' Harber product. There will be a contract specific to an event- for example, the 19/20 English Premier League. Each event will have only a single winner. There is one NFT for each team- i.e. in the case of the English Premier League, there will be 20 tokens. At contract initiation, each NFT will have a price of zero and will be owned by the contract itself. Any user is free to 'rent' a team/NFT at any time- in order to do this, they set a daily rental price (in Dai) and deposit Dai to fund the rent. If a token is already owned, no problem- just set a higher rental price and you will immediately become the new owner. If your deposit runs out, ownership reverts to the previous owner, at the previous price.

All rent paid among all the tokens will go into a central pot, and will be paid out to all the owners of the winning token, *in proportion to how long they have owned it*. This makes Harber completely unique among gambling products- your winnings are no longer determined by how much money you paid, but instead simply by *how long you have owned the team*. 

Note that this is a modification of normal Harberger Tax rules, because here, you do not need to pay anything to the previous owner. If you are unfamiliar with the concept of of Harberger Taxes, I suggest [this](https://medium.com/@simondlr/what-is-harberger-tax-where-does-the-blockchain-fit-in-1329046922c6). This post was authoured by Simon de la Rouviere. Harber began life as a fork of his project [thisartworkisalwaysonsale](https://thisartworkisalwaysonsale.com/).

Tokens are fully ERC721 compliant (and can be viewed in any ERC721 wallet) with the exception that only the contract can modify the owner.

![](https://i.imgur.com/eOVWgqY.png)

**Example Flow**

To continue again the example of the English Premier League. The Premier League lasts 9 months. There are 20 teams.

All prices given are the cost to rent the token for one day. The following are assumed to happen at the start of each month:

* Month 1: Vitalik rents the Manchester United token and sets a price of 1 DAI. He deposits 90 DAI. 
* Month 2: Gavin rents the Manchester United token and takes ownership off Vitalik by setting a higher price, of 2 DAI. He deposits 60 DAI. Vitalik has 60 DAI remaining of his deposit (90 DAI less 30 days of 1 DAI per day rent). 
* Month 3: Gavin's deposit runs out (30 days * 2 DAI =60) and so ownership reverts to Vitalik, and the price reverts to 1 DAI
* Month 5: Vitalik's deposit runs out and there are no previous owners so the token becomes unowned and remains unowned until market resolution

Upon market resolution:
* Vitalik has paid 90 DAI in rent and owned the contract for 3 months
* Gavin has paid 60 DAI rent and owned the contract for 1 month
* Total rent paid for the Manchester United token is 150 DAI and it was owned for 4 months.

Let us assume a total of 850 DAI was paid in rent among all the other 19 tokens. There is now 1000 DAI in the contract. 

Assuming Manchester United wins, Vitalik will receive winnings of 750 DAI (1000 * (3 months / 4 months)) and Gavin will receive winnings of 250 DAI (1000 * (1 months / 4 months)). Winnings may be lower in reality due to any fees payable to the Oracle.

### Phase 2- Lottery

Phase 2 is a twist on the above idea. There are two differences: token ownership does not change (unless the owners chooses to transfer ownership- i.e. there is no Harberger tax element) and there are multiple winning tokens. Token ownership is allocated *randomly* in the form of a lottery, or raffle. Winnings are paid in proportion to how each team (or whatever the token represents) performs, in a specific way that is unique for each event. For example, if the event is the Olympics, then winnings may be paid in proportion to how many gold medals each country wins. If the event is the Oscars, then winnings may be paid in proportion to how many Oscars each movie wins. If the event is the US General Election 2020, then winnings may be paid in proportion to electoral college votes. 

**Example Flow**

Let us use the example of the Olympics (this is my intended first use case of Phase 2). Assume there are 100 NFTs, each one representing one of the top 100 countries that compete in the Olympics. Assume there will be 1000 lottery tickets, giving each ticket a 10% chance of winning an NFT. Users state a) how many tickets they wish to buy and b) their maximum price, and deposit Dai equal to number of tickets * maximum price. At the end of the ticketing process, all 1000 tickets will be sold at the 1000th most expensive price offered by users. As below:

* Vitalik wishes to buy 400 tickets at a price of 0.5 DAI each, and pays 200 DAI
* Gavin wishes to buy 400 tickets at a price of 1 DAI each, and pays 400 DAI
* Joe wishes to buy 400 tickets at a price of 2 DAI each, and pays 800 DAI
* Andreas wishes to buy 400 tickets at a price of 3 DAI each, and pays 1200 DAI

The 1000th most expensive ticket is worth 1 DAI, so all tickets are sold at this price. Andreas receives his full allocation of 400 tickets and is returned 800 DAI. Joe also receives his full allocation of 400 tickets and is returned 400 DAI. Gavin only receives 200 of his 400 tickets, and is returned 200 DAI. Vitalik does not receive any tickets, and is returned 200 DAI.

There is now a total of 1000 DAI in the contract to be paid out. Assume that one of Gavin's 200 tickets wins him the USA token. Assume further, that the total number of gold medals among all 100 teams is 1000, and that USA wins 10%, or 100 of these. Gavin will therefore receive winnings of 100 DAI, 10% of the total pot, for owning this token. The remaining 900 DAI will be paid out to the owners of all the other 99 tokens. 

Phase 2 has been designed to appeal to those who would not normally be interested in gambling. Using this product is more akin to a lottery than gambling- a lottery with a unique twist. Further, lottery tickets (or the NFTs themselves) would make fantastic gifts, especially for new users. 

It is my intention for there to be various markets running simultaneously for the 'main', Phase 1 product, but there to only ever be a single lottery running at any time, in order to give the latter a feeling of something unique and special.

### Phase 3- ???

Phase 3 does not form part of this grant. I do not request funding, nor propose a timeline for Phase 3 work. I mention it here only to highlight the potential of this project. Ideas include:
* perpetual tokens- the same token will pay out multiple times, not just on a single occasion as in the above examples. For example, instead of a token paying out if Manchester United wins the 19/20 Premier League, it pays out *every year* if they win that year.  
* decentralising market creation. Currently, there is no ability for users to create their own markets. Further, users could also choose which Oracle to use (as with Omen).
* incentivising liquidity providers. There is currently zero incentive to provide liquidity to Harber (as opposed to taking a position, for which there is the incentive of winning DAI). 

### Team description
I am the only team member (although I have employed the help of freelancers on Upwork for the front end). I am a former Deloitte Chartered Accountant/Financial Analyst working in the City of London and Cambridge. I fell in love with Ethereum and decided to quit my job and change career. I joined the Consensys Solidity Bootcamp in November 2019. Harber began as my final project for this bootcamp. 

I am actively seeking a co-founder. 
### Timeline, Milestones and Deliverables

**Phase 1**  			

I have been working on this project full time since November 2019, and as such, Phase 1 is already complete- both the back end (including extensive tests) and front end, with the following exceptions:
* formal code audit (and implementing any necessary changes)
* front end is designed and has a full React implementation, but needs some love prior to mainnet deployment (such as implementing Consensys' Rimble UI for input validation and transaction flow). There is one additional page ('my account') that needs both a design and implementation. 

Further, Harber currently uses Augur as an Oracle, however I would seek the advice of the Gnosis team here- perhaps they would suggest alternatives (such as https://realit.io/).

Links to already completed work:\
[All contracts](https://github.com/mcplums/Harber/tree/master/contracts)\
[Main contract- Harber.sol](https://github.com/mcplums/Harber/blob/master/contracts/Harber.sol)\
[15 page 'self audit'](https://docs.google.com/document/d/1r7gaSrs6vHShrW3vOzEEULJSXM06OtS-kkheyhSDGGw/edit)\
[Front end code](https://github.com/mcplums/HarberFrontEnd/)

The project is already online at [harber.io](https://www.harber.io) (on Kovan).

Deliverables: audited contracts, fully feature complete front end.

Cost: $3k. $2k one month's living expenses, $1k additional freelancer costs. Costs may be higher due to legal expenses- again, I seek the counsel of Gnosis' legal advisors here.

**Phase 2**

Phase 1 has taken four months of full time work to get to the above point. Phase 2 will be considerably quicker, due to a) my increased familiarity with Ethereum and b) much of the front end design and implementation will carry over to Phase 2. I therefore estimate two months for this phase (i.e. completion in June 2020- in time for the Olympics). From an engineering standpoint, the primary hurdle will be the randomness required when allocating NFTs to lottery ticket holders. I am aware of the complexity of randomness in Ethereum. I will be seeking the advice of Justin Drake, a personal friend and Eth 2.0 researcher, who is an expert in this area. He is already advising the PoolTogether project on this point.

Deliverables: audited contracts, fully feature complete front end.

Cost: $6k. $4k two month's living expenses, $2k freelancer costs.