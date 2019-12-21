const { BN, shouldFail, ether, expectEvent, balance, time } = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');
// const Cash = artifacts.require('./Cash.sol');

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

// These test assume that 100 dai (in wei-dai or whatever) is sent with the getTestDai function and numberoftokens = 5
// These tests do NOT reset the blockchain after each test. In retrospect this was a mistake, as it wasted a huge amount of time. harber_test2 fix this. 

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
  var newOwnerPurchaseCount1 = 0;

  // var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
  var andrewsAddress = accounts[9];

//the actual addresses are not used, I just need to pass the constructor smth
const augurCashAddress = '0x0802563FB6CfA1f07363D3aBf529F7b3999096f6';
const augurMarketAddress = '0xA830e8A271909b2407985F95921E5dD4AD1d859A'; //0x3276323FCcAA197DCCe782CCF783120D78D57cE6 this has worked before
const augurShareTokenAddress = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';
const marketedExpectedResolutionTime = 0;
  

beforeEach(async () => {
    token = await Token.new("Harber.io", "HARB", andrewsAddress);
    harber = await Harber.new(andrewsAddress, token.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress, marketedExpectedResolutionTime);
  });

  it('test GetWinner- winner 1', async () => {
    await harber.getTestDai({ from: user0 });
    await harber.getTestDai({ from: user1 });
    await harber.getTestDai({ from: user2 });
    await harber.getTestDai({ from: user3 });
    //buy losing teams
    await harber.buy(365,2,10,{ from: user0 });
    await harber.buy(730,3,20,{ from: user1 });
    //buy winning team
    await harber.buy(365,1,10,{ from: user0 });
    await time.increase(time.duration.weeks(1));
    await harber.buy(730,1,20,{ from: user1 });
    await time.increase(time.duration.weeks(1));
    await harber.buy(1095,1,30,{ from: user2 });
    await time.increase(time.duration.weeks(1));
    await harber.getWinner();
    
    
  });





});