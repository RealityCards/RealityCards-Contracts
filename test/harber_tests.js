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
    var price = await harber.getPrice.call(0);
    assert.equal(price, 100);
    var testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 90);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 10);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,0);
    assert.equal(trackedPrice, 100);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,0);
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
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,0);
    assert.equal(trackedPrice, 200);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,0);
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
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,1);
    assert.equal(trackedPrice, 300);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,1);
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
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,1);
    assert.equal(trackedPrice, 400);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,1);
    assert.equal(trackedAddress, user);
  });
////////////
  it('switch back to user 1 buy Token third time and check: various', async () => {
    user = user1;
    await harber.buy(1000,0,20,{ from: user });
    var price = await harber.getPrice.call(0);
    assert.equal(price, 1000);
    var testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 60);
    var deposit = await harber.deposits.call(0,user);
    assert.equal(deposit, 40);
    var owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,2);
    assert.equal(trackedPrice, 1000);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,2);
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
    var trackedPrice = await harber.getOwnerTrackerPrice.call(0,2);
    assert.equal(trackedPrice, 2000);
    var trackedAddress = await harber.getOwnerTrackerAddress.call(0,2);
    assert.equal(trackedAddress, user);
  });

  it('augurFundsOwed function', async () => {
    user = user3;
    await harber.getTestDai({ from: user });
    await harber.buy(3650,0,30,{ from: user  });
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
    var depositAbleToWithdraw = await harber.liveDepositAbleToWithdraw.call(0);
    assert.equal(depositAbleToWithdraw,100);
    currentTime = await time.latest();
    var expectedRentalExpiryTime = currentTime.add(time.duration.seconds(100));
    var actualRentalExpiryTime = await harber.rentalExpiryTime.call(0);
    assert.equal(expectedRentalExpiryTime.toString(),actualRentalExpiryTime.toString());
  });







});