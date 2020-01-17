const { BN, shouldFail, ether, expectEvent, balance, time } = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');
// const Cash = artifacts.require('./Cash.sol');

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';

// This is a unique test to help guard against denial of service attacks. 
// I will have a many different users each buy a token and test the gas usage of the payout functions
// ganache must have -a 1000 on the end to generate enough accounts

// results:
// 5 buyers, complete takes ~750k gas 
// 10 buyers, complete takes ~900k gas
// 20 buyers, complete takes ~1.3m gas
// 100 buyers, complete takes ~4m gas
// 500 buyers, complete is OOG

//howevever, this is being run with usingAugur set to false. It is clear that it would cost even more gas when its true. 
//in conclusion we need to fix complete and emergencyExit so it only can deal with part of the total stuff. 

contract('HarberTests3', (accounts) => {

  var numberOfRuns = 500;;
  let harber;
  
  beforeEach(async () => {
    token = await Token.deployed();
    harber = await Harber.deployed();
  });

  it('allocate dai to all X accounts', async () => {
    var i;
    for (i = 0; i < numberOfRuns; i++) {
    await harber.getTestDai({ from: accounts[i] });
    }
  });

  it('have all X accounts buy a token', async () => {
    var i;
    var price = 10000000000;
    for (i = 0; i < numberOfRuns; i++) {
      price++;
      await harber.newRental(price,0,10000000000,{ from: accounts[i] });
      await time.increase(time.duration.weeks(1));
    }
  });

  it('finalise', async () => {
    await harber.complete(0, true);
  });

});


