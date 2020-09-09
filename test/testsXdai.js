const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

var RCFactory = artifacts.require('./RealityCardsFactory.sol');
var RCMarket = artifacts.require('./RealityCardsMarketXdai.sol');
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests Xdai version', (accounts) => {

  var realitycards;
  var numberOfTokens = 20;
  var templateId = 2;
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
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
    await rcfactory.setLibraryAddressXdai(rcLib.address);
    await rcfactory.createMarket(2,'0x0',andrewsAddress,numberOfTokens,marketLockingTime, oracleResolutionTime, templateId, question, arbitrator, timeout, tokenName);
    const marketAddress = await rcfactory.marketAddresses.call(0);
    realitycards = await RCMarket.at(marketAddress);
    for (i = 0; i < 20; i++) {
        await realitycards.mintNfts("uri", {from: andrewsAddress});
    }
  });

    // test the payout functions work fine, with different winners each time
  it('test withdraw- winner 1', async () => {
    /////// SETUP //////
    //rent losing teams
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),2,{ from: user0, value: web3.utils.toWei('10', 'ether') }); //used deposit of 10
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),3,{ from: user1, value: web3.utils.toWei('20', 'ether') }); //used deposit of 20
    //rent winning team
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),1,{ from: user0, value: web3.utils.toWei('10', 'ether') }); //used deposit of 7
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('2', 'ether'),1,{ from: user1, value: web3.utils.toWei('20', 'ether') }); //used deposit of 14
    await time.increase(time.duration.weeks(1));
    await realitycards.newRental(web3.utils.toWei('3', 'ether'),1,{ from: user2, value: web3.utils.toWei('24', 'ether') }); //used deposit of 24
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
    await realitycards.lockMarket(); 
    // set winner 1
    await realitycards.determineWinner2(1,{ from:andrewsAddress}); 
    ////////////////////////
    // total deposits = 75, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('75', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var balanceBefore = await web3.eth.getBalance(user0);
    await realitycards.withdraw({ from: user0 });
    var balanceAfter = await web3.eth.getBalance(user0);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user0 }), "Already withdrawn");
    //check user1 winnings
    var balanceBefore = await web3.eth.getBalance(user1);
    await realitycards.withdraw({ from: user1 });
    var balanceAfter = await web3.eth.getBalance(user1);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('75').mul(new BN('604800')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var balanceBefore = await web3.eth.getBalance(user2);
    await realitycards.withdraw({ from: user2 });
    var balanceAfter = await web3.eth.getBalance(user2);
    var winningsSentToUser = balanceAfter - balanceBefore;
    var winningsShouldBe = ether('75').mul(new BN('691200')).div(new BN('1900800'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await shouldFail.reverting.withMessage(realitycards.withdraw({ from: user6 }), "Not a winner");
  });

});


