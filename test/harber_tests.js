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
  
  beforeEach(async () => {
    token = await Token.deployed();
    harber = await Harber.deployed();
  });

    it('getVersion', async () => {
    const version = await harber.getVersion();
    assert.equal(version, 22);
  });

    it('getOwner', async () => {
    const owner = await token.ownerOf.call(0);
    assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
  });

  it('getName', async () => {
    const name = await token.name.call();
    assert.equal(name, 'Harber.io');
  });

  it('getTestDai and check balance', async () => {
    await harber.getTestDai({ from: user1 });
    const testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 100);
  });

  it('user 1 buy Token first time and check: daibalance, price, tokendeposit, userdeposit, token owner, state', async () => {
    user = user1;
    await harber.buy(100,0,10,{ from: user });
    const price = await harber.getPrice.call(0);
    assert.equal(price, 100);
    const testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 90);
    const deposit = await harber.deposit.call(0);
    assert.equal(deposit, 10);
    const userdeposit = await harber.userDeposits.call(0,user);
    assert.equal(userdeposit, 10);
    const owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
  });


  it('user 1 buy Token second time and check: daibalance, price, tokendeposit, userdeposit, token owner, state', async () => {
    user = user1;
    await harber.buy(200,0,10,{ from: user });
    const price = await harber.getPrice.call(0);
    assert.equal(price, 200);
    const testDaiBalance = await harber.getTestDaiBalance.call();
    assert.equal(testDaiBalance, 80);
    const deposit = await harber.deposit.call(0);
    assert.equal(deposit, 20);
    const userdeposit = await harber.userDeposits.call(0,user);
    assert.equal(userdeposit, 20);
    const owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
  });

  it('user 2 buy Token fail states', async () => {
    user = user2;
    await shouldFail.reverting.withMessage(harber.buy(200,0,0,{ from: user}), "Price must be higher than current price");
    await shouldFail.reverting.withMessage(harber.buy(300,0,0,{ from: user}), "Must deposit something");
    await shouldFail.reverting.withMessage(harber.buy(300,0,10,{ from: user}), "Not enough DAI");
  });


  it('user 2 buy Token first time and check: daibalance, price, tokendeposit, userdeposit, token owner, state', async () => { 
    user = user2;
    await harber.getTestDai({ from: user });
    await harber.buy(300,0,10,{ from: user  });
    const price = await harber.getPrice.call(0);
    assert.equal(price, 300);
    const testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 90);
    const deposit = await harber.deposit.call(0);
    assert.equal(deposit, 10);
    const userdeposit = await harber.userDeposits.call(0,user );
    assert.equal(userdeposit, 10);
    const owner = await token.ownerOf.call(0);
    assert.equal(owner, user );
  });

  it('user 2 buy Token second time and check: daibalance, price, tokendeposit, userdeposit, token owner, state', async () => {
    user = user2;
    await harber.buy(400,0,10,{ from: user });
    const price = await harber.getPrice.call(0);
    assert.equal(price, 400);
    const testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 80);
    const deposit = await harber.deposit.call(0);
    assert.equal(deposit, 20);
    const userdeposit = await harber.userDeposits.call(0,user);
    assert.equal(userdeposit, 20);
    const owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
  });

  it('switch back to user 1 buy Token third time and check: daibalance, price, tokendeposit, userdeposit, token owner, state', async () => {
    user = user1;
    await harber.buy(1000,0,20,{ from: user });
    const price = await harber.getPrice.call(0);
    assert.equal(price, 1000);
    const testDaiBalance = await harber.getTestDaiBalance.call({ from: user });
    assert.equal(testDaiBalance, 60);
    const deposit = await harber.deposit.call(0);
    assert.equal(deposit, 40);
    const userdeposit = await harber.userDeposits.call(0,user);
    assert.equal(userdeposit, 40);
    const owner = await token.ownerOf.call(0);
    assert.equal(owner, user);
  });




});