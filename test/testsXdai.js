const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

var RCFactory = artifacts.require('./RealityCardsFactory.sol');
var RCMarket = artifacts.require('./RealityCardsMarketXdai.sol');
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests Xdai version', (accounts) => {

  var realitycards;
  var numberOfTokens = 20;
  var templateId = 2;
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
  var timeout = 86400;
  var tokenName = 'PresElection';

  user0 = accounts[0];
  user1 = accounts[1];
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
    const rcLib = await RCMarket.new();
    rcfactory = await RCFactory.new(cash.address, realitio.address);
    await rcfactory.setLibraryAddressXdai(rcLib.address);
    await rcfactory.createMarket(2,'0x0',andrewsAddress,numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, arbitrator, timeout, tokenName);
    const marketAddress = await rcfactory.marketAddresses.call(0);
    realitycards = await RCMarket.at(marketAddress);
    for (i = 0; i < 20; i++) {
        await realitycards.mintNfts("uri", {from: andrewsAddress});
    }
  });

  async function newRental(price, outcome, deposit, userx) {
    await realitycards.newRental(price,outcome,{ from: userx, value: deposit });
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

  async function withdrawDeposit(amount,outcome,userx) {
    await realitycards.withdrawDeposit(amount,outcome,{ from: userx});
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

  // check that the contract initially owns the token
  it('getName', async () => {
    var name = await realitycards.name.call();
    assert.equal(name, 'PresElection');
  });

    // check fundamentals first
    it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
    user = user0;
    // setup
    //////await cash.faucet(web3.utils.toWei('100', 'ether'), user);
    //////await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
    await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    var deposit = await realitycards.deposits.call(4, user);
    assert.equal(deposit, web3.utils.toWei('10', 'ether'));
    var owner = await realitycards.ownerOf.call(4);
    assert.equal(owner, user);
    // 1 because nothing stored in zero
    var ownerTracker = await realitycards.ownerTracker.call(4, 1);
    assert.equal(ownerTracker[1].toString(), web3.utils.toWei('1', 'ether').toString());
    assert.equal(ownerTracker[0], user);
    });
    
// do the same thing- does it still work? 
    it('user 0 rent Token second time and check: various', async () => {
    user = user0;
    // setup from previous test
    //////await cash.faucet(web3.utils.toWei('100', 'ether'), user);
    //////await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
    await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), user);
    // new setup
    await newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('2', 'ether'));
    var deposit = await realitycards.deposits.call(4, user);
    var depositShouldBe = web3.utils.toWei('20', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString())
    assert.isBelow(difference/deposit,0.00001);
    var owner = await realitycards.ownerOf.call(4);
    assert.equal(owner, user);
    var ownerTracker = await realitycards.ownerTracker.call(4, 1);
    assert.equal(ownerTracker[1].toString(), web3.utils.toWei('2', 'ether').toString());
    assert.equal(ownerTracker[0], user);
    });
  
      // check changePrice is working properly- should work
      it('user 1 using changePrice function', async () => {
        // setup from previous test
        user = user0;
        // ////await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        // ////await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), user);
        await newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),user);
        //new setup
        await changePrice(web3.utils.toWei('3', 'ether'),4,user);
        // tests
        var price = await realitycards.price.call(4);
        assert.equal(price, web3.utils.toWei('3', 'ether'));
        var deposit = await realitycards.deposits.call(4,user);
        var depositShouldBe = web3.utils.toWei('20', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        var owner = await realitycards.ownerOf.call(4);
        assert.equal(owner, user);
        var ownerTracker = await realitycards.ownerTracker.call(4,1);
        var trackedPriceShouldBe = web3.utils.toWei('3', 'ether');
        var difference = Math.abs(ownerTracker[1].toString()-trackedPriceShouldBe.toString());
        assert.isBelow(difference/trackedPriceShouldBe,0.00001);
      });

    
    // is rentOwed function correct? Perhaps the most important function!!
    it('calculateRentOwed function', async () => {
        // setup from previous test
        user = user0;
        ////await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        ////await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), user);
        await newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),user);
        await changePrice(web3.utils.toWei('3', 'ether'),4,user);
        // tests
        var fundsOwedActual = await realitycards.rentOwed.call(4);
        assert.equal(fundsOwedActual, 0);
        await time.increase(time.duration.days(1));
        var fundsOwedActual = await realitycards.rentOwed.call(4);
        var fundsOwedActualShouldBe = web3.utils.toWei('3', 'ether');
        var difference = Math.abs(fundsOwedActual.toString()-fundsOwedActualShouldBe.toString());
        assert.isBelow(difference/fundsOwedActual,0.001);
      });


    // check this front end function
    it('rentalExpiryTime function', async () => {
        //setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), user);
        //tests
        currentTime = await time.latest();
        var expectedRentalExpiryTime = currentTime.add(time.duration.days(10)); //deposit should last ten days
        var actualRentalExpiryTime = await realitycards.rentalExpiryTime.call(4);
        var difference = Math.abs(actualRentalExpiryTime.toString()-expectedRentalExpiryTime.toString())
        assert.isBelow(difference,2);
      });
  
      // test a normal instance of collectRent
      it('function no revertPreviousOwner/foreclose', async () => {
        // setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('100', 'ether'), user);
        await time.increase(time.duration.weeks(1));
        await realitycards.collectRentAllTokens();
        // tests
        //test deposits
        var deposit = await realitycards.deposits.call(4,user); 
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
        var deposit = await realitycards.deposits.call(4,user); 
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
      it('collectRentAllTokens function with foreclose but no revertPreviousOwner', async () => {
        // setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 1, web3.utils.toWei('6', 'ether'), user);
        await time.increase(time.duration.weeks(1));
        await realitycards.collectRentAllTokens();
        //test
        //owned by contract address = foreclosed
        var owner = await realitycards.ownerOf.call(1);
        assert.equal(owner, realitycards.address);
      });


    
    // test collectRent again, this time it should return to previous owner, does it?
    it('collectRentAllTokens function with revertPreviousOwner via calling _collect directly', async () => {
        // setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        user = user1;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        user = user2;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        //tests
        //check deposits
        var deposit = await realitycards.deposits.call(0,user0); 
        var depositShouldBe = web3.utils.toWei('10', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        var deposit = await realitycards.deposits.call(0,user1); 
        var depositShouldBe = web3.utils.toWei('10', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        var deposit = await realitycards.deposits.call(0,user2); 
        var depositShouldBe = web3.utils.toWei('10', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
        //check ownerTracker variable
        //user0
        var ownerTracker = await realitycards.ownerTracker.call(0,1);
        assert.equal(ownerTracker[1], web3.utils.toWei('1', 'ether'));
        assert.equal(ownerTracker[0], user0);
        //user1:
        var ownerTracker = await realitycards.ownerTracker.call(0,2);
        assert.equal(ownerTracker[1], web3.utils.toWei('2', 'ether'));
        assert.equal(ownerTracker[0], user1);
        //user2:
        var ownerTracker = await realitycards.ownerTracker.call(0,3);
        assert.equal(ownerTracker[1], web3.utils.toWei('3', 'ether'));
        assert.equal(ownerTracker[0], user2);
        await time.increase(time.duration.days(3));
        await realitycards.collectRentAllTokens();
        // should not have reverted
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user2);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('3', 'ether'));
        await time.increase(time.duration.days(3));
        await realitycards.collectRentAllTokens();
        // should have reverted
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('2', 'ether'));
        await time.increase(time.duration.days(11));
        await realitycards.collectRentAllTokens();
        // should have reverted again
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('1', 'ether'));
        // buy again, check the new owner, then revert again
        user = user5;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('100', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        // check stuff 
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user5);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('100', 'ether'));
        //revert again
        await time.increase(time.duration.days(14));
        await realitycards.collectRentAllTokens();
        //check it is back with u0 again
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('1', 'ether'));
        //check foreclose
        await time.increase(time.duration.days(14));
        await realitycards.collectRentAllTokens();
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, realitycards.address);
        var price = await realitycards.price.call(0);
        assert.equal(price, web3.utils.toWei('0', 'ether'));
      });
  
      // these are four crucial variables that are relied on for other functions. are they what they should be?
      it('test timeHeld and totalTimeHeld', async () => {
        //same as previous but this time check that time is correct
        // setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        user = user1;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        user = user2;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('12', 'ether'), user);
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
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('10', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
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
  
      // check realitycards.withdrawDeposit works as it should
      it('test realitycards.withdrawDeposit- should pass', async () => {
        //setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        //withdraw half. We cannot withdraw all as _collectrent is run which means there may
        //... not be enough. Exit is the function to withdraw all. 
        var deposit = await realitycards.deposits.call(0,user); 
        assert.equal(deposit, web3.utils.toWei('10', 'ether')); 
        await realitycards.withdrawDeposit(web3.utils.toWei('5', 'ether'),0,{ from: user  });
        var deposit = await realitycards.deposits.call(0,user); 
        var depositShouldBe = web3.utils.toWei('5', 'ether');
        var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
        assert.isBelow(difference/deposit,0.00001);
      });
  
      it('test realitycards.withdrawDeposit- withdraw too much', async () => {
        //setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('24', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        await time.increase(time.duration.hours(1));
        await cash.resetBalance(user);
        //withdraw too much
        var balanceBefore = await web3.eth.getBalance(user);
        await withdrawDeposit(web3.utils.toWei('1000', 'ether'),0,user);
        var balanceAfter = await web3.eth.getBalance(user0);
        var depositWithdrawn = await balanceAfter - balanceBefore;
        var depositWithdrawnShouldBe = web3.utils.toWei('9', 'ether');
        var difference = Math.abs(depositWithdrawn.toString() - depositWithdrawnShouldBe.toString());
        assert.isBelow(difference/depositWithdrawn,0.001);
        //original user tries to withdraw again, there should be zero withdrawn
        await cash.resetBalance(user);
        var deposit = await realitycards.deposits.call(0, user);
        assert.equal(deposit,0);
        var balanceBefore = await web3.eth.getBalance(user);
        await withdrawDeposit(web3.utils.toWei('1000', 'ether'),0,user);
        var balanceAfter = await web3.eth.getBalance(user0);
        var depositWithdrawn = await balanceAfter - balanceBefore;
        assert.equal(depositWithdrawn,0);
      });
  
      // check the exit function works as it should
      it('test exit- more than an hours passed', async () => {
        //setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        var deposit = await realitycards.deposits.call(0,user); 
        assert.equal(deposit, web3.utils.toWei('10', 'ether')); 
        // test exit
        await time.increase(time.duration.hours(1)); 
        await realitycards.exit(0,{ from: user  });
        var deposit = await realitycards.deposits.call(0,user); 
        assert.equal(deposit, web3.utils.toWei('0', 'ether'));
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, realitycards.address);
        // as above but this time it should revert instead of foreclose
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user1 );
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user1 );
        await newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), user1 );
        await time.increase(time.duration.hours(1)); 
        await realitycards.exit(0,{ from: user1  });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
      });
  
      // check the exit function works as it should
      it('test exit after deposit has run out', async () => {
        //setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        await time.increase(time.duration.weeks(2)); 
        // test exit
        await realitycards.exit(0,{ from: user  });
        var deposit = await realitycards.deposits.call(0,user); 
        assert.equal(deposit, web3.utils.toWei('0', 'ether'));
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, realitycards.address);
      });
  
      it('test withdraw after deposit has run out', async () => {
        //setup
        user = user0;
        //await cash.faucet(web3.utils.toWei('100', 'ether'), user);
        //await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), user);
        await newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), user);
        await time.increase(time.duration.weeks(2)); 
        // test exit
        await realitycards.withdrawDeposit(web3.utils.toWei('5', 'ether'), 0,{ from: user  });
        var deposit = await realitycards.deposits.call(0,user); 
        assert.equal(deposit, web3.utils.toWei('0', 'ether'));
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, realitycards.address);
      });
  

    
    // test the payout functions work fine, with different winners each time
  it('test withdraw- winner 1', async () => {
    /////// SETUP //////
    //rent losing teams
    await newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),user0 ); //used deposit of 10
    await newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),user1 );  //used deposit of 20
    //rent winning team
    await newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),user0 );  //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),user1 );  //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),user2 );  //used deposit of 24
    await time.increase(time.duration.weeks(2)); 
    // winner 1: 
    // totalcollected = 75, 
    // paid: 0: 17, 1: 34, 2: 30
    // total days: 22 = 1900800 seconds
    // time: 0: 7 days (604800) 1: 7 days 2: 8 days (691200)
    // winner 2: 
    // totalcollected = 75, 
    // paid: 0: 10
    // total days: 22 = 1900800 seconds
    // time: 0: 10 days (604800) 
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner 1
    await realitycards.determineWinner2(1,{ from:andrewsAddress}); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var balanceBefore = await web3.eth.getBalance(user0);
    await withdraw(user0);
    var balanceAfter = await web3.eth.getBalance(user0);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var balanceBefore = await web3.eth.getBalance(user1);
    await withdraw(user1 );
    var balanceAfter = await web3.eth.getBalance(user1);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var balanceBefore = await web3.eth.getBalance(user2);
    await withdraw(user2);
    var balanceAfter = await web3.eth.getBalance(user2);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('75').mul(new BN('691200')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");
  });

  it('test sponsor', async () => {
    await realitycards.sponsor({ value: web3.utils.toWei('75', 'ether'), from: user3 });
    /////// SETUP //////
    //rent losing teams
    await newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),user0 ); //used deposit of 10
    await newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),user1 );  //used deposit of 20
    //rent winning team
    await newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),user0 );  //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),user1 );  //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),user2 );  //used deposit of 24
    await time.increase(time.duration.weeks(2)); 
    // winner 1: 
    // totalcollected = 75, //now 150
    // paid: 0: 17, 1: 34, 2: 30
    // total days: 22 = 1900800 seconds
    // time: 0: 7 days (604800) 1: 7 days 2: 8 days (691200)
    // winner 2: 
    // totalcollected = 75, 
    // paid: 0: 10
    // total days: 22 = 1900800 seconds
    // time: 0: 10 days (604800) 
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner 1
    await realitycards.determineWinner2(1,{ from:andrewsAddress}); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('150', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var balanceBefore = await web3.eth.getBalance(user0);
    await withdraw(user0);
    var balanceAfter = await web3.eth.getBalance(user0);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('150').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var balanceBefore = await web3.eth.getBalance(user1);
    await withdraw(user1 );
    var balanceAfter = await web3.eth.getBalance(user1);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('150').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var balanceBefore = await web3.eth.getBalance(user2);
    await withdraw(user2);
    var balanceAfter = await web3.eth.getBalance(user2);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('150').mul(new BN('691200')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");
  });

});


