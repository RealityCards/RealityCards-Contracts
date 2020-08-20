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
    cash = await CashMockup.new();
    realitio = await RealitioMockup.new();
    rcfactory = await RCFactory.new(cash.address, realitio.address);
  });

  // check that the contract initially owns the token
  it('create three markets then one test on final market', async () => {
    var marketLockingTime = await time.latest();
    var oracleResolutionTime = await time.latest();
    var address1 = '0xAc5BFb2B621AAcDcEA78eDa76e47449a4a6904e1';
    var address2 = '0x067D446251AD3d451613C0431068110D4EA5Ce0d';
    var address3 = '0xc86Fd07F5BAF9e61D4F60479eA6A06712B729B48';

    // first market
    rcfactory.createMarket(numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout, tokenName);
    var marketAddress = await rcfactory.marketAddresses.call(0);
    assert.equal(marketAddress, address1);
    var recentAddress = await rcfactory.mostRecentContract.call();
    assert.equal(recentAddress, address1);

    // second market
    rcfactory.createMarket(numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout, tokenName);
    var marketAddress = await rcfactory.marketAddresses.call(1);
    assert.equal(marketAddress, address2);
    var recentAddress = await rcfactory.mostRecentContract.call();
    assert.equal(recentAddress, address2);

    // third market
    rcfactory.createMarket(numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout, tokenName);
    var marketAddress = await rcfactory.marketAddresses.call(2);
    assert.equal(marketAddress, address3);
    var recentAddress = await rcfactory.mostRecentContract.call();
    assert.equal(recentAddress, address3);

    
    // test withdraw- winner 1
    realitycards = await RCMarket.at(recentAddress);
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


