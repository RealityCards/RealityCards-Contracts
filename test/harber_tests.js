const { BN, shouldFail, ether, expectEvent, balance, time } = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';

// todo: test over/underflows

contract('HarberTests', (accounts) => {

  let token;
  let harber;
  user1 = accounts[0];
  user2 = accounts[1];
  user3 = accounts[2];
  user4 = accounts[3];
  user5 = accounts[4];
  user6 = accounts[5];
  user7 = accounts[6];
  user8 = accounts[7];
  user9 = accounts[8];
  var newOwnerPurchaseCount1 = 0;
  
  beforeEach(async () => {
    token = await Token.deployed();
    harber = await Harber.deployed();
  });

    it('getVersion', async () => {
    var version = await harber.getVersion();
    assert.equal(version, 24);
  });

    it('getOwner', async () => {
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
  });

  it('getName', async () => {
    var name = await token.name.call();
    assert.equal(name, 'Harber.io');
  });

  it('getTestDai and check balance', async () => {
    await harber.getTestDai({ from: user1 });
    var testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 100);
  });

  it('user 1 buy Token first time and check: various', async () => {
    user = user1;
    await harber.buy(100,0,10,{ from: user });
    newOwnerPurchaseCount1++;
    var price = await harber.getPrice.call(0);
    assert.equal(price, 100);
    var testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 90);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 10);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedPrice, 100);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedAddress, user);
  });

  it('user 1 buy Token second time and check: various', async () => {
    user = user1;
    await harber.buy(200,0,10,{ from: user });
    var price = await harber.getPrice.call(0);
    assert.equal(price, 200);
    var testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 80);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 20);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedPrice, 200);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedAddress, user);
  });

  it('user 2 buy Token fail states', async () => {
    user = user2;
    await shouldFail.reverting.withMessage(harber.buy(200,0,0,{ from: user}), "Price must be higher than current price");
    await shouldFail.reverting.withMessage(harber.buy(300,0,0,{ from: user}), "Must deposit something");
    await shouldFail.reverting.withMessage(harber.buy(300,0,10,{ from: user}), "Not enough DAI");
  });

  it('user 2 buy Token first time and check: various', async () => { 
    user = user2;
    await harber.getTestDai({ from: user });
    await harber.buy(300,0,10,{ from: user  });
    newOwnerPurchaseCount1++;
    //  check user1 deposit is still there
    var deposit = await harber.deposits.call(0,user1);
    assert.equal(deposit, 20);
    //
    var price = await harber.getPrice.call(0);
    assert.equal(price, 300);
    var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 90);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 10);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user );
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedPrice, 300);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedAddress, user);
  });

  it('user 2 buy Token second time and check: various', async () => {
    user = user2;
    await harber.buy(400,0,10,{ from: user });
    var price = await harber.getPrice.call(0);
    assert.equal(price, 400);
    var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 80);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 20);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedPrice, 400);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedAddress, user);
  });
////////////
  it('switch back to user 1 buy Token third time and check: various', async () => {
    user = user1;
    await harber.buy(1000,0,20,{ from: user });
    newOwnerPurchaseCount1++;
    var price = await harber.getPrice.call(0);
    assert.equal(price, 1000);
    var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 60);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 40);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedPrice, 1000);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedAddress, user);
  });

  it('changePrice function fail testing', async () => {
    user = user2;
    await shouldFail.reverting.withMessage(harber.changePrice(2000,0,{ from: user}), "Not owner");
    user = user1;
    await shouldFail.reverting.withMessage(harber.changePrice(1000,0,{ from: user}), "New price must be higher than current price");
  });

  it('user 1 using changePrice function', async () => {
    user = user1;
    await harber.changePrice(2000,0,{ from: user });
    var price = await harber.getPrice.call(0);
    assert.equal(price, 2000);
    var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 60);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 40);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedPrice, 2000);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,newOwnerPurchaseCount1);
    assert.equal(trackedAddress, user);
  });

  it('augurFundsOwed function', async () => {
    user = user3;
    await harber.getTestDai({ from: user });
    await harber.buy(3650,0,30,{ from: user  });
    newOwnerPurchaseCount1++;
    var fundsOwedActual = await harber.augurFundsOwed.call(0);
    assert.equal(fundsOwedActual, 0);
    await time.increase(time.duration.minutes(1440)); //mins in a day
    var fundsOwedActual = await harber.augurFundsOwed.call(0);
    assert.equal(fundsOwedActual, 10);
  });

  it('userDepositAbleToWithdraw and  liveDepositAbleToWithdraw function', async () => {
    user = user3;
    //due to 1 day passing from above, the userDepositAbleToWithdraw and depositAbleToWithdraw should be lower by 10 but the deposit amount should no
    var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
    var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0, { from: user })
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 30);
    assert.equal(userDepositAbleToWithdraw,20);
    assert.equal(depositAbleToWithdraw,20);
    //increment time another half day and check that deposit is the same but the other two are not
    await time.increase(time.duration.minutes(720)); //mins in half a day
    var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
    var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0, { from: user })
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 30);
    assert.equal(userDepositAbleToWithdraw,15);
    assert.equal(depositAbleToWithdraw,15);
    //switch user, buy, increment time. user3 deposit and userDepositAbleToWithdraw should not change but depositAbleToWithdraw should 
    await harber.getTestDai({ from: user4 });
    await harber.buy(7300,0,100,{ from: user4  });
    newOwnerPurchaseCount1++;
    var price = await harber.getPrice.call(0);
    assert.equal(price, 7300);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user4);
    await time.increase(time.duration.minutes(1440)); 
    // 
    var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
    var deposit = await harber.deposits.call(0,user);
    var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0, { from: user })
    assert.equal(deposit, 15);
    assert.equal(userDepositAbleToWithdraw,15);
    assert.equal(depositAbleToWithdraw,80);
    //wait another half a day and check that nothing has changed for user 3 since he isnt the owner
    await time.increase(time.duration.minutes(720));
    var userDepositAbleToWithdraw = await harber.userDepositAbleToWithdraw.call(0, { from: user });
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 15);
    assert.equal(userDepositAbleToWithdraw,15);
  });

  it('rentalExpiryTime function', async () => {
    user = user5;
    await harber.getTestDai({ from: user });
    await harber.buy(31536000,0,100,{ from: user  }); //price = number of seconds in a year so that deposit = number of seconds we expect it to last for. 
    newOwnerPurchaseCount1++;
    var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0);
    assert.equal(depositAbleToWithdraw,100);
    currentTime = await time.latest();
    var expectedRentalExpiryTime = currentTime.add(time.duration.seconds(100));
    var actualRentalExpiryTime = await harber.rentalExpiryTime.call(0);
    assert.equal(expectedRentalExpiryTime.toString(),actualRentalExpiryTime.toString());
  });

  //at this point we are resetting things and will use second token

  it('_collectAugurFunds function no revertPreviousOwner/foreclose', async () => {
    user = user6;
    // get total collected from all the above tets and just check that it is added to properly
    var totalCollectedSoFar = await harber.totalCollected.call(); 
    await harber.getTestDai({ from: user });
    await harber.buy(365,1,20,{ from: user  });
    var timeAcquired = await harber.timeAcquired.call(1); 
    var currentTime = await time.latest();
    assert.equal(timeAcquired.toString(),currentTime.toString());
    //wait a week and buy again to trigger function call 
    await time.increase(time.duration.weeks(1));
    await harber.buy(730,1,20,{ from: user  });
    var timeAcquired = await harber.timeAcquired.call(1); 
    var currentTime = await time.latest();
    assert.equal(timeAcquired.toString(),currentTime.toString());
    //test deposits
    var deposit = await harber.deposits.call(1,user); 
    assert.equal(deposit, 33); //price 365, 1 week delay = charge of 7, 40-7 = 33
    //test currentCollected
    var currentCollected = await harber.currentCollected.call(1); 
    assert.equal(currentCollected,7);
    //test totalCollected. The total so far from previous tests is 45.  So we expect 52
    var totalCollected = await harber.totalCollected.call();
    assert.equal(totalCollected,totalCollectedSoFar.toNumber()+currentCollected.toNumber());
    //test timeLastCollected
    var timeLastCollected = await harber.timeLastCollected.call(1);
    currentTime = await time.latest();
    assert.equal(currentTime.toString(),timeLastCollected.toString());
    //wait a week and check all the above again, they should be unchanged
    await time.increase(time.duration.weeks(1));
    time10MinsAgo=currentTime;
    var deposit = await harber.deposits.call(1,user); 
    assert.equal(deposit, 33);
    var currentCollected = await harber.currentCollected.call(1); 
    assert.equal(currentCollected,7);
    var totalCollected = await harber.totalCollected.call();
    assert.equal(totalCollected,totalCollectedSoFar.toNumber()+currentCollected.toNumber());
    var timeLastCollected = await harber.timeLastCollected.call(1);
    assert.equal(time10MinsAgo.toString(),timeLastCollected.toString());
    //trigger the function again by doing another purchase and check all variables have updated correctly
    await harber.buy(1095,1,20,{ from: user });
    var deposit = await harber.deposits.call(1,user); 
    assert.equal(deposit, 39); // 33 + 20 - 14
    var currentCollected = await harber.currentCollected.call(1); 
    assert.equal(currentCollected,21); // 7 + 14
    var totalCollected = await harber.totalCollected.call();
    assert.equal(totalCollected,totalCollectedSoFar.toNumber()+currentCollected.toNumber());
    currentTime = await time.latest();
    var timeLastCollected = await harber.timeLastCollected.call(1);
    assert.equal(currentTime.toString(),timeLastCollected.toString());
  });

  it('_collectAugurFunds function with foreclose but no revertPreviousOwner', async () => {
    user = user6;
    //from the above, we currently have a price of 1095 = charge of 3 per day. We have a deposit of 39 left, 39/3= 13 days. Let's wait ten days and check it hasn't been foreclosed, then another 5 and check that it has
    //we cannot check the state variable to see if it's foreclosed, as it is immediately rebought. Instead, we can try and put a price lower than the previous one- it will accept this if there was a foreclosure that reduced the price to zero. 
    await time.increase(time.duration.weeks(1));
    await shouldFail.reverting.withMessage(harber.buy(1,1,21,{ from: user}), "Price must be higher than current price");
    await time.increase(time.duration.weeks(1));
    await harber.buy(1,1,5,{ from: user  }); 
  });

  it('_collectAugurFunds function with revertPreviousOwner and foreclose', async () => {
    //let's rebuy with an easier price to work with
    await harber.buy(365,1,5,{ from: user6  }); //10 deposit = 10 days
    await harber.getTestDai({ from: user7 });
    await harber.buy(730,1,20,{ from: user7  }); //20 deposit = 10 days
    await harber.getTestDai({ from: user8 });
    await harber.buy(1095,1,30,{ from: user8  }); //30 deposit = 10 days
    //check deposits
    var deposit = await harber.deposits.call(1,user6); 
    assert.equal(deposit, 10);
    var deposit = await harber.deposits.call(1,user7); 
    assert.equal(deposit, 20);
    var deposit = await harber.deposits.call(1,user8); 
    assert.equal(deposit, 30);
    //check ownerTracker variable
    //user 6:
    var trackedPrice = await harber.getOwnerTrackerPrice.call(1,1);
    assert.equal(trackedPrice, 365);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(1,1);
    assert.equal(trackedAddress, user6);
    //user 7:
    var trackedPrice = await harber.getOwnerTrackerPrice.call(1,2);
    assert.equal(trackedPrice, 730);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(1,2);
    assert.equal(trackedAddress, user7);
    //user 8:
    var trackedPrice = await harber.getOwnerTrackerPrice.call(1,3);
    assert.equal(trackedPrice, 1095);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(1,3);
    assert.equal(trackedAddress, user8);
    //wait a week then call collectfunds, should not revert
    await time.increase(time.duration.weeks(1));
    await harber._collectAugurFunds.call(1,{ from: user1 }) //user irrelevant
    var owner = await token.ownerOf.call(1);
    assert.equal(owner, user8);
    var price = await harber.getPrice.call(1);
    assert.equal(price, 1095);
    //wait another week, should now revert
    await time.increase(time.duration.weeks(10));
    await harber._collectAugurFunds.call(1,{ from: user1 }) //user irrelevant
    var owner = await token.ownerOf.call(1);
    assert.equal(owner, user7);
    var price = await harber.getPrice.call(1);
    assert.equal(price, 730);
    








    // var owner = await token.ownerOf.call(1);
    // assert.equal(owner, user8 );
  });

  // it('debugger', async () => {
  //   console.log(await harber.currentOwnerIndex.call(1));
  // });








});