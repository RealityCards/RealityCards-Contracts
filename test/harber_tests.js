const { BN, shouldFail, ether, expectEvent, balance, time } = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');
// const HarberSimple = artifacts.require("./HarberSimple.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';

// todo: test over/underflows

contract('HarberTests', (accounts) => {

  let token;
  let harber;
  // let harbersimple;
  
  beforeEach(async () => {
    token = await Token.deployed();
    harber = await Harber.deployed();
    // harbersimple = await HarberSimple.deployed();
  });

    it('getVersion', async () => {
    const version = await harbersimple.getVersion();
    assert.equal(version, 21);
  });

  //   it('getOwner', async () => {
  //   const owner = await token.ownerOf.call(0);
  //   assert.equal(owner, '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0');
  // });

  // it('getName', async () => {
  //   const name = await token.name.call();
  //   assert.equal(name, 'Harber.io');
  // });

  it('getVersion', async () => {
    const version = await harber.getVersion();
    assert.equal(version, 21);
  });

  // it('getTestDai and check balance', async () => {
  //   await harber.getTestDai({ from: accounts[0] });
  //   const testDaiBalance = await harber.getTestDaiBalance.call();
  //   assert.equal(testDaiBalance, 100000000000000000000);
  // });



});