const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

var RCFactory = artifacts.require('./RCFactory.sol');
var RCTreasury = artifacts.require('./RCTreasury.sol');
var RCMarket = artifacts.require('./RCMarketXdaiV1.sol');
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
  user2 = accounts[2]; //0xE5904695748fe4A84b40b3fc79De2277660BD1D3
  user3 = accounts[3]; //0x92561F28Ec438Ee9831D00D1D59fbDC981b762b2
  user4 = accounts[4];
  user5 = accounts[5];
  user6 = accounts[6];
  user7 = accounts[7];
  user8 = accounts[8];
  andrewsAddress = accounts[9];

  beforeEach(async () => {
    var marketLockingTime = await time.latest();
    var oracleResolutionTime = await time.latest();
    var timestamps = [marketLockingTime,oracleResolutionTime];
    cash = await CashMockup.new();
    realitio = await RealitioMockup.new();
    treasury = await RCTreasury.new();
    rcreference = await RCMarket.new();
    rcfactory = await RCFactory.new(cash.address, realitio.address, treasury.address);
    await rcfactory.setReferenceContractAddress(0,rcreference.address);
    //first market
    await rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName);
    var marketAddress = await rcfactory.marketAddresses.call(0);
    realitycards = await RCMarket.at(marketAddress);
    for (i = 0; i < 20; i++) {
        await realitycards.mintNfts("uri", {from: andrewsAddress});
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
    // withdraw
    await withdrawDeposit(1000,user);
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
    // withdraw
    await withdrawDeposit(1000,user);
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
        // withdraw
        await withdrawDeposit(1000,user);
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
        // withdraw
        await withdrawDeposit(1000,user);
        // withdraw
        await withdrawDeposit(1000,user1);
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
        assert.isBelow(difference,4);
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
        // withdraw
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
        await withdrawDeposit(1000,user2);
      });
  
      it('test withdrawDeposit after zero mins', async () => {
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
        // withdraw for next test
        await withdrawDeposit(1000,user0);
      });

    it('test withdrawDeposit- multiple markets', async () => {
        user = user0;
        await depositDai(10,user);
        await newRental(144,0,user);
        //second market
        var marketLockingTime = await time.latest();
        var oracleResolutionTime = await time.latest();
        var timestamps = [marketLockingTime,oracleResolutionTime];
        await rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName);
        marketAddress = await rcfactory.marketAddresses.call(1);
        realitycards2 = await RCMarket.at(marketAddress);
        for (i = 0; i < 20; i++) {
            await realitycards2.mintNfts("uri", {from: andrewsAddress});
        }
        await realitycards2.newRental(web3.utils.toWei('288', 'ether'),0,{ from: user});
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
        // withdraw for next test
        await withdrawDeposit(1000,user0);
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
        assert.isBelow(difference,3);
        // call exit, user 0 should own and no more time held on u1
        await realitycards.exit(0,{ from: user1  });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        await time.increase(time.duration.hours(1)); 
        await realitycards.collectRentAllTokens();
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.hours(1);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,3);
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
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
        assert.isBelow(difference,5);
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
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
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
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
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
    await realitio.setResult(2);
    await realitycards.determineWinner();
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
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

  it('test sponsor', async () => {
    await shouldFail.reverting.withMessage(realitycards.sponsor({ from: user3 }), "Must send something");
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
    // set winner
    await realitio.setResult(2);
    await realitycards.determineWinner();
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
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user3);
  });

  it('test sponsor- invalid', async () => {
    await shouldFail.reverting.withMessage(realitycards.sponsor({ from: user3 }), "Must send something");
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
    // set winner 
    await realitio.setResult(20);
    await realitycards.determineWinner();
    ////////////////////////
    //check sponsor winnings
    var depositBefore = await treasury.deposits.call(user3); 
    await withdraw(user3);
    var depositAfter = await treasury.deposits.call(user3); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('153');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user3);
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
    await realitio.setResult(69);
    await realitycards.determineWinner();
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
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
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
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
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
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    });

it('check expected failures with market resolution: question not resolved but market ended', async () => {
    await depositDai(1000,user0);
    await newRental(1,0,user0); 
    await time.increase(time.duration.hours(1));
    await realitycards.lockMarket(); 
    await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Oracle not resolved");
    await shouldFail.reverting.withMessage(realitycards.withdraw(), "Incorrect state");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('newRental check failures', async () => {
    /////// SETUP //////
    user = user0;
    await depositDai(1000,user0);
    // check newRental stuff
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('0.5', 'ether'),0,{ from: user}), "Minimum rental 1 Dai");
    await newRental(1,0,user0);
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('1', 'ether'),0,{ from: user}), "Price not 10% higher");
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('1', 'ether'),23,{ from: user}), "This token does not exist");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    });


    it('check market resolution failures', async () => {
        /////// SETUP //////
        await depositDai(1000,user0);
        await newRental(1,0,user0); 
        //// TESTS ////
        // call step 2 before step 1 done
        await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Incorrect state");
        //call step 1 before markets ended
        await shouldFail.reverting.withMessage(realitycards.lockMarket(), "Market has not finished");
        await time.increase(time.duration.hours(1)); 
        // call step 1 after markets ended, should work
        await realitycards.lockMarket(); 
        // call step 1 twice
        await shouldFail.reverting.withMessage(realitycards.lockMarket(), "Incorrect state");
        // withdraw for next test
        await withdrawDeposit(1000,user0);
    });

    it('check that _revertToPreviousOwner does not revert more than ten times ', async () => {
        /////// SETUP //////
        await depositDai(1000,user0);
        await depositDai(1000,user1);
        await depositDai(1000,user2);
        await depositDai(1000,user3);
        // get user 0 and 1 to rent it 4 times
        await newRental(1,0,user0); 
        await newRental(2,0,user1);
        await newRental(3,0,user0);
        await newRental(4,0,user1);
        // get user 2 and 3 to rent it more than ten times
        await newRental(5,0,user2);
        await newRental(6,0,user3);
        await newRental(7,0,user2);
        await newRental(8,0,user3);
        await newRental(9,0,user2);
        await newRental(10,0,user3);
        await newRental(20,0,user2);
        await newRental(30,0,user3);
        await newRental(40,0,user2);
        await newRental(50,0,user3);
        await newRental(60,0,user2);
        await newRental(70,0,user3);
        // make sure owned for at least an hour
        await time.increase(time.duration.hours(1)); 
        // user 2 and 3 exit, it should return to one of them NOT return to user 0 or 1 
        await realitycards.exit(0,{ from: user2 });
        await realitycards.exit(0,{ from: user3 });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user3);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('6', 'ether'));
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
        await withdrawDeposit(1000,user2);
        await withdrawDeposit(1000,user3);
    });

it('check that cannot rent a card if less than 1 hous rent', async () => {
    await depositDai(1,user0);
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('150', 'ether'),2,{ from: user0}), "Insufficient deposit");
    });

it('test deposits after 0 mins, 5 mins, 15 mins', async () => {
    user = user0;
    await depositDai(144,user);
    await newRental(144,0,user);
    // 0 mins
    var deposit = await treasury.deposits.call(user); 
    marketAddress = await rcfactory.marketAddresses.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
    // 5 mins
    await time.increase(time.duration.minutes(5));
    await realitycards.collectRentAllTokens(); 
    var deposit = await treasury.deposits.call(user); 
    assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
    marketAddress = await rcfactory.marketAddresses.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    var depositSpecificShouldBe = web3.utils.toWei('0.5', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01);
    // 15 mins
    var deposit = await treasury.deposits.call(user); 
    assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
    marketAddress = await rcfactory.marketAddresses.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    var depositSpecificShouldBe = web3.utils.toWei('0.5', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01);
    await withdrawDeposit(1000,user0);
});

it('check that users cannot transfer their NFTs until withdraw state', async() => {
    user = user0;
    await depositDai(144,user);
    await newRental(1,2,user);
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner, user);
    // buidler giving me shit when I try and intercept revert message so just testing revert, in OPEN state
    await shouldFail.reverting(realitycards.transferFrom(user,user1,2));
    await shouldFail.reverting(realitycards.safeTransferFrom(user,user1,2));
    await shouldFail.reverting(realitycards.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")));
    await time.increase(time.duration.days(1)); 
    await realitycards.lockMarket();
    // // should fail cos LOCKED
    await shouldFail.reverting(realitycards.transferFrom(user,user1,2));
    await shouldFail.reverting(realitycards.safeTransferFrom(user,user1,2));
    await shouldFail.reverting(realitycards.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")));
    await realitio.setResult(2);
    await realitycards.determineWinner();
    // // these shoudl all fail cos wrong owner:
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner, user);
    await shouldFail.reverting(realitycards.transferFrom(user,user1,2,{from: user1}));
    await shouldFail.reverting(realitycards.safeTransferFrom(user1,user1,2,{from: user1}));
    // these should not
    await realitycards.transferFrom(user,user1,2,{from: user});
    await realitycards.safeTransferFrom(user1,user,2,{from: user1});
    // withdraw for next test
    await withdrawDeposit(1000,user0);
  });

  it('make sure functions cant be called in the wrong state', async() => {
    user = user0;
    // undo beforeEach
    var marketLockingTime = await time.latest();
    var oracleResolutionTime = await time.latest();
    var timestamps = [marketLockingTime,oracleResolutionTime];
    await rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName);
    marketAddress = await rcfactory.marketAddresses.call(1);
    realitycards2 = await RCMarket.at(marketAddress);
    // check state is 0
    var state = await realitycards2.state.call();
    assert.equal(0,state);
    // currently in state 'NFTSNOTMINTED' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards2.lockMarket(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.determineWinner(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.withdraw(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.collectRentAllTokens(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.newRental(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.exit(0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.rentAllCards(), "Incorrect state");
    // increment state
    for (i = 0; i < 20; i++) {
      await realitycards2.mintNfts("uri", {from: andrewsAddress});
    }
    var state = await realitycards2.state.call();
    assert.equal(1,state);
    // currently in state 'OPEN' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards2.mintNfts(user), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.determineWinner(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.withdraw(), "Incorrect state");
    // increment state
    await time.increase(time.duration.days(1)); 
    await realitycards2.lockMarket();
    var state = await realitycards2.state.call();
    assert.equal(2,state);
    // currently in state 'LOCKED' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards2.mintNfts(user), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.collectRentAllTokens(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.newRental(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.exit(0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.rentAllCards(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.sponsor({value: 3}), "Incorrect state");
    // increment state
    await realitio.setResult(1);
    await realitycards2.determineWinner();
    var state = await realitycards2.state.call();
    assert.equal(3,state);
    // currently in state 'WITHDRAW' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards2.mintNfts(user), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.lockMarket(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.determineWinner(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.collectRentAllTokens(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.newRental(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.exit(0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards2.sponsor({value: 3}), "Incorrect state");
  });

  it('check that owner can not be changed unless correct owner', async() => {
    // buidler giving me shit when I try and intercept revert message so just testing revert
    var newOwner = await realitycards.owner.call();
    await shouldFail.reverting(realitycards.transferOwnership(user5,{from: user1}));
    await realitycards.transferOwnership(user5,{from: andrewsAddress});
    var newOwner = await realitycards.owner.call();
    assert.equal(newOwner, user5);
  });

  it('check renounce ownership works', async() => {
    user = user0;
    // should work while im the owner
    await realitycards.renounceOwnership({from: andrewsAddress});
    var newOwner = await realitycards.owner.call();
    assert.equal(newOwner, 0);
  });

it('check oracleResolutionTime and marketLockingTime expected failures', async () => {
    // someone else deploys question to realitio
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
    var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
    var timeout = 86400;
    var templateId = 2;
    // resolution time before locking, expect failure
    var oracleResolutionTime = 69419;
    var marketLockingTime = 69420; 
    var timestamps = [marketLockingTime,oracleResolutionTime];
    await shouldFail.reverting.withMessage(rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName), "Invalid timestamps");
    // resolution time > 1 weeks after locking, expect failure
    var oracleResolutionTime = 604810;
    var marketLockingTime = 0; 
    var timestamps = [marketLockingTime,oracleResolutionTime];
    await shouldFail.reverting.withMessage(rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName), "Invalid timestamps");
    // resolution time < 1 week  after locking, no failure
    var oracleResolutionTime = 604790;
    var marketLockingTime = 0; 
    var timestamps = [marketLockingTime,oracleResolutionTime];
    await rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName);
    // same time, no failure
    var oracleResolutionTime = 0;
    var marketLockingTime = 0; 
    var timestamps = [marketLockingTime,oracleResolutionTime];
    await rcfactory.createMarket(0,'0x0',andrewsAddress,numberOfTokens,timestamps, question, arbitrator, timeout, tokenName);
  });

  it('test maxTimeHeld & longestOwner', async () => {
    await depositDai(10,user0);
    await newRental(1,2,user0);
    // await newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),user0 ); 
    await time.increase(time.duration.days(1)); 
    await realitycards.collectRentAllTokens();
    var maxTimeHeld = await realitycards.maxTimeHeld(2);
    var maxTimeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(maxTimeHeld.toString() - maxTimeHeldShouldBe.toString());
    assert.isBelow(difference/maxTimeHeld,0.0001);
    var longestOwner = await realitycards.longestOwner(2);
    var longestOwnerShouldBe = user0;
    assert.equal(longestOwner, longestOwnerShouldBe);
    // try again new owner
    await depositDai(10,user1);
    await newRental(2,2,user1);
    // await newRental(web3.utils.toWei('2', 'ether'),2,web3.utils.toWei('10', 'ether'),user1 ); 
    await time.increase(time.duration.days(2));
    await realitycards.collectRentAllTokens();
    var maxTimeHeld = await realitycards.maxTimeHeld(2);
    var maxTimeHeldShouldBe = time.duration.days(2);
    var difference = Math.abs(maxTimeHeld.toString() - maxTimeHeldShouldBe.toString());
    assert.isBelow(difference/maxTimeHeld,0.0001);
    var longestOwner = await realitycards.longestOwner(2);
    var longestOwnerShouldBe = user1;
    assert.equal(longestOwner, longestOwnerShouldBe);
  });

it('test NFT allocation after event- winner', async () => {
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await newRental(1,0,user0); 
    await newRental(1,1,user1); 
    await newRental(1,2,user2);
    await time.increase(time.duration.weeks(1));
    await newRental(2,0,user1); //user 1 winner
    await time.increase(time.duration.weeks(2));
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner
    await realitio.setResult(0);
    await realitycards.determineWinner();
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    for (i = 1; i < 20; i++) {
        await shouldFail.reverting.withMessage(realitycards.ownerOf(i), "ERC721: owner query for nonexistent token");
    }
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test NFT allocation after event- circuit breaker', async () => {
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await newRental(1,0,user0); 
    await newRental(1,1,user1); 
    await newRental(1,2,user2);
    await time.increase(time.duration.weeks(1));
    await newRental(2,0,user1); //user 1 winner
    await time.increase(time.duration.weeks(2));
    ////////////////////////
    await realitycards.lockMarket(); 
    await time.increase(time.duration.weeks(2));
    await realitycards.circuitBreaker();
    for (i = 0; i < 20; i++) {
        await shouldFail.reverting.withMessage(realitycards.ownerOf(i), "ERC721: owner query for nonexistent token");
    }
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test NFT allocation after event- nobody owns winner', async () => {
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await newRental(1,0,user0); 
    await newRental(1,1,user1); 
    await newRental(1,2,user2);
    await time.increase(time.duration.weeks(1));
    await newRental(2,0,user1); //user 1 winner
    await time.increase(time.duration.weeks(2));
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner
    await realitio.setResult(4);
    await realitycards.determineWinner();
    for (i = 0; i < 20; i++) {
        await shouldFail.reverting.withMessage(realitycards.ownerOf(i), "ERC721: owner query for nonexistent token");
    }
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

});


