const { assert } = require('hardhat');
const {
  BN,
  expectRevert,
  ether,
  expectEvent,
  balance,
  time
} = require('@openzeppelin/test-helpers');

var RCFactory = artifacts.require('./RCFactory.sol');
var RCTreasury = artifacts.require('./RCTreasury.sol');
var RCMarket = artifacts.require('./RCMarket.sol');
var XdaiProxy = artifacts.require('./bridgeproxies/RCOracleProxyXdai.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCOracleProxyMainnet.sol');
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");
var BridgeMockup = artifacts.require("./mockups/BridgeMockup.sol");

// redeploys
var MainnetProxy2 = artifacts.require('./mockups/redeploys/RCOracleProxyMainnetV2.sol');
var XdaiProxy2 = artifacts.require('./mockups/redeploys/RCOracleProxyXdaiV2.sol');
var RCMarket2 = artifacts.require('./mockups/redeploys/RCMarketXdaiV2.sol');
var BridgeMockup2 = artifacts.require('./mockups/redeploys/BridgeMockupV2.sol');
var RealitioMockup2 = artifacts.require("./mockups/redeploys/RealitioMockupV2.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests XdaiV1', (accounts) => {

  var realitycards;
  var tokenURIs = ['x','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x']; // 20 tokens
  var eventDetails = ['RCToken','x']; 
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var maxuint256 = 4294967295;

  user0 = accounts[0]; //0xc783df8a850f42e7F7e57013759C285caa701eB6
  user1 = accounts[1]; //0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4
  user2 = accounts[2]; //0xE5904695748fe4A84b40b3fc79De2277660BD1D3
  user3 = accounts[3]; //0x92561F28Ec438Ee9831D00D1D59fbDC981b762b2
  user4 = accounts[4];
  user5 = accounts[5];
  user6 = accounts[6];
  user7 = accounts[7];
  user8 = accounts[8];
  andrewsAddress = accounts[9];
  var cardRecipients = ['0x0000000000000000000000000000000000000000',user6,user7,user8,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0];

  beforeEach(async () => {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    // main contracts
    treasury = await RCTreasury.new();
    rcfactory = await RCFactory.new(treasury.address);
    rcreference = await RCMarket.new();
    await treasury.setFactoryAddress(rcfactory.address);
    await rcfactory.setReferenceContractAddress(rcreference.address);
    // mockups 
    realitio = await RealitioMockup.new();
    bridge = await BridgeMockup.new();
    // bridge contracts
    xdaiproxy = await XdaiProxy.new(bridge.address, rcfactory.address);
    mainnetproxy = await MainnetProxy.new(bridge.address, realitio.address);
    await rcfactory.updateOracleProxyXdaiAddress(xdaiproxy.address);
    await xdaiproxy.setOracleProxyMainnetAddress(mainnetproxy.address);
    await mainnetproxy.setOracleProxyXdaiAddress(xdaiproxy.address);
    await bridge.setOracleProxyMainnetAddress(mainnetproxy.address);
    await bridge.setOracleProxyXdaiAddress(xdaiproxy.address);
    // market creation
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards = await RCMarket.at(marketAddress);
  });

  async function createMarketWithArtistSet() {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user7;
    var eventDetails = ['RCToken','y'];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketWithArtistSet2() {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user7;
    var eventDetails = ['RCToken','z'];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomMode(mode) {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var eventDetails = ['RCToken','y'];
    await rcfactory.createMarket(
        mode,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(mode);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomMode2(mode) {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var eventDetails = ['RCToken','z'];
    await rcfactory.createMarket(
        mode,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(mode);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketWithCardAffiliates() {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var cardRecipients = [user5,user6,user7,user8,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var eventDetails = ['RCToken','y'];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomModeWithArtist(mode) {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user7;
    var eventDetails = ['RCToken','y'];
    await rcfactory.createMarket(
        mode,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(mode);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketWithArtistAndCardAffiliates() {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user7;
    var cardRecipients = [user5,user6,user7,user8,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0];
    var eventDetails = ['RCToken','y'];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketWithArtistAndCardAffiliatesAndSponsorship(amount, user) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user7;
    var eventDetails = ['RCToken','y'];
    var cardRecipients = [user5,user6,user7,user8,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails, {value: amount, from: user}
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomeTimestamps(marketOpeningTime,marketLockingTime,oracleResolutionTime) {
    var artistAddress = user8;
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
    var eventDetails = ['RCToken','y'];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomeTimestamps2(marketOpeningTime,marketLockingTime,oracleResolutionTime) {
    var artistAddress = user8;
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
    var eventDetails = ['RCToken','z'];
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
        eventDetails,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function depositDai(amount, user) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await treasury.deposit(user,{ from: user, value: amount });
  }

  async function newRental(price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price,0,outcome,{ from: user});
  }

  async function newRentalWithDeposit(price, outcome, user, dai) {
    price = web3.utils.toWei(price.toString(), 'ether');
    dai = web3.utils.toWei(dai.toString(), 'ether');
    await realitycards.newRental(price,0,outcome,{ from: user, value: dai});
  }

  async function newRentalCustomContract(contract, price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await contract.newRental(price,maxuint256.toString(),outcome,{ from: user});
  }

  async function newRentalWithDepositCustomContract(contract, price, outcome, user, dai) {
    price = web3.utils.toWei(price.toString(), 'ether');
    dai = web3.utils.toWei(dai.toString(), 'ether');
    await contract.newRental(price,maxuint256.toString(),outcome,{ from: user, value: dai});
  }

  async function newRentalCustomTimeLimit(price, timelimit, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price,(timelimit*3600*24).toString(),outcome,{ from: user});
  }

  async function changePrice(price, outcome, userx) {
    await realitycards.changePrice(price,outcome,{ from: userx });
  }

  async function userRemainingDeposit(outcome, userx) {
    await realitycards.userRemainingDeposit.call(outcome, {from: userx} );
  }

  async function withdraw(userx) {
    await realitycards.withdraw({from:userx} );
  }

  async function withdrawDeposit(amount,userx) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await treasury.withdrawDeposit(amount,{ from: userx});
  }

    // check that the contract initially owns the token
    it('getOwner', async () => {
    var i;
    for (i = 0; i < 20; i++) {
        var owner = await realitycards.ownerOf.call(i);
        assert.equal(owner, realitycards.address);
    }
    });

  // check name
  it('getName', async () => {
    var name = await realitycards.name.call();
    assert.equal(name, 'RCToken');
  });

    // check fundamentals first
  it('user 0 rent Token first time and check: price, deposits, owner etc', async () => {
    user = user0;
    // setup
    await depositDai(144,user);
    await newRental(144,4,user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('144', 'ether'));
    var deposit = await treasury.deposits.call(user);
    assert.equal(deposit, web3.utils.toWei('143', 'ether'));
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,4);
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
    var owner = await realitycards.ownerOf.call(4);
    assert.equal(owner, user);
    // 1 because nothing stored in zero
    var ownerTracker = await realitycards.ownerTracker.call(4, 1);
    assert.equal(ownerTracker[1].toString(), web3.utils.toWei('144', 'ether').toString());
    assert.equal(ownerTracker[0], user);
    // withdraw
    await withdrawDeposit(1000,user);
   });
  
  it('test change price by renting again', async () => {
    user = user0;
    // setup
    await depositDai(10,user);
    await newRental(1,4,user);
    // tests
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    // rent again
    await newRental(3,4,user);
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('3', 'ether'));
    // withdraw
    await withdrawDeposit(1000,user);
   });
  
it('test various after collectRent', async () => {
    // setup
    user = user0;
    await depositDai(100,user);
    await newRental(1,4,user);
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllTokens();
    // tests
    //test deposits
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('93', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    //test totalCollected. 
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('7', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    //test timeLastCollected
    var timeLastCollected = await realitycards.timeLastCollected.call(4);
    currentTime = await time.latest();
    assert.equal(currentTime.toString(),timeLastCollected.toString());
    //wait a week and repeat the above
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllTokens();
    //test deposits
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('86', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    //test totalCollected. 
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('14', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.001);
    //test timeLastCollected
    var timeLastCollected = await realitycards.timeLastCollected.call(4);
    currentTime = await time.latest();
    assert.equal(currentTime.toString(),timeLastCollected.toString());
    // withdraw
    await withdrawDeposit(1000,user);
});

// test collectRent again, but this time it should foreclose, does it?
it('ccollectRent function with foreclose and revertPreviousOwner', async () => {
    // setup
    await depositDai(6,user0);
    await newRental(1,1,user0);
    await depositDai(10,user1);
    await newRental(2,1,user1);
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllTokens();
    // check reverted
    var owner = await realitycards.ownerOf.call(1);
    assert.equal(owner, user0);
    var price = await realitycards.price.call(1);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllTokens();
    var owner = await realitycards.ownerOf.call(1);
    assert.equal(owner, realitycards.address);
    var price = await realitycards.price.call(1);
    assert.equal(price, 0);
});
  
// these are two crucial variables that are relied on for other functions. are they what they should be?
it('test timeHeld and totalTimeHeld', async () => {
    await depositDai(10,user0);
    await newRental(1,0,user0);
    await depositDai(10,user1);
    await newRental(2,0,user1);
    await depositDai(12,user2);
    await newRental(3,0,user2);
    //tests
    await time.increase(time.duration.days(3));
    await realitycards.collectRentAllTokens();
    // u2 3 days
    var timeHeld = await realitycards.timeHeld.call(0, user2);
    var timeHeldShouldBe = time.duration.days(3);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,4);
    await time.increase(time.duration.days(3));
    await realitycards.collectRentAllTokens();
    // u2 one more day
    var timeHeld = await realitycards.timeHeld.call(0, user2);
    var timeHeldShouldBe = time.duration.days(4);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,2);
    await time.increase(time.duration.days(3));
    await realitycards.collectRentAllTokens();
    // u2 still 4 days, u1 5 days, u0 0 days
    var timeHeld = await realitycards.timeHeld.call(0, user2);
    var timeHeldShouldBe = time.duration.days(4);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,2);
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.days(5);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    await time.increase(time.duration.days(3));
    await realitycards.collectRentAllTokens();
    // u1 5 days, u0 3 days
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.days(5);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    var timeHeld = await realitycards.timeHeld.call(0, user0);
    var timeHeldShouldBe = time.duration.days(3);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    await time.increase(time.duration.days(1));
    await realitycards.collectRentAllTokens();
    // u1 5 days, u0 6 day
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.days(5);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    var timeHeld = await realitycards.timeHeld.call(0, user0);
    var timeHeldShouldBe = time.duration.days(4);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // buy again, check the new owner, then revert again
    user = user5;
    await depositDai(10,user5);
    await newRental(10,0,user5);
    await time.increase(time.duration.days(2));
    await realitycards.collectRentAllTokens();
    var timeHeld = await realitycards.timeHeld.call(0, user5);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    await time.increase(time.duration.days(7));
    await realitycards.collectRentAllTokens();
    // u0 8 days
    var timeHeld = await realitycards.timeHeld.call(0, user0);
    var timeHeldShouldBe = time.duration.days(10);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    await time.increase(time.duration.days(9));
    await realitycards.collectRentAllTokens();
    // u0 10 days
    var timeHeld = await realitycards.timeHeld.call(0, user0);
    var timeHeldShouldBe = time.duration.days(10);
    var difference = Math.abs(timeHeld - timeHeldShouldBe); 
    assert.isBelow(difference/timeHeld,0.001);
    // check total collected
    var totalTimeHeldShouldBe = time.duration.days(20);
    var totalTimeHeld = await realitycards.totalTimeHeld.call(0);
    var difference = Math.abs(totalTimeHeld - totalTimeHeldShouldBe);
    assert.isBelow(difference/timeHeld,0.001);
});
  
it('test withdrawDeposit after zero mins', async () => {
    user = user0;
    await depositDai(144,user);
    await newRental(144,0,user);
    var deposit = await treasury.deposits.call(user); 
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether')); 
    // withdraw half
    var balanceBefore = await web3.eth.getBalance(user);
    await withdrawDeposit(72,user);
    // check deposit balances 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('71', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // check withdrawn amounts
    var balanceAfter = await web3.eth.getBalance(user);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var depositWithdrawnShouldBe = web3.utils.toWei('72', 'ether');
    var difference = Math.abs(depositWithdrawn.toString()-depositWithdrawnShouldBe.toString());
    assert.isBelow(difference/depositWithdrawnShouldBe,0.00001);
    // withdraw too much, should only allow you to withdraw the remaining
    var balanceBefore = await web3.eth.getBalance(user);
    await withdrawDeposit(100,user);
    // check deposit balances 
    var deposit = await treasury.deposits.call(user); 
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    assert.equal(deposit, 0); 
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
    // check withdrawn amounts 
    var balanceAfter = await web3.eth.getBalance(user);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var depositWithdrawnShouldBe = web3.utils.toWei('71', 'ether');
    var difference = Math.abs(depositWithdrawn.toString()-depositWithdrawnShouldBe.toString());
    assert.isBelow(difference/depositWithdrawnShouldBe,0.00001);
});

it('test withdrawDeposit- multiple markets', async () => {
    user = user0;
    await depositDai(10,user);
    await newRental(144,0,user);
    //second market
    realitycards2 = await createMarketWithArtistSet();
    await realitycards2.newRental(web3.utils.toWei('288', 'ether'),maxuint256,0,{ from: user});
    // withdraw all, should be 3 left therefore only withdraw 7
    var balanceBefore = await web3.eth.getBalance(user);
    await withdrawDeposit(1000,user);
    var balanceAfter = await web3.eth.getBalance(user);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var depositWithdrawnShouldBe = web3.utils.toWei('7', 'ether');
    var difference = Math.abs(depositWithdrawn.toString() - depositWithdrawnShouldBe.toString());
    assert.isBelow(difference/depositWithdrawn,0.001);
    //original user tries to withdraw again, should be nothign to withdraw 
    await expectRevert(treasury.withdrawDeposit(1000), "Nothing to withdraw");
});

it('test exit- more than ten mins', async () => {
    // setup
    await depositDai(144,user0);
    await depositDai(144,user1);
    await newRental(10,0,user0);
    await newRental(144,0,user1);
    await time.increase(time.duration.hours(1)); 
    await realitycards.collectRentAllTokens();
    // user 1 should still be owner, held for 1 hour
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user1);
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.hours(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,5);
    // call exit, user 0 should own and no more time held on u1
    await realitycards.exit(0,{ from: user1  });
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user0);
    await time.increase(time.duration.hours(1)); 
    await realitycards.collectRentAllTokens();
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.hours(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,4);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

    it('test exit- less than ten mins', async () => {
        // setup
        await depositDai(144,user0);
        await depositDai(144,user1);
        await newRental(10,0,user0);
        await newRental(144,0,user1);
        await time.increase(time.duration.minutes(5)); 
        await realitycards.collectRentAllTokens();
        // user 1 should be owner, held for 5 mins
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.minutes(5);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,5);
        // call exit, user 1 should still own
        await realitycards.exit(0,{ from: user1 });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        // increase by an hour, user 0 will own and u1 should have ten minutes ownership time
        await time.increase(time.duration.hours(1)); 
        await realitycards.collectRentAllTokens();
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.minutes(10);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeldShouldBe,0.01);
        // to be safe, chcek that u0 has owned for 55 mins
        await realitycards.collectRentAllTokens();
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.minutes(55);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeldShouldBe,0.01);
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
    });

    it('test exit- reduce rental time to one min', async () => {
        // check function is owned to change limit
        await expectRevert(treasury.updateMinRental(12,{from: user1}), "caller is not the owner");
        // change to one min
        await treasury.updateMinRental(1440);
        await depositDai(144,user0);
        await depositDai(144,user1);
        await newRental(10,0,user0);
        await newRental(144,0,user1);
        await time.increase(time.duration.seconds(30)); 
        await realitycards.collectRentAllTokens();
        // user 1 should be owner, held for 30 secs
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.seconds(30);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,5);
        // call exit, user 1 should still own
        await realitycards.exit(0,{ from: user1 });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        // increase by 90 secs, user 0 will own and u1 should have ten minutes ownership time
        await time.increase(time.duration.seconds(90)); 
        await realitycards.collectRentAllTokens();
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.minutes(1);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeldShouldBe,0.01);
        // to be safe, chcek that u0 has owned for 1 min
        await realitycards.collectRentAllTokens();
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.minutes(1);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        // 0.1 cos we're dealing with individual seconds and indivdiual calls take a few seconds so 
        // more time has elapsed than the 90 that was set above
        assert.isBelow(difference/timeHeldShouldBe,0.15); 
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        // await withdrawDeposit(1000,user1);
    });

    it('test exitAll', async () => {
        // setup
        await depositDai(144,user0);
        await newRental(10,0,user0);
        await newRental(10,1,user0);
        await newRental(10,2,user0);
        await newRental(10,3,user0);
        await depositDai(144,user1);
        await newRental(144,0,user1);
        await newRental(144,1,user1);
        await newRental(144,2,user1);
        await newRental(144,3,user1);
        await time.increase(time.duration.hours(1)); 
        // exit all, should all be owned by user 0
        await realitycards.exitAll({ from: user1  });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var owner = await realitycards.ownerOf.call(1);
        assert.equal(owner, user0);
        var owner = await realitycards.ownerOf.call(2);
        assert.equal(owner, user0);
        var owner = await realitycards.ownerOf.call(3);
        assert.equal(owner, user0);
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
    });
  
  it('test winner/withdraw mode 0- zero artist/creator cut', async () => {
    /////// SETUP //////
    await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 52
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await realitycards.exitAll({from: user1});
    await realitycards.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await newRental(1,2,user0); // auto locks 
    // // set winner 1
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    ////////////////////////
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards.withdraw({ from: user6 }), "Not a winner");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test winner/withdraw mode 0- with artist/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(60,0,40,0,100);
    var realitycards2 = await createMarketWithArtistSet();
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDepositCustomContract(realitycards2,1,0,user0,144); // collected 28
    await newRentalWithDepositCustomContract(realitycards2,2,1,user1,144); // collected 52
    // rent winning
    await newRentalWithDepositCustomContract(realitycards2,1,2,user0,144); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,2,2,user1,144); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,3,2,user2,144); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await realitycards2.payMarketCreator();
    // artist and market creator cant withdraw twice
    await expectRevert(realitycards2.payMarketCreator(), "Creator already paid");
    await expectRevert(realitycards2.payArtist(), "Artist already paid");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that creator fees are correct shold be 147 * .04 = 8.82 
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    var depositCreatorShouldBe = web3.utils.toWei('5.88', 'ether');
    var difference = Math.abs(depositCreator.toString() - depositCreatorShouldBe.toString());
    assert.isBelow(difference/depositCreator,0.00001);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // rremaining pot is 132.3 which is 10% less as this is what is given to artists and creators
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('132.3').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0} ), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('132.3').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2} );
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('132.3').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Not a winner");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user8);
});

it('test winner/withdraw mode 0- with artist/winner/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(60,100,40,0,100);
    var realitycards2 = await createMarketWithArtistSet();
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDepositCustomContract(realitycards2,1,0,user0,144); // collected 28
    await newRentalWithDepositCustomContract(realitycards2,2,1,user1,144); // collected 52
    // rent winning
    await newRentalWithDepositCustomContract(realitycards2,1,2,user0,144); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,2,2,user1,144); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,3,2,user2,144); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await realitycards2.payMarketCreator();
    // artist and market creator cant withdraw twice
    await expectRevert(realitycards2.payMarketCreator(), "Creator already paid");
    await expectRevert(realitycards2.payArtist(), "Artist already paid");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that creator fees are correct shold be 147 * .04 = 8.82 
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    var depositCreatorShouldBe = web3.utils.toWei('5.88', 'ether');
    var difference = Math.abs(depositCreator.toString() - depositCreatorShouldBe.toString());
    assert.isBelow(difference/depositCreator,0.00001);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // 147 total, less 8.82 for artist, less 5.88 for creator, less 14.7 for winner = 117.6
    // remaining pot = 80% of total collected
    var remainingPot = ether('147').mul(new BN('8')).div(new BN('10'));
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('7')).div(new BN('28')); 
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0} ), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('7')).div(new BN('28'));remainingPot
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2} );
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('14')).div(new BN('28'));
    winningsShouldBe = winningsShouldBe.add(ether('14.7'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Not a winner");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user8);
});

it('test winner/withdraw mode 0- with artist/affiliate/winner/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(60,100,40,100,100);
    var realitycards2 = await createMarketWithArtistSet();
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDepositCustomContract(realitycards2,1,0,user0,144); // collected 28
    await newRentalWithDepositCustomContract(realitycards2,2,1,user1,144); // collected 52
    // rent winning
    await newRentalWithDepositCustomContract(realitycards2,1,2,user0,144); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,2,2,user1,144); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,3,2,user2,144); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await realitycards2.payAffiliate();
    await realitycards2.payMarketCreator();
    // artist and market creator cant withdraw twice
    await expectRevert(realitycards2.payMarketCreator(), "Creator already paid");
    await expectRevert(realitycards2.payArtist(), "Artist already paid");
    await expectRevert(realitycards2.payAffiliate(), "Affiliate already paid");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that affiliate fees are correct shold be 147 * .6 = 14.7 
    var depositAffiliate = await treasury.deposits.call(user7); 
    var depositAffiliateShouldBe = web3.utils.toWei('14.7', 'ether');
    var difference = Math.abs(depositAffiliate.toString() - depositAffiliateShouldBe.toString());
    assert.isBelow(difference/depositAffiliate,0.00001);
    // check that creator fees are correct shold be 147 * .04 = 8.82 
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    var depositCreatorShouldBe = web3.utils.toWei('5.88', 'ether');
    var difference = Math.abs(depositCreator.toString() - depositCreatorShouldBe.toString());
    assert.isBelow(difference/depositCreator,0.00001);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // 147 total, less 8.82 for artist, less 5.88 for creator, less 14.7 for winner = 117.6
    // remaining pot = 70% of total collected
    var remainingPot = ether('147').mul(new BN('7')).div(new BN('10'));
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('7')).div(new BN('28')); 
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0} ), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('7')).div(new BN('28'));remainingPot
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2} );
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('14')).div(new BN('28'));
    winningsShouldBe = winningsShouldBe.add(ether('14.7'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Not a winner");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user7);
    await withdrawDeposit(1000,user8);
});

  it('test winner/withdraw mode 1- zero artist/creator cut', async () => {
    var realitycards2 = await createMarketCustomMode(1);
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 52
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // check user0 and 1 winnings should fail cos user 2 winner
    await expectRevert(realitycards2.withdraw({from:user0}), "Not a winner");
    await expectRevert(realitycards2.withdraw({from:user1}), "Not a winner");
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var difference = Math.abs(winningsSentToUser.toString()-totalCollected.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test winner/withdraw mode 1- with artist/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(60,43,40,0,100);
    var realitycards2 = await createMarketCustomModeWithArtist(1);
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 52
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await realitycards2.payMarketCreator();
    // artist and market creator cant withdraw twice
    await expectRevert(realitycards2.payMarketCreator(), "Creator already paid");
    await expectRevert(realitycards2.payArtist(), "Artist already paid");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that creator fees are correct shold be 147 * .04 = 8.82 
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    var depositCreatorShouldBe = web3.utils.toWei('5.88', 'ether');
    var difference = Math.abs(depositCreator.toString() - depositCreatorShouldBe.toString());
    assert.isBelow(difference/depositCreator,0.00001);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // check user0 and 1 winnings should fail cos user 2 winner
    await expectRevert(realitycards2.withdraw({from:user0}), "Not a winner");
    await expectRevert(realitycards2.withdraw({from:user1}), "Not a winner");
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    totalCollected = (totalCollected.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString()-totalCollected.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

  it('test winner/withdraw mode 2- zero artist/creator cut', async () => {
    var realitycards2 = await createMarketCustomMode(2);
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 52
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0});
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0}), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1});
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Not a winner");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test winner/withdraw mode 0- with card affiliate but zero artist/creator cut', async () => {
    var realitycards2 = await createMarketWithCardAffiliates();
    /////// SETUP //////
    await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from:user0});
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    // 10% to card specific so * 0.9
    winningsShouldBe = (winningsShouldBe.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from:user1});
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    // 10% to card specific so * 0.9
    winningsShouldBe = (winningsShouldBe.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    // 10% to card specific so * 0.9
    winningsShouldBe = (winningsShouldBe.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // now check that card specifics got the correct payout
    // token 0, collected = 28
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('28').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1, collected = 56
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('56').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 2, collected = 63
    var deposit = await treasury.deposits.call(user7);
    var depositShouldBe = ether('63').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // check cant call payCardSpecificAffiliate() twice
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Card recipients already paid");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
    });

it('test winner/withdraw mode 0 with artist/creator/card affiliate cut', async () => {
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(60,0,40,0,100);
    var realitycards2 = await createMarketWithArtistAndCardAffiliates();
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDepositCustomContract(realitycards2,1,0,user0,144); // collected 28
    await newRentalWithDepositCustomContract(realitycards2,2,1,user1,144); // collected 52
    // rent winning
    await newRentalWithDepositCustomContract(realitycards2,1,2,user0,144); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,2,2,user1,144); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,3,2,user2,144); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await realitycards2.payMarketCreator();
    // artist and market creator cant withdraw twice
    await expectRevert(realitycards2.payMarketCreator(), "Creator already paid");
    await expectRevert(realitycards2.payArtist(), "Artist already paid");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that creator fees are correct shold be 147 * .04 = 8.82 
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    var depositCreatorShouldBe = web3.utils.toWei('5.88', 'ether');
    var difference = Math.abs(depositCreator.toString() - depositCreatorShouldBe.toString());
    assert.isBelow(difference/depositCreator,0.00001);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    winningsShouldBe = (winningsShouldBe.mul(new BN('8'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0} ), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    winningsShouldBe = (winningsShouldBe.mul(new BN('8'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2} );
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    winningsShouldBe = (winningsShouldBe.mul(new BN('8'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Not a winner");
    // now check that card specifics got the correct payout
    // token 0, collected = 28
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('28').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1, collected = 56
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('56').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 2, collected = 63
    var deposit = await treasury.deposits.call(user7);
    var depositShouldBe = ether('63').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // check cant call payCardSpecificAffiliate() twice
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Card recipients already paid");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
});

it('test winner/withdraw mode 0- with artist/winner/creator/card affiliate cut', async () => {
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(60,100,40,0,100);
    var realitycards2 = await createMarketWithArtistAndCardAffiliates();
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDepositCustomContract(realitycards2,1,0,user0,144); // collected 28
    await newRentalWithDepositCustomContract(realitycards2,2,1,user1,144); // collected 52
    // rent winning
    await newRentalWithDepositCustomContract(realitycards2,1,2,user0,144); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,2,2,user1,144); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,3,2,user2,144); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await realitycards2.payMarketCreator();
    // artist and market creator cant withdraw twice
    await expectRevert(realitycards2.payMarketCreator(), "Creator already paid");
    await expectRevert(realitycards2.payArtist(), "Artist already paid");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that creator fees are correct shold be 147 * .04 = 8.82 
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    var depositCreatorShouldBe = web3.utils.toWei('5.88', 'ether');
    var difference = Math.abs(depositCreator.toString() - depositCreatorShouldBe.toString());
    assert.isBelow(difference/depositCreator,0.00001);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // remaining pot = 80% of total collected
    var remainingPot = ether('147').mul(new BN('7')).div(new BN('10'));
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0} ), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2} );
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = remainingPot.mul(new BN('14')).div(new BN('28'));
    winningsShouldBe = winningsShouldBe.add(ether('14.7'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Not a winner");
    // now check that card specifics got the correct payout
    // token 0, collected = 28
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('28').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1, collected = 56
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('56').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 2, collected = 63
    var deposit = await treasury.deposits.call(user7);
    var depositShouldBe = ether('63').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // check cant call payCardSpecificAffiliate() twice
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Card recipients already paid");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
});

  it('test sponsor', async () => {
    await expectRevert(realitycards.sponsor({ from: user3 }), "Must send something");
    await realitycards.sponsor({ value: web3.utils.toWei('153', 'ether'), from: user3 });
    ///// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 52
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await realitycards.exitAll({from: user1});
    await realitycards.exitAll({from: user2});
    await time.increase(time.duration.years(1));     
    // winner 1: 
    // totalcollected = 147, // now 300 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('300', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('300').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('300').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('300').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards.withdraw({ from: user6 }), "Not a winner");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test sponsor with card affiliate cut', async () => {
    // 10% card specific affiliates
    await rcfactory.updatePotDistribution(0,0,0,0,100);
    var realitycards2 = await createMarketWithArtistAndCardAffiliates();
    await realitycards2.sponsor({ value: web3.utils.toWei('200', 'ether'), from: user3 });
    await newRentalWithDepositCustomContract(realitycards2,5,0,user0,1000); // paid 50
    await newRentalWithDepositCustomContract(realitycards2,15,1,user1,1000);  // paid 150
    await time.increase(time.duration.days(10));
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket(); 
    await realitio.setResult(0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    // token 0
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('60').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('160').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // winnings of user 0 should be 400 - 20 so 380
    var depositBefore = await treasury.deposits.call(user0);
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = web3.utils.toWei('360', 'ether');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // ensure everything is withdrawn
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test sponsor via market creation with card affiliate cut', async () => {
    // 10% card specific affiliates
    await rcfactory.updatePotDistribution(0,0,0,0,100);
    // add user3 to whitelist 
    await rcfactory.addOrRemoveGovernor(user3);
    var realitycards2 = await createMarketWithArtistAndCardAffiliatesAndSponsorship(200,user3);
    // await realitycards2.sponsor({ value: web3.utils.toWei('200', 'ether'), from: user3 });
    await newRentalWithDepositCustomContract(realitycards2,5,0,user0,1000); // paid 50
    await newRentalWithDepositCustomContract(realitycards2,15,1,user1,1000);  // paid 150
    await time.increase(time.duration.days(10));
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket(); 
    await realitio.setResult(0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    // token 0
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('60').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('160').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // winnings of user 0 should be 400 - 20 so 380
    var depositBefore = await treasury.deposits.call(user0);
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = web3.utils.toWei('360', 'ether');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // ensure everything is withdrawn
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

  it('test sponsor- invalid', async () => {
    await expectRevert(realitycards.sponsor({ from: user3 }), "Must send something");
    await realitycards.sponsor({ value: web3.utils.toWei('153', 'ether'), from: user3 });
    ///// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 52
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await realitycards.exitAll({from: user1});
    await realitycards.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, // now 300 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner 
    await realitio.setResult(20);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    ////////////////////////
    //check sponsor winnings
    var depositBefore = await treasury.deposits.call(user3); 
    await withdraw(user3);
    var depositAfter = await treasury.deposits.call(user3); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('153');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // withdraw other stuff
    await withdraw(user0);
    await withdraw(user1);
    await withdraw(user2);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user3);
  });


it('test sponsor- invalid with card affiliate cut', async () => {
    // 10% card specific affiliates
    await rcfactory.updatePotDistribution(0,0,0,0,100);
    var realitycards2 = await createMarketWithArtistAndCardAffiliates();
    await realitycards2.sponsor({ value: web3.utils.toWei('200', 'ether'), from: user3 });
    await newRentalWithDepositCustomContract(realitycards2,5,0,user0,1000); // paid 50
    await newRentalWithDepositCustomContract(realitycards2,15,1,user1,1000);  // paid 150
    await time.increase(time.duration.days(10));
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket(); 
    await realitio.setResult(69);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    // token 0
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('60').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('160').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // user 0
    var depositBefore = await treasury.deposits.call(user0);
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = web3.utils.toWei('45', 'ether');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // user 1
    var depositBefore = await treasury.deposits.call(user1);
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = web3.utils.toWei('135', 'ether');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // user 3 (sponsor)
    var depositBefore = await treasury.deposits.call(user3);
    await realitycards2.withdraw({from: user3} );
    var depositAfter = await treasury.deposits.call(user3); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = web3.utils.toWei('180', 'ether');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);    
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test withdraw- invalid mode 0- zero artist/creator cut', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRental(1,0,user0); // collected 28
    await newRental(2,1,user1); // collected 56
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRental(3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await realitycards.exitAll({from: user1});
    await realitycards.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // set invalid winner
    await realitio.setResult(69);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards.withdraw({ from: user6 }), "Paid no rent");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

it('test withdraw- invalid mode 0- with artist/creator cut', async () => {
    /////// SETUP //////
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(50,62,20,0,100);
    var realitycards2 = await createMarketWithArtistSet();
    await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2));
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // set invalid winner
    await realitio.setResult(69);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from:user0});
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    winningsShouldBe = (winningsShouldBe.mul(new BN('19'))).div(new BN('20'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from:user1});
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    winningsShouldBe = (winningsShouldBe.mul(new BN('19'))).div(new BN('20'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    winningsShouldBe = (winningsShouldBe.mul(new BN('19'))).div(new BN('20'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    await realitycards2.payArtist();
    // check that artist fees are correct shold be 147 * .05 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('7.35', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

    it('test withdraw- invalid mode 0- with artist/affiliate/creator cut', async () => {
        /////// SETUP //////
        // 6% artist 4% creator
        await rcfactory.updatePotDistribution(50,62,20,100,100);
        var realitycards2 = await createMarketWithArtistSet();
        await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
        await depositDai(1000,user1);
        await depositDai(1000,user2);
        // rent losing teams
        await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
        await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
        // rent winning team
        await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
        await time.increase(time.duration.weeks(1));
        await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
        await time.increase(time.duration.weeks(1));
        await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
        await time.increase(time.duration.weeks(2));
        // exit all, progress time so marketLockingTime in the past
        await realitycards2.exitAll({from: user0});
        await realitycards2.exitAll({from: user1});
        await realitycards2.exitAll({from: user2});
        await time.increase(time.duration.years(1)); 
        // winner 1: 
        // totalcollected = 147, 
        // total days = 28 
        // user 0 owned for 7 days
        // user 1 owned for 7 days
        // user 2 owned for 14 days
        ////////////////////////
        await realitycards2.lockMarket(); 
        // set invalid winner
        await realitio.setResult(69);
        await mainnetproxy.getWinnerFromOracle(realitycards2.address);
        await realitycards2.determineWinner();
        ////////////////////////
        // total deposits = 139, check:
        var totalCollected = await realitycards2.totalCollected.call();
        var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
        var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
        assert.isBelow(difference/totalCollected,0.00001);
        //check user0 winnings
        var depositBefore = await treasury.deposits.call(user0); 
        await realitycards2.withdraw({from:user0});
        var depositAfter = await treasury.deposits.call(user0); 
        var winningsSentToUser = depositAfter - depositBefore;
        var winningsShouldBe = ether('35');
        winningsShouldBe = (winningsShouldBe.mul(new BN('17'))).div(new BN('20'));
        var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
        assert.isBelow(difference/winningsSentToUser,0.00001);
        //check user1 winnings
        var depositBefore = await treasury.deposits.call(user1); 
        await realitycards2.withdraw({from:user1});
        var depositAfter = await treasury.deposits.call(user1); 
        var winningsSentToUser = depositAfter - depositBefore;
        var winningsShouldBe = ether('70');
        winningsShouldBe = (winningsShouldBe.mul(new BN('17'))).div(new BN('20'));
        var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
        assert.isBelow(difference/winningsSentToUser,0.00001);
        //check user2 winnings
        var depositBefore = await treasury.deposits.call(user2); 
        await realitycards2.withdraw({from:user2});
        var depositAfter = await treasury.deposits.call(user2); 
        var winningsSentToUser = depositAfter - depositBefore;
        var winningsShouldBe = ether('42');
        winningsShouldBe = (winningsShouldBe.mul(new BN('17'))).div(new BN('20'));
        var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
        assert.isBelow(difference/winningsSentToUser,0.00001);
        await realitycards2.payArtist();
        await realitycards2.payAffiliate();
        // check that artist fees are correct shold be 147 * .05 = 8.82 
        var depositArtist = await treasury.deposits.call(user8); 
        var depositArtistShouldBe = web3.utils.toWei('7.35', 'ether');
        var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
        assert.isBelow(difference/depositArtist,0.00001);
        // check that affiliate fees are correct shold be 147 * .05 = 8.82 
        var depositAffiliate = await treasury.deposits.call(user7); 
        var depositAffiliateShouldBe = web3.utils.toWei('14.7', 'ether');
        var difference = Math.abs(depositAffiliate.toString() - depositAffiliateShouldBe.toString());
        assert.isBelow(difference/depositAffiliate,0.00001);
        // check market pot is empty
        var marketPot = await treasury.marketPot.call(realitycards2.address);
        assert.isBelow(Math.abs(marketPot.toString()),10);
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
        await withdrawDeposit(1000,user2);
        await withdrawDeposit(1000,user7);
        await withdrawDeposit(1000,user8);
        });

it('test withdraw- invalid mode 1- zero artist/creator cut', async () => {
    var realitycards2 = await createMarketCustomMode(1);
    /////// SETUP //////
    await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2));
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // set invalid winner
    await realitio.setResult(69);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    // total deposits = 147, check:
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from:user0});
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from:user1});
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

    it('test withdraw- invalid mode 1- with artist/creator cut', async () => {
        /////// SETUP //////
        // 6% artist 4% creator
        await rcfactory.updatePotDistribution(50,13,20,0,100);
        var realitycards2 = await createMarketCustomModeWithArtist(1);
        await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
        await depositDai(1000,user1);
        await depositDai(1000,user2);
        // rent losing teams
        await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
        await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
        // rent winning team
        await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
        await time.increase(time.duration.weeks(1));
        await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
        await time.increase(time.duration.weeks(1));
        await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
        await time.increase(time.duration.weeks(2));
        // exit all, progress time so marketLockingTime in the past
        await realitycards2.exitAll({from: user0});
        await realitycards2.exitAll({from: user1});
        await realitycards2.exitAll({from: user2});
        await time.increase(time.duration.years(1)); 
        // winner 1: 
        // totalcollected = 147, 
        // total days = 28 
        // user 0 owned for 7 days
        // user 1 owned for 7 days
        // user 2 owned for 14 days
        ////////////////////////
        await realitycards2.lockMarket(); 
        // set invalid winner
        await realitio.setResult(69);
        await mainnetproxy.getWinnerFromOracle(realitycards2.address);
        await realitycards2.determineWinner();
        ////////////////////////
        // total deposits = 139, check:
        var totalCollected = await realitycards2.totalCollected.call();
        var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
        var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
        assert.isBelow(difference/totalCollected,0.00001);
        //check user0 winnings
        var depositBefore = await treasury.deposits.call(user0); 
        await realitycards2.withdraw({from:user0});
        var depositAfter = await treasury.deposits.call(user0); 
        var winningsSentToUser = depositAfter - depositBefore;
        var winningsShouldBe = ether('35');
        winningsShouldBe = (winningsShouldBe.mul(new BN('19'))).div(new BN('20'));
        var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
        assert.isBelow(difference/winningsSentToUser,0.00001);
        //check user1 winnings
        var depositBefore = await treasury.deposits.call(user1); 
        await realitycards2.withdraw({from:user1});
        var depositAfter = await treasury.deposits.call(user1); 
        var winningsSentToUser = depositAfter - depositBefore;
        var winningsShouldBe = ether('70');
        winningsShouldBe = (winningsShouldBe.mul(new BN('19'))).div(new BN('20'));
        var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
        assert.isBelow(difference/winningsSentToUser,0.00001);
        //check user2 winnings
        var depositBefore = await treasury.deposits.call(user2); 
        await realitycards2.withdraw({from:user2});
        var depositAfter = await treasury.deposits.call(user2); 
        var winningsSentToUser = depositAfter - depositBefore;
        var winningsShouldBe = ether('42');
        winningsShouldBe = (winningsShouldBe.mul(new BN('19'))).div(new BN('20'));
        var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
        assert.isBelow(difference/winningsSentToUser,0.00001);
        await realitycards2.payArtist();
        // check that artist fees are correct shold be 147 * .05 = 8.82 
        var depositArtist = await treasury.deposits.call(user8); 
        var depositArtistShouldBe = web3.utils.toWei('7.35', 'ether');
        var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
        assert.isBelow(difference/depositArtist,0.00001);
        // check market pot is empty
        var marketPot = await treasury.marketPot.call(realitycards2.address);
        assert.isBelow(Math.abs(marketPot.toString()),10);
        // withdraw for next test
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
        await withdrawDeposit(1000,user2);
        });

it('test withdraw- invalid mode 0- zero artist/creator cut', async () => {
    // with stands 10% payout to dudes
    var realitycards2 = await createMarketWithCardAffiliates(0);
    /////// SETUP //////
    await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2));
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // set invalid winner
    await realitio.setResult(69);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    // total deposits = 147, check:
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from:user0});
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    // 10% to card specific so * 0.9
    winningsShouldBe = (winningsShouldBe.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from:user1});
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    // 10% to card specific so * 0.9
    winningsShouldBe = (winningsShouldBe.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    // 10% to card specific so * 0.9
    winningsShouldBe = (winningsShouldBe.mul(new BN('9'))).div(new BN('10'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
        // now check that card specifics got the correct payout
    // token 0, collected = 28
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('28').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1, collected = 56
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('56').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 2, collected = 63
    var collected = await realitycards2.collectedPerToken.call(1);
    var deposit = await treasury.deposits.call(user7);
    var depositShouldBe = ether('63').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // check cant call payCardSpecificAffiliate() twice
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Card recipients already paid");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
    });

it('test withdraw- invalid mode 0- with artist/creator/card affiliate cut', async () => {
    /////// SETUP //////
    // 6% artist 4% creator
    await rcfactory.updatePotDistribution(50,13,20,0,100);
    var realitycards2 = await createMarketWithArtistAndCardAffiliates(0);
    await treasury.send(web3.utils.toWei('1000', 'ether')); // sneaky direct send instead of deposit
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomContract(realitycards2,1,0,user0); // collected 28
    await newRentalCustomContract(realitycards2,2,1,user1); // collected 56
    // rent winning team
    await newRentalCustomContract(realitycards2,1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomContract(realitycards2,3,2,user2); // collected 42
    await time.increase(time.duration.weeks(2));
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // set invalid winner
    await realitio.setResult(69);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    ////////////////////////
    // total deposits = 139, check:
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from:user0});
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('35');
    winningsShouldBe = (winningsShouldBe.mul(new BN('17'))).div(new BN('20'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from:user1});
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('70');
    winningsShouldBe = (winningsShouldBe.mul(new BN('17'))).div(new BN('20'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from:user2});
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('42');
    winningsShouldBe = (winningsShouldBe.mul(new BN('17'))).div(new BN('20'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    await realitycards2.payArtist();
    // check that artist fees are correct shold be 147 * .05 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('7.35', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // now check that card specifics got the correct payout
    // token 0, collected = 28
    await realitycards2.payCardSpecificAffiliate();
    var deposit = await treasury.deposits.call(user5);
    var depositShouldBe = ether('28').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 1, collected = 56
    var deposit = await treasury.deposits.call(user6);
    var depositShouldBe = ether('56').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // token 2, collected = 63
    var deposit = await treasury.deposits.call(user7);
    var depositShouldBe = ether('63').div(new BN('10'));
    var difference = Math.abs(deposit.toString() - depositShouldBe.toString());
    assert.isBelow(difference/deposit,0.00001);
    // check cant call payCardSpecificAffiliate() twice
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Card recipients already paid");
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
    });

// it('test circuitBreaker', async () => {
//     /////// SETUP //////
//     await depositDai(1000,user0);
//     await depositDai(1000,user1);
//     await depositDai(1000,user2);
//     // rent losing teams
//     await newRental(1,0,user0); // collected 28
//     await newRental(2,1,user1); // collected 56
//     // rent winning team
//     await newRental(1,2,user0); // collected 7
//     await time.increase(time.duration.weeks(1));
//     await newRental(2,2,user1); // collected 14
//     await time.increase(time.duration.weeks(1));
//     await newRental(3,2,user2); // collected 42
//     await time.increase(time.duration.weeks(2)); 
//     // exit all, progress time so marketLockingTime in the past
//     await realitycards.exitAll({from: user0});
//     await realitycards.exitAll({from: user1});
//     await realitycards.exitAll({from: user2});
//     await time.increase(time.duration.years(1)); 
//     // winner 1: 
//     // totalcollected = 147, 
//     // total days = 28 
//     // user 0 owned for 7 days
//     // user 1 owned for 7 days
//     // user 2 owned for 14 days
//     ////////////////////////
//     await realitycards.lockMarket(); 
//     await time.increase(time.duration.weeks(24));
//     await realitycards.circuitBreaker(); 
//     ////////////////////////
//     // total deposits = 139, check:
//     var totalCollected = await realitycards.totalCollected.call();
//     var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
//     var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
//     assert.isBelow(difference/totalCollected,0.00001);
//     //check user0 winnings
//     var depositBefore = await treasury.deposits.call(user0); 
//     await withdraw(user0);
//     var depositAfter = await treasury.deposits.call(user0); 
//     var winningsSentToUser = depositAfter - depositBefore;
//     var winningsShouldBe = ether('35');
//     var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
//     assert.isBelow(difference/winningsSentToUser,0.00001);
//     //check user0 cant withdraw again
//     await expectRevert(withdraw(user0), "Already withdrawn");
//     //check user1 winnings
//     var depositBefore = await treasury.deposits.call(user1); 
//     await withdraw(user1);
//     var depositAfter = await treasury.deposits.call(user1); 
//     var winningsSentToUser = depositAfter - depositBefore;
//     var winningsShouldBe = ether('70');
//     var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
//     assert.isBelow(difference/winningsSentToUser,0.00001);
//     //check user2 winnings
//     var depositBefore = await treasury.deposits.call(user2); 
//     await withdraw(user2);
//     var depositAfter = await treasury.deposits.call(user2); 
//     var winningsSentToUser = depositAfter - depositBefore;
//     var winningsShouldBe = ether('42');
//     var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
//     assert.isBelow(difference/winningsSentToUser,0.00001);
//     // check random user can't withdraw
//     await expectRevert(realitycards.withdraw({ from: user6 }), "Paid no rent");
//     // check market pot is empty
//     var marketPot = await treasury.marketPot.call(realitycards.address);
//     assert.isBelow(Math.abs(marketPot.toString()),10);
//     // withdraw for next test
//     await withdrawDeposit(1000,user0);
//     await withdrawDeposit(1000,user1);
//     await withdrawDeposit(1000,user2);
//     });

// it('test circuitBreaker less than 1 month', async () => {
//     /////// SETUP //////
//     await depositDai(1000,user0);
//     await newRental(1,0,user0); // collected 28
//     await time.increase(time.duration.weeks(3));
//     // exit all, progress time so marketLockingTime in the past
//     await realitycards.exitAll({from: user0});
//     await time.increase(time.duration.years(1)); 
//     await realitycards.lockMarket(); 
//     await expectRevert(realitycards.circuitBreaker(), "Too early");
//     await time.increase(time.duration.weeks(3));
//     await realitycards.circuitBreaker();
//     // withdraw for next test
//     await withdrawDeposit(1000,user0);
//     });

// it('test NFT allocation after event- circuit breaker', async () => {
//     await depositDai(1000,user0);
//     await depositDai(1000,user1);
//     await depositDai(1000,user2);
//     await newRental(1,0,user0); 
//     await newRental(1,1,user1); 
//     await newRental(1,2,user2);
//     await time.increase(time.duration.weeks(1));
//     await newRental(2,0,user1); //user 1 winner
//     await time.increase(time.duration.weeks(2));
//     // exit all, progress time so marketLockingTime in the past
//     await realitycards.exitAll({from: user0});
//     await realitycards.exitAll({from: user1});
//     await realitycards.exitAll({from: user2});
//     await time.increase(time.duration.years(1)); 
//     ////////////////////////
//     await realitycards.lockMarket(); 
//     await time.increase(time.duration.weeks(2));
//     await realitycards.circuitBreaker();
//     var owner = await realitycards.ownerOf(0);
//     assert.equal(owner,user1);
//     var owner = await realitycards.ownerOf(1);
//     assert.equal(owner,user1);
//     var owner = await realitycards.ownerOf(2);
//     assert.equal(owner,user2);
//     var owner = await realitycards.ownerOf(5);
//     assert.equal(owner,realitycards.address);
//     await withdrawDeposit(1000,user0);
//     await withdrawDeposit(1000,user1);
//     await withdrawDeposit(1000,user2);
// });

it('check expected failures with market resolution: question not resolved but market ended', async () => {
    await depositDai(1000,user0);
    await newRental(1,0,user0); 
    await time.increase(time.duration.hours(1));
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await time.increase(time.duration.years(1)); 
    await realitycards.lockMarket(); 
    await expectRevert(realitycards.determineWinner(), "Oracle not resolved");
    await expectRevert(realitycards.withdraw(), "Incorrect state");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('newRental check failures', async () => {
    /////// SETUP //////
    user = user0;
    await depositDai(1000,user0);
    // check newRental stuff
    await expectRevert(realitycards.newRental(web3.utils.toWei('0.5', 'ether'),maxuint256,0,{ from: user}), "Minimum rental 1 Dai");
    await newRental(1,0,user0);
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),maxuint256,0,{ from: user}), "Price too low");
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),maxuint256,23,{ from: user}), "This token does not exist");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    });

it('check lockMarket cant be called too early', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await newRental(1,0,user0); 
    //// TESTS ////
    // call step 2 before step 1 done
    await expectRevert(realitycards.determineWinner(), "Incorrect state");
    //call step 1 before markets ended
    await expectRevert(realitycards.lockMarket(), "Market has not finished");
    await time.increase(time.duration.years(1)); 
    // // call step 1 after markets ended, should work
    await realitycards.lockMarket(); 
    // // call step 1 twice
    await expectRevert(realitycards.lockMarket(), "Incorrect state");
    // // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('check that _revertToPreviousOwner does not revert more than ten times ', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await depositDai(1000,user3);
    // get user 0 and 1 to rent it 4 times
    await newRental(1,0,user0); 
    await newRental(2,0,user1);
    await newRental(3,0,user0);
    await newRental(4,0,user1);
    // get user 2 and 3 to rent it more than ten times
    await newRental(5,0,user2);
    await newRental(6,0,user3);
    await newRental(7,0,user2);
    await newRental(8,0,user3);
    await newRental(9,0,user2);
    await newRental(10,0,user3);
    await newRental(20,0,user2);
    await newRental(30,0,user3);
    await newRental(40,0,user2);
    await newRental(50,0,user3);
    await newRental(60,0,user2);
    await newRental(70,0,user3);
    // make sure owned for at least an hour
    await time.increase(time.duration.hours(1)); 
    // user 2 and 3 exit, it should return to one of them NOT return to user 0 or 1 
    await realitycards.exit(0,{ from: user2 });
    await realitycards.exit(0,{ from: user3 });
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user3);
    var price = await realitycards.price.call(0);
    assert.equal(price, web3.utils.toWei('6', 'ether'));
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user3);
});

it('check that cannot rent a card if less than 1 hous rent', async () => {
    await depositDai(1,user0);
    await expectRevert(realitycards.newRental(web3.utils.toWei('150', 'ether'),maxuint256,2,{ from: user0}), "Insufficient deposit");
    });

it('test payRent/deposits after 0 mins, 5 mins, 15 mins, 20 mins', async () => {
    user = user0;
    await depositDai(144,user);
    await newRental(144,0,user);
    // 0 mins
    var deposit = await treasury.deposits.call(user); 
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
    // 5 mins
    await time.increase(time.duration.minutes(5));
    await realitycards.collectRentAllTokens(); 
    var deposit = await treasury.deposits.call(user); 
    assert.equal(deposit, web3.utils.toWei('143', 'ether')); 
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    var depositSpecificShouldBe = web3.utils.toWei('0.5', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01);
    // 15 mins
    await time.increase(time.duration.minutes(10));
    await realitycards.collectRentAllTokens(); 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('142.5', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/depositShouldBe,0.01);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    assert.equal(depositSpecific, 0);
    // 20 mins
    await time.increase(time.duration.minutes(5));
    await realitycards.collectRentAllTokens(); 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('142', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/depositShouldBe,0.01);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user,0);
    assert.equal(depositSpecific, 0);
    await withdrawDeposit(1000,user0);
});

it('check that users cannot transfer their NFTs until withdraw state', async() => {
    await rcfactory.approveOrUnapproveMarket(realitycards.address);
    user = user0;
    await depositDai(144,user);
    await newRental(1,2,user);
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner, user);
    // buidler giving me shit when I try and intercept revert message so just testing revert, in OPEN state
    await expectRevert(realitycards.transferFrom(user,user1,2), "Incorrect state");
    await expectRevert(realitycards.safeTransferFrom(user,user1,2), "Incorrect state");
    await expectRevert(realitycards.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")), "Incorrect state");
    await time.increase(time.duration.years(1)); 
    await realitycards.lockMarket();
    // should fail cos LOCKED
    await expectRevert(realitycards.transferFrom(user,user1,2), "Incorrect state");
    await expectRevert(realitycards.safeTransferFrom(user,user1,2), "Incorrect state");
    await expectRevert(realitycards.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")), "Incorrect state");
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    // // these shoudl all fail cos wrong owner:
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner, user);
    await expectRevert(realitycards.transferFrom(user,user1,2,{from: user1}), "Not owner");
    await expectRevert(realitycards.safeTransferFrom(user1,user1,2,{from: user1}), "Not owner");
    // these should not
    await realitycards.transferFrom(user,user1,2,{from: user});
    await realitycards.safeTransferFrom(user1,user,2,{from: user1});
  });

  it('make sure functions cant be called in the wrong state', async() => {
    user = user0;
    realitycards2 = realitycards; // cos later we will add realitycards2 back
    var state = await realitycards2.state.call();
    assert.equal(1,state);
    // currently in state 'OPEN' the following should all fail 
    await expectRevert(realitycards2.determineWinner(), "Incorrect state");
    await expectRevert(realitycards2.withdraw(), "Incorrect state");
    await expectRevert(realitycards2.payArtist(), "Incorrect state");
    await expectRevert(realitycards2.payMarketCreator(), "Incorrect state");
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Incorrect state");
    // increment state
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    var state = await realitycards2.state.call();
    assert.equal(2,state);
    // currently in state 'LOCKED' the following should all fail 
    await expectRevert(realitycards2.collectRentAllTokens(), "Incorrect state");
    await expectRevert(realitycards2.newRental(0,maxuint256,0), "Incorrect state");
    await expectRevert(realitycards2.exit(0), "Incorrect state");
    await expectRevert(realitycards2.rentAllCards(), "Incorrect state");
    await expectRevert(realitycards2.sponsor({value: 3}), "Incorrect state");
    await expectRevert(realitycards2.payArtist(), "Incorrect state");
    await expectRevert(realitycards2.payMarketCreator(), "Incorrect state");
    await expectRevert(realitycards2.payCardSpecificAffiliate(), "Incorrect state");
    // increment state
    await realitio.setResult(1);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    var state = await realitycards2.state.call();
    assert.equal(3,state);
    // currently in state 'WITHDRAW' the following should all fail 
    await expectRevert(realitycards2.lockMarket(), "Incorrect state");
    await expectRevert(realitycards2.determineWinner(), "Incorrect state");
    await expectRevert(realitycards2.collectRentAllTokens(), "Incorrect state");
    await expectRevert(realitycards2.newRental(0,maxuint256,0), "Incorrect state");
    await expectRevert(realitycards2.exit(0), "Incorrect state");
    await expectRevert(realitycards2.sponsor({value: 3}), "Incorrect state");
  });

it('check oracleResolutionTime and marketLockingTime expected failures', async () => {
    // someone else deploys question to realitio
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
    var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
    var timeout = 86400;
    var templateId = 2;
    var artistAddress = user8;
    var affiliateAddress = user8;
    var eventDetails = ['RCToken','y']; 
    // resolution time before locking, expect failure
    var oracleResolutionTime = 69419;
    var marketLockingTime = 69420; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress,affiliateAddress,cardRecipients, question,eventDetails), "Invalid timestamps");
    // resolution time > 1 weeks after locking, expect failure
    var oracleResolutionTime = 604810;
    var marketLockingTime = 0; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress, affiliateAddress,cardRecipients, question,eventDetails), "Invalid timestamps");
    // resolution time < 1 week  after locking, no failure
    var oracleResolutionTime = 604790;
    var marketLockingTime = 0; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var eventDetails = ['RCToken','z']; 
    await rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress, affiliateAddress,cardRecipients, question,eventDetails);
    // same time, no failure
    var oracleResolutionTime = 0;
    var marketLockingTime = 0; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var eventDetails = ['RCToken','a']; 
    await rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress, affiliateAddress,cardRecipients, question,eventDetails);
  });

  it('test longestTimeHeld & longestOwner', async () => {
    await depositDai(10,user0);
    await newRental(1,2,user0);
    // await newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),user0 ); 
    await time.increase(time.duration.days(1)); 
    await realitycards.collectRentAllTokens();
    var maxTimeHeld = await realitycards.longestTimeHeld(2);
    var maxTimeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(maxTimeHeld.toString() - maxTimeHeldShouldBe.toString());
    assert.isBelow(difference/maxTimeHeld,0.0001);
    var longestOwner = await realitycards.longestOwner(2);
    var longestOwnerShouldBe = user0;
    assert.equal(longestOwner, longestOwnerShouldBe);
    // try again new owner
    await depositDai(10,user1);
    await newRental(2,2,user1);
    // await newRental(web3.utils.toWei('2', 'ether'),2,web3.utils.toWei('10', 'ether'),user1 ); 
    await time.increase(time.duration.days(2));
    await realitycards.collectRentAllTokens();
    var maxTimeHeld = await realitycards.longestTimeHeld(2);
    var maxTimeHeldShouldBe = time.duration.days(2);
    var difference = Math.abs(maxTimeHeld.toString() - maxTimeHeldShouldBe.toString());
    assert.isBelow(difference/maxTimeHeld,0.0001);
    var longestOwner = await realitycards.longestOwner(2);
    var longestOwnerShouldBe = user1;
    assert.equal(longestOwner, longestOwnerShouldBe);
  });

it('test NFT allocation after event- winner', async () => {
    await rcfactory.approveOrUnapproveMarket(realitycards.address);
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await newRental(1,0,user0); 
    await newRental(1,1,user1); 
    await newRental(1,2,user2);
    await time.increase(time.duration.weeks(1));
    await newRental(2,0,user1); //user 1 winner
    await time.increase(time.duration.weeks(2));
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await realitycards.exitAll({from: user1});
    await realitycards.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    ////////////////////////
    await realitycards.lockMarket(); 
    // set winner
    await realitio.setResult(0);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user1);
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner,user2);
    var owner = await realitycards.ownerOf(5);
    assert.equal(owner,realitycards.address);
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});


it('check that card specific deposit is only allocated once', async () => {
    await depositDai(1000,user0);
    await newRental(144,0,user0);
    // check user 0 has 1 card specific deposit
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user0,0);
    var depositSpecificShouldBe = web3.utils.toWei('1', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01);
    // repeat, should now be 2, not or 1 (i.e. unchaged)
    await newRental(288,0,user0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user0,0);
    var depositSpecificShouldBe = web3.utils.toWei('2', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01)
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('check card specific deposit is removed when there is a new renter', async () => {
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRental(144,0,user0);
    // check user 0 has 1 card specific deposit
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user0,0);
    var depositSpecificShouldBe = web3.utils.toWei('1', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01);
    // user 1 rents, check user 0 now has zero deposit and user1 has 2
    await newRental(288,0,user1);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user0,0);
    assert.equal(depositSpecific,0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user1,0);
    var depositSpecificShouldBe = web3.utils.toWei('2', 'ether');
    var difference = Math.abs(depositSpecific.toString()-depositSpecificShouldBe.toString());
    assert.isBelow(difference/depositSpecificShouldBe,0.01);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('test exit but then can rent again', async () => {
    // setup
    await depositDai(144,user0);
    await depositDai(144,user1);
    await newRental(10,0,user0);
    await newRental(144,0,user1);
    await time.increase(time.duration.hours(1)); 
    await realitycards.collectRentAllTokens();
    // exit, ownership reverts back to 1
    await realitycards.exit(0,{ from: user1 });
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user0);
    // user1 rents again should be new owner
    await newRental(144,0,user1);
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user1);
    await time.increase(time.duration.hours(1)); 
    await realitycards.collectRentAllTokens();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user1);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test _revertToPreviousOwner will not revert to user if exit flag set', async () => {
    // setup
    await depositDai(144,user0);
    await depositDai(144,user1);
    await depositDai(144,user2);
    await newRental(100,0,user0);
    await newRental(144,0,user1);
    await newRental(288,0,user2);
    // user 1 exits
    await realitycards.exit(0,{ from: user1 });
    // user 2 should still own
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user2);
    // user 2 has enough for 12 hours, so go 13 hours and check user0 owns it
    await time.increase(time.duration.hours(13)); 
    await realitycards.collectRentAllTokens();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user0);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test _revertToPreviousOwner will revert properly if current owner has deposit but previous owner does not', async () => {
    // setup
    await depositDai(144,user0);
    await depositDai(144,user1);
    await depositDai(144,user2);
    await newRental(72,0,user0);
    await newRental(144,0,user1);
    // 20 mins pass so card speciifc used, then withdraw the rest for user1
    await time.increase(time.duration.minutes(20)); 
    await newRental(288,0,user2)
    await withdrawDeposit(1000,user1);
    // check that user 1 has zero deposit
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user1,0);
    assert.equal(depositSpecific,0);
    var deposit = await treasury.deposits.call(user1); 
    assert.equal(deposit,0);
    // pass an hour and then exit so user 2 has insufficinet card deposit but there is still some, should return to zero
    await time.increase(time.duration.days(3)); 
    await realitycards.exit(0,{ from: user2 });
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user0);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('test marketOpeningTime stuff', async () => {
    await depositDai(144,user0);
    // // check that state is 1 if marketopening time in the past
    var realitycards2 = await createMarketCustomeTimestamps(100,100,100);
    var state = await realitycards2.state();
    assert.equal(state,1);
    var latestTime = await time.latest();
    var oneMonth = new BN('2592000');
    var oneYear = new BN('31104000');
    var oneMonthInTheFuture = oneMonth.add(latestTime);
    var oneYearInTheFuture = oneYear.add(latestTime);
    var realitycards3 = await createMarketCustomeTimestamps2(oneMonthInTheFuture,oneYearInTheFuture,oneYearInTheFuture);
    // check that if in the future, state 0 originally
    // just use the default realitycards
    var state = await realitycards3.state();
    assert.equal(state,0);
    // check newRental fails because incorrect state
    await expectRevert(realitycards3.newRental(web3.utils.toWei('150', 'ether'),maxuint256,2,{ from: user0}), "Incorrect state");
    // advance time so its in the past, should work
    await time.increase(time.duration.weeks(8)); 
    await realitycards3.newRental(web3.utils.toWei('150', 'ether'),maxuint256,2,{ from: user0})
    // check that it won't increment state twice
    await realitycards3.newRental(web3.utils.toWei('200', 'ether'),maxuint256,2,{ from: user0})
    var state = await realitycards3.state();
    assert.equal(state,1);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('check that non markets cannot call market only functions on Treasury', async () => {
    await expectRevert(treasury.allocateCardSpecificDeposit(user0,user0,0,0), "Not authorised");
    await expectRevert(treasury.payRent(user0,user0,0,0), "Not authorised");
    await expectRevert(treasury.payout(user0,0), "Not authorised");
    await expectRevert(treasury.payCurrentOwner(user0,user0,0), "Not authorised");
});

it('check that sending ether direct is the same as a deposit', async () => {
    await treasury.send(1);
    var deposit = await treasury.deposits.call(user0); 
    assert.equal(deposit,1);
});

it('check that ownership can not be changed unless correct owner, treasury and factory', async() => {
    await expectRevert(rcfactory.transferOwnership(user1,{from: user1}), "caller is not the owner");
    await expectRevert(treasury.transferOwnership(user1,{from: user1}), "caller is not the owner");
    // check that works fine if owner
    await rcfactory.transferOwnership(user1,{from: user0});
    await treasury.transferOwnership(user1,{from: user0});
    // check that ownership changed
    var newOwner = await rcfactory.owner.call();
    assert.equal(newOwner, user1);
    var newOwner = await treasury.owner.call();
    assert.equal(newOwner, user1);
  });

  it('check renounce ownership works, treasury and factory', async() => {
    await expectRevert(rcfactory.renounceOwnership({from: user1}), "caller is not the owner");
    await expectRevert(treasury.renounceOwnership({from: user1}), "caller is not the owner");
    // check that works fine if owner
    await rcfactory.renounceOwnership({from: user0});
    await treasury.renounceOwnership({from: user0});
    // check that ownership changed
    var newOwner = await rcfactory.owner.call();
    assert.equal(newOwner, 0);
    var newOwner = await treasury.owner.call();
    assert.equal(newOwner, 0);
  });

it('test timeHeldLimit', async() => {
    await depositDai(144,user0);
    await depositDai(144,user1);
    // first: check timeHeldLimit cant be below ten mins
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),'500',0,{ from: user0}), "Limit too low");
    // second: limit is below rent owed and below total deposit
    // rent a card for one day only
    await newRentalCustomTimeLimit(1,1,0,user0);
    await newRentalCustomTimeLimit(5,1,0,user1);
    // do a minor interval to check it isnt reverting yet
    await time.increase(time.duration.hours(11));
    await realitycards.collectRentAllTokens();
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    await time.increase(time.duration.weeks(10));
    await realitycards.collectRentAllTokens();
    // check that only owned for 1 day
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // check they paid 5 dai
    var collected = await realitycards.collectedPerUser(user1);
    var collectedShouldBe = web3.utils.toWei('5', 'ether');
    var difference = Math.abs(collected.toString() - collectedShouldBe.toString()); 
    assert.isBelow(difference/collected,0.001);
    // check that it reverted
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user0);
    // third: deposit is below rent owed and below limit
    await depositDai(144,user2);
    await depositDai(144,user3);
    await newRentalCustomTimeLimit(1,1,1,user2);
    await newRentalCustomTimeLimit(144,100,1,user3);
    await time.increase(time.duration.days(2));
    await realitycards.collectRentAllTokens();
    // check that only owned for 1 day
    var timeHeld = await realitycards.timeHeld.call(1, user3);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // check that it reverted
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user2);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test timeHeldLimit failures both newRental and updateTimeHeldLimit', async() => {
    await depositDai(144,user0);
    await depositDai(144,user1);
    // first: check timeHeldLimit cant be below ten mins
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),'500',0,{ from: user0}), "Limit too low");
    // change divisor and check it still gives the same error, set to 1 min and try 50 seconds
    await treasury.updateMinRental(1440);
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),'50',0,{ from: user0}), "Limit too low");
    // but 70 second should work
    await realitycards.newRental(web3.utils.toWei('1', 'ether'),'70',0);
    // same thing with updateeTimeHeld
    await expectRevert(realitycards.updateTimeHeldLimit(50,0,{ from: user0}), "Limit too low");
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test winner/withdraw, recreated without exit', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    // rent losing teams
    await newRentalCustomTimeLimit(1,28,0,user0); // collected 28
    await newRentalCustomTimeLimit(2,28,1,user1); // collected 56
    // rent winning team
    await newRental(1,2,user0); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRental(2,2,user1); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalCustomTimeLimit(3,14,2,user2); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    ////////////////////////
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards.withdraw({ from: user6 }), "Not a winner");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test timeHeldLimit using updateTimeHeldLimit', async() => {
    await depositDai(144,user0);
    await depositDai(144,user1);
    // first: check timeHeldLimit cant be below ten mins
    await expectRevert(realitycards.updateTimeHeldLimit('500',0,{ from: user0}), "Limit too low");
    // second: limit is below rent owed and below total deposit
    // rent a card for one day only
    await newRental(1,0,user0);
    await realitycards.updateTimeHeldLimit(86400,0,{from: user0});
    await newRental(5,0,user1);
    await realitycards.updateTimeHeldLimit(86400,0,{from: user1});
    // do a minor interval to check it isnt reverting yet
    await time.increase(time.duration.hours(11));
    await realitycards.collectRentAllTokens();
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    await time.increase(time.duration.weeks(10));
    await realitycards.collectRentAllTokens();
    // check that only owned for 1 day
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // check they paid 5 dai
    var collected = await realitycards.collectedPerUser(user1);
    var collectedShouldBe = web3.utils.toWei('5', 'ether');
    var difference = Math.abs(collected.toString() - collectedShouldBe.toString()); 
    assert.isBelow(difference/collected,0.001);
    // check that it reverted
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user0);
    // third: deposit is below rent owed and below limit
    await depositDai(144,user2);
    await depositDai(144,user3);
    await newRentalCustomTimeLimit(1,1,1,user2);
    await newRentalCustomTimeLimit(144,100,1,user3);
    await time.increase(time.duration.days(2));
    await realitycards.collectRentAllTokens();
    // check that only owned for 1 day
    var timeHeld = await realitycards.timeHeld.call(1, user3);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // check that it reverted
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user2);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});


it('test newRentalWithDeposit', async() => {
    // var amount = web3.utils.toWei('144', 'ether')
    await newRentalWithDeposit(144,0,user0,144);
    // check that rent worked
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user0);
    // check deposits are correct
    var deposit = await treasury.deposits.call(user0)
    var depositShouldBe = web3.utils.toWei('143', 'ether');
    assert.equal(deposit,depositShouldBe);
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user0,0);
    assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
});

it('test winner/withdraw recreated using newRentalWithDeposit', async () => {
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDeposit(1,0,user0,144); // collected 28
    // await realitycards.newRentalWithDeposit(web3.utils.toWei('1', 'ether'),maxuint256,0,{from: user0, value: web3.utils.toWei('144', 'ether')}); // collected 28
    await newRentalWithDeposit(2,1,user1,144);
    // await realitycards.newRentalWithDeposit(web3.utils.toWei('2', 'ether'),maxuint256,1,{from: user1, value: web3.utils.toWei('144', 'ether')}); // collected 52
    // rent winning
    await newRentalWithDeposit(1,2,user0,144);
    // await realitycards.newRentalWithDeposit(web3.utils.toWei('1', 'ether'),maxuint256,2,{from: user0, value: web3.utils.toWei('144', 'ether')}); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDeposit(2,2,user1,144);
    // await realitycards.newRentalWithDeposit(web3.utils.toWei('2', 'ether'),maxuint256,2,{from: user1, value: web3.utils.toWei('144', 'ether')}); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDeposit(3,2,user2,144);
    // await realitycards.newRentalWithDeposit(web3.utils.toWei('3', 'ether'),maxuint256,2,{from: user2, value: web3.utils.toWei('144', 'ether')}); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await realitycards.exitAll({from: user1});
    await realitycards.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards.lockMarket(); 
    // // set winner 1
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    ////////////////////////
    var totalCollected = await realitycards.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await withdraw(user0);
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(withdraw(user0), "Already withdrawn");
    //check user1 winnings
    var depositBefore = await treasury.deposits.call(user1); 
    await withdraw(user1);
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('7')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user2 winnings
    var depositBefore = await treasury.deposits.call(user2); 
    await withdraw(user2);
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('147').mul(new BN('14')).div(new BN('28'));
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards.withdraw({ from: user6 }), "Not a winner");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test winner/withdraw with invalid market and artist and creator fees', async () => {
    // 6% artist 4% creator but invalid so 0% creator
    await rcfactory.updatePotDistribution(60,0,40,0,100);
    var realitycards2 = await createMarketWithArtistSet();
    /////// SETUP //////
    // var amount = web3.utils.toWei('144', 'ether')
    // var price = web3.utils.toWei('1', 'ether')
    // rent losing
    await newRentalWithDepositCustomContract(realitycards2,1,0,user0,144); // collected 28
    await newRentalWithDepositCustomContract(realitycards2,2,1,user1,144); // collected 52
    // rent winning
    await newRentalWithDepositCustomContract(realitycards2,1,2,user0,144); // collected 7
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,2,2,user1,144); // collected 14
    await time.increase(time.duration.weeks(1));
    await newRentalWithDepositCustomContract(realitycards2,3,2,user2,144); // collected 42
    await time.increase(time.duration.weeks(2)); 
    // exit all, progress time so marketLockingTime in the past
    await realitycards2.exitAll({from: user0});
    await realitycards2.exitAll({from: user1});
    await realitycards2.exitAll({from: user2});
    await time.increase(time.duration.years(1)); 
    // winner 1: 
    // totalcollected = 147, 
    // total days = 28 
    // user 0 owned for 7 days
    // user 1 owned for 7 days
    // user 2 owned for 14 days
    ////////////////////////
    await realitycards2.lockMarket(); 
    // // set winner 1
    await realitio.setResult(69);
    var depositCreatorBefore = await treasury.deposits.call(user0);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    await realitycards2.payArtist();
    await expectRevert(realitycards2.payMarketCreator(), "No winner");
    var depositCreatorAfter = await treasury.deposits.call(user0);
    // check that artist fees are correct shold be 147 * .06 = 8.82 
    var depositArtist = await treasury.deposits.call(user8); 
    var depositArtistShouldBe = web3.utils.toWei('8.82', 'ether');
    var difference = Math.abs(depositArtist.toString() - depositArtistShouldBe.toString());
    assert.isBelow(difference/depositArtist,0.00001);
    // check that creator fees are zero
    var depositCreator = depositCreatorAfter - depositCreatorBefore; 
    assert.equal(depositCreator,0);
    ////////////////////////
    var totalCollected = await realitycards2.totalCollected.call();
    var totalCollectedShouldBe = web3.utils.toWei('147', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
    // eremaining pot is 132.3 which is 10% less as this is what is given to artists and creators
    // //check user0 winnings
    var depositBefore = await treasury.deposits.call(user0); 
    await realitycards2.withdraw({from: user0} );
    var depositAfter = await treasury.deposits.call(user0); 
    var winningsSentToUser = depositAfter - depositBefore;
    // usually 35 so should be 35 * .94 = 32.9
    var winningsShouldBe = ether('32.9');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    //check user0 cant withdraw again
    await expectRevert(realitycards2.withdraw({from: user0} ), "Already withdrawn");
    // usually 70 so should be 70 * .94 = 65.8
    var depositBefore = await treasury.deposits.call(user1); 
    await realitycards2.withdraw({from: user1} );
    var depositAfter = await treasury.deposits.call(user1); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('65.8');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // usually 42 so should be 70 * .94 = 39.48
    var depositBefore = await treasury.deposits.call(user2); 
    await realitycards2.withdraw({from: user2} );
    var depositAfter = await treasury.deposits.call(user2); 
    var winningsSentToUser = depositAfter - depositBefore;
    var winningsShouldBe = ether('39.48');
    var difference = Math.abs(winningsSentToUser.toString() - winningsShouldBe.toString());
    assert.isBelow(difference/winningsSentToUser,0.00001);
    // check random user can't withdraw
    await expectRevert(realitycards2.withdraw({ from: user6 }), "Paid no rent");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user8);
});

it('test updateMaxContractBalance function and deposit limit hit', async () => {
    // change deposit balance limit to 500 ether
    await treasury.updateMaxContractBalance(web3.utils.toWei('500', 'ether'));
    // 400 should work
    await depositDai(400,user0);
    // another 400 should not
    await expectRevert(treasury.deposit(user0,{value: web3.utils.toWei('500', 'ether')}), "Limit hit");
});

it('test addOrRemoveGovernor and updateMarketCreationGovernorsOnly', async () => {
    // check user1 cant create market
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user8;
    var eventDetails = ['x','y'];
    await rcfactory.updateMarketCreationGovernorsOnly();
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails,{from: user1}), "Not approved");
    // first check that only owner can call
    await expectRevert(rcfactory.addOrRemoveGovernor(user1,{from: user1}), "caller is not the owner");
    // add user1 to whitelist 
    await rcfactory.addOrRemoveGovernor(user1);
    //try again, should work
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails,{from: user1});
    // remove them, should fail again
    await rcfactory.addOrRemoveGovernor(user1);
    await expectRevert(rcfactory.addOrRemoveGovernor(user1,{from: user1}), "caller is not the owner");
    // disable whitelist, should work
    await rcfactory.updateMarketCreationGovernorsOnly();
    var eventDetails = ['x','z'];
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails,{from: user1});
    // re-enable whitelist, should not work again
    await rcfactory.updateMarketCreationGovernorsOnly();
    await expectRevert(rcfactory.addOrRemoveGovernor(user1,{from: user1}), "caller is not the owner"); 
});

it('test rentAllCards', async () => {
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRental(10,0,user1);
    await realitycards.rentAllCards();
    for (i = 0; i < 20; i++) {
        var owner = await realitycards.ownerOf.call(i);
        assert.equal(owner, user0);
    }
    // check price
    var price = await realitycards.price.call(0);
    assert.equal(price, web3.utils.toWei('11', 'ether'));
    for (i = 1; i < 20; i++) {
        var price = await realitycards.price.call(i);
        assert.equal(price, web3.utils.toWei('1', 'ether'));
    }
    // withdraw
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test hot potato mode fundamentals', async () => {
    var realitycards2 = await createMarketCustomMode(2);
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(0.5,user1);
    // user0 rents
    await newRentalCustomContract(realitycards2,1,0,user0);
    // check user 1 cant rent cos not enough deposted
    await expectRevert(newRentalCustomContract(realitycards2,2,0,user1), "Insufficient deposit");
    // user 1 rents properly this time
    await depositDai(999.5,user1);
    var depositBefore = await treasury.deposits.call(user0);
    await newRentalCustomContract(realitycards2,2,0,user1);
    // check user 0 has extra 1 xdai
    var depositAfter = await treasury.deposits.call(user0); 
    var paymentSentToUser = depositAfter - depositBefore;
    // on 1 xdai price deposit specific is 0.00694 which is also returned, so add this to what payment should be
    var paymentSentToUserShouldBe = web3.utils.toWei('1.00694', 'ether');
    var difference = Math.abs(paymentSentToUser.toString()-paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.0001);
    // try again user 1
    var depositBefore = await treasury.deposits.call(user1);
    // user 1 rents
    await newRentalCustomContract(realitycards2,500,0,user0); 
    // check user 1 has 2 extra xdai
    var depositAfter = await treasury.deposits.call(user1); 
    var paymentSentToUser = depositAfter - depositBefore;
    // on 1 xdai price deposit specific is 0.00694 which is also returned, so add this to what payment should be
    var paymentSentToUserShouldBe = web3.utils.toWei('2.01388', 'ether');
    var difference = Math.abs(paymentSentToUser.toString()-paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.00001);
    // try again once more for luck
    var depositBefore = await treasury.deposits.call(user0);
    // user 1 rents
    await newRentalCustomContract(realitycards2,600,0,user1); 
    // check user 1 has 500 extra xdai
    var depositAfter = await treasury.deposits.call(user0); 
    var paymentSentToUser = depositAfter - depositBefore;
    // on 1 xdai price deposit specific is 3.472 which is also returned, so add this to what payment should be
    var paymentSentToUserShouldBe = web3.utils.toWei('503.472222', 'ether');
    var difference = Math.abs(paymentSentToUser.toString()-paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.0001);
    // check user2 cant take it off them cos insufficient deposit
    await depositDai(500,user2);
    await expectRevert(newRentalCustomContract(realitycards2,700,0,user2), "Insufficient deposit");
    // withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
  });

it('test auto lock', async () => {
    await depositDai(1000,user0);
    await newRental(1,0,user0);
    // check state 1
    var state = await realitycards.state.call();
    assert.equal(1,state);
    // increment 11 months, rent, should be state 1 still
    await time.increase(time.duration.weeks(51));
    await newRental(2,0,user0);
    // check state 1
    var state = await realitycards.state.call();
    assert.equal(1,state);
    // increment 2 months, rent, should be state 2 still
    await time.increase(time.duration.weeks(2));
    await newRental(3,0,user0);
    // check state 1
    var state = await realitycards.state.call();
    assert.equal(2,state);
    // withdraw for next test
    await withdrawDeposit(1000,user0);
});

it('test sponsor via market creation', async () => {
    await rcfactory.updateSponsorshipRequired(ether('200'));
    await rcfactory.addOrRemoveGovernor(user3);
    await expectRevert(createMarketWithArtistAndCardAffiliatesAndSponsorship(100,user3), "Insufficient sponsorship");
    var realitycards2 = await createMarketWithArtistAndCardAffiliatesAndSponsorship(200,user3);
    var totalCollected = await realitycards2.totalCollected();
    var totalCollectedShouldBe = web3.utils.toWei('200', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
});

it('ensure only factory can add markets', async () => {
    await expectRevert(treasury.addMarket(user3), "Not factory");
});

it('test updateHotPotatoPayment', async () => {
    var realitycards2 = await createMarketCustomMode(2);
    // first check only owner is set
    await expectRevert(treasury.updateHotPotatoPayment(7*24, {from: user1}), "caller is not the owner");
    await treasury.updateHotPotatoPayment(7*24, {from: user0});
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRentalCustomContract(realitycards2,24,0,user0); 
    var depositBefore = await treasury.deposits.call(user0);
    await newRentalCustomContract(realitycards2,590,0,user1);
    var depositAfter = await treasury.deposits.call(user0);
    var paymentSentToUser = depositAfter - depositBefore;
    // should be 1 ether sent via mode 2 and extra 24/(24*6) = 0.1666 from specific returned 
    var paymentSentToUserShouldBe = ether('1.166667');
    var difference = Math.abs(paymentSentToUser.toString() - paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.001);
//   withdraw for next test
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('check onlyOwner is on relevant Treasury functions', async () => {
    await expectRevert(treasury.updateHotPotatoPayment(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(treasury.updateMinRental(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(treasury.updateMaxContractBalance(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(treasury.setGlobalPause({from: user1}), "caller is not the owner");
    await expectRevert(treasury.pauseMarket(realitycards.address,{from: user1}), "caller is not the owner");
});

// it('check onlyOwner is on relevant Factory functions', async () => {
//     await expectRevert(rcfactory.updatePotDistribution(0,0,0,0,0, {from: user1}), "caller is not the owner");
//     await expectRevert(rcfactory.addOrRemoveGovernor(user0, {from: user1}), "caller is not the owner");
//     await expectRevert(rcfactory.updateMarketCreationGovernorsOnly({from: user1}), "caller is not the owner");
//     await expectRevert(rcfactory.updateSponsorshipRequired(7*24, {from: user1}), "caller is not the owner");
//     await expectRevert(rcfactory.approveOrUnapproveMarket(user0, {from: user1}), "Not approved");
//     await expectRevert(rcfactory.updateMinimumPriceIncrease(4, {from: user1}), "caller is not the owner");
//     await expectRevert(rcfactory.burnCardsIfUnapproved({from: user1}), "caller is not the owner");
//     await expectRevert(rcfactory.updateAdvancedWarning({from: user1}), "caller is not the owner");
// });

it('test updateMinimumPriceIncrease', async () => {
    var realitycards2 = await createMarketCustomMode(0);
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRentalCustomContract(realitycards2,1,0,user0); 
    // 5% increase, should fail
    await expectRevert(newRentalCustomContract(realitycards2,1.05,0,user1), "Price too low");
    // update min to 5%, try again
    await rcfactory.updateMinimumPriceIncrease(5);
    var realitycards3 = await createMarketCustomMode2(0);
    await newRentalCustomContract(realitycards3,1.05,0,user1);
    // check rent all cards works
    await realitycards3.rentAllCards({from:user0});
    var price = await realitycards3.price(0);
    var priceShouldBe = ether('1.1025');
    assert.equal(price.toString(),priceShouldBe.toString());
});

it('test uberOwner Treasury', async () => {
    // market creation shit
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var eventDetails = ['x','r'];
    // first, change owner
    await treasury.changeUberOwner(user5);
    // now try and change again and change factory from prevous owner, should fail
    await expectRevert(treasury.changeUberOwner(user0), "Access denied");
    await expectRevert(treasury.setFactoryAddress(user0), "Access denied");
    // deploy new factory, update address
    rcfactory2 = await RCFactory.new(treasury.address);
    await treasury.setFactoryAddress(rcfactory2.address,{from: user5});
    await rcfactory2.setReferenceContractAddress(rcreference.address);
    await rcfactory2.updateOracleProxyXdaiAddress(xdaiproxy.address);
    // create market with old factory, should fail
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails), "Not factory");
    // create market with new factory and do some standard stuff
    await xdaiproxy.setFactoryAddress(rcfactory2.address);
    var eventDetails = ['x','a'];
    await rcfactory2.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails);
    var marketAddress = await rcfactory2.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    await depositDai(144,user3);
    await newRentalCustomContract(realitycards2,144,4,user3);
    var price = await realitycards2.price.call(4);
    assert.equal(price, web3.utils.toWei('144', 'ether'));
    // check that the original market still works
    await newRental(69,4,user3);
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('69', 'ether'));
});

it('test uberOwner factory', async () => {
    // market creation shit
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    // first, change owner
    await rcfactory.changeUberOwner(user5);
    // now try and change again and change reference from prevous owner, should fail
    await expectRevert(rcfactory.changeUberOwner(user0), "Access denied");
    await expectRevert(rcfactory.setReferenceContractAddress(user0), "Access denied");
    // deploy new reference, update address
    rcreference2 = await RCMarket2.new();
    await rcfactory.setReferenceContractAddress(rcreference2.address, {from: user5});
    // check version has increased 
    var version = await rcfactory.referenceContractVersion.call();
    assert.equal(version,2);
    // deploy new market from new reference contract, check that price is doubling
    var eventDetails = ['x','z'];
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails);
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    await depositDai(144,user3);
    await newRentalCustomContract(realitycards2,144,4,user3);
    var price = await realitycards2.price.call(4);
    assert.equal(price, web3.utils.toWei('288', 'ether'));
    // check that the original market still works
    await newRental(69,4,user3);
    var price = await realitycards.price.call(4);
    assert.equal(price, web3.utils.toWei('69', 'ether'));
});

it('test RCOracleProxyXdai', async () => {
    // check reverts on owned functions
    await expectRevert(xdaiproxy.setOracleProxyMainnetAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setBridgeXdaiAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setFactoryAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.amicableResolution(user0, 3, {from: user1}), "caller is not the owner");
    // check reverts on other functions 
    await expectRevert(xdaiproxy.sendQuestionToBridge(user0, "x", 0), "Not factory");
    await expectRevert(xdaiproxy.setWinner(user0, 0), "Not bridge");
    await expectRevert(xdaiproxy.getWinner(user0), "Not finalised");
    // test changing mainnet proxy
    mainnetproxy2 = await MainnetProxy2.new(bridge.address, realitio.address);
    await xdaiproxy.setOracleProxyMainnetAddress(mainnetproxy2.address);
    await mainnetproxy2.setOracleProxyXdaiAddress(xdaiproxy.address);
    await bridge.setOracleProxyMainnetAddress(mainnetproxy2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio.setResult(2);
    // should be 69 even though 2 was set
    await mainnetproxy2.getWinnerFromOracle(realitycards2.address);
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket(); 
    await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner,69);
    // test changing bridge, bridge should now have number = 69
    bridge2 = await BridgeMockup2.new();
    await xdaiproxy.setBridgeXdaiAddress(bridge2.address);
    await createMarketWithArtistSet2();
    var number = await bridge2.number();
    assert.equal(number,69);
    // setFactoryAddress is already tested in test uberOwner Treasury
});

// it('test RCOracleProxyMainnet various', async () => {
//     // check reverts on owned functions
//     await expectRevert(mainnetproxy.setOracleProxyXdaiAddress(user0, {from: user1}), "caller is not the owner");
//     await expectRevert(mainnetproxy.setBridgeMainnetAddress(user0, {from: user1}), "caller is not the owner");
//     await expectRevert(mainnetproxy.setRealitioAddress(user0, {from: user1}), "caller is not the owner");
//     await expectRevert(mainnetproxy.setArbitrator(user0, {from: user1}), "caller is not the owner");
//     await expectRevert(mainnetproxy.setTimeout(user0, {from: user1}), "caller is not the owner");
//     await expectRevert(mainnetproxy.postQuestionToOracleAdmin(user0,"x",0, {from: user1}), "caller is not the owner");
//     // check reverts on other functions 
//     await expectRevert(mainnetproxy.postQuestionToOracle(user0, "x", 0), "Not bridge");
//     // test changing xdai proxy
//     var xdaiproxy2 = await XdaiProxy2.new(bridge.address, rcfactory.address);
//     await xdaiproxy2.setOracleProxyMainnetAddress(mainnetproxy.address);
//     await xdaiproxy2.setBridgeXdaiAddress(bridge.address);
//     await xdaiproxy2.setFactoryAddress(rcfactory.address);
//     await mainnetproxy.setOracleProxyXdaiAddress(xdaiproxy2.address);
//     await bridge.setOracleProxyXdaiAddress(xdaiproxy2.address);
//     await rcfactory.updateOracleProxyXdaiAddress(xdaiproxy2.address);
//     realitycards2 = await createMarketWithArtistSet();
//     await realitio.setResult(2);
//     // should be 4 even though 2 was set
//     await mainnetproxy.getWinnerFromOracle(realitycards2.address);
//     await time.increase(time.duration.years(1)); 
//     await realitycards2.lockMarket(); 
//     await realitycards2.determineWinner();
//     var winner = await realitycards2.winningOutcome();
//     assert.equal(winner,4);
//     // test changing setBridgeMainnetAddress
//     await mainnetproxy.setBridgeMainnetAddress(user0);
//     var newproxy = await mainnetproxy.bridge.call();
//     assert.equal(newproxy,user0)
    
// });

it('test RCOracleProxyMainnet, various 2', async () => {
    // change relaitio, winner should return 69
    realitio2 = await RealitioMockup2.new();
    await mainnetproxy.setRealitioAddress(realitio2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio2.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket(); 
    await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner,69);
    // change arbitrator
    await mainnetproxy.setArbitrator(user0);
    var newarb = await mainnetproxy.arbitrator.call();
    assert.equal(newarb,user0)
    // change timeout
    await mainnetproxy.setTimeout(69);
    var newtime = await mainnetproxy.timeout.call();
    assert.equal(newtime,69)
});

it('test postQuestionToOracleAdmin', async () => {
    // first, check it cant be called cos already posted
    await expectRevert(mainnetproxy.postQuestionToOracleAdmin(realitycards.address,"x",0),"Already posted");
    // fuck up the bridge and post a new market
    await bridge.setOracleProxyMainnetAddress(user0);
    realitycards2 = await createMarketWithArtistSet();
    await mainnetproxy.postQuestionToOracleAdmin(realitycards2.address,"x",0)
    await realitio.setResult(2);
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // bridge still fucked so should think not resolved
    await expectRevert(realitycards2.determineWinner(),"Oracle not resolved");
    // fix bridge, should work
    await bridge.setOracleProxyMainnetAddress(mainnetproxy.address);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome.call();
    assert.equal(winner,2)
});

it('test postQuestionToOracleAdmin', async () => {
    // first, check it cant be called cos already posted
    await expectRevert(mainnetproxy.postQuestionToOracleAdmin(realitycards.address,"x",0),"Already posted");
    // fuck up the bridge and post a new market
    await bridge.setOracleProxyMainnetAddress(user0);
    realitycards2 = await createMarketWithArtistSet();
    await mainnetproxy.postQuestionToOracleAdmin(realitycards2.address,"x",0)
    await realitio.setResult(2);
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // bridge still fucked so should think not resolved
    await expectRevert(realitycards2.determineWinner(),"Oracle not resolved");
    // fix bridge, should work
    await bridge.setOracleProxyMainnetAddress(mainnetproxy.address);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome.call();
    assert.equal(winner,2)
});

it('test approveOrUnapproveMarket', async () => {
    // first, check that recent market is hidden
    var hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden,false);
    // atttempt to unhide it with someone not on the whitelist
    await expectRevert(rcfactory.approveOrUnapproveMarket(realitycards.address, {from: user1}), "Not approved");
    // add user 1 and try again, check that its not hidden
    await rcfactory.addOrRemoveGovernor(user1);
    await rcfactory.approveOrUnapproveMarket(realitycards.address, {from: user1});
    hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden,true);
    // hide it again, then check that cards are burnt
    await rcfactory.approveOrUnapproveMarket(realitycards.address, {from: user1});
    hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden,false);
    // await depositDai(100,user0);
    // await newRental(1,0,user0);
    await realitio.setResult(2);
    await time.increase(time.duration.years(1));
    await realitycards.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.determineWinner();
    for (i = 0; i < 20; i++) {
        await expectRevert(realitycards.ownerOf.call(i), "owner query for nonexistent token");
    }
    // new market, dont approve it, but switch burnIfUnapproved to false
    realitycards2 = await createMarketWithArtistSet();
    hidden = await rcfactory.isMarketApproved.call(realitycards2.address);
    assert.equal(hidden,false);
    await rcfactory.burnCardsIfUnapproved();
    var burnIfHidden = await rcfactory.burnIfUnapproved.call();
    assert.equal(burnIfHidden,false);
    await time.increase(time.duration.years(1));
    await realitycards2.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await realitycards2.determineWinner();
    for (i = 0; i < 20; i++) {
        await realitycards2.ownerOf.call(i);
    }
});

it('test duplicate slug', async () => {
    // first, check that recent market is hidden
    createMarketWithArtistSet();
    await expectRevert(createMarketWithArtistSet(), "Duplicate slug");
});

it('check cant rent or deposit if globalpause', async () => {
    // setup
    await treasury.setGlobalPause();
    await expectRevert(depositDai(144,user0), "Deposits are disabled");
    await expectRevert(newRental(144,0,user1), "Rentals are disabled");
});

it('check cant rent if market paused', async () => {
    // setup
    await treasury.pauseMarket(realitycards.address);
    depositDai(144,user0);
    await expectRevert(newRental(144,0,user1), "Rentals are disabled");
});

it('test amicableResolution', async () => {
    // normal setup, dont call the bridge, see if payout works
    await time.increase(time.duration.years(1)); 
    await expectRevert(xdaiproxy.amicableResolution(realitycards.address,2, {from: user1}), "caller is not the owner");
    await xdaiproxy.amicableResolution(realitycards.address,2);
    await realitycards.lockMarket();
    await realitycards.determineWinner();
    var winner = await realitycards.winningOutcome();
    assert.equal(winner,2);
    // new market, resolve the normal way, check cant use amicableResolution
    var realitycards2 = await createMarketWithArtistSet();
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await expectRevert(xdaiproxy.amicableResolution(realitycards.address,2),"Event finalised");
});

it('test advancedWarning', async () => {
    await rcfactory.updateAdvancedWarning(86400);
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var eventDetails = ['x','r'];
    // opening time zero, should fail
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails),"Market opening time not set");
    // opening time not 1 day in the future, should fail
    var timestamps = [latestTime,marketLockingTime,oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails),"Market opens too soon");
    var twoDays = new BN('172800');
    var twoDaysInTheFuture = twoDays.add(latestTime);
    // opening time 2 days in the future, should not fail
    var timestamps = [twoDaysInTheFuture,marketLockingTime,oracleResolutionTime];
    rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,eventDetails);
});

});

