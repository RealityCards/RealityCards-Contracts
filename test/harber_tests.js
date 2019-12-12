const { BN, shouldFail, ether, expectEvent, balance, time } = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';

// (0) 0xCb4BF048F1Aaf4E0C05b0c77546fE820F299d4Fe (100 ETH)
// (1) 0xA2b8502b1bC80A345400054Ffc00F49C2A9362d8 (100 ETH)
// (2) 0x40332B4437382BeAE2402D28C4cc9Aaa8D9Be9C0 (100 ETH)
// (3) 0xfFcE23bd68644Df7683921a6466f8d988bEf80C6 (100 ETH)
// (4) 0xC396032F60d6C5365CCa89A69dd93cf1401BBA32 (100 ETH)
// (5) 0xec0C53d38BdF76489c4aC86c8a8F742e2EEc221a (100 ETH)
// (6) 0xD149E086dbfF274449810D4Ffe0B23ffCF294c2C (100 ETH)
// (7) 0x37A0D2DfeD52aB3f0a7f3420c665D82eB67FE321 (100 ETH)
// (8) 0x06b58dDf8CF8E115D01137A296fb57e522Cc441f (100 ETH)
// (9) 0x84CAbF995E9Af67B6d73232C2D5E9fBeBEF92224 (100 ETH)

contract('HarberTests', (accounts) => {

  let token;
  let harber;
  user0 = accounts[0];
  user1 = accounts[1];
  user2 = accounts[2];
  user3 = accounts[3];
  user4 = accounts[4];
  user5 = accounts[5];
  user6 = accounts[6];
  user7 = accounts[7];
  user8 = accounts[8];
  var newOwnerPurchaseCount1 = 0;
  
  beforeEach(async () => {
    token = await Token.deployed();
    harber = await Harber.deployed();
  });

  //   it('getOwner', async () => {
  //   var owner = await token.ownerOf.call(0);
  //   assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
  // });

  // it('getName', async () => {
  //   var name = await token.name.call();
  //   assert.equal(name, 'Harber.io');
  // });

  // it('getTestDai and check balance', async () => {
  //   await harber.getTestDai({ from: user0 });
  //   var testDaiBalance = await harber.getTestDaiBalance.call();
  //   assert.equal(testDaiBalance, 100);
  // });

  it('user 1 buy Token first time and check: various', async () => {
    user = user0;
    await harber.buy(100,0,10,{ from: user });
    await harber.buy(100,0,10,{ from: user }); // <--  delete  thish after finishined that thing
    // newOwnerPurchaseCount1++;
    // var price = await harber.price.call(0);
    // assert.equal(price, 100);
    // var testDaiBalance = await harber.getTestDaiBalance.call();
    // assert.equal(testDaiBalance, 90);
    // var deposit = await harber.deposits.call(0,user);
    // assert.equal(deposit, 10);
    // var owner = await token.ownerOf.call(0);
    // assert.equal(owner, user);
    // var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    // assert.equal(trackedPrice, 100);
    // var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    // assert.equal(trackedAddress, user);
  });

  // it('user 1 buy Token second time and check: various', async () => {
  //   user = user0;
  //   await harber.buy(200,0,10,{ from: user });
  //   var price = await harber.price.call(0);
  //   assert.equal(price, 200);
  //   var testDaiBalance = await harber.getTestDaiBalance.call();
  //   assert.equal(testDaiBalance, 80);
  //   var deposit = await harber.deposits.call(0,user);
  //   assert.equal(deposit, 20);
  //   var owner = await token.ownerOf.call(0);
  //   assert.equal(owner, user);
  //   var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
  //   assert.equal(trackedPrice, 200);
  //   var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
  //   assert.equal(trackedAddress, user);
  // });

//   it('user 2 buy Token fail states', async () => {
//     user = user1;
//     await shouldFail.reverting.withMessage(harber.buy(200,0,0,{ from: user}), "Price must be higher than current price");
//     await shouldFail.reverting.withMessage(harber.buy(300,0,0,{ from: user}), "Must deposit something");
//     await shouldFail.reverting.withMessage(harber.buy(300,0,10,{ from: user}), "Not enough DAI");
//   });

//   it('user 2 buy Token first time and check: various', async () => { 
//     user = user1;
//     await harber.getTestDai({ from: user });
//     await harber.buy(300,0,10,{ from: user  });
//     newOwnerPurchaseCount1++;
//     //  check user0 deposit is still there
//     var deposit = await harber.deposits.call(0,user0);
//     assert.equal(deposit, 20);
//     //
//     var price = await harber.price.call(0);
//     assert.equal(price, 300);
//     var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
//     assert.equal(testDaiBalance, 90);
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 10);
//     var owner = await token.ownerOf.call(0);
//     assert.equal(owner, user );
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedPrice, 300);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedAddress, user);
//   });

//   it('user 2 buy Token second time and check: various', async () => {
//     user = user1;
//     await harber.buy(400,0,10,{ from: user });
//     var price = await harber.price.call(0);
//     assert.equal(price, 400);
//     var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
//     assert.equal(testDaiBalance, 80);
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 20);
//     var owner = await token.ownerOf.call(0);
//     assert.equal(owner, user);
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedPrice, 400);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedAddress, user);
//   });
// ////////////
//   it('switch back to user 1 buy Token third time and check: various', async () => {
//     user = user0;
//     await harber.buy(1000,0,20,{ from: user });
//     newOwnerPurchaseCount1++;
//     var price = await harber.price.call(0);
//     assert.equal(price, 1000);
//     var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
//     assert.equal(testDaiBalance, 60);
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 40);
//     var owner = await token.ownerOf.call(0);
//     assert.equal(owner, user);
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedPrice, 1000);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedAddress, user);
//   });

//   it('changePrice function fail testing', async () => {
//     user = user1;
//     await shouldFail.reverting.withMessage(harber.changePrice(2000,0,{ from: user}), "Not owner");
//     user = user0;
//     await shouldFail.reverting.withMessage(harber.changePrice(1000,0,{ from: user}), "New price must be higher than current price");
//   });

//   it('user 1 using changePrice function', async () => {
//     user = user0;
//     await harber.changePrice(2000,0,{ from: user });
//     var price = await harber.price.call(0);
//     assert.equal(price, 2000);
//     var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
//     assert.equal(testDaiBalance, 60);
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 40);
//     var owner = await token.ownerOf.call(0);
//     assert.equal(owner, user);
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedPrice, 2000);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
//     assert.equal(trackedAddress, user);
//   });

//   it('augurFundsOwed function', async () => {
//     user = user2;
//     await harber.getTestDai({ from: user });
//     await harber.buy(3650,0,30,{ from: user  });
//     newOwnerPurchaseCount1++;
//     var fundsOwedActual = await harber.augurFundsOwed.call(0);
//     assert.equal(fundsOwedActual, 0);
//     await time.increase(time.duration.minutes(1440)); //mins in a day
//     var fundsOwedActual = await harber.augurFundsOwed.call(0);
//     assert.equal(fundsOwedActual, 10);
//   });

//   it('userDepositAbleToWithdraw and  liveDepositAbleToWithdraw function', async () => {
//     user = user2;
//     //due to 1 day passing from above, the userDepositAbleToWithdraw and depositAbleToWithdraw should be lower by 10 but the deposit amount should no
//     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
//     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0, { from: user })
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 30);
//     assert.equal(userDepositAbleToWithdraw,20);
//     assert.equal(depositAbleToWithdraw,20);
//     //increment time another half day and check that deposit is the same but the other two are not
//     await time.increase(time.duration.minutes(720)); //mins in half a day
//     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
//     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0, { from: user })
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 30);
//     assert.equal(userDepositAbleToWithdraw,15);
//     assert.equal(depositAbleToWithdraw,15);
//     //switch user, buy, increment time. user2 deposit and userDepositAbleToWithdraw should not change but depositAbleToWithdraw should 
//     await harber.getTestDai({ from: user3 });
//     await harber.buy(7300,0,100,{ from: user3  });
//     newOwnerPurchaseCount1++;
//     var price = await harber.price.call(0);
//     assert.equal(price, 7300);
//     var owner = await token.ownerOf.call(0);
//     assert.equal(owner, user3);
//     await time.increase(time.duration.minutes(1440)); 
//     // 
//     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
//     var deposit = await harber.deposits.call(0,user);
//     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0, { from: user })
//     assert.equal(deposit, 15);
//     assert.equal(userDepositAbleToWithdraw,15);
//     assert.equal(depositAbleToWithdraw,80);
//     //wait another half a day and check that nothing has changed for user 3 since he isnt the owner
//     await time.increase(time.duration.minutes(720));
//     var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
//     var deposit = await harber.deposits.call(0,user);
//     assert.equal(deposit, 15);
//     assert.equal(userDepositAbleToWithdraw,15);
//   });

//   it('rentalExpiryTime function', async () => {
//     user = user4;
//     await harber.getTestDai({ from: user });
//     await harber.buy(31536000,0,100,{ from: user  }); //price = number of seconds in a year so that deposit = number of seconds we expect it to last for. 
//     newOwnerPurchaseCount1++;
//     var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0);
//     assert.equal(depositAbleToWithdraw,100);
//     currentTime = await time.latest();
//     var expectedRentalExpiryTime = currentTime.add(time.duration.seconds(100));
//     var actualRentalExpiryTime = await harber.rentalExpiryTime.call(0);
//     assert.equal(expectedRentalExpiryTime.toString(),actualRentalExpiryTime.toString());
//   });

//   // at this point we are resetting things and will use second token

//   it('_collectAugurFunds function no revertPreviousOwner/foreclose', async () => {
//     user = user5;
//     // get total collected from all the above tets and just check that it is added to properly
//     var totalCollectedSoFar = await harber.totalCollectedAndSentToAugur.call(); 
//     await harber.getTestDai({ from: user });
//     await harber.buy(365,1,20,{ from: user  });
//     var timeAcquired = await harber.timeAcquired.call(1); 
//     var currentTime = await time.latest();
//     assert.equal(timeAcquired.toString(),currentTime.toString());
//     //wait a week and buy again to trigger function call 
//     await time.increase(time.duration.weeks(1));
//     await harber.buy(730,1,20,{ from: user  });
//     var timeAcquired = await harber.timeAcquired.call(1); 
//     var currentTime = await time.latest();
//     assert.equal(timeAcquired.toString(),currentTime.toString());
//     //test deposits
//     var deposit = await harber.deposits.call(1,user); 
//     assert.equal(deposit, 33); //price 365, 1 week delay = charge of 7, 40-7 = 33
//     //test collectedAndSentToAugur
//     var collectedAndSentToAugur = await harber.collectedAndSentToAugur.call(1); 
//     assert.equal(collectedAndSentToAugur,7);
//     //test totalCollectedAndSentToAugur. The total so far from previous tests is 45.  So we expect 52
//     var totalCollectedAndSentToAugur = await harber.totalCollectedAndSentToAugur.call();
//     assert.equal(totalCollectedAndSentToAugur,totalCollectedSoFar.toNumber()+collectedAndSentToAugur.toNumber());
//     //test timeLastCollected
//     var timeLastCollected = await harber.timeLastCollected.call(1);
//     currentTime = await time.latest();
//     assert.equal(currentTime.toString(),timeLastCollected.toString());
//     //wait a week and check all the above again, they should be unchanged
//     await time.increase(time.duration.weeks(1));
//     time10MinsAgo=currentTime;
//     var deposit = await harber.deposits.call(1,user); 
//     assert.equal(deposit, 33);
//     var collectedAndSentToAugur = await harber.collectedAndSentToAugur.call(1); 
//     assert.equal(collectedAndSentToAugur,7);
//     var totalCollectedAndSentToAugur = await harber.totalCollectedAndSentToAugur.call();
//     assert.equal(totalCollectedAndSentToAugur,totalCollectedSoFar.toNumber()+collectedAndSentToAugur.toNumber());
//     var timeLastCollected = await harber.timeLastCollected.call(1);
//     assert.equal(time10MinsAgo.toString(),timeLastCollected.toString());
//     //trigger the function again by doing another purchase and check all variables have updated correctly
//     await harber.buy(1095,1,20,{ from: user });
//     var deposit = await harber.deposits.call(1,user); 
//     assert.equal(deposit, 39); // 33 + 20 - 14
//     var collectedAndSentToAugur = await harber.collectedAndSentToAugur.call(1); 
//     assert.equal(collectedAndSentToAugur,21); // 7 + 14
//     var totalCollectedAndSentToAugur = await harber.totalCollectedAndSentToAugur.call();
//     assert.equal(totalCollectedAndSentToAugur,totalCollectedSoFar.toNumber()+collectedAndSentToAugur.toNumber());
//     currentTime = await time.latest();
//     var timeLastCollected = await harber.timeLastCollected.call(1);
//     assert.equal(currentTime.toString(),timeLastCollected.toString());
//   });

//   it('_collectAugurFunds function with foreclose but no revertPreviousOwner', async () => {
//     user = user5;
//     //from the above, we currently have a price of 1095 = charge of 3 per day. We have a deposit of 39 left, 39/3= 13 days. Let's wait ten days and check it hasn't been foreclosed, then another 5 and check that it has
//     //we cannot check the state variable to see if it's foreclosed, as it is immediately rebought. Instead, we can try and put a price lower than the previous one- it will accept this if there was a foreclosure that reduced the price to zero. 
//     await time.increase(time.duration.weeks(1));
//     await shouldFail.reverting.withMessage(harber.buy(1,1,21,{ from: user}), "Price must be higher than current price");
//     await time.increase(time.duration.weeks(1));
//     await harber.buy(1,1,5,{ from: user  }); 
//   });

//   it('_collectAugurFunds function with revertPreviousOwner via calling _collect directly', async () => {
//     await harber.buy(365,1,5,{ from: user5  }); //10 deposit = 10 days
//     await harber.getTestDai({ from: user6 });
//     await harber.buy(730,1,20,{ from: user6  }); //20 deposit = 10 days
//     await harber.getTestDai({ from: user7 });
//     await harber.buy(1095,1,30,{ from: user7  }); //30 deposit = 10 days
//     //check deposits
//     var deposit = await harber.deposits.call(1,user5); 
//     assert.equal(deposit, 10);
//     var deposit = await harber.deposits.call(1,user6); 
//     assert.equal(deposit, 20);
//     var deposit = await harber.deposits.call(1,user7); 
//     assert.equal(deposit, 30);
//     //check ownerTracker variable
//     //user 6:
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(1,1);
//     assert.equal(trackedPrice, 365);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(1,1);
//     assert.equal(trackedAddress, user5);
//     //user 7:
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(1,2);
//     assert.equal(trackedPrice, 730);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(1,2);
//     assert.equal(trackedAddress, user6);
//     //user 8:
//     var trackedPrice = await harber.getOwnerTrackerPrice.call(1,3);
//     assert.equal(trackedPrice, 1095);
//     var trackedAddress = await harber.getOwnerTrackerAddress.call(1,3);
//     assert.equal(trackedAddress, user7);
//     //wait a week then call collectfunds, should not revert
//     await time.increase(time.duration.weeks(1));
//     await harber._collectAugurFunds(1,{ from: user0 }); //user irrelevant
//     var deposit = await harber.deposits.call(1,user7); 
//     assert.equal(deposit, 9); 
//     var owner = await token.ownerOf.call(1);
//     assert.equal(owner, user7);
//     var price = await harber.price.call(1);
//     assert.equal(price, 1095);
//     //wait another week, should now revert
//     await time.increase(time.duration.weeks(1));
//     await harber._collectAugurFunds(1,{ from: user0 }); //user irrelevant
//     var owner = await token.ownerOf.call(1);
//     assert.equal(owner, user6);
//     var price = await harber.price.call(1);
//     assert.equal(price, 730);
//     //wait another 2 weeks, should revert again
//     await time.increase(time.duration.weeks(2));
//     await harber._collectAugurFunds(1,{ from: user0 }); //user irrelevant
//     var owner = await token.ownerOf.call(1);
//     assert.equal(owner, user5);
//     var price = await harber.price.call(1);
//     assert.equal(price, 365);
//     //wait another 2 weeks, check that its foreclosed 
//     await time.increase(time.duration.weeks(2));
//     await harber._collectAugurFunds(1,{ from: user0 }); //user irrelevant
//     var owner = await token.ownerOf.call(1);
//     assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
//     var price = await harber.price.call(1);
//     assert.equal(price, 0);
//     // await harber.buy(365,1,5,{ from: user5  });
//   });

// //reset to third token

//   it('test collected, acquired, held variables', async () => {
//     await harber.buy(365,2,14,{ from: user0  }); //14 so lasts exactly 2 weeks
//     var timeAcquiredExpected = await time.latest();
//     //delay a week, do  collection
//     await time.increase(time.duration.weeks(1));
//     await harber._collectAugurFunds(2);
//     var currentTime = await time.latest();
//     //check time acquired
//     var timeAcquiredActual = await harber.timeAcquired.call(2);
//     assert.equal(timeAcquiredExpected.toString(),timeAcquiredActual.toString());
//     // check time collected
//     var timeCollected = await harber.timeLastCollected.call(2);
//     assert.equal(timeCollected.toString(),currentTime.toString());
//     // wait 2 weeks and do collection, check time held = 2 weeks
//     await time.increase(time.duration.weeks(2));
//     await harber._collectAugurFunds(2);
//     var timeHeld = await harber.timeHeld.call(2, user0);
//     var difference = Math.abs(timeHeld - 1209600);
//     assert.isBelow(difference,2);
//     //check many timeHelds now. Flow: user1 deposits enough for 4 weeks. After 2  weeks, user2 buys it with enough deposit for 1 week. After 2 weeks, _collect is called and ownership reverts back to user1. After 1 week, user3 buys it with enough deposit for 2 weeks. After 1 week, user4 buys it with enough deposit for 3 days. After 1 week _collect is called, ownership  reverts back to user3. After 2 weeks _collect is called, ownership goes back to user2. Wait three days. Call collect. Timehelds should be: user1 21 days, user2 7 days, user3 14 days, user4 3 days
//     await harber.buy(365,2,28,{ from: user1  }); 
//     await time.increase(time.duration.weeks(2));
//     await harber.buy(730,2,14,{ from: user2  }); 
//     await time.increase(time.duration.weeks(2));
//     await harber._collectAugurFunds(2);
//     await time.increase(time.duration.weeks(1));
//     await harber.getTestDai({ from: user3 });
//     await harber.buy(1095,2,42,{ from: user3  }); 
//     await time.increase(time.duration.weeks(1));
//     await harber.getTestDai({ from: user4 });
//     await harber.buy(1460,2,12,{ from: user4  }); 
//     await time.increase(time.duration.weeks(1));
//     await harber._collectAugurFunds(2); //revert to user3
//     await time.increase(time.duration.weeks(2));
//     await harber._collectAugurFunds(2); //revert to user2
//     await time.increase(time.duration.days(3));
//     await harber._collectAugurFunds(2); //revert to user1
//     await time.increase(time.duration.days(2));
//     await harber._collectAugurFunds(2);
//     var timeHeld = await harber.timeHeld.call(2, user1);
//     var difference = Math.abs(timeHeld - 1814400); // 24 days
//     assert.isBelow(difference,2);
//     var timeHeld = await harber.timeHeld.call(2, user2);
//     var difference = Math.abs(timeHeld - 604800); // 7 days
//     assert.isBelow(difference,2);
//     var timeHeld = await harber.timeHeld.call(2, user3);
//     var difference = Math.abs(timeHeld - 1209600); // 14 days 
//     assert.isBelow(difference,2);
//     var timeHeld = await harber.timeHeld.call(2, user4);
//     var difference = Math.abs(timeHeld - 259200); // 7 days
//     assert.isBelow(difference,2);
//   });

//   //token 3

//   it('test withdrawDeposit', async () => {
//     user = user0;
//     //buy then withdraw half
//     await harber.buy(365,3,14,{ from: user }); 
//     var deposit = await harber.deposits.call(3,user); 
//     assert.equal(deposit, 14); 
//     await harber.withdrawDeposit(7,3,{ from: user  });
//     var deposit = await harber.deposits.call(3,user); 
//     assert.equal(deposit, 7); 
//     // withdraw other half then check foreclose
//     await harber.withdrawDeposit(7,3,{ from: user  });
//     var deposit = await harber.deposits.call(3,user); 
//     assert.equal(deposit, 0); 
//     var price = await harber.price.call(3);
//     assert.equal(price, 0);
//     var owner = await token.ownerOf.call(3);
//     assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0'); //if it belongs to me it means it has foreclosed
//     //try again but this time have two users buy it, and make sure it reverts to original  user after the first one sells
//     await harber.buy(365,3,10,{ from: user1 });
//     await harber.buy(720,3,10,{ from: user2 });
//     await harber.withdrawDeposit(10,3,{ from: user2 });
//     var owner = await token.ownerOf.call(3);
//     assert.equal(owner, user1);
//     var price = await harber.price.call(3);
//     assert.equal(price, 365);
//     await harber.withdrawDeposit(10,3,{ from: user1 });
//     var owner = await token.ownerOf.call(3);
//     assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
//     var price = await harber.price.call(3);
//     assert.equal(price, 0);
//   });

//   it('test exit', async () => {
//     user = user0;
//     //buy then withdraw half
//     await harber.buy(365,3,14,{ from: user }); 
//     var deposit = await harber.deposits.call(3,user); 
//     assert.equal(deposit, 14); 
//     await harber.exit(3,{ from: user  });
//     var deposit = await harber.deposits.call(3,user); 
//     assert.equal(deposit, 0); 
//     var price = await harber.price.call(3);
//     assert.equal(price, 0);
//     var owner = await token.ownerOf.call(3);
//     assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0'); //if it belongs to me it means it has foreclosed
//     //try again but this time have two users buy it, and make sure it reverts to original  user after the first one sells
//     await harber.buy(365,3,10,{ from: user1 });
//     await harber.buy(720,3,10,{ from: user2 });
//     await harber.exit(3,{ from: user2 });
//     var owner = await token.ownerOf.call(3);
//     assert.equal(owner, user1);
//     var price = await harber.price.call(3);
//     assert.equal(price, 365);
//     await harber.exit(3,{ from: user1 });
//     var owner = await token.ownerOf.call(3);
//     assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
//     var price = await harber.price.call(3);
//     assert.equal(price, 0);
//   });

  //token 4










});