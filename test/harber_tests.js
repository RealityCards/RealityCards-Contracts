const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var MarketMockup = artifacts.require("./mockups/MarketMockup.sol");
var OICashMockup = artifacts.require("./mockups/OICashMockup.sol");
const MintNFTs = artifacts.require("./mintNFTs.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

// These test assume that 100 dai (in wei-dai or whatever) is sent with the getTestDai function and numberoftokens = 20, and that usingAugur = false
// These tests do NOT reset the blockchain after each test. In retrospect this was a mistake, as it wasted a huge amount of time. harber_test2 fixes this. 

contract('HarberTests', (accounts) => {

  let token;
  let harber;
  // let cash;
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

  const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d'; // this can be anything 
  const marketedExpectedResolutionTime = 0;

  beforeEach(async () => {
    cash = await CashMockup.new();
    market0 = await MarketMockup.new();
    market1 = await MarketMockup.new();
    market2 = await MarketMockup.new();
    market3 = await MarketMockup.new();

    const augurMarketAddress = [
      market0.address,
      market1.address,
      market2.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address,
      market3.address
    ];

    augur = await OICashMockup.new(cash.address);
    token = await Token.new("Harber.io", "HARB");
    harber = await Harber.new(andrewsAddress, token.address, cash.address, augurMarketAddress, augur.address, augurMainAddress, marketedExpectedResolutionTime);
    mintNFTs = await MintNFTs.new(token.address, harber.address);
  });

  // check that the contract initially owns the token
  it('getOwner', async () => {
    var i;
    for (i = 0; i < 20; i++) {
      var owner = await token.ownerOf.call(i);
      assert.equal(owner, harber.address);
    }
  });

  // check that the contract initially owns the token
  it('getName', async () => {
    var name = await token.name.call();
    assert.equal(name, 'Harber.io');
  });

  // check fundamentals first
  it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
    user = user0;
    // setup
    await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
    await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
    // tests
    var price = await harber.price.call(4);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    var deposit = await harber.deposits.call(4, user);
    assert.equal(deposit, web3.utils.toWei('10', 'ether'));
    var owner = await token.ownerOf.call(4);
    assert.equal(owner, user);
    // 1 because nothing stored in zero
    var trackedPrice = await harber.getOwnerTrackerPrice.call(4, 1);
    assert.equal(trackedPrice.toString(), web3.utils.toWei('1', 'ether').toString());
    var trackedAddress = await harber.getOwnerTrackerAddress.call(4, 1);
    assert.equal(trackedAddress, user);
  });

    // do the same thing- does it still work? 
    it('user 0 rent Token second time and check: various', async () => {
      user = user0;
      // setup from previous test
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      // new setup
      await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      // tests
      var price = await harber.price.call(4);
      assert.equal(price, web3.utils.toWei('2', 'ether'));
      var deposit = await harber.deposits.call(4, user);
      var depositShouldBe = web3.utils.toWei('20', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString())
      assert.isBelow(difference/deposit,0.00001);
      var owner = await token.ownerOf.call(4);
      assert.equal(owner, user);
      var trackedPrice = await harber.getOwnerTrackerPrice.call(4, 1);
      assert.equal(trackedPrice.toString(), web3.utils.toWei('2', 'ether').toString());
      var trackedAddress = await harber.getOwnerTrackerAddress.call(4, 1);
      assert.equal(trackedAddress, user);
    });

    // make sure it throws a revert when it is supposed to
    it('user 1 rent Token fail states', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      // tests
      await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Amount must be above zero");
      await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('1', 'ether'),{ from: user}), "Price must be higher than current price");
      await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Amount must be above zero");
      await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('3', 'ether'),20,web3.utils.toWei('0', 'ether'),{ from: user}), "This token does not exist");
      await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('100', 'ether'),{ from: user}), "Insufficient balance");
    });

    // check changePrice is working properly- should fail
    it('changePrice function fail testing', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      // tests
      user = user1;
      await shouldFail.reverting.withMessage(harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user}), "Not owner");
      user = user0;
      await shouldFail.reverting.withMessage(harber.changePrice(web3.utils.toWei('2', 'ether'),4,{ from: user}), "New price must be higher than current price");
    });

    // check changePrice is working properly- should work
    it('user 1 using changePrice function', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      //new setup
      await harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
      // tests
      var price = await harber.price.call(4);
      assert.equal(price, web3.utils.toWei('3', 'ether'));
      var deposit = await harber.deposits.call(4,user);
      var depositShouldBe = web3.utils.toWei('20', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var owner = await token.ownerOf.call(4);
      assert.equal(owner, user);
      var trackedPrice = await harber.getOwnerTrackerPrice.call(4,1);
      var trackedPriceShouldBe = web3.utils.toWei('3', 'ether');
      var difference = (trackedPrice.toString()-trackedPriceShouldBe.toString());
      assert.isBelow(difference/trackedPrice,0.00001);
      var trackedAddress = await harber.getOwnerTrackerAddress.call(4,1);
      assert.equal(trackedAddress, user);
    });

    // is rentOwed function correct? Perhaps the most important function!!
    it('calculateRentOwed function', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      await harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
      // tests
      var fundsOwedActual = await harber.rentOwed.call(4);
      assert.equal(fundsOwedActual, 0);
      await time.increase(time.duration.days(1));
      var fundsOwedActual = await harber.rentOwed.call(4);
      var fundsOwedActualShouldBe = web3.utils.toWei('3', 'ether');
      var difference = (fundsOwedActual.toString()-fundsOwedActualShouldBe.toString());
      assert.isBelow(difference/fundsOwedActual,0.00001);
    });

    // check these front end functions. 
    it('userDepositAbleToWithdraw and  liveDepositAbleToWithdraw function', async () => {
      // setup from previous test
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
      await harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
      await time.increase(time.duration.days(1));
      // tests
      //due to 1 day passing from above, the userDepositAbleToWithdraw and depositAbleToWithdraw should be lower by 10 but the deposit amount should not
      var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
      var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(4, { from: user })
      var deposit = await harber.deposits.call(4,user);
      var depositShouldBe = web3.utils.toWei('20', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var userDepositAbleToWithdrawShouldBe = web3.utils.toWei('17', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/userDepositAbleToWithdrawShouldBe,0.00001);
      var depositAbleToWithdrawShouldBe = web3.utils.toWei('17', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/depositAbleToWithdrawShouldBe,0.00001);
      //increment time another half day and check that deposit is the same but the other two are not
      await time.increase(time.duration.minutes(720)); //mins in half a day
      var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
      var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(4, { from: user })
      var deposit = await harber.deposits.call(4,user);
      var depositShouldBe = web3.utils.toWei('20', 'ether');
      var difference = (deposit.toString() - depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var userDepositAbleToWithdrawShouldBe = web3.utils.toWei('15.5', 'ether');
      var difference = (userDepositAbleToWithdraw.toString() - userDepositAbleToWithdrawShouldBe.toString());
      assert.isBelow(difference/userDepositAbleToWithdrawShouldBe,0.00001);
      //switch user, rent, increment time. user1 deposit and userDepositAbleToWithdraw should not change but depositAbleToWithdraw should 
      user = user1;
      var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
      var deposit = await harber.deposits.call(4,user);
      var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(4, { from: user })
      assert.equal(deposit, 0);
      assert.equal(userDepositAbleToWithdraw,0);
      var depositAbleToWithdrawShouldBe = web3.utils.toWei('15.5', 'ether');
      var difference = (depositAbleToWithdrawShouldBe.toString()-depositAbleToWithdraw.toString());
      assert.isBelow(difference/userDepositAbleToWithdrawShouldBe,0.00001);
      //wait another half a day and check that nothing has changed for user since he isnt the owner
      await time.increase(time.duration.minutes(720));
      var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
      assert.equal(deposit, 0);
      assert.equal(userDepositAbleToWithdraw,0);
    });

    // check this front end function
    it('rentalExpiryTime function', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
      //tests
      currentTime = await time.latest();
      var expectedRentalExpiryTime = currentTime.add(time.duration.days(10)); //deposit should last ten days
      var actualRentalExpiryTime = await harber.rentalExpiryTime.call(4);
      var difference = (actualRentalExpiryTime.toString()-expectedRentalExpiryTime.toString())
      assert.isBelow(difference,2);
    });

    // test a normal instance of collectRent
    it(' function no revertPreviousOwner/foreclose', async () => {
      // setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('100', 'ether'), { from: user });
      await time.increase(time.duration.weeks(1));
      await harber.collectRentAllTokens();
      // tests
      //test deposits
      var deposit = await harber.deposits.call(4,user); 
      var depositShouldBe = web3.utils.toWei('93', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      //test totalCollected. 
      var totalCollected = await harber.totalCollected.call();
      assert.equal(totalCollected,web3.utils.toWei('7', 'ether'));
      //test timeLastCollected
      var timeLastCollected = await harber.timeLastCollected.call(4);
      currentTime = await time.latest();
      assert.equal(currentTime.toString(),timeLastCollected.toString());
      //wait a week and repeat the above
      await time.increase(time.duration.weeks(1));
      await harber.collectRentAllTokens();
      //test deposits
      var deposit = await harber.deposits.call(4,user); 
      var depositShouldBe = web3.utils.toWei('86', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      //test totalCollected. 
      var totalCollected = await harber.totalCollected.call();
      var totalCollectedShouldBe = web3.utils.toWei('20', 'ether');
      var difference = (totalCollected.toString()-totalCollectedShouldBe.toString());
      assert.isBelow(difference/totalCollected,0.00001);
      //test timeLastCollected
      var timeLastCollected = await harber.timeLastCollected.call(4);
      currentTime = await time.latest();
      assert.equal(currentTime.toString(),timeLastCollected.toString());
    });

    // test collectRent again, but this time it should foreclose, does it?
    it('collectRentAllTokens function with foreclose but no revertPreviousOwner', async () => {
      // setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 1, web3.utils.toWei('6', 'ether'), { from: user });
      await time.increase(time.duration.weeks(1));
      await harber.collectRentAllTokens();
      //test
      //owned by contract address = foreclosed
      var owner = await token.ownerOf.call(1);
      assert.equal(owner, harber.address);
    });

    // test collectRent again, this time it should return to previous owner, does it?
    it('collectRentAllTokens function with revertPreviousOwner via calling _collect directly', async () => {
      // setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user1;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user2;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      //tests
      //check deposits
      var deposit = await harber.deposits.call(0,user0); 
      var depositShouldBe = web3.utils.toWei('10', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var deposit = await harber.deposits.call(0,user1); 
      var depositShouldBe = web3.utils.toWei('10', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      var deposit = await harber.deposits.call(0,user2); 
      var depositShouldBe = web3.utils.toWei('10', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
      //check ownerTracker variable
      //user0
      var trackedPrice = await harber.getOwnerTrackerPrice.call(0,1);
      assert.equal(trackedPrice, web3.utils.toWei('1', 'ether'));
      var trackedAddress = await harber.getOwnerTrackerAddress.call(0,1);
      assert.equal(trackedAddress, user0);
      //user1:
      var trackedPrice = await harber.getOwnerTrackerPrice.call(0,2);
      assert.equal(trackedPrice, web3.utils.toWei('2', 'ether'));
      var trackedAddress = await harber.getOwnerTrackerAddress.call(0,2);
      assert.equal(trackedAddress, user1);
      //user2:
      var trackedPrice = await harber.getOwnerTrackerPrice.call(0,3);
      assert.equal(trackedPrice, web3.utils.toWei('3', 'ether'));
      var trackedAddress = await harber.getOwnerTrackerAddress.call(0,3);
      assert.equal(trackedAddress, user2);
      await time.increase(time.duration.days(3));
      await harber.collectRentAllTokens();
      // should not have reverted
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, user2);
      var price = await harber.price.call(0);
      assert.equal(price, web3.utils.toWei('3', 'ether'));
      await time.increase(time.duration.days(3));
      await harber.collectRentAllTokens();
      // should have reverted
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, user1);
      var price = await harber.price.call(0);
      assert.equal(price, web3.utils.toWei('2', 'ether'));
      await time.increase(time.duration.days(11));
      await harber.collectRentAllTokens();
      // should have reverted again
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, user0);
      var price = await harber.price.call(0);
      assert.equal(price, web3.utils.toWei('1', 'ether'));
      // buy again, check the new owner, then revert again
      user = user5;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('100', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      // check stuff 
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, user5);
      var price = await harber.price.call(0);
      assert.equal(price, web3.utils.toWei('100', 'ether'));
      //revert again
      await time.increase(time.duration.days(14));
      await harber.collectRentAllTokens();
      //check it is back with u0 again
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, user0);
      var price = await harber.price.call(0);
      assert.equal(price, web3.utils.toWei('1', 'ether'));
      //check foreclose
      await time.increase(time.duration.days(14));
      await harber.collectRentAllTokens();
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, harber.address);
      var price = await harber.price.call(0);
      assert.equal(price, web3.utils.toWei('0', 'ether'));
    });



    // these are four crucial variables that are relied on for other functions. are they what they should be?
    it('test timeHeld and totalTimeHeld', async () => {
      //same as previous but this time check that time is correct
      // setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user1;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      user = user2;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('12', 'ether'), { from: user });
      //tests
      await time.increase(time.duration.days(3));
      await harber.collectRentAllTokens();
      // u2 3 days
      var timeHeld = await harber.timeHeld.call(0, user2);
      var timeHeldShouldBe = time.duration.days(3);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference,2);
      await time.increase(time.duration.days(3));
      await harber.collectRentAllTokens();
      // u2 one more day
      var timeHeld = await harber.timeHeld.call(0, user2);
      var timeHeldShouldBe = time.duration.days(4);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference,2);
      await time.increase(time.duration.days(3));
      await harber.collectRentAllTokens();
      // u2 still 4 days, u1 3 days
      var timeHeld = await harber.timeHeld.call(0, user2);
      var timeHeldShouldBe = time.duration.days(4);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,2);
      var timeHeld = await harber.timeHeld.call(0, user1);
      var timeHeldShouldBe = time.duration.days(3);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.00001);
      await time.increase(time.duration.days(3));
      await harber.collectRentAllTokens();
      // u1 5 days
      var timeHeld = await harber.timeHeld.call(0, user1);
      var timeHeldShouldBe = time.duration.days(5);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.00001);
      await time.increase(time.duration.days(1));
      await harber.collectRentAllTokens();
      // u1 5 days, u0 1 day
      var timeHeld = await harber.timeHeld.call(0, user1);
      var timeHeldShouldBe = time.duration.days(5);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.00001);
      var timeHeld = await harber.timeHeld.call(0, user0);
      var timeHeldShouldBe = time.duration.days(1);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.0001);
      // buy again, check the new owner, then revert again
      user = user5;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('10', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      await time.increase(time.duration.days(2));
      await harber.collectRentAllTokens();
      var timeHeld = await harber.timeHeld.call(0, user5);
      var timeHeldShouldBe = time.duration.days(1);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.0001);
      await time.increase(time.duration.days(7));
      await harber.collectRentAllTokens();
      // u0 8 days
      var timeHeld = await harber.timeHeld.call(0, user0);
      var timeHeldShouldBe = time.duration.days(8);
      var difference = (timeHeld.toString() - timeHeldShouldBe.toString()); 
      assert.isBelow(difference/timeHeld,0.0001);
      await time.increase(time.duration.days(7));
      await harber.collectRentAllTokens();
      // u0 10 days
      var timeHeld = await harber.timeHeld.call(0, user0);
      var timeHeldShouldBe = time.duration.days(10);
      var difference = Math.abs(timeHeld - timeHeldShouldBe); 
      assert.isBelow(difference/timeHeld,0.0001);
      // check total collected
      var totalTimeHeldShouldBe = time.duration.days(20);
      var totalTimeHeld = await harber.totalTimeHeld.call(0);
      var difference = Math.abs(totalTimeHeld - totalTimeHeldShouldBe);
      assert.isBelow(difference/timeHeld,0.0001);
    });

    // check withdrawDeposit works as it should
    it('test withdrawDeposit- should pass', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      //withdraw half. We cannot withdraw all as _collectrent is run which means there may
      //... not be enough. Exit is the function to withdraw all. 
      var deposit = await harber.deposits.call(0,user); 
      assert.equal(deposit, web3.utils.toWei('10', 'ether')); 
      await harber.withdrawDeposit(web3.utils.toWei('5', 'ether'),0,{ from: user  });
      var deposit = await harber.deposits.call(0,user); 
      var depositShouldBe = web3.utils.toWei('5', 'ether');
      var difference = (deposit.toString()-depositShouldBe.toString());
      assert.isBelow(difference/deposit,0.00001);
    });

    it('test withdrawDeposit with failures', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      //withdraw too much
      await shouldFail.reverting.withMessage(harber.withdrawDeposit(web3.utils.toWei('11', 'ether'),0,{ from: user}), "Withdrawing too much");
      //wrong user trying to withdraw, shouldnt be any error, simply nothing gets withdrawn
      await harber.withdrawDeposit(web3.utils.toWei('1', 'ether'), 0, { from: user1 });
    });


    // check the exit function works as it should
    it('test exit', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      var deposit = await harber.deposits.call(0,user); 
      assert.equal(deposit, web3.utils.toWei('10', 'ether')); 
      // test exit
      await harber.exit(0,{ from: user  });
      var deposit = await harber.deposits.call(0,user); 
      assert.equal(deposit, web3.utils.toWei('0', 'ether'));
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, harber.address);
      // as above but this time it should revert instead of foreclose
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user1 });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user1 });
      await harber.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user1 });
      await harber.exit(0,{ from: user1  });
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, user0);
    });

    // check the exit function works as it should
    it('test exit after deposit has run out', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      await time.increase(time.duration.weeks(2)); 
      // test exit
      await harber.exit(0,{ from: user  });
      var deposit = await harber.deposits.call(0,user); 
      assert.equal(deposit, web3.utils.toWei('0', 'ether'));
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, harber.address);
    });

    it('test withdraw after deposit has run out', async () => {
      //setup
      user = user0;
      await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
      await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
      await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
      await time.increase(time.duration.weeks(2)); 
      // test exit
      await harber.withdrawDeposit(web3.utils.toWei('5', 'ether'), 0,{ from: user  });
      var deposit = await harber.deposits.call(0,user); 
      assert.equal(deposit, web3.utils.toWei('0', 'ether'));
      var owner = await token.ownerOf.call(0);
      assert.equal(owner, harber.address);
    });

    // test the payout functions work fine, with different winners each time
  it('test complete- winner 1', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await market0.setResult(2);
    await market1.setResult(1);
    await market2.setResult(2);
    await market3.setResult(2);
    ////////////////////////
    await harber.step1checkMarketsResolved(); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await harber.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = (totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //knock off 1% that was sent to me so use 74.25 below
    //check user0 winnings
    await harber.complete({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('74.25').mul(new BN('604800')).div(new BN('1900800'));
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    await harber.complete({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('74.25').mul(new BN('604800')).div(new BN('1900800'));
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    await harber.complete({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('74.25').mul(new BN('691200')).div(new BN('1900800'));
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
  });

  // test the payout functions work fine, with different winners each time
  it('test complete- winner 2', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await market0.setResult(2);
    await market1.setResult(2);
    await market2.setResult(1);
    await market3.setResult(2);
    await harber.step1checkMarketsResolved(); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await harber.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = (totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //knock off 1% that was sent to me so use 74.25 below
    //check user0 winnings
    await harber.complete({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('74.25');
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    await shouldFail.reverting.withMessage(harber.complete({ from: user1 }), "You are not a winner, or winnings already paid");
    //check user2 winnings
    await shouldFail.reverting.withMessage(harber.complete({ from: user2 }), "You are not a winner, or winnings already paid");
  });

  it('test complete- invalid', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await market0.setResult(0);
    await market1.setResult(2);
    await market2.setResult(1);
    await market3.setResult(2);
    await harber.step1checkMarketsResolved(); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    ////////////////////////
    //check user0 winnings 
    await harber.complete({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('17');
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings 
    await harber.complete({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('34');
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings 
    await harber.complete({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('24');
    var difference = (winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user5 winnings, should fail cos didn't pay any rent
    await shouldFail.reverting.withMessage(harber.complete({ from: user5 }), "You paid no rent, or rent already returned");
  });

  // test the emergency Exit function works
  it('test emergencyExit', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await harber.step1BemergencyExit(); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    ////////////////////////
    //check user0 winnings 
    await harber.complete({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('17');
    var difference = (winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 winnings 
    await harber.complete({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('34');
    var difference = (winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 winnings 
    await harber.complete({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('24');
    var difference = (winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
  });

  // test the circuit breaker works
  it('test circuit breaker', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await harber.step1CcircuitBreaker({ from: andrewsAddress} ); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    ////////////////////////
    //check user0 winnings 
    await harber.complete({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('17');
    var difference = (winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings 
    await harber.complete({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('34');
    var difference = (winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings 
    await harber.complete({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('24');
    var difference = (winningsSentToUser.toString()-winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
  });

    it('test return deposits work (after payout)', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await market0.setResult(2);
    await market1.setResult(1);
    await market2.setResult(2);
    await market3.setResult(2);
    await harber.step1checkMarketsResolved(); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    await harber.complete({ from: user0 });
    await harber.complete({ from: user1 });
    await harber.complete({ from: user2 });
    /////// THIS TEST //////
    // reset cash balances
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    await cash.resetBalance(user8);
    // get deposits back
    // u0
    await harber.withdrawDepositAfterResolution({ from: user0 });
    var depositReturnedToUser = await cash.balanceOf.call(user0);
    var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
    var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u1
    await harber.withdrawDepositAfterResolution({ from: user1 });
    var depositReturnedToUser = await cash.balanceOf.call(user1);
    var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
    var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u2
    await harber.withdrawDepositAfterResolution({ from: user2 });
    var depositReturnedToUser = await cash.balanceOf.call(user2);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    // u8
    await harber.withdrawDepositAfterResolution({ from: user8 });
    var depositReturnedToUser = await cash.balanceOf.call(user8);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    });


  it('test return deposits work (before payout but after step2withdrawFromAugur)', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await market0.setResult(2);
    await market1.setResult(1);
    await market2.setResult(2);
    await market3.setResult(2);
    await harber.step1checkMarketsResolved(); 
    await harber.step2withdrawFromAugur(); 
    await harber.step3payAndrew(); 
    /////// THIS TEST //////
    // reset cash balances
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    await cash.resetBalance(user8);
    // get deposits back
    // u0
    await harber.withdrawDepositAfterResolution({ from: user0 });
    var depositReturnedToUser = await cash.balanceOf.call(user0);
    var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
    var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u1
    await harber.withdrawDepositAfterResolution({ from: user1 });
    var depositReturnedToUser = await cash.balanceOf.call(user1);
    var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
    var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u2
    await harber.withdrawDepositAfterResolution({ from: user2 });
    var depositReturnedToUser = await cash.balanceOf.call(user2);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    // u8
    await harber.withdrawDepositAfterResolution({ from: user8 });
    var depositReturnedToUser = await cash.balanceOf.call(user8);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    });

  it('test return deposits work before step2withdrawFromAugur)', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await market0.setResult(2);
    await market1.setResult(1);
    await market2.setResult(2);
    await market3.setResult(2);
    await harber.step1checkMarketsResolved(); 
    /////// THIS TEST //////
    // reset cash balances
    await cash.resetBalance(user0);
    await cash.resetBalance(user1);
    await cash.resetBalance(user2);
    await cash.resetBalance(user8);
    // get deposits back
    // u0
    await harber.withdrawDepositAfterResolution({ from: user0 });
    var depositReturnedToUser = await cash.balanceOf.call(user0);
    var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
    var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u1
    await harber.withdrawDepositAfterResolution({ from: user1 });
    var depositReturnedToUser = await cash.balanceOf.call(user1);
    var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
    var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
    assert.isBelow(difference/depositReturnedToUser,0.00001);
    // u2
    await harber.withdrawDepositAfterResolution({ from: user2 });
    var depositReturnedToUser = await cash.balanceOf.call(user2);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    // u8
    await harber.withdrawDepositAfterResolution({ from: user8 });
    var depositReturnedToUser = await cash.balanceOf.call(user8);
    var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
    assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
    });

  it('check expected failures with market resolution: markets unresolved', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
    await time.increase(time.duration.weeks(2)); 
    // not setting market0 markret unresolved
    await market1.setResult(1);
    await market2.setResult(2);
    await market3.setResult(2);
    await shouldFail.reverting.withMessage(harber.step1checkMarketsResolved(), "Markets have not resolved yet");
    await shouldFail.reverting.withMessage(harber.step2withdrawFromAugur(), "Must wait for market resolution");
    await shouldFail.reverting.withMessage(harber.step3payAndrew(), "Step2 must be completed first");
    await shouldFail.reverting.withMessage(harber.complete(), "Step3 must be completed first");
    });

  it('check exit does not revert to previous owner if not the current owner', async () => {
    /////// SETUP //////
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await harber.exit(1,{ from: user0 })
    /////// TESTS //////
    var owner = await token.ownerOf.call(1);
    assert.equal(owner, user1);
});

it('test payouts (incl deposit returned) when newRental called again by existing owner', async () => {
  /////// SETUP //////
  await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
  await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
  await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
  await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
  await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
  await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
  //rent losing teams
  await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
  await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
  //rent winning team
  await harber.newRental(web3.utils.toWei('0.1', 'ether'),1,web3.utils.toWei('5', 'ether'),{ from: user0 }); 
  // AND AGAIN SAME OWNER
  await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('5', 'ether'),{ from: user0 }); //used deposit of 7
  await time.increase(time.duration.weeks(1));
  await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
  await time.increase(time.duration.weeks(1));
  await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
  await market0.setResult(2);
  await market1.setResult(1);
  await market2.setResult(2);
  await market3.setResult(2);
  await harber.step1checkMarketsResolved(); 
  await harber.step2withdrawFromAugur(); 
  await harber.step3payAndrew(); 
  await harber.complete({ from: user0 });
  await harber.complete({ from: user1 });
  await harber.complete({ from: user2 });
  /////// THIS TEST //////
  // reset cash balances
  await cash.resetBalance(user0);
  await cash.resetBalance(user1);
  await cash.resetBalance(user2);
  await cash.resetBalance(user8);
  // get deposits back
  // u0
  await harber.withdrawDepositAfterResolution({ from: user0 });
  var depositReturnedToUser = await cash.balanceOf.call(user0);
  var depositReturnedShouldBe = web3.utils.toWei('3', 'ether');
  var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
  assert.isBelow(difference/depositReturnedToUser,0.00001);
  // u1
  await harber.withdrawDepositAfterResolution({ from: user1 });
  var depositReturnedToUser = await cash.balanceOf.call(user1);
  var depositReturnedShouldBe = web3.utils.toWei('6', 'ether');
  var difference = (depositReturnedToUser.toString()-depositReturnedShouldBe.toString());
  assert.isBelow(difference/depositReturnedToUser,0.00001);
  // u2
  await harber.withdrawDepositAfterResolution({ from: user2 });
  var depositReturnedToUser = await cash.balanceOf.call(user2);
  var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
  assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
  // u8
  await harber.withdrawDepositAfterResolution({ from: user8 });
  var depositReturnedToUser = await cash.balanceOf.call(user8);
  var depositReturnedShouldBe = web3.utils.toWei('0', 'ether');
  assert.equal(depositReturnedToUser.toString(),depositReturnedShouldBe.toString());
  });
});



