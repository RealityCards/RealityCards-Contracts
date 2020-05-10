const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

// const Token = artifacts.require('./ERC721Full.sol');
var RealityCards = artifacts.require('./RealityCards.sol');
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests', (accounts) => {

  var realitycards;
  var numberOfTokens = 20;
  var templateId = 2;
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
  var timeout = 86400;

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
    var marketExpectedResolutionTime = await time.latest();
    cash = await CashMockup.new();
    realitio = await RealitioMockup.new();
    realitycards = await RealityCards.new(andrewsAddress, numberOfTokens, cash.address, realitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);
    for (i = 0; i < 20; i++) {
      await realitycards.mintNfts("uri", {from: andrewsAddress});
    }
  });

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
    assert.equal(name, 'realitycards.io');
  });

  // check fundamentals first
  it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
    user = user0;
    // setup
    await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      // new setup
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
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

    // make sure it throws a revert when it is supposed to
    it('user 1 rent Token fail states', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      // tests
      await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Amount must be above zero");
      await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('1', 'ether'),{ from: user}), "Price not 10% higher");
      await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Amount must be above zero");
      await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('3', 'ether'),20,web3.utils.toWei('0', 'ether'),{ from: user}), "This token does not exist");
      await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('100', 'ether'),{ from: user}), "Insufficient balance");
    });

    // check changePrice is working properly- should fail
    it('changePrice function fail testing', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      // tests
      user = user1;
      await shouldFail.reverting.withMessage(realitycards.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user}), "Not owner");
      user = user0;
      await shouldFail.reverting.withMessage(realitycards.changePrice(web3.utils.toWei('2', 'ether'),4,{ from: user}), "New price must be higher");
    });

    // check changePrice is working properly- should work
    it('user 1 using changePrice function', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      //new setup
      await realitycards.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      await realitycards.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
      // tests
      var fundsOwedActual = await realitycards.rentOwed.call(4);
      assert.equal(fundsOwedActual, 0);
      await time.increase(time.duration.days(1));
      var fundsOwedActual = await realitycards.rentOwed.call(4);
      var fundsOwedActualShouldBe = web3.utils.toWei('3', 'ether');
      var difference = Math.abs(fundsOwedActual.toString()-fundsOwedActualShouldBe.toString());
      assert.isBelow(difference/fundsOwedActual,0.001);
    });

    // check these front end functions. 
    it('userRemainingDeposit and  currentOwnerRemainingDeposit function', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      await realitycards.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
      await time.increase(time.duration.days(1));
      // tests
      //due to 1 day passing from above, the userRemainingDeposit and depositAbleToWithdraw should be lower by 10 but the deposit amount should not
      var userRemainingDeposit = await realitycards.userRemainingDeposit.call(4, { from: user });
      var depositAbleToWithdraw = await realitycards.currentOwnerRemainingDeposit.call(4, { from: user })
      var deposit = await realitycards.deposits.call(4,user);
      var depositShouldBe = web3.utils.toWei('20', 'ether');
      var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var userRemainingDepositShouldBe = web3.utils.toWei('17', 'ether');
      var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/userRemainingDepositShouldBe,0.00001);
      var depositAbleToWithdrawShouldBe = web3.utils.toWei('17', 'ether');
      var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/depositAbleToWithdrawShouldBe,0.00001);
      //increment time another half day and check that deposit is the same but the other two are not
      await time.increase(time.duration.minutes(720)); //mins in half a day
      var userRemainingDeposit = await realitycards.userRemainingDeposit.call(4, { from: user });
      var depositAbleToWithdraw = await realitycards.currentOwnerRemainingDeposit.call(4, { from: user })
      var deposit = await realitycards.deposits.call(4,user);
      var depositShouldBe = web3.utils.toWei('20', 'ether');
      var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var userRemainingDepositShouldBe = web3.utils.toWei('15.5', 'ether');
      var difference = Math.abs(userRemainingDeposit.toString() - userRemainingDepositShouldBe.toString());
      assert.isBelow(difference/userRemainingDepositShouldBe,0.00001);
      //switch user, rent, increment time. user1 deposit and userRemainingDeposit should not change but depositAbleToWithdraw should 
      user = user1;
      var userRemainingDeposit = await realitycards.userRemainingDeposit.call(4, { from: user });
      var deposit = await realitycards.deposits.call(4,user);
      var depositAbleToWithdraw = await realitycards.currentOwnerRemainingDeposit.call(4, { from: user })
      assert.equal(deposit, 0);
      assert.equal(userRemainingDeposit,0);
      var depositAbleToWithdrawShouldBe = web3.utils.toWei('15.5', 'ether');
      var difference = Math.abs(depositAbleToWithdrawShouldBe.toString()-depositAbleToWithdraw.toString());
      assert.isBelow(difference/userRemainingDepositShouldBe,0.00001);
      //wait another half a day and check that nothing has changed for user since he isnt the owner
      await time.increase(time.duration.minutes(720));
      var userRemainingDeposit = await realitycards.userRemainingDeposit.call(4, { from: user });
      assert.equal(deposit, 0);
      assert.equal(userRemainingDeposit,0);
    });

    // check this front end function
    it('rentalExpiryTime function', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('100', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 1, web3.utils.toWei('6', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user1;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user2;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('100', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user1;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user2;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('12', 'ether'), { from: user });
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
      // u2 still 4 days, u1 3 days
      var timeHeld = await realitycards.timeHeld.call(0, user2);
      var timeHeldShouldBe = time.duration.days(4);
      var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,2);
      var timeHeld = await realitycards.timeHeld.call(0, user1);
      var timeHeldShouldBe = time.duration.days(3);
      var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.001);
      await time.increase(time.duration.days(3));
      await realitycards.collectRentAllTokens();
      // u1 5 days
      var timeHeld = await realitycards.timeHeld.call(0, user1);
      var timeHeldShouldBe = time.duration.days(5);
      var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.001);
      await time.increase(time.duration.days(1));
      await realitycards.collectRentAllTokens();
      // u1 5 days, u0 1 day
      var timeHeld = await realitycards.timeHeld.call(0, user1);
      var timeHeldShouldBe = time.duration.days(5);
      var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.001);
      var timeHeld = await realitycards.timeHeld.call(0, user0);
      var timeHeldShouldBe = time.duration.days(1);
      var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.001);
      // buy again, check the new owner, then revert again
      user = user5;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('10', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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
      var timeHeldShouldBe = time.duration.days(8);
      var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.001);
      await time.increase(time.duration.days(7));
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

    // check withdrawDeposit works as it should
    it('test withdrawDeposit- should pass', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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

    it('test withdrawDeposit- withdraw too much', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('24', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      await time.increase(time.duration.hours(1));
      await cash.resetBalance(user);
      //withdraw too much
      await realitycards.withdrawDeposit(web3.utils.toWei('1000', 'ether'),0,{ from: user});
      var depositWithdrawn = await cash.balanceOf(user);
      var depositWithdrawnShouldBe = web3.utils.toWei('9', 'ether');
      var difference = Math.abs(depositWithdrawn.toString() - depositWithdrawnShouldBe.toString());
      assert.isBelow(difference/depositWithdrawn,0.001);
      //original user tries to withdraw again, there should be zero withdrawn
      await cash.resetBalance(user);
      var deposit = await realitycards.deposits.call(0, user);
      assert.equal(deposit,0);
      await realitycards.withdrawDeposit(web3.utils.toWei('1000', 'ether'),0,{ from: user});
      var depositWithdrawn = await cash.balanceOf(user);
      assert.equal(depositWithdrawn,0);
    });

    // check the exit function works as it should
    it('test exit- more than an hours passed', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user1 });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user1 });
      await realitycards.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user1 });
      await time.increase(time.duration.hours(1)); 
      await realitycards.exit(0,{ from: user1  });
      var owner = await realitycards.ownerOf.call(0);
      assert.equal(owner, user0);
    });

    // check the exit function works as it should
    it('test exit after deposit has run out', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
      await realitycards.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
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
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    // set winner 1
    await realitio.setResult(1);
    ////////////////////////
    await realitycards.lockContract(); 
    await realitycards.determineWinner(); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    await realitycards.withdraw({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user0 }), "Already withdrawn");
    //check user1 winnings
    await realitycards.withdraw({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    await realitycards.withdraw({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('75').mul(new BN('691200')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");
  });

  // test the payout functions work fine, with different winners each time
  it('test withdraw- winner 2', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    // set winner 2
    await realitio.setResult(2);
    await realitycards.lockContract(); 
    await realitycards.determineWinner(); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //knock off 1% that was sent to me so use 74.25 below
    //check user0 winnings
    await realitycards.withdraw({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('75');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user1 }), "Not a winner");
    //check user2 winnings
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user2 }), "Not a winner");
  });

  it('test withdraw- invalid', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    // set an invalid outcome
    await realitio.setResult(69);
    await realitycards.lockContract(); 
    await realitycards.determineWinner(); 
    ////////////////////////
    //check user0 winnings 
    await realitycards.withdraw({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('17');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user0 }), "Already withdrawn");
    //check user1 winnings 
    await realitycards.withdraw({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('34');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings 
    await realitycards.withdraw({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('24');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user5 winnings, should fail cos didn't pay any rent
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user5 }), "Paid no rent");
  });

  // test the emergency Exit function works
  it('test circuitBreaker user: more than 1 month', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    ////////////////////////
    await realitycards.lockContract(); 
    await time.increase(time.duration.weeks(24)); 
    await realitycards.circuitBreaker(); 
    ////////////////////////
    //check user0 winnings 
    await realitycards.withdraw({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('17');
    var difference = Math.abs(winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 winnings 
    await realitycards.withdraw({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('34');
    var difference = Math.abs(winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 winnings 
    await realitycards.withdraw({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('24');
    var difference = Math.abs(winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
  });

  it('test circuitBreaker users: less than 1 month', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //
    await time.increase(time.duration.weeks(3)); 
    ////////////////////////
    await shouldFail.reverting.withMessage(realitycards.circuitBreaker(), "Not owner or too early");
    await time.increase(time.duration.weeks(1)); 
    await realitycards.circuitBreaker();
  });

  // test the circuit breaker works
  it('test circuit breaker me', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    ////////////////////////
    // calling thrice to ensure it makes no difference how many times
    await realitycards.collectRentAllTokens();
    await realitycards.circuitBreaker({ from: andrewsAddress} );
    await realitycards.circuitBreaker({ from: andrewsAddress} ); 
    await realitycards.circuitBreaker({ from: andrewsAddress} );  
    ////////////////////////
    //check user0 winnings 
    await realitycards.withdraw({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('17');
    var difference = Math.abs(winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings 
    await realitycards.withdraw({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('34');
    var difference = Math.abs(winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings 
    await realitycards.withdraw({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('24');
    var difference = Math.abs(winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check error if I try and increment state again
  });

    it('test return deposits work (after payout)', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    // set winner 1
    await realitio.setResult(1);
    await realitycards.lockContract(); 
    await realitycards.determineWinner(); 
    await realitycards.withdraw({ from: user0 });
    await realitycards.withdraw({ from: user1 });
    await realitycards.withdraw({ from: user2 });
    /////// THIS TEST //////
    // reset cash balances
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    await cash.resetBalance(user8);
    // get deposits back
    // u0
    await realitycards.withdrawDepositAfterMarketEnded({ from: user0 });
    var depositReturnedToUser = await cash.balanceOf.call(user0);
    var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
    var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u1
    await realitycards.withdrawDepositAfterMarketEnded({ from: user1 });
    var depositReturnedToUser = await cash.balanceOf.call(user1);
    var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
    var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u2
    await realitycards.withdrawDepositAfterMarketEnded({ from: user2 });
    var depositReturnedToUser = await cash.balanceOf.call(user2);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    // u8
    await realitycards.withdrawDepositAfterMarketEnded({ from: user8 });
    var depositReturnedToUser = await cash.balanceOf.call(user8);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    });


  it('test return deposits work (before payout but after step2', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    // set winner 1
    await realitio.setResult(1);
    await realitycards.lockContract(); 
    await realitycards.determineWinner(); 
    /////// THIS TEST //////
    // reset cash balances
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    await cash.resetBalance(user8);
    // get deposits back
    // u0
    await realitycards.withdrawDepositAfterMarketEnded({ from: user0 });
    var depositReturnedToUser = await cash.balanceOf.call(user0);
    var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
    var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u1
    await realitycards.withdrawDepositAfterMarketEnded({ from: user1 });
    var depositReturnedToUser = await cash.balanceOf.call(user1);
    var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
    var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u2
    await realitycards.withdrawDepositAfterMarketEnded({ from: user2 });
    var depositReturnedToUser = await cash.balanceOf.call(user2);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    // u8
    await realitycards.withdrawDepositAfterMarketEnded({ from: user8 });
    var depositReturnedToUser = await cash.balanceOf.call(user8);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    });

  it('test return deposits work before step2', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    // set winner 1
    await realitio.setResult(1);
    // should fail before step 1:
    await shouldFail.reverting.withMessage(realitycards.withdrawDepositAfterMarketEnded({ from: user0 }), "Incorrect state");
    await realitycards.lockContract(); 
    /////// THIS TEST //////
    // reset cash balances
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    await cash.resetBalance(user8);
    // get deposits back
    // u0
    await realitycards.withdrawDepositAfterMarketEnded({ from: user0 });
    var depositReturnedToUser = await cash.balanceOf.call(user0);
    var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
    var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u1
    await realitycards.withdrawDepositAfterMarketEnded({ from: user1 });
    var depositReturnedToUser = await cash.balanceOf.call(user1);
    var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
    var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u2
    await realitycards.withdrawDepositAfterMarketEnded({ from: user2 });
    var depositReturnedToUser = await cash.balanceOf.call(user2);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    // u8
    await realitycards.withdrawDepositAfterMarketEnded({ from: user8 });
    var depositReturnedToUser = await cash.balanceOf.call(user8);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    });

  it('check expected failures with market resolution: question not resolved but market ended', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
    await time.increase(time.duration.weeks(2)); 
    // not setting winner so we expect step2 to revert
    await realitycards.lockContract(); 
    await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Oracle not resolved");
    await shouldFail.reverting.withMessage(realitycards.withdraw(), "Incorrect state");
    });

    it('check expected failures with market resolution: question not resolved and market not ended', async () => {
      /////// SETUP //////
      await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
      await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
      await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
      await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
      //rent losing teams
      await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
      //rent winning team
      await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
      await time.increase(time.duration.weeks(1));
      await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
      await time.increase(time.duration.weeks(1));
      await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
      await time.increase(time.duration.weeks(2)); 
      // not setting winner so we expect step1 to revert
      await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Incorrect state");
      await shouldFail.reverting.withMessage(realitycards.withdraw(), "Incorrect state");
      });

  it('check exit does not revert to previous owner if not the current owner', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await realitycards.exit(1,{ from: user0 })
    /////// TESTS //////
    var owner = await realitycards.ownerOf.call(1);
    assert.equal(owner, user1);
});

it('test payouts (incl deposit returned) when newRental called again by existing owner', async () => {
  /////// SETUP //////
  await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
  await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
  await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
  await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
  await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
  await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
  //rent losing teams
  await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
  await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
  //rent winning team
  await realitycards.newRental(web3.utils.toWei('0.1', 'ether'),1,web3.utils.toWei('5', 'ether'),{ from: user0 }); 
  // AND AGAIN SAME OWNER
  await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('5', 'ether'),{ from: user0 }); //used deposit of 7
  await time.increase(time.duration.weeks(1));
  await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
  await time.increase(time.duration.weeks(1));
  await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
  // set winner 1
  await realitio.setResult(1);
  await realitycards.lockContract(); 
  await realitycards.determineWinner(); 
  await realitycards.withdraw({ from: user0 });
  await realitycards.withdraw({ from: user1 });
  await realitycards.withdraw({ from: user2 });
  /////// THIS TEST //////
  // reset cash balances
  await cash.resetBalance(user0);
  await cash.resetBalance(user1);
  await cash.resetBalance(user2);
  await cash.resetBalance(user8);
  // get deposits back
  // u0
  await realitycards.withdrawDepositAfterMarketEnded({ from: user0 });
  var depositReturnedToUser = await cash.balanceOf.call(user0);
  var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
  var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
  assert.isBelow(difference/depositReturnedToUser,0.00001);
  // u1
  await realitycards.withdrawDepositAfterMarketEnded({ from: user1 });
  var depositReturnedToUser = await cash.balanceOf.call(user1);
  var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
  var difference = Math.abs(depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
  assert.isBelow(difference/depositReturnedToUser,0.00001);
  // u2
  await realitycards.withdrawDepositAfterMarketEnded({ from: user2 });
  var depositReturnedToUser = await cash.balanceOf.call(user2);
  var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
  assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
  // u8
  await realitycards.withdrawDepositAfterMarketEnded({ from: user8 });
  var depositReturnedToUser = await cash.balanceOf.call(user8);
  var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
  assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
  });

  it('test correct modifers are on all the external ordinary course of business functions', async () => {
    /////// SETUP //////
    user = user0;
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user });
    //check amoutNotZero
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Amount must be above zero");
    await shouldFail.reverting.withMessage(realitycards.depositDai(web3.utils.toWei('0', 'ether'),4,{ from: user}), "Amount must be above zero");
    await shouldFail.reverting.withMessage(realitycards.withdrawDeposit(web3.utils.toWei('0', 'ether'),4,{ from: user}), "Amount must be above zero");
    //check tokenExists
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('2', 'ether'),24,web3.utils.toWei('0', 'ether'),{ from: user}), "This token does not exist");
    await shouldFail.reverting.withMessage(realitycards.depositDai(web3.utils.toWei('2', 'ether'),24,{ from: user}), "This token does not exist");
    await shouldFail.reverting.withMessage(realitycards.withdrawDeposit(web3.utils.toWei('2', 'ether'),24,{ from: user}), "This token does not exist");
    await shouldFail.reverting.withMessage(realitycards.changePrice(web3.utils.toWei('2', 'ether'),24,{ from: user}), "This token does not exist");
    await shouldFail.reverting.withMessage(realitycards.exit(24,{ from: user}), "This token does not exist");
    //check not owner
    await shouldFail.reverting.withMessage(realitycards.changePrice(web3.utils.toWei('2', 'ether'),2,{ from: user1}), "Not owner");
    //check notEnded
    await time.increase(time.duration.hours(1)); 
    await realitycards.lockContract();
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('1', 'ether'),{ from: user}), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.depositDai(web3.utils.toWei('2', 'ether'),4,{ from: user}), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdrawDeposit(web3.utils.toWei('2', 'ether'),4,{ from: user}), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.changePrice(web3.utils.toWei('2', 'ether'),4,{ from: user}), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.exit(4,{ from: user}), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.collectRentAllTokens({ from: user}), "Incorrect state");
    });

  it('new tests following addition of step1checkMarketsEnded function', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 });
    //// TESTS ////
    // call step 2 before step 1 done
    await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Incorrect state");
    //call step 1 before markets ended
    await shouldFail.reverting.withMessage(realitycards.lockContract(), "Market has not finished");
    await time.increase(time.duration.hours(1)); 
    // call step 1 after markets ended, should work
    await realitycards.lockContract(); 
    // call step 1 twice
    await shouldFail.reverting.withMessage(realitycards.lockContract(), "Incorrect state");
    });

  it('check that _revertToPreviousOwner does not revert more than ten times ', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user3 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user3 });
    // get user 0 and 1 to rent it 4 times
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0 });
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user1 });
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0 });
    await realitycards.newRental(web3.utils.toWei('4', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user1 });
    // get user 2 and 3 to rent it more than ten times
    await realitycards.newRental(web3.utils.toWei('5', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user2 });
    await realitycards.newRental(web3.utils.toWei('6', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user3 });
    await realitycards.newRental(web3.utils.toWei('7', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user2 });
    await realitycards.newRental(web3.utils.toWei('8', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user3 });
    await realitycards.newRental(web3.utils.toWei('9', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user2 });
    await realitycards.newRental(web3.utils.toWei('10', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user3 });
    await realitycards.newRental(web3.utils.toWei('20', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user2 });
    await realitycards.newRental(web3.utils.toWei('30', 'ether'),2,web3.utils.toWei('2', 'ether'),{ from: user3 });
    await realitycards.newRental(web3.utils.toWei('40', 'ether'),2,web3.utils.toWei('3', 'ether'),{ from: user2 });
    await realitycards.newRental(web3.utils.toWei('50', 'ether'),2,web3.utils.toWei('4', 'ether'),{ from: user3 });
    await realitycards.newRental(web3.utils.toWei('60', 'ether'),2,web3.utils.toWei('5', 'ether'),{ from: user2 });
    await realitycards.newRental(web3.utils.toWei('70', 'ether'),2,web3.utils.toWei('6', 'ether'),{ from: user3 });
    // make sure owned for at least an hour
    await time.increase(time.duration.hours(1)); 
    // user 2 and 3 exit, it should return to one of them NOT return to user 0 or 1 
    await realitycards.exit(2,{ from: user2 });
    await realitycards.exit(2,{ from: user3 });
    var owner = await realitycards.ownerOf.call(2);
    assert.equal(owner, user3);
    var price = await realitycards.price.call(2);
    assert.equal(price, web3.utils.toWei('6', 'ether'));
    });

  it('check that price cannot be increased by less than 10%', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0 });
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('1.05', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0}), "Price not 10% higher");
    await realitycards.newRental(web3.utils.toWei('1.1', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0 });
    });

  it('check that cannot deposit less than 1 hous rent', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('25', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0}), "One hour's rent minimum");
    await realitycards.newRental(web3.utils.toWei('24', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0 });
    });

  it('check expected failure by rental price below 0.01 dai', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('0.005', 'ether'),2,web3.utils.toWei('1', 'ether'),{ from: user0}), "Minimum rental 0.01 Dai");
    });

  it('check exit if owned < 1 hour ', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    // 12 dai an hour price, starting with 19 dai so afer 45 minutes will have 10 dai
    await realitycards.newRental(web3.utils.toWei('288', 'ether'),2,web3.utils.toWei('19', 'ether'),{ from: user0 });
    await time.increase(time.duration.seconds(2700)); //45 mins
    // after 45 mins, deposit should be 10
    await realitycards.collectRentAllTokens();
    var depositRemaining = await realitycards.deposits(2,user0);
    var depositShouldBe = web3.utils.toWei('10', 'ether');
    var difference = Math.abs(depositRemaining.toString()-depositShouldBe.toString())
    assert.isBelow(difference/depositRemaining,0.001);
    ////
    await cash.resetBalance(user0);
    await realitycards.exit(2);
    // this is effectively a call for 10 dai to be returned, but only 7 should be, because still needs to pay 3 extra for it to be owned 1 hour
    var depositReturned = await cash.balanceOf(user0);
    assert.equal(depositReturned-1, web3.utils.toWei('7', 'ether'))
  });

  it('check withdraw if owned < 1 hour withdrawing more than max', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    // 12 dai an hour price, starting with 19 dai so afer 45 minutes will have 10 dai
    await realitycards.newRental(web3.utils.toWei('288', 'ether'),2,web3.utils.toWei('19', 'ether'),{ from: user0 });
    await time.increase(time.duration.seconds(2700)); //45 mins
    // after 45 mins, deposit should be 10
    await realitycards.collectRentAllTokens();
    var depositRemaining = await realitycards.deposits(2,user0);
    var depositRemainingShouldBe = web3.utils.toWei('10', 'ether');
    var difference = Math.abs(depositRemaining.toString()-depositRemainingShouldBe.toString());
    assert.isBelow(difference/depositRemaining,0.001);
    ////
    await cash.resetBalance(user0);
    await realitycards.withdrawDeposit(web3.utils.toWei('8', 'ether'),2);
    // this is effectively a call for 10 dai to be returned, but only 7 should be, because still needs to pay 3 extra for it to be owned 1 hour
    var depositReturned = await cash.balanceOf(user0);
    var depositShouldBe = web3.utils.toWei('7', 'ether');
    var difference = Math.abs(depositReturned.toString()-depositShouldBe.toString())
    assert.isBelow(difference/depositRemaining,0.00001);
  });

  it('check withdraw if owned < 1 hour withdrawing less than max', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    // 12 dai an hour price, starting with 19 dai so afer 45 minutes will have 10 dai
    await realitycards.newRental(web3.utils.toWei('288', 'ether'),2,web3.utils.toWei('19', 'ether'),{ from: user0 });
    await time.increase(time.duration.seconds(2700)); //45 mins
    // after 45 mins, deposit should be 10
    await realitycards.collectRentAllTokens();
    var depositRemaining = await realitycards.deposits(2,user0);
    var depositRemainingShouldBe = web3.utils.toWei('10', 'ether');
    var difference = Math.abs(depositRemaining.toString()-depositRemainingShouldBe.toString())
    assert.isBelow(difference/depositRemaining,0.001);
    ////
    await cash.resetBalance(user0);
    await realitycards.withdrawDeposit(web3.utils.toWei('6', 'ether'),2);
    // this is effectively a call for 10 dai to be returned, but only 7 should be, because still needs to pay 3 extra for it to be owned 1 hour
    var depositReturned = await cash.balanceOf(user0);
    var depositShouldBe = web3.utils.toWei('6', 'ether');
    var difference = Math.abs(depositReturned.toString()-depositShouldBe.toString())
    assert.isBelow(difference/depositRemaining,0.001);
  });

  it('check that users cannot transfer their NFTs', async() => {
    user = user0;
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user });
    // 12 dai an hour price, starting with 19 dai so afer 45 minutes will have 10 dai
    await realitycards.newRental(web3.utils.toWei('288', 'ether'),2,web3.utils.toWei('19', 'ether'),{ from: user });
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner, user);
    // buidler giving me shit when I try and intercept revert message so just testing revert
    await shouldFail.reverting(realitycards.transferFrom(user,user1,2));
    await shouldFail.reverting(realitycards.safeTransferFrom(user,user1,2));
    await shouldFail.reverting(realitycards.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")));
  });

  it('huge check state expected failures', async() => {
    user = user0;
    // undo beforeEach
    marketExpectedResolutionTime = 0;
    realitycards = await RealityCards.new(andrewsAddress, numberOfTokens, cash.address, realitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout); 
    // check state is 0
    var state = await realitycards.state.call();
    assert.equal(0,state);
    // currently in state 'NFTSNOTMINTED' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards.lockContract(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdraw(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdrawDepositAfterMarketEnded(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.collectRentAllTokens(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.newRental(0,0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.depositDai(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.changePrice(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdrawDeposit(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.exit(0), "Incorrect state");
    // increment state
    for (i = 0; i < 20; i++) {
      await realitycards.mintNfts("uri", {from: andrewsAddress});
    }
    var state = await realitycards.state.call();
    assert.equal(1,state);
    // currently in state 'OPEN' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards.mintNfts(user), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdraw(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdrawDepositAfterMarketEnded(), "Incorrect state");
    // increment state
    await realitycards.lockContract();
    var state = await realitycards.state.call();
    assert.equal(2,state);
    // currently in state 'LOCKED' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards.mintNfts(user), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.collectRentAllTokens(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.newRental(0,0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.depositDai(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.changePrice(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdrawDeposit(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.exit(0), "Incorrect state");
    // increment state
    await realitio.setResult(1);
    await realitycards.determineWinner();
    var state = await realitycards.state.call();
    assert.equal(3,state);
    // currently in state 'WITHDRAW' the following should all fail 
    await shouldFail.reverting.withMessage(realitycards.mintNfts(user), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.lockContract(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.determineWinner(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.collectRentAllTokens(), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.newRental(0,0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.depositDai(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.changePrice(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.withdrawDeposit(0,0), "Incorrect state");
    await shouldFail.reverting.withMessage(realitycards.exit(0), "Incorrect state");
  });
  
  it('check onlyOwner modifier is working', async() => {
    user = user0;
    // undo the token creation from the beforeEach:
    marketExpectedResolutionTime = await time.latest();
    realitycards = await RealityCards.new(andrewsAddress, numberOfTokens, cash.address, realitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);
    // await time.increase(time.duration.weeks(5)); 
    await shouldFail.reverting.withMessage(realitycards.mintNfts(user), "Ownable: caller is not the owner");
    await shouldFail.reverting.withMessage(realitycards.circuitBreaker(), "Not owner or too early");
  });

  it('check that owner can not be changed', async() => {
    user = user0;
    // buidler giving me shit when I try and intercept revert message so just testing revert
    await shouldFail.reverting(realitycards.transferOwnership(user));
    await shouldFail.reverting(realitycards.transferOwnership(user));
  });

  it('check allOwners', async() => {
    user = user0;
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user });
    await realitycards.newRental(web3.utils.toWei('10', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user });
    user = user1;
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user });
    await realitycards.newRental(web3.utils.toWei('20', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user });
    user = user2;
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user });
    await realitycards.newRental(web3.utils.toWei('30', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user });
    await realitycards.newRental(web3.utils.toWei('40', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user1 })
    // the test
    var allOwners = await realitycards.allOwners.call(2,0);
    assert.equal(allOwners,user0);
    var allOwners = await realitycards.allOwners.call(2,1);
    assert.equal(allOwners,user1);
    var allOwners = await realitycards.allOwners.call(2,2);
    assert.equal(allOwners,user2);
    // check it didn't add user2 a second time
    var allOwners = await shouldFail.reverting(realitycards.allOwners.call(2,3));
  });

  it('check renounce ownership works', async() => {
    user = user0;
    // undo the token creation from the beforeEach:
    marketExpectedResolutionTime = await time.latest();
    realitycards = await RealityCards.new(andrewsAddress, numberOfTokens, cash.address, realitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);
    // should work while im the owner
    await realitycards.mintNfts("uri", {from: andrewsAddress});
    await realitycards.renounceOwnership({from: andrewsAddress});
    await shouldFail.reverting.withMessage(realitycards.mintNfts("uri", {from: andrewsAddress}), "Ownable: caller is not the owner");
    await shouldFail.reverting.withMessage(realitycards.circuitBreaker({from: andrewsAddress}), "Not owner or too early");
  });

  it('check getWinnings with different winners', async () => {
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),0,web3.utils.toWei('50', 'ether'),{ from: user0 });
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('50', 'ether'),{ from: user0 });
    await time.increase(time.duration.weeks(1)); 
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('50', 'ether'),{ from: user1 });
    await time.increase(time.duration.weeks(1)); 
    // 0 has paid rent of 14 for 0 and 7 for 1, 1 has paid 14 for 1. 
    // total collected = 35
    // winnings for 0 if 0 wins should be 35
    // winnings for 0 if 1 wins should be one half of 35
    await realitycards.collectRentAllTokens();
    var winnings = await realitycards.getWinnings.call(0,{from: user0});
    var winningsShouldBe = web3.utils.toWei('35', 'ether');
    var difference = Math.abs(winnings.toString()-winningsShouldBe.toString())
    assert.isBelow(difference/winnings,0.00001);
    var winnings = await realitycards.getWinnings.call(1,{from:user0});
    var winningsShouldBe = web3.utils.toWei('35', 'ether') / 2;
    var difference = Math.abs(winnings.toString()-winningsShouldBe.toString())
    assert.isBelow(difference/winnings,0.00001);
  });

});


