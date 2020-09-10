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

  async function newRental(price, outcome, deposit, user) {
    await realitycards.newRental(price,outcome,{ from: user, value: deposit });
  }
  

    // check that the contract initially owns the token
    it('getOwner', async () => {
    var i;
    for (i = 0; i < 20; i++) {
        var owner = await realitycards.ownerOf.call(i);
        assert.equal(owner, realitycards.address);
    }
    });


  // check that the contract initially owns the token
  it('getName', async () => {
    var name = await realitycards.name.call();
    assert.equal(name, 'PresElection');
  });

    // check fundamentals first
    it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
    user = user0;
    // setup
    await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
    await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
    await newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    var deposit = await realitycards.deposits.call(4, user);
    assert.equal(deposit, web3.utils.toWei('10', 'ether'));
    var owner = await realitycards.ownerOf.call(4);
    assert.equal(owner, user);
    // 1 because nothing stored in zero
    var ownerTracker = await realitycards.ownerTracker.call(4, 1);
    assert.equal(ownerTracker[1].toString(), web3.utils.toWei('1', 'ether').toString());
    assert.equal(ownerTracker[0], user);
    });
    
// // do the same thing- does it still work? 
//     it('user 0 rent Token second time and check: various', async () => {
//     user = user0;
//     // setup from previous test
//     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
//     await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
//     await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
//     // new setup
//     await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
//     // tests
//     var price = await realitycards.price.call(4);
//     assert.equal(price, web3.utils.toWei('2', 'ether'));
//     var deposit = await realitycards.deposits.call(4, user);
//     var depositShouldBe = web3.utils.toWei('20', 'ether');
//     var difference = Math.abs(deposit.toString()-depositShouldBe.toString())
//     assert.isBelow(difference/deposit,0.00001);
//     var owner = await realitycards.ownerOf.call(4);
//     assert.equal(owner, user);
//     var ownerTracker = await realitycards.ownerTracker.call(4, 1);
//     assert.equal(ownerTracker[1].toString(), web3.utils.toWei('2', 'ether').toString());
//     assert.equal(ownerTracker[0], user);
//     });

//     // make sure it throws a revert when it is supposed to
//     it('user 1 rent Token fail states', async () => {
//     // setup from previous test
//     user = user0;
//     await cash.faucet(web3.utils.toWei('100', 'ether'), { from: user });
//     await cash.approve(realitycards.address, web3.utils.toWei('100', 'ether'), { from: user });
//     await realitycards.newRental(web3.utils.toWei('1', 'ether'), 4, web3.utils.toWei('10', 'ether'), { from: user });
//     await realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('10', 'ether'),{ from: user });
//     // tests
//     await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('2', 'ether'),4,web3.utils.toWei('1', 'ether'),{ from: user}), "Price not 10% higher");
//     await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('3', 'ether'),20,web3.utils.toWei('0', 'ether'),{ from: user}), "This token does not exist");
//     await shouldFail.reverting.withMessage(realitycards.newRental(web3.utils.toWei('3', 'ether'),4,web3.utils.toWei('100', 'ether'),{ from: user}), "Insufficient balance");
//     });

    // test the payout functions work fine, with different winners each time
  it('test withdraw- winner 1', async () => {
    /////// SETUP //////
    //rent losing teams
    await newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),user0 ); //used deposit of 10
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


