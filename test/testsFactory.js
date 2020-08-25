const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

var RCFactory = artifacts.require('./RealityCardsFactory.sol');
var RCMarket = artifacts.require('./RealityCardsMarket.sol');
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests', (accounts) => {

  var realitycards;
  var numberOfTokens = 20;
  var templateId = 2;
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var questionId = '0xb5358101b5dfdf6918d344b751898ad5a3d1738f57c49124edf019ba61bf8f44';
  var useExistingQuestion = false;
  var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
  var timeout = 86400;
  var tokenName = 'PresElection';

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

  beforeEach(async () => {
    var marketLockingTime = await time.latest();
    var oracleResolutionTime = await time.latest();
    cash = await CashMockup.new();
    realitio = await RealitioMockup.new();
    const rcLib = await RCMarket.new();
    rcfactory = await RCFactory.new(cash.address, realitio.address);
    await rcfactory.setLibraryAddress(rcLib.address);
    await rcfactory.createMarket(numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout, tokenName);
    const marketAddress = await rcfactory.marketAddresses.call(0);
    realitycards = await RCMarket.at(marketAddress);
  });

  // check that the contract initially owns the token
  it('create three markets then one test on final market', async () => {  
    // test withdraw- winner 1
    for (i = 0; i < 20; i++) {
        await realitycards.mintNfts("uri", {from: andrewsAddress});
    }
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user0 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user1 });
    await cash.faucet(web3.utils.toWei('100', 'ether'),{ from: user2 });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'),{ from: user2 });
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,web3.utils.toWei('10', 'ether'),{ from: user0 }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,web3.utils.toWei('20', 'ether'),{ from: user1 }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,web3.utils.toWei('24', 'ether'),{ from: user2 }); //used deposit of 24
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
    await realitio.setResult(1);
    ////////////////////////
    await realitycards.lockMarket(); 
    await realitycards.determineWinner(); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    await realitycards.withdraw({ from: user0 });
    var winningsSentToUser = await cash.balanceOf.call(user0);
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user0 }), "Already withdrawn");
    //check user1 winnings
    await realitycards.withdraw({ from: user1 });
    var winningsSentToUser = await cash.balanceOf.call(user1);
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    await realitycards.withdraw({ from: user2 });
    var winningsSentToUser = await cash.balanceOf.call(user2);
    var winningsShouldBe = ether('75').mul(new BN('691200')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");

  });

});


