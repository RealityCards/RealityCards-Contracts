const { BN, shouldFail, ether, expectEvent, balance, time } = require('openzeppelin-test-helpers');

const Token = artifacts.require('./ERC721Full.sol');
const Harber = artifacts.require('./Harber.sol');
const MintNFTs = artifacts.require("./mintNFTs.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

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

// These test assume that 100 dai (in wei-dai or whatever) is sent with the getTestDai function and numberoftokens >= 5

contract('HarberTests2', (accounts) => {

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

  // var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
  var andrewsAddress = accounts[9];

//the actual addresses are not used, I just need to pass the constructor smth
const augurCashAddress = '0x0802563FB6CfA1f07363D3aBf529F7b3999096f6';
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
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A']; 
const augurShareTokenAddress = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';
const marketedExpectedResolutionTime = 0;

beforeEach(async () => {
    token = await Token.new("Harber.io", "HARB", andrewsAddress);
    harber = await Harber.new(andrewsAddress, token.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress, marketedExpectedResolutionTime);
    mintNFTs = await MintNFTs.new(token.address, harber.address);
    /////// SETUP //////
    await harber.getTestDai({ from: user0 });
    await harber.getTestDai({ from: user1 });
    await harber.getTestDai({ from: user2 });
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
    ////////////////////////
  });

  // test the payout functions work fine, with different winners each time
  it('test complete- winner 1', async () => {
    var loops = 100;
    await harber.step1checkMarketsResolved(1, true); 
    await harber.step2getLoopsRequired(); 
    await harber.step3returnDeposits(loops); 
    await harber.step4sellCompleteSets(); 
    await harber.step5getDaiAvailableToDistribute(); 
    await harber.step6complete(loops);
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await harber.totalCollected.call();
    assert.equal(totalCollected,web3.utils.toWei('75', 'ether'));
    //knock off 1% that was sent to me so use 74.25 below
    //check user0 winnings
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('74.25').mul(new BN('604800')).div(new BN('61900800'));
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user1 winnings
    var winningsSentToUser = await harber.winningsSentToUser.call(user1);
    var winningsShouldBe = ether('74.25').mul(new BN('604800')).div(new BN('61900800'));
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user2 winnings
    var winningsSentToUser = await harber.winningsSentToUser.call(user2);
    var winningsShouldBe = ether('74.25').mul(new BN('691200')).div(new BN('61900800'));
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  });

  // // test the payout functions work fine, with different winners each time
  it('test complete- winner 2', async () => {
    var loops = 100;
    await harber.step1checkMarketsResolved(2, true); 
    await harber.step2getLoopsRequired(); 
    await harber.step3returnDeposits(loops); 
    await harber.step4sellCompleteSets(); 
    await harber.step5getDaiAvailableToDistribute(); 
    await harber.step6complete(loops);
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await harber.totalCollected.call();
    assert.equal(totalCollected,web3.utils.toWei('75', 'ether'));
    //knock off 1% that was sent to me so use 74.25 below
    //check user0 winnings
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('74.25');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user1 winnings
    var winningsSentToUser = await harber.winningsSentToUser.call(user1);
    var winningsShouldBe = ether('0');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user2 winnings
    var winningsSentToUser = await harber.winningsSentToUser.call(user2);
    var winningsShouldBe = ether('0');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  });

  // // test the payout functions work fine, with different winners each time
  it('test complete- invalid', async () => {
    var loops = 100;
    await harber.step1checkMarketsResolved(1, false); 
    await harber.step2getLoopsRequired(); 
    await harber.step3returnDeposits(loops); 
    await harber.step4sellCompleteSets(); 
    await harber.step5getDaiAvailableToDistribute(); 
    await harber.step6complete(loops);
    ////////////////////////
    //check user0 winnings 
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('17');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user0 winnings 
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('34');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user0 winnings 
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('24');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  });

  // // test the emergency Exit function works
  it('test emergencyExit', async () => {
    var loops = 100;
    await harber.step1BemergencyExit(); 
    await harber.step2getLoopsRequired(); 
    await harber.step3returnDeposits(loops); 
    await harber.step4sellCompleteSets(); 
    await harber.step5getDaiAvailableToDistribute(); 
    await harber.step6complete(loops);
    ////////////////////////
    //check user0 winnings 
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('17');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user0 winnings 
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('34');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
    //check user0 winnings 
    var winningsSentToUser = await harber.winningsSentToUser.call(user0);
    var winningsShouldBe = ether('24');
    assert.equal(toString(winningsSentToUser),toString(winningsShouldBe));
  });

});

// Ideas for more complicated tests in the future to write:
// 40 users. All of them get testDai. 
// 20 of them each deposit $100 on all 20, at a price of $1
// Wait 10 days

// A different 20 each deposit $100 on the same 20 tokens, at a price of $2
// Wait 10 days

// /test exit
// All 40 call exit

// We now have 30 x 20 paid in rent. Everyone has owned the tokenfor 10 days. Everyone has 70 dai left.


// First 20 of them each deposit $50 on all 20, at a price of $1
// Wait 10 days

// //check lots of winners 
// User 10 buys token 5 for price 2, deposits final 20
// Wait 10 days, 