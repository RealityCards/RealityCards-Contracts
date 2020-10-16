const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

var RCFactory = artifacts.require('./RealityCardsFactory.sol');
var RCTreasury = artifacts.require('./RealityCardsTreasury.sol');
var RCMarket = artifacts.require('./RealityCardsMarketXdaiV1.sol');
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests XdaiV1', (accounts) => {

  var realitycards;
  var numberOfTokens = 20;
  var templateId = 2;
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
  var timeout = 86400;
  var tokenName = 'PresElection';

  user0 = accounts[0]; //0xc783df8a850f42e7F7e57013759C285caa701eB6
  user1 = accounts[1]; //0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4
  user2 = accounts[2];
  user3 = accounts[3];
  user4 = accounts[4];
  user5 = accounts[5];
  user6 = accounts[6];
  user7 = accounts[7];
  user8 = accounts[8];
  andrewsAddress = accounts[9];

  beforeEach(async () => {
    var marketLockingTime = await time.latest();
    var oracleResolutionTime = await time.latest();
    cash = await CashMockup.new();
    realitio = await RealitioMockup.new();
    treasury = await RCTreasury.new();
    rcreference = await RCMarket.new();
    rcfactory = await RCFactory.new(cash.address, realitio.address, treasury.address);
    await rcfactory.setLibraryAddressXdaiV1(rcreference.address);
    //first market
    await rcfactory.createMarket(3,'0x0',andrewsAddress,numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, arbitrator, timeout, tokenName);
    var marketAddress = await rcfactory.marketAddresses.call(0);
    realitycards = await RCMarket.at(marketAddress);
    for (i = 0; i < 20; i++) {
        await realitycards.mintNfts("uri", {from: andrewsAddress});
    }
    //second market
    await rcfactory.createMarket(3,'0x0',andrewsAddress,numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, arbitrator, timeout, tokenName);
    marketAddress = await rcfactory.marketAddresses.call(1);
    realitycards2 = await RCMarket.at(marketAddress);
    for (i = 0; i < 20; i++) {
        await realitycards2.mintNfts("uri", {from: andrewsAddress});
    }
  });

  async function depositDai(amount, user) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await treasury.deposit({ from: user, value: amount });
  }

  async function newRental(price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price,outcome,{ from: user});
  }

  async function newRental2(price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards2.newRental(price,outcome,{ from: user});
  }

  async function changePrice(price, outcome, userx) {
    await realitycards.changePrice(price,outcome,{ from: userx });
  }

  async function userRemainingDeposit(outcome, userx) {
    await realitycards.userRemainingDeposit.call(outcome, {from: userx} );
  }

  async function withdraw(userx) {
    await realitycards.withdraw({from:userx} );
  }

  async function withdrawDeposit(amount,userx) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await treasury.withdrawDeposit(amount,{ from: userx});
  }

    //dummy functions so I don't need to delete the same line from every test
  async function faucet(dummy, dummy2) {}
  async function approve(dummy, dummy2, dummy3) {}

    // check that the contract initially owns the token
    it('getOwner', async () => {
    var i;
    for (i = 0; i < 20; i++) {
        var owner = await realitycards.ownerOf.call(i);
        assert.equal(owner, realitycards.address);
    }
    });

  // check name
  it('getName', async () => {
    var name = await realitycards.name.call();
    assert.equal(name, 'PresElection');
  });

    // check fundamentals first
  it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
    user = user0;
    // setup
    await depositDai(144,user);
    await newRental(144,4,user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('144', 'ether'));
    var deposit = await treasury.deposits.call(user);
    assert.equal(deposit, web3.utils.toWei('143', 'ether'));
    marketAddress = await rcfactory.marketAddresses.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,4);
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
    var owner = await realitycards.ownerOf.call(4);
    assert.equal(owner, user);
    // 1 because nothing stored in zero
    var ownerTracker = await realitycards.ownerTracker.call(4, 1);
    assert.equal(ownerTracker[1].toString(), web3.utils.toWei('144', 'ether').toString());
    assert.equal(ownerTracker[0], user);
   });
  
  it('test change price by renting again', async () => {
    user = user0;
    // setup
    await depositDai(10,user);
    await newRental(1,4,user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    // rent again
    await newRental(3,4,user);
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('3', 'ether'));
   });
    
    // is rentOwed function correct? Perhaps the most important function!!
    it('test rentOwed function', async () => {
        user = user0;
        await depositDai(10,user);
        await newRental(1,4,user);
        await newRental(2,4,user);
        await newRental(3,4,user);
        // tests
        var fundsOwedActual = await realitycards.rentOwed.call(4);
        assert.equal(fundsOwedActual, 0);
        await time.increase(time.duration.days(1));
        var fundsOwedActual = await realitycards.rentOwed.call(4);
        var fundsOwedActualShouldBe = web3.utils.toWei('3', 'ether');
        var difference = Math.abs(fundsOwedActual.toString()-fundsOwedActualShouldBe.toString());
        assert.isBelow(difference/fundsOwedActual,0.001);
      });
  
    it('test various after collectRent', async () => {
        // setup
        user = user0;
        await depositDai(100,user);
        await newRental(1,4,user);
        await time.increase(time.duration.weeks(1));
        await realitycards.collectRentAllTokens();
        // tests
        //test deposits
        var deposit = await treasury.deposits.call(user); 
        var depositShouldBe = web3.utils.toWei('93', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        //test totalCollected. 
        var totalCollected = await realitycards.totalCollected.call();
        var totalCollectedShouldBe = web3.utils.toWei('7', 'ether');
        var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        //test timeLastCollected
        var timeLastCollected = await realitycards.timeLastCollected.call(4);
        currentTime = await time.latest();
        assert.equal(currentTime.toString(),timeLastCollected.toString());
        //wait a week and repeat the above
        await time.increase(time.duration.weeks(1));
        await realitycards.collectRentAllTokens();
        //test deposits
        var deposit = await treasury.deposits.call(user); 
        var depositShouldBe = web3.utils.toWei('86', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        //test totalCollected. 
        var totalCollected = await realitycards.totalCollected.call();
        var totalCollectedShouldBe = web3.utils.toWei('14', 'ether');
        var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
        assert.isBelow(difference/totalCollected,0.001);
        //test timeLastCollected
        var timeLastCollected = await realitycards.timeLastCollected.call(4);
        currentTime = await time.latest();
        assert.equal(currentTime.toString(),timeLastCollected.toString());
    });

    // test collectRent again, but this time it should foreclose, does it?
    it('ccollectRent function with foreclose and revertPreviousOwner', async () => {
        // setup
        await depositDai(6,user0);
        await newRental(1,1,user0);
        await depositDai(10,user1);
        await newRental(2,1,user1);
        await time.increase(time.duration.weeks(1));
        await realitycards.collectRentAllTokens();
        // check reverted
        var owner = await realitycards.ownerOf.call(1);
        assert.equal(owner, user0);
        var price = await realitycards.price.call(1);
        assert.equal(price, web3.utils.toWei('1', 'ether'));
        await time.increase(time.duration.weeks(1));
        await realitycards.collectRentAllTokens();
        var owner = await realitycards.ownerOf.call(1);
        assert.equal(owner, realitycards.address);
        var price = await realitycards.price.call(1);
        assert.equal(price, 0);
    });

  
      // these are two crucial variables that are relied on for other functions. are they what they should be?
      it('test timeHeld and totalTimeHeld', async () => {
        await depositDai(10,user0);
        await newRental(1,0,user0);
        await depositDai(10,user1);
        await newRental(2,0,user1);
        await depositDai(12,user2);
        await newRental(3,0,user2);
        //tests
        await time.increase(time.duration.days(3));
        await realitycards.collectRentAllTokens();
        // u2 3 days
        var timeHeld = await realitycards.timeHeld.call(0, user2);
        var timeHeldShouldBe = time.duration.days(3);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,2);
        await time.increase(time.duration.days(3));
        await realitycards.collectRentAllTokens();
        // u2 one more day
        var timeHeld = await realitycards.timeHeld.call(0, user2);
        var timeHeldShouldBe = time.duration.days(4);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,2);
        await time.increase(time.duration.days(3));
        await realitycards.collectRentAllTokens();
        // u2 still 4 days, u1 5 days, u0 0 days
        var timeHeld = await realitycards.timeHeld.call(0, user2);
        var timeHeldShouldBe = time.duration.days(4);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,2);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.days(5);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        await time.increase(time.duration.days(3));
        await realitycards.collectRentAllTokens();
        // u1 5 days, u0 3 days
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.days(5);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.days(3);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        await time.increase(time.duration.days(1));
        await realitycards.collectRentAllTokens();
        // u1 5 days, u0 6 day
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.days(5);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.days(4);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        // buy again, check the new owner, then revert again
        user = user5;
        await depositDai(10,user5);
        await newRental(10,0,user5);
        await time.increase(time.duration.days(2));
        await realitycards.collectRentAllTokens();
        var timeHeld = await realitycards.timeHeld.call(0, user5);
        var timeHeldShouldBe = time.duration.days(1);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        await time.increase(time.duration.days(7));
        await realitycards.collectRentAllTokens();
        // u0 8 days
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.days(10);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeld,0.001);
        await time.increase(time.duration.days(9));
        await realitycards.collectRentAllTokens();
        // u0 10 days
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.days(10);
        var difference = Math.abs(timeHeld - timeHeldShouldBe); 
        assert.isBelow(difference/timeHeld,0.001);
        // check total collected
        var totalTimeHeldShouldBe = time.duration.days(20);
        var totalTimeHeld = await realitycards.totalTimeHeld.call(0);
        var difference = Math.abs(totalTimeHeld - totalTimeHeldShouldBe);
        assert.isBelow(difference/timeHeld,0.001);
      });
  
      it('test withdrawDeposit', async () => {
        user = user0;
        await depositDai(144,user);
        await newRental(144,0,user);
        var deposit = await treasury.deposits.call(user); 
        marketAddress = await rcfactory.marketAddresses.call(0);
        var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
        assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
        assert.equal(depositSpecific, web3.utils.toWei('1', 'ether')); 
        // withdraw half
        var balanceBefore = await web3.eth.getBalance(user);
        await withdrawDeposit(72,user);
        // check deposit balances 
        var deposit = await treasury.deposits.call(user); 
        var depositShouldBe = web3.utils.toWei('71', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        // check withdrawn amounts
        var balanceAfter = await web3.eth.getBalance(user);
        var depositWithdrawn = await balanceAfter - balanceBefore;
        var depositWithdrawnShouldBe = web3.utils.toWei('72', 'ether');
        var difference = Math.abs(depositWithdrawn.toString()-depositWithdrawnShouldBe.toString());
        assert.isBelow(difference/depositWithdrawnShouldBe,0.00001);
        // withdraw too much, should only allow you to withdraw the remaining
        var balanceBefore = await web3.eth.getBalance(user);
        await withdrawDeposit(100,user);
        // check deposit balances 
        var deposit = await treasury.deposits.call(user); 
        marketAddress = await rcfactory.marketAddresses.call(0);
        var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
        assert.equal(deposit, 0); 
        assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
        // check withdrawn amounts 
        var balanceAfter = await web3.eth.getBalance(user);
        var depositWithdrawn = await balanceAfter - balanceBefore;
        var depositWithdrawnShouldBe = web3.utils.toWei('71', 'ether');
        var difference = Math.abs(depositWithdrawn.toString()-depositWithdrawnShouldBe.toString());
        assert.isBelow(difference/depositWithdrawnShouldBe,0.00001);
      });

      it('test withdrawDeposit- multiple markets', async () => {
        user = user0;
        await depositDai(10,user);
        await newRental(144,0,user);
        await newRental2(288,0,user);
        // withdraw all, should be 3 left therefore only withdraw 7
        var balanceBefore = await web3.eth.getBalance(user);
        await withdrawDeposit(1000,user);
        var balanceAfter = await web3.eth.getBalance(user);
        var depositWithdrawn = await balanceAfter - balanceBefore;
        var depositWithdrawnShouldBe = web3.utils.toWei('7', 'ether');
        var difference = Math.abs(depositWithdrawn.toString() - depositWithdrawnShouldBe.toString());
        assert.isBelow(difference/depositWithdrawn,0.001);
        //original user tries to withdraw again, there should be zero withdrawn
        var balanceBefore = await web3.eth.getBalance(user);
        await withdrawDeposit(1000,user);
        var balanceAfter = await web3.eth.getBalance(user);
        var depositWithdrawn = await balanceAfter - balanceBefore;
        assert.equal(depositWithdrawn,0);
      });

    it('test exit- more than ten mins', async () => {
        // setup
        await depositDai(144,user0);
        await depositDai(144,user1);
        await newRental(10,0,user0);
        await newRental(144,0,user1);
        await time.increase(time.duration.hours(1)); 
        await realitycards.collectRentAllTokens();
        // user 1 should still be owner, held for 1 hour
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.hours(1);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,2);
        // call exit, user 0 should own and no more time held on u1
        await realitycards.exit(0,{ from: user1  });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        await time.increase(time.duration.hours(1)); 
        await realitycards.collectRentAllTokens();
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.hours(1);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,2);
    });

    it('test exit- less than ten mins', async () => {
        // setup
        await depositDai(144,user0);
        await depositDai(144,user1);
        await newRental(10,0,user0);
        await newRental(144,0,user1);
        await time.increase(time.duration.minutes(5)); 
        await realitycards.collectRentAllTokens();
        // user 1 should be owner, held for 5 mins
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.minutes(5);
        
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,2);
        // call exit, user 1 should still own
        await realitycards.exit(0,{ from: user1 });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        // increase by an hour, user 0 will own and u1 should have ten minutes ownership time
        await time.increase(time.duration.hours(1)); 
        await realitycards.collectRentAllTokens();
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.minutes(10);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeldShouldBe,0.01);
        // to be safe, chcek that u0 has owned for 55 mins
        await realitycards.collectRentAllTokens();
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.minutes(55);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeldShouldBe,0.01);
    });

    it('test exitAll', async () => {
        // setup
        await depositDai(144,user0);
        await newRental(10,0,user0);
        await newRental(10,1,user0);
        await newRental(10,2,user0);
        await newRental(10,3,user0);
        await depositDai(144,user1);
        await newRental(144,0,user1);
        await newRental(144,1,user1);
        await newRental(144,2,user1);
        await newRental(144,3,user1);
        await time.increase(time.duration.hours(1)); 
        // exit all, should all be owned by user 0
        await realitycards.exitAll({ from: user1  });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var owner = await realitycards.ownerOf.call(1);
        assert.equal(owner, user0);
        var owner = await realitycards.ownerOf.call(2);
        assert.equal(owner, user0);
        var owner = await realitycards.ownerOf.call(3);
        assert.equal(owner, user0);
    });
  
    // test the payout functions work fine, with different winners each time
  it('test withdraw', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 52
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner 1
    await realitycards.determineWinner2(2,{ from:andrewsAddress}); 
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");
  });

  it('test sponsor', async () => {
    await realitycards.sponsor({ value: web3.utils.toWei('153', 'ether'), from: user3 });
    ///// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 52
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // winner 1: 
    // totalcollected = 147, // now 300 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner 1
    await realitycards.determineWinner2(2,{ from:andrewsAddress}); 
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('300', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('300').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('300').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('300').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");
  });

it('test withdraw- invalid', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 56
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // set invalid winner
    await realitycards.determineWinner2(69,{ from:andrewsAddress}); 
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Paid no rent");
    });

it('test circuitBreaker', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 56
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    await time.increase(time.duration.weeks(24));
    await realitycards.circuitBreaker(); 
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Paid no rent");
    });

it('test circuitBreaker less than 1 month', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await newRental(1,0,user0); // collected 28
    await time.increase(time.duration.weeks(3));
    await realitycards.lockMarket(); 
    await shouldFail.reverting.withMessage(realitycards.circuitBreaker(), "Too early");
    await time.increase(time.duration.weeks(3));
    await realitycards.circuitBreaker();
    });

});


