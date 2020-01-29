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
var CashMockup = artifacts.require("./CashMockup.sol");
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
  userx = accounts[9];
  var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';

  const augurMarketAddress = [
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
    '0xA830e8A271909b2407985F95921E5dD4AD1d859A'
  ];
  const augurShareTokenAddress = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
  const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';
  const marketedExpectedResolutionTime = 0;

  beforeEach(async () => {
    cash = await CashMockup.new();
    token = await Token.new("Harber.io", "HARB");
    harber = await Harber.new(andrewsAddress, token.address, cash.address, augurMarketAddress, augurShareTokenAddress, augurMainAddress, marketedExpectedResolutionTime);
    mintNFTs = await MintNFTs.new(token.address, harber.address);
  });

  // // check that the contract initially owns the token
  // it('getOwner', async () => {
  //   var i;
  //   for (i = 0; i < 20; i++) {
  //     var owner = await token.ownerOf.call(i);
  //     assert.equal(owner, harber.address);
  //   }
  // });

  // // check that the contract initially owns the token
  // it('getName', async () => {
  //   var name = await token.name.call();
  //   assert.equal(name, 'Harber.io');
  // });

  // // check fundamentals first
  // it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
  //   user = user0;
  //   // setup
  //   await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //   await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //   // tests
  //   var price = await harber.price.call(4);
  //   assert.equal(price, web3.utils.toWei('1', 'ether'));
  //   var deposit = await harber.deposits.call(4, user);
  //   assert.equal(deposit, web3.utils.toWei('10', 'ether'));
  //   var owner = await token.ownerOf.call(4);
  //   assert.equal(owner, user);
  //   // 1 because nothing stored in zero
  //   var trackedPrice = await harber.getOwnerTrackerPrice.call(4, 1);
  //   assert.equal(trackedPrice.toString(), web3.utils.toWei('1', 'ether').toString());
  //   var trackedAddress = await harber.getOwnerTrackerAddress.call(4, 1);
  //   assert.equal(trackedAddress, user);
  // });

  //   // do the same thing- does it still work? 
  //   it('user 0 rent Token second time and check: various', async () => {
  //     user = user0;
  //     // setup from previous test
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     // new setup
  //     await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
  //     // tests
  //     var price = await harber.price.call(4);
  //     assert.equal(price, web3.utils.toWei('2', 'ether'));
  //     var deposit = await harber.deposits.call(4, user);
  //     var depositShouldBe = web3.utils.toWei('20', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString())
  //     assert.isBelow(difference/deposit,0.00001);
  //     var owner = await token.ownerOf.call(4);
  //     assert.equal(owner, user);
  //     var trackedPrice = await harber.getOwnerTrackerPrice.call(4, 1);
  //     assert.equal(trackedPrice.toString(), web3.utils.toWei('2', 'ether').toString());
  //     var trackedAddress = await harber.getOwnerTrackerAddress.call(4, 1);
  //     assert.equal(trackedAddress, user);
  //   });

  //   // make sure it throws a revert when it is supposed to
  //   it('user 1 rent Token fail states', async () => {
  //     // setup from previous test
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
  //     // tests
  //     await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Price must be higher than current price");
  //     await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('0', 'ether'),{ from: user}), "Must deposit something");
  //     await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('3', 'ether'),20,web3.utils.toWei('0', 'ether'),{ from: user}), "This team does not exist");
  //     await shouldFail.reverting.withMessage(harber.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('100', 'ether'),{ from: user}), "Insufficient balance");
  //   });

  //   // check changePrice is working properly- should fail
  //   it('changePrice function fail testing', async () => {
  //     // setup from previous test
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
  //     // tests
  //     user = user1;
  //     await shouldFail.reverting.withMessage(harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user}), "Not owner");
  //     user = user0;
  //     await shouldFail.reverting.withMessage(harber.changePrice(web3.utils.toWei('2', 'ether'),4,{ from: user}), "New price must be higher than current price");
  //   });

  //   // check changePrice is working properly- should work
  //   it('user 1 using changePrice function', async () => {
  //     // setup from previous test
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
  //     //new setup
  //     await harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
  //     // tests
  //     var price = await harber.price.call(4);
  //     assert.equal(price, web3.utils.toWei('3', 'ether'));
  //     var deposit = await harber.deposits.call(4,user);
  //     var depositShouldBe = web3.utils.toWei('20', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     var owner = await token.ownerOf.call(4);
  //     assert.equal(owner, user);
  //     var trackedPrice = await harber.getOwnerTrackerPrice.call(4,1);
  //     var trackedPriceShouldBe = web3.utils.toWei('3', 'ether');
  //     var difference = (trackedPrice.toString()-trackedPriceShouldBe.toString());
  //     assert.isBelow(difference/trackedPrice,0.00001);
  //     var trackedAddress = await harber.getOwnerTrackerAddress.call(4,1);
  //     assert.equal(trackedAddress, user);
  //   });

  //   // is rentOwed function correct? Perhaps the most important function!!
  //   it('calculateRentOwed function', async () => {
  //     // setup from previous test
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
  //     await harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
  //     // tests
  //     var fundsOwedActual = await harber.rentOwed.call(4);
  //     assert.equal(fundsOwedActual, 0);
  //     await time.increase(time.duration.days(1));
  //     var fundsOwedActual = await harber.rentOwed.call(4);
  //     var fundsOwedActualShouldBe = web3.utils.toWei('3', 'ether');
  //     var difference = (fundsOwedActual.toString()-fundsOwedActualShouldBe.toString());
  //     assert.isBelow(difference/fundsOwedActual,0.00001);
  //   });

  //   // check these front end functions. 
  //   it('userDepositAbleToWithdraw and  liveDepositAbleToWithdraw function', async () => {
  //     // setup from previous test
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
  //     await harber.changePrice(web3.utils.toWei('3', 'ether'),4,{ from: user });
  //     await time.increase(time.duration.days(1));
  //     // tests
  //     //due to 1 day passing from above, the userDepositAbleToWithdraw and depositAbleToWithdraw should be lower by 10 but the deposit amount should not
  //     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
  //     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(4, { from: user })
  //     var deposit = await harber.deposits.call(4,user);
  //     var depositShouldBe = web3.utils.toWei('20', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     var userDepositAbleToWithdrawShouldBe = web3.utils.toWei('17', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/userDepositAbleToWithdrawShouldBe,0.00001);
  //     var depositAbleToWithdrawShouldBe = web3.utils.toWei('17', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/depositAbleToWithdrawShouldBe,0.00001);
  //     //increment time another half day and check that deposit is the same but the other two are not
  //     await time.increase(time.duration.minutes(720)); //mins in half a day
  //     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
  //     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(4, { from: user })
  //     var deposit = await harber.deposits.call(4,user);
  //     var depositShouldBe = web3.utils.toWei('20', 'ether');
  //     var difference = (deposit.toString() - depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     var userDepositAbleToWithdrawShouldBe = web3.utils.toWei('15.5', 'ether');
  //     var difference = (userDepositAbleToWithdraw.toString() - userDepositAbleToWithdrawShouldBe.toString());
  //     assert.isBelow(difference/userDepositAbleToWithdrawShouldBe,0.00001);
  //     //switch user, rent, increment time. user1 deposit and userDepositAbleToWithdraw should not change but depositAbleToWithdraw should 
  //     user = user1;
  //     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
  //     var deposit = await harber.deposits.call(4,user);
  //     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(4, { from: user })
  //     assert.equal(deposit, 0);
  //     assert.equal(userDepositAbleToWithdraw,0);
  //     var depositAbleToWithdrawShouldBe = web3.utils.toWei('15.5', 'ether');
  //     var difference = (depositAbleToWithdrawShouldBe.toString()-depositAbleToWithdraw.toString());
  //     assert.isBelow(difference/userDepositAbleToWithdrawShouldBe,0.00001);
  //     //wait another half a day and check that nothing has changed for user since he isnt the owner
  //     await time.increase(time.duration.minutes(720));
  //     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(4, { from: user });
  //     assert.equal(deposit, 0);
  //     assert.equal(userDepositAbleToWithdraw,0);
  //   });

  //   // check this front end function
  //   it('rentalExpiryTime function', async () => {
  //     //setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
  //     //tests
  //     currentTime = await time.latest();
  //     var expectedRentalExpiryTime = currentTime.add(time.duration.days(10)); //deposit should last ten days
  //     var actualRentalExpiryTime = await harber.rentalExpiryTime.call(4);
  //     var difference = (actualRentalExpiryTime.toString()-expectedRentalExpiryTime.toString())
  //     assert.isBelow(difference,2);
  //   });

  //   // test a normal instance of collectRent
  //   it('_collectRent function no revertPreviousOwner/foreclose', async () => {
  //     // setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('100', 'ether'), { from: user });
  //     await time.increase(time.duration.weeks(1));
  //     await harber._collectRent(4);
  //     // tests
  //     //test deposits
  //     var deposit = await harber.deposits.call(4,user); 
  //     var depositShouldBe = web3.utils.toWei('93', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     //test collectedAndSentToAugur
  //     var collectedAndSentToAugur = await harber.collectedPerMarket.call(4); 
  //     var collectedAndSentToAugurShouldBe = web3.utils.toWei('7', 'ether');
  //     var difference = (collectedAndSentToAugurShouldBe.toString()-collectedAndSentToAugur.toString());
  //     assert.isBelow(difference/collectedAndSentToAugur,0.00001);
  //     //test totalCollected. 
  //     var totalCollected = await harber.totalCollected.call();
  //     assert.equal(totalCollected,web3.utils.toWei('7', 'ether'));
  //     //test timeLastCollected
  //     var timeLastCollected = await harber.timeLastCollected.call(4);
  //     currentTime = await time.latest();
  //     assert.equal(currentTime.toString(),timeLastCollected.toString());
  //     //wait a week and repeat the above
  //     await time.increase(time.duration.weeks(1));
  //     await harber._collectRent(4);
  //     //test deposits
  //     var deposit = await harber.deposits.call(4,user); 
  //     var depositShouldBe = web3.utils.toWei('86', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     //test collectedAndSentToAugur
  //     var collectedAndSentToAugur = await harber.collectedPerMarket.call(4); 
  //     var collectedAndSentToAugurShouldBe = web3.utils.toWei('14', 'ether');
  //     var difference = (collectedAndSentToAugurShouldBe.toString()-collectedAndSentToAugur.toString());
  //     assert.isBelow(difference/collectedAndSentToAugur,0.00001);
  //     //test totalCollected. 
  //     var totalCollected = await harber.totalCollected.call();
  //     var totalCollectedShouldBe = web3.utils.toWei('20', 'ether');
  //     var difference = (totalCollected.toString()-totalCollectedShouldBe.toString());
  //     assert.isBelow(difference/totalCollected,0.00001);
  //     //test timeLastCollected
  //     var timeLastCollected = await harber.timeLastCollected.call(4);
  //     currentTime = await time.latest();
  //     assert.equal(currentTime.toString(),timeLastCollected.toString());
  //   });

  //   // test collectRent again, but this time it should foreclose, does it?
  //   it('_collectRent function with foreclose but no revertPreviousOwner', async () => {
  //     // setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 1, web3.utils.toWei('6', 'ether'), { from: user });
  //     await time.increase(time.duration.weeks(1));
  //     await harber._collectRent(1);
  //     //test
  //     //owned by contract address = foreclosed
  //     var owner = await token.ownerOf.call(1);
  //     assert.equal(owner, harber.address);
  //   });

  //   // test collectRent again, this time it should return to previous owner, does it?
  //   it('_collectRent function with revertPreviousOwner via calling _collect directly', async () => {
  //     // setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     user = user1;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     user = user2;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     //tests
  //     //check deposits
  //     var deposit = await harber.deposits.call(0,user0); 
  //     var depositShouldBe = web3.utils.toWei('10', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     var deposit = await harber.deposits.call(0,user1); 
  //     var depositShouldBe = web3.utils.toWei('10', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     var deposit = await harber.deposits.call(0,user2); 
  //     var depositShouldBe = web3.utils.toWei('10', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     //check ownerTracker variable
  //     //user0
  //     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,1);
  //     assert.equal(trackedPrice, web3.utils.toWei('1', 'ether'));
  //     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,1);
  //     assert.equal(trackedAddress, user0);
  //     //user1:
  //     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,2);
  //     assert.equal(trackedPrice, web3.utils.toWei('2', 'ether'));
  //     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,2);
  //     assert.equal(trackedAddress, user1);
  //     //user2:
  //     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,3);
  //     assert.equal(trackedPrice, web3.utils.toWei('3', 'ether'));
  //     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,3);
  //     assert.equal(trackedAddress, user2);
  //     await time.increase(time.duration.days(3));
  //     await harber._collectRent(0);
  //     // should not have reverted
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, user2);
  //     var price = await harber.price.call(0);
  //     assert.equal(price, web3.utils.toWei('3', 'ether'));
  //     await time.increase(time.duration.days(3));
  //     await harber._collectRent(0);
  //     // should have reverted
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, user1);
  //     var price = await harber.price.call(0);
  //     assert.equal(price, web3.utils.toWei('2', 'ether'));
  //     await time.increase(time.duration.days(11));
  //     await harber._collectRent(0);
  //     // should have reverted again
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, user0);
  //     var price = await harber.price.call(0);
  //     assert.equal(price, web3.utils.toWei('1', 'ether'));
  //     // buy again, check the new owner, then revert again
  //     user = user5;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('100', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     // check stuff 
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, user5);
  //     var price = await harber.price.call(0);
  //     assert.equal(price, web3.utils.toWei('100', 'ether'));
  //     //revert again
  //     await time.increase(time.duration.days(14));
  //     await harber._collectRent(0);
  //     //check it is back with u0 again
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, user0);
  //     var price = await harber.price.call(0);
  //     assert.equal(price, web3.utils.toWei('1', 'ether'));
  //     //check foreclose
  //     await time.increase(time.duration.days(14));
  //     await harber._collectRent(0);
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, harber.address);
  //     var price = await harber.price.call(0);
  //     assert.equal(price, web3.utils.toWei('0', 'ether'));
  //   });

  //   // these are four crucial variables that are relied on for other functions. are they what they should be?
  //   it('test timeHeld and totalTimeHeld', async () => {
  //     //same as previous but this time check that time is correct
  //     // setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     user = user1;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     user = user2;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('3', 'ether'), 0, web3.utils.toWei('12', 'ether'), { from: user });
  //     //tests
  //     await time.increase(time.duration.days(3));
  //     await harber._collectRent(0);
  //     // u2 3 days
  //     var timeHeld = await harber.timeHeld.call(0, user2);
  //     var timeHeldShouldBe = time.duration.days(3);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe);
  //     assert.isBelow(difference,2);
  //     await time.increase(time.duration.days(3));
  //     await harber._collectRent(0);
  //     // u2 one more day
  //     var timeHeld = await harber.timeHeld.call(0, user2);
  //     var timeHeldShouldBe = time.duration.days(4);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2);
  //     await time.increase(time.duration.days(3));
  //     await harber._collectRent(0);
  //     // u2 still 4 days, u1 3 days
  //     var timeHeld = await harber.timeHeld.call(0, user2);
  //     var timeHeldShouldBe = time.duration.days(4);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2);
  //     var timeHeld = await harber.timeHeld.call(0, user1);
  //     var timeHeldShouldBe = time.duration.days(3);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2);
  //     await time.increase(time.duration.days(3));
  //     await harber._collectRent(0);
  //     // u1 5 days
  //     var timeHeld = await harber.timeHeld.call(0, user1);
  //     var timeHeldShouldBe = time.duration.days(5);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2);
  //     await time.increase(time.duration.days(1));
  //     await harber._collectRent(0);
  //     // u1 5 days, u0 1 day
  //     var timeHeld = await harber.timeHeld.call(0, user1);
  //     var timeHeldShouldBe = time.duration.days(5);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2);
  //     var timeHeld = await harber.timeHeld.call(0, user0);
  //     var timeHeldShouldBe = time.duration.days(1);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,3);
  //     // buy again, check the new owner, then revert again
  //     user = user5;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('10', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     await time.increase(time.duration.days(2));
  //     await harber._collectRent(0);
  //     var timeHeld = await harber.timeHeld.call(0, user5);
  //     var timeHeldShouldBe = time.duration.days(1);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2)
  //     await time.increase(time.duration.days(7));
  //     await harber._collectRent(0);
  //     // u0 8 days
  //     var timeHeld = await harber.timeHeld.call(0, user0);
  //     var timeHeldShouldBe = time.duration.days(8);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,3)
  //     await time.increase(time.duration.days(7));
  //     await harber._collectRent(0);
  //     // u0 10 days
  //     var timeHeld = await harber.timeHeld.call(0, user0);
  //     var timeHeldShouldBe = time.duration.days(10);
  //     var difference = Math.abs(timeHeld - timeHeldShouldBe); 
  //     assert.isBelow(difference,2)
  //     // check total collected
  //     var totalTimeHeldShouldBe = time.duration.days(20);
  //     var totalTimeHeld = await harber.totalTimeHeld.call(0);
  //     assert.equal(totalTimeHeldShouldBe.toString(), totalTimeHeld.toString());
  //   });

  //   // check withdrawDeposit works as it should
  //   it('test withdrawDeposit- should pass', async () => {
  //     //setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     //withdraw half
  //     var deposit = await harber.deposits.call(0,user); 
  //     assert.equal(deposit, web3.utils.toWei('10', 'ether')); 
  //     await harber.withdrawDeposit(web3.utils.toWei('5', 'ether'),0,{ from: user  });
  //     var deposit = await harber.deposits.call(0,user); 
  //     var depositShouldBe = web3.utils.toWei('5', 'ether');
  //     var difference = (deposit.toString()-depositShouldBe.toString());
  //     assert.isBelow(difference/deposit,0.00001);
  //     // withdraw other half then check foreclose
  //     await harber.withdrawDeposit(web3.utils.toWei('5', 'ether'),0,{ from: user  });
  //     var deposit = await harber.deposits.call(0,user); 
  //     assert.equal(deposit, web3.utils.toWei('0', 'ether'));
  //     var owner = await token.ownerOf.call(0);
  //     assert.equal(owner, harber.address);
  //   });

  //   it('test withdrawDeposit with failures', async () => {
  //     //setup
  //     user = user0;
  //     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
  //     await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
  //     await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
  //     //withdraw too much
  //     await shouldFail.reverting.withMessage(harber.withdrawDeposit(web3.utils.toWei('11', 'ether'),0,{ from: user}), "Withdrawing too much");
  //     //wrong user trying to withdraw
  //     await shouldFail.reverting.withMessage(harber.withdrawDeposit(web3.utils.toWei('1', 'ether'),0,{ from: user1}), "Withdrawing too much");
  //   });


    // // check the exit function works as it should
    // it('test exit', async () => {
    //   //setup
    //   user = user0;
    //   await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
    //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user });
    //   await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
    //   var deposit = await harber.deposits.call(0,user); 
    //   assert.equal(deposit, web3.utils.toWei('10', 'ether')); 
    //   // test exit
    //   await harber.exit(0,{ from: user  });
    //   var deposit = await harber.deposits.call(0,user); 
    //   assert.equal(deposit, web3.utils.toWei('0', 'ether'));
    //   var owner = await token.ownerOf.call(0);
    //   assert.equal(owner, harber.address);
    //   // as above but this time it should revert instead of foreclose
    //   await harber.newRental(web3.utils.toWei('1', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user });
    //   await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user1 });
    //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'), { from: user1 });
    //   await harber.newRental(web3.utils.toWei('2', 'ether'), 0, web3.utils.toWei('10', 'ether'), { from: user1 });
    //   await harber.exit(0,{ from: user1  });
    //   var owner = await token.ownerOf.call(0);
    //   assert.equal(owner, user0);
    // });

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

  //   // test the payout functions work fine, with different winners each time
  // it('test complete- winner 1', async () => {
  //   /////// SETUP //////
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   //rent losing teams
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
  //   //rent winning team
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
  //   await time.increase(time.duration.weeks(2)); 
  //   // winner 1: 
  //   // totalcollected = 75, 
  //   // paid: 0: 17, 1: 34, 2: 30
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 7 days (604800) 1: 7 days 2: 8 days (691200)
  //   // winner 2: 
  //   // totalcollected = 75, 
  //   // paid: 0: 10
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 10 days (604800) 
  //   ////////////////////////
  //   var loops = 100;
  //   await harber.step1checkMarketsResolved(1, true); 
  //   await harber.step2getLoopsRequired(); 
  //   await harber.step3returnDeposits(loops); 
  //   await harber.step4sellCompleteSetsAndPayAndrew(); 
  //   await harber.step5complete(loops);
  //   ////////////////////////
  //   // total deposits = 75, check:
  //   var totalCollected = await harber.totalCollected.call();
  //   var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
  //   var difference = (totalCollected.toString()-totalCollectedShouldBe.toString());
  //   assert.isBelow(difference/totalCollected,0.00001);
  //   //knock off 1% that was sent to me so use 74.25 below
  //   //check user0 winnings
  //   var winningsSentToUser = await cash.balanceOf.call(user0);
  //   var winningsShouldBe = ether('74.25').mul(new BN('604800')).div(new BN('61900800'));
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user1 winnings
  //   var winningsSentToUser = await cash.balanceOf.call(user1);
  //   var winningsShouldBe = ether('74.25').mul(new BN('604800')).div(new BN('61900800'));
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user2 winnings
  //   var winningsSentToUser = await cash.balanceOf.call(user2);
  //   var winningsShouldBe = ether('74.25').mul(new BN('691200')).div(new BN('61900800'));
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  // });

  // // // test the payout functions work fine, with different winners each time
  // it('test complete- winner 2', async () => {
  //   /////// SETUP //////
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   //rent losing teams
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
  //   //rent winning team
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
  //   await time.increase(time.duration.weeks(2)); 
  //   // winner 1: 
  //   // totalcollected = 75, 
  //   // paid: 0: 17, 1: 34, 2: 30
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 7 days (604800) 1: 7 days 2: 8 days (691200)
  //   // winner 2: 
  //   // totalcollected = 75, 
  //   // paid: 0: 10
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 10 days (604800) 
  //   ////////////////////////
  //   var loops = 100;
  //   await harber.step1checkMarketsResolved(2, true); 
  //   await harber.step2getLoopsRequired(); 
  //   await harber.step3returnDeposits(loops); 
  //   await harber.step4sellCompleteSetsAndPayAndrew(); 
  //   await harber.step5complete(loops);
  //   ////////////////////////
  //   // total deposits = 75, check:
  //   var totalCollected = await harber.totalCollected.call();
  //   var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
  //   var difference = (totalCollected.toString()-totalCollectedShouldBe.toString());
  //   assert.isBelow(difference/totalCollected,0.00001);
  //   //knock off 1% that was sent to me so use 74.25 below
  //   //check user0 winnings
  //   var winningsSentToUser = await cash.balanceOf.call(user0);
  //   var winningsShouldBe = ether('74.25');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user1 winnings
  //   var winningsSentToUser = await cash.balanceOf.call(user1);
  //   var winningsShouldBe = ether('0');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user2 winnings
  //   var winningsSentToUser = await cash.balanceOf.call(user2);
  //   var winningsShouldBe = ether('0');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  // });

  // // // test the payout functions work fine, with different winners each time
  // it('test complete- invalid', async () => {
  //   /////// SETUP //////
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   //rent losing teams
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
  //   //rent winning team
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
  //   await time.increase(time.duration.weeks(2)); 
  //   // winner 1: 
  //   // totalcollected = 75, 
  //   // paid: 0: 17, 1: 34, 2: 30
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 7 days (604800) 1: 7 days 2: 8 days (691200)
  //   // winner 2: 
  //   // totalcollected = 75, 
  //   // paid: 0: 10
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 10 days (604800) 
  //   ////////////////////////
  //   var loops = 100;
  //   await harber.step1BemergencyExit(); 
  //   await harber.step2getLoopsRequired(); 
  //   await harber.step3returnDeposits(loops); 
  //   await harber.step4sellCompleteSetsAndPayAndrew(); 
  //   await harber.step5complete(loops);
  //   ////////////////////////
  //   //check user0 winnings 
  //   var winningsSentToUser = await cash.balanceOf.call(user0);
  //   var winningsShouldBe = ether('17');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user0 winnings 
  //   var winningsSentToUser = await cash.balanceOf.call(user1);
  //   var winningsShouldBe = ether('34');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user0 winnings 
  //   var winningsSentToUser = await cash.balanceOf.call(user2);
  //   var winningsShouldBe = ether('24');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  // });

  // // // test the emergency Exit function works
  // it('test emergencyExit', async () => {
  //   /////// SETUP //////
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
  //   await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   await cash.approve(harber.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
  //   //rent losing teams
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
  //   //rent winning team
  //   await harber.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
  //   await time.increase(time.duration.weeks(1));
  //   await harber.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
  //   await time.increase(time.duration.weeks(2)); 
  //   // winner 1: 
  //   // totalcollected = 75, 
  //   // paid: 0: 17, 1: 34, 2: 30
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 7 days (604800) 1: 7 days 2: 8 days (691200)
  //   // winner 2: 
  //   // totalcollected = 75, 
  //   // paid: 0: 10
  //   // total days: 22 = 1900800 seconds
  //   // time: 0: 10 days (604800) 
  //   ////////////////////////
  //   var loops = 100;
  //   await harber.step1checkMarketsResolved(1, true); 
  //   await harber.step2getLoopsRequired(); 
  //   await harber.step3returnDeposits(loops); 
  //   await harber.step4sellCompleteSetsAndPayAndrew(); 
  //   await harber.step5complete(loops);
  //   ////////////////////////
  //   //check user0 winnings 
  //   var winningsSentToUser = await cash.balanceOf.call(user0);
  //   var winningsShouldBe = ether('17');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user0 winnings 
  //   var winningsSentToUser = await cash.balanceOf.call(user1);
  //   var winningsShouldBe = ether('34');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  //   //check user0 winnings 
  //   var winningsSentToUser = await cash.balanceOf.call(user2);
  //   var winningsShouldBe = ether('24');
  //   assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  // });

});