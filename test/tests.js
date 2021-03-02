const { assert } = require('hardhat');
const {
  BN,
  expectRevert,
  ether,
  expectEvent,
  balance,
  time
} = require('@openzeppelin/test-helpers');

// main contracts
var RCFactory = artifacts.require('./RCFactory.sol');
var RCTreasury = artifacts.require('./RCTreasury.sol');
var RCMarket = artifacts.require('./RCMarket.sol');
var NftHubXDai = artifacts.require('./nfthubs/RCNftHubXdai.sol');
var NftHubMainnet = artifacts.require('./nfthubs/RCNftHubMainnet.sol');
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyXdai.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyMainnet.sol');
// mockups
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");
var BridgeMockup = artifacts.require("./mockups/BridgeMockup.sol");
var AlternateReceiverBridgeMockup = artifacts.require("./mockups/AlternateReceiverBridgeMockup.sol");
var SelfDestructMockup = artifacts.require("./mockups/SelfDestructMockup.sol");
var DaiMockup = artifacts.require("./mockups/DaiMockup.sol");
// redeploys
var RCFactory2 = artifacts.require('./RCFactoryV2.sol');
var MainnetProxy2 = artifacts.require('./mockups/redeploys/RCProxyMainnetV2.sol');
var XdaiProxy2 = artifacts.require('./mockups/redeploys/RCProxyXdaiV2.sol');
var RCMarket2 = artifacts.require('./mockups/redeploys/RCMarketXdaiV2.sol');
var BridgeMockup2 = artifacts.require('./mockups/redeploys/BridgeMockupV2.sol');
var RealitioMockup2 = artifacts.require("./mockups/redeploys/RealitioMockupV2.sol");

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('RealityCardsTests', (accounts) => {

  var realitycards;
  var tokenURIs = ['x','x','x','uri','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x','x']; // 20 tokens
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
  user9 = accounts[9];
  andrewsAddress = accounts[9];
  // throws a tantrum if cardRecipients is not outside beforeEach for some reason
  var zeroAddress = '0x0000000000000000000000000000000000000000';
  var cardRecipients = ['0x0000000000000000000000000000000000000000'];

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
    // nft hubs
    nfthubxdai = await NftHubXDai.new(rcfactory.address);
    nfthubmainnet = await NftHubMainnet.new();
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(rcfactory.address);
    await rcfactory.setReferenceContractAddress(rcreference.address);
    await rcfactory.setNftHubAddress(nfthubxdai.address, 0);
    // mockups 
    realitio = await RealitioMockup.new();
    bridge = await BridgeMockup.new();
    alternateReceiverBridge = await AlternateReceiverBridgeMockup.new();
    dai = await DaiMockup.new();
    // bridge contracts
    xdaiproxy = await XdaiProxy.new(bridge.address, rcfactory.address, treasury.address);
    mainnetproxy = await MainnetProxy.new(bridge.address, realitio.address, nfthubmainnet.address, alternateReceiverBridge.address, dai.address);
    // tell the factory, mainnet proxy and bridge the xdai proxy address
    await rcfactory.setProxyXdaiAddress(xdaiproxy.address);
    await mainnetproxy.setProxyXdaiAddress(xdaiproxy.address);
    await bridge.setProxyXdaiAddress(xdaiproxy.address);
    // tell the xdai proxy, nft mainnet hub and bridge the mainnet proxy address
    await xdaiproxy.setProxyMainnetAddress(mainnetproxy.address);
    await bridge.setProxyMainnetAddress(mainnetproxy.address);
    await nfthubmainnet.setProxyMainnetAddress(mainnetproxy.address);
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
    await rcfactory.addOrRemoveArtist(user8);
    var affiliateAddress = user7;
    await rcfactory.addOrRemoveAffiliate(user7);
    var slug = 'y';
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    // artist and affiliate already approved from createMarketWithArtistSet
    var slug = 'z';
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    var slug = 'y';
    await rcfactory.createMarket(
        mode,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    var slug = 'z';
    await rcfactory.createMarket(
        mode,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    await rcfactory.addOrRemoveCardAffiliate(user5);
    await rcfactory.addOrRemoveCardAffiliate(user6);
    await rcfactory.addOrRemoveCardAffiliate(user7);
    await rcfactory.addOrRemoveCardAffiliate(user8);
    await rcfactory.addOrRemoveCardAffiliate(user0);
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var slug = 'y';
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    await rcfactory.addOrRemoveAffiliate(user7);
    await rcfactory.addOrRemoveArtist(user8);
    var slug = 'y';
    await rcfactory.createMarket(
        mode,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    await rcfactory.addOrRemoveCardAffiliate(user5);
    await rcfactory.addOrRemoveCardAffiliate(user6);
    await rcfactory.addOrRemoveCardAffiliate(user7);
    await rcfactory.addOrRemoveCardAffiliate(user8);
    await rcfactory.addOrRemoveCardAffiliate(user0);
    await rcfactory.addOrRemoveAffiliate(user7);
    await rcfactory.addOrRemoveArtist(user8);
    var slug = 'y';
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    var slug = 'y';
    var cardRecipients = [user5,user6,user7,user8,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0];
    await rcfactory.addOrRemoveCardAffiliate(user5);
    await rcfactory.addOrRemoveCardAffiliate(user6);
    await rcfactory.addOrRemoveCardAffiliate(user7);
    await rcfactory.addOrRemoveCardAffiliate(user8);
    await rcfactory.addOrRemoveCardAffiliate(user0);
    await rcfactory.addOrRemoveAffiliate(user7);
    await rcfactory.addOrRemoveArtist(user8);
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question, {value: amount, from: user}
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomeTimestamps(marketOpeningTime,marketLockingTime,oracleResolutionTime) {
    var artistAddress = user8;
    await rcfactory.addOrRemoveArtist(user8);
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
    var slug = 'y';
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
      );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomeTimestamps2(marketOpeningTime,marketLockingTime,oracleResolutionTime) {
    var artistAddress = user8;
    // await rcfactory.addOrRemoveArtist(user8);
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
    var slug = 'z';
    await rcfactory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardRecipients,
        question,
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
    await realitycards.newRental(price,0,zeroAddress,outcome,{ from: user});
  }

  async function newRentalWithStartingPosition(price, outcome, position, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price,0,position,outcome,{ from: user});
  }

  async function newRentalWithDeposit(price, outcome, user, dai) {
    price = web3.utils.toWei(price.toString(), 'ether');
    dai = web3.utils.toWei(dai.toString(), 'ether');
    await realitycards.newRental(price,0,zeroAddress,outcome,{ from: user, value: dai});
  }

  async function newRentalCustomContract(contract, price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await contract.newRental(price,maxuint256.toString(),zeroAddress,outcome,{ from: user});
  }

  async function newRentalWithDepositCustomContract(contract, price, outcome, user, dai) {
    price = web3.utils.toWei(price.toString(), 'ether');
    dai = web3.utils.toWei(dai.toString(), 'ether');
    await contract.newRental(price,maxuint256.toString(),zeroAddress,outcome,{ from: user, value: dai});
  }

  async function newRentalCustomTimeLimit(price, timelimit, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price,(timelimit*3600*24).toString(),zeroAddress,outcome,{ from: user});
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
    var name = await nfthubxdai.name.call();
    assert.equal(name, 'RealityCards');
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
    assert.equal(deposit, web3.utils.toWei('144', 'ether'));
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    var owner = await realitycards.ownerOf.call(4);
    assert.equal(owner, user);
    // withdraw
    await time.increase(time.duration.minutes(10));
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user);
   });
  
it('test various after collectRent', async () => {
    // setup
    user = user0;
    await depositDai(100,user);
    await newRental(1,4,user);
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user);
});

// test collectRent again, but this time it should foreclose, does it?
it('collectRent function with foreclose and revertPreviousOwner', async () => {
    // setup
    await depositDai(6,user0);
    await newRental(1,1,user0);
    await depositDai(10,user1);
    await newRental(2,1,user1);
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllCards();
    // check reverted
    var owner = await realitycards.ownerOf.call(1);
    assert.equal(owner, user0);
    var price = await realitycards.price.call(1);
    assert.equal(price, web3.utils.toWei('1', 'ether'));
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
    // u2 3 days
    var timeHeld = await realitycards.timeHeld.call(0, user2);
    var timeHeldShouldBe = time.duration.days(3);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,4);
    await time.increase(time.duration.days(3));
    await realitycards.collectRentAllCards();
    // u2 one more day
    var timeHeld = await realitycards.timeHeld.call(0, user2);
    var timeHeldShouldBe = time.duration.days(4);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,2);
    await time.increase(time.duration.days(3));
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
    var timeHeld = await realitycards.timeHeld.call(0, user5);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    await time.increase(time.duration.days(7));
    await realitycards.collectRentAllCards();
    // u0 8 days
    var timeHeld = await realitycards.timeHeld.call(0, user0);
    var timeHeldShouldBe = time.duration.days(10);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    await time.increase(time.duration.days(9));
    await realitycards.collectRentAllCards();
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
    assert.equal(deposit, web3.utils.toWei('144', 'ether')); 
    // withdraw half
    var balanceBefore = await web3.eth.getBalance(user);
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(72,user);
    // check deposit balances 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('72', 'ether');
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
    assert.equal(deposit, 0); 
    // check withdrawn amounts 
    var balanceAfter = await web3.eth.getBalance(user);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var depositWithdrawnShouldBe = web3.utils.toWei('72', 'ether');
    var difference = Math.abs(depositWithdrawn.toString()-depositWithdrawnShouldBe.toString());
    assert.isBelow(difference/depositWithdrawnShouldBe,0.00001);
});

it('test withdrawDeposit- multiple markets', async () => {
    user = user0;
    await depositDai(10,user);
    await newRental(144,0,user);
    //second market
    realitycards2 = await createMarketWithArtistSet();
    await realitycards2.newRental(web3.utils.toWei('288', 'ether'),maxuint256,zeroAddress,0,{ from: user});
    // withdraw all, should be 3 left therefore only withdraw 7
    var balanceBefore = await web3.eth.getBalance(user);
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user);
    var balanceAfter = await web3.eth.getBalance(user);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var depositWithdrawnShouldBe = web3.utils.toWei('10', 'ether');
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
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
    var timeHeld = await realitycards.timeHeld.call(0, user1);
    var timeHeldShouldBe = time.duration.hours(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference,4);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

    it('test exit- reduce rental time to one min', async () => {
        // this has been gimped due to removing card specific deposit, a lot of this likely makes no sense now
        // check function is owned to change limit
        await expectRevert(treasury.setMinRental(12,{from: user1}), "caller is not the owner");
        // change to one min
        await treasury.setMinRental(1440);
        await depositDai(144,user0);
        await depositDai(144,user1);
        await newRental(10,0,user0);
        await newRental(144,0,user1);
        await time.increase(time.duration.seconds(30)); 
        await realitycards.collectRentAllCards();
        // user 1 should be owner, held for 30 secs
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user1);
        var timeHeld = await realitycards.timeHeld.call(0, user1);
        var timeHeldShouldBe = time.duration.seconds(30);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference,5);
        // call exit, user 0 should own
        await realitycards.exit(0,{ from: user1 });
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        // increase by 90 secs, user 0 will own and u1 should have ten minutes ownership time
        await time.increase(time.duration.seconds(90)); 
        await realitycards.collectRentAllCards();
        var owner = await realitycards.ownerOf.call(0);
        assert.equal(owner, user0);
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.seconds(92);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        assert.isBelow(difference/timeHeldShouldBe,0.012);
        // to be safe, chcek that u0 has owned for 1 min
        await realitycards.collectRentAllCards();
        var timeHeld = await realitycards.timeHeld.call(0, user0);
        var timeHeldShouldBe = time.duration.seconds(92);
        var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
        // 0.1 cos we're dealing with individual seconds and indivdiual calls take a few seconds so 
        // more time has elapsed than the 90 that was set above
        assert.isBelow(difference/timeHeldShouldBe,0.15); 
        // withdraw for next test
        await time.increase(time.duration.minutes(10));
        await withdrawDeposit(1000,user0);
        await withdrawDeposit(1000,user1);
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
        await time.increase(time.duration.minutes(10));
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
    // await realitycards.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test winner/withdraw mode 0- with artist/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(60,0,40,0,100);
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user8);
});

it('test winner/withdraw mode 0- with artist/winner/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(60,100,40,0,100);
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user8);
});

it('test winner/withdraw mode 0- with artist/affiliate/winner/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(60,100,40,100,100);
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test winner/withdraw mode 1- with artist/creator cut', async () => {
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(60,43,40,0,100);
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
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
    // await realitycards2.determineWinner();
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
    for (i = 0; i < 20; i++) {
        await realitycards2.payCardAffiliate(i);
        }
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
    // check cant call payCardAffiliate() twice
    for (i = 0; i < 20; i++) {
        await expectRevert(realitycards2.payCardAffiliate(i), "Card affiliate already paid");
    }
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
    });

it('test winner/withdraw mode 0 with artist/creator/card affiliate cut', async () => {
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(60,0,40,0,100);
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
    // await realitycards2.determineWinner();
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
for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    // check cant call payCardAffiliate() twice
for (i = 0; i < 20; i++) {
    await expectRevert(realitycards2.payCardAffiliate(i), "Card affiliate already paid");
}
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
});

it('test winner/withdraw mode 0- with artist/winner/creator/card affiliate cut', async () => {
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(60,100,40,0,100);
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
    // await realitycards2.determineWinner();
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
     for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
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
    // await realitycards.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
  });

it('test sponsor with card affiliate cut', async () => {
    // 10% card specific affiliates
    await rcfactory.setPotDistribution(0,0,0,0,100);
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
    // await realitycards2.determineWinner();
    // token 0
     for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('test sponsor via market creation with card affiliate cut', async () => {
    // 10% card specific affiliates
    await rcfactory.setPotDistribution(0,0,0,0,100);
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
    // await realitycards2.determineWinner();
    // token 0
for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    await time.increase(time.duration.minutes(10));
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
    // await realitycards.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user3);
  });


it('test sponsor- invalid with card affiliate cut', async () => {
    // 10% card specific affiliates
    await rcfactory.setPotDistribution(0,0,0,0,100);
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
    // await realitycards2.determineWinner();
    // token 0
for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    await time.increase(time.duration.minutes(10));
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
    // await realitycards.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

it('test withdraw- invalid mode 0- with artist/creator cut', async () => {
    /////// SETUP //////
    // 6% artist 4% creator
    await rcfactory.setPotDistribution(50,62,20,0,100);
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

    it('test withdraw- invalid mode 0- with artist/affiliate/creator cut', async () => {
        /////// SETUP //////
        // 6% artist 4% creator
        await rcfactory.setPotDistribution(50,62,20,100,100);
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
        // await realitycards2.determineWinner();
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
        await time.increase(time.duration.minutes(10));
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

    it('test withdraw- invalid mode 1- with artist/creator cut', async () => {
        /////// SETUP //////
        // 6% artist 4% creator
        await rcfactory.setPotDistribution(50,13,20,0,100);
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
        // await realitycards2.determineWinner();
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
        await time.increase(time.duration.minutes(10));
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
    // await realitycards2.determineWinner();
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
for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
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
    await rcfactory.setPotDistribution(50,13,20,0,100);
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
    // await realitycards2.determineWinner();
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
for (i = 0; i < 20; i++) {
    await realitycards2.payCardAffiliate(i);
    }
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
    // check market pot is empty
    var marketPot = await treasury.marketPot.call(realitycards2.address);
    assert.isBelow(Math.abs(marketPot.toString()),10);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
    });

it('test circuitBreaker', async () => {
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
    await time.increase(time.duration.weeks(24));
    await realitycards.circuitBreaker(); 
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    });

it('test circuitBreaker less than 3 months', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await newRental(1,0,user0); // collected 28
    await time.increase(time.duration.weeks(3));
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await time.increase(time.duration.years(1)); 
    await realitycards.lockMarket(); 
    await expectRevert(realitycards.circuitBreaker(), "Too early");
    await time.increase(time.duration.weeks(13));
    await realitycards.circuitBreaker();
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    });

it('test NFT allocation after event- circuit breaker', async () => {
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
    await time.increase(time.duration.weeks(12));
    await realitycards.circuitBreaker();
    await realitycards.claimCard(0,{from: user1})
    await realitycards.claimCard(1,{from: user1})
    await expectRevert(realitycards.claimCard(2,{from: user1}),"Not longest owner");
    await realitycards.claimCard(2,{from: user2})
    await expectRevert(realitycards.claimCard(2,{from: user2}),"Already claimed");
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user1);
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner,user2);
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('check expected failures with market resolution: question not resolved but market ended', async () => {
    await depositDai(1000,user0);
    await newRental(1,0,user0); 
    await time.increase(time.duration.hours(1));
    // exit all, progress time so marketLockingTime in the past
    await realitycards.exitAll({from: user0});
    await time.increase(time.duration.years(1)); 
    await realitycards.lockMarket(); 
    await expectRevert(realitycards.setWinner(3), "Not proxy");
    await expectRevert(realitycards.withdraw(), "Incorrect state");
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
});

it('newRental check failures', async () => {
    /////// SETUP //////
    user = user0;
    await depositDai(1000,user0);
    // check newRental stuff
    await expectRevert(realitycards.newRental(web3.utils.toWei('0.5', 'ether'),maxuint256,zeroAddress,0,{ from: user}), "Minimum rental 1 xDai");
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),maxuint256,zeroAddress,23,{ from: user}), "This token does not exist");
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    });

it('check lockMarket cant be called too early', async () => {
    /////// SETUP //////
    await depositDai(1000,user0);
    await newRental(1,0,user0); 
    //// TESTS ////
    //call step 1 before markets ended
    await expectRevert(realitycards.lockMarket(), "Market has not finished");
    await time.increase(time.duration.years(1)); 
    // // call step 1 after markets ended, should work
    await realitycards.lockMarket(); 
    // // call step 1 twice
    await expectRevert(realitycards.lockMarket(), "Incorrect state");
    // // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
});

it('check that _revertToUnderbidder does not revert more than ten times ', async () => {
    user9 = accounts[9];
    user10 = accounts[10];
    user11 = accounts[11];
    user12 = accounts[12];
    user13 = accounts[13];
    user14 = accounts[14];
    //
    // console.log(user0); 
    // console.log(user1);
    // console.log(user2);
    // console.log(user3); 
    // console.log(user4);
    // console.log(user5);
    // console.log(user6); 
    // console.log(user7);
    // console.log(user8);
    // console.log(user9); 
    // console.log(user10);
    // console.log(user11);
    // console.log(user12); 
    // console.log(user13);
    // console.log(user14);
    /////// SETUP //////
    // console.log(realitycards.address);
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await depositDai(1000,user3);
    await depositDai(1000,user4);
    await depositDai(1000,user5);
    await depositDai(1000,user6);
    await depositDai(1000,user7);
    await depositDai(1000,user8);
    await depositDai(1000,user9);
    await depositDai(1000,user10);
    await depositDai(1000,user11);
    await depositDai(1000,user12);
    await depositDai(1000,user13);
    await depositDai(1000,user14);
    // everyone rents at the same price
    await newRental(10,0,user0); 
    await newRental(10,0,user1);
    await newRental(10,0,user2);
    await newRental(10,0,user3);
    await newRental(10,0,user4);
    await newRental(10,0,user5);
    await newRental(10,0,user6);
    await newRental(10,0,user7);
    await newRental(10,0,user8);
    await newRental(9,0,user9);
    await expectRevert(newRental(8,0,user10), "Location too high");
    await newRentalWithStartingPosition(7,0,user7,user10);
    await newRentalWithStartingPosition(6,0,user7,user11);
    await newRentalWithStartingPosition(5,0,user7,user12);
    await newRentalWithStartingPosition(4,0,user7,user13);
    await newRentalWithStartingPosition(3,0,user7,user14);
    // make sure owned for at least an hour
    await time.increase(time.duration.hours(1)); 
    // everyone withdraws deposit
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user3);
    await withdrawDeposit(1000,user4);
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user6);
    await withdrawDeposit(1000,user7);
    await withdrawDeposit(1000,user8);
    await withdrawDeposit(1000,user9);
    await withdrawDeposit(1000,user10);
    await withdrawDeposit(1000,user11);
    await withdrawDeposit(1000,user12);
    await withdrawDeposit(1000,user13);
    await withdrawDeposit(1000,user14);
    // collect rent, it should revert back 10 places
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user10);
    var price = await realitycards.price.call(0);
    assert.equal(price, web3.utils.toWei('7', 'ether'));
});

it('check that cannot rent a card if less than 1 hours rent', async () => {
    await depositDai(1,user0);
    await expectRevert(realitycards.newRental(web3.utils.toWei('150', 'ether'),maxuint256,zeroAddress,2,{ from: user0}), "Insufficient deposit");
    });

it('test payRent/deposits after 0 mins, 5 mins, 15 mins, 20 mins', async () => {
    user = user0;
    await depositDai(144,user);
    await newRental(144,0,user);
    // 0 mins
    var deposit = await treasury.deposits.call(user); 
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    assert.equal(deposit, web3.utils.toWei('144', 'ether')); 
    // 5 mins
    await time.increase(time.duration.minutes(5));
    await realitycards.collectRentAllCards(); 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('143.5', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/depositShouldBe,0.01);
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    // 15 mins
    await time.increase(time.duration.minutes(10));
    await realitycards.collectRentAllCards(); 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('142.5', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/depositShouldBe,0.01);
    // 20 mins
    await time.increase(time.duration.minutes(5));
    await realitycards.collectRentAllCards(); 
    var deposit = await treasury.deposits.call(user); 
    var depositShouldBe = web3.utils.toWei('142', 'ether');
    var difference = Math.abs(deposit.toString()-depositShouldBe.toString());
    assert.isBelow(difference/depositShouldBe,0.01);
    await time.increase(time.duration.minutes(10));
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
    await expectRevert(nfthubxdai.transferFrom(user,user1,2), "Incorrect state");
    await expectRevert(nfthubxdai.safeTransferFrom(user,user1,2), "Incorrect state");
    await expectRevert(nfthubxdai.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")), "Incorrect state");
    await time.increase(time.duration.years(1)); 
    await realitycards.lockMarket();
    // should fail cos LOCKED
    await expectRevert(nfthubxdai.transferFrom(user,user1,2), "Incorrect state");
    await expectRevert(nfthubxdai.safeTransferFrom(user,user1,2), "Incorrect state");
    await expectRevert(nfthubxdai.safeTransferFrom(user,user1,2,web3.utils.asciiToHex("123456789")), "Incorrect state");
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    // await realitycards.determineWinner();
    await realitycards.claimCard(2,{from:user});
    // these shoudl all fail cos wrong owner:
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner, user);
    await expectRevert(nfthubxdai.transferFrom(user,user1,2,{from: user1}), "Not owner");
    await expectRevert(nfthubxdai.safeTransferFrom(user1,user1,2,{from: user1}), "Not owner");
    // these should not
    await nfthubxdai.transferFrom(user,user1,2,{from: user});
    await nfthubxdai.safeTransferFrom(user1,user,2,{from: user1});
  });

  it('make sure functions cant be called in the wrong state', async() => {
    user = user0;
    realitycards2 = realitycards; // cos later we will add realitycards2 back
    var state = await realitycards2.state.call();
    assert.equal(1,state);
    // currently in state 'OPEN' the following should all fail 
    await expectRevert(realitycards2.withdraw(), "Incorrect state");
    await expectRevert(realitycards2.payArtist(), "Incorrect state");
    await expectRevert(realitycards2.payMarketCreator(), "Incorrect state");
    await expectRevert(realitycards2.payCardAffiliate(7), "Incorrect state");
    await expectRevert(realitycards2.claimCard(7), "Incorrect state");
    // increment state
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    var state = await realitycards2.state.call();
    assert.equal(2,state);
    // currently in state 'LOCKED' the following should all fail 
    await expectRevert(realitycards2.collectRentAllCards(), "Incorrect state");
    await expectRevert(realitycards2.newRental(0,maxuint256,zeroAddress,0), "Incorrect state");
    await expectRevert(realitycards2.exit(0), "Incorrect state");
    await expectRevert(realitycards2.sponsor({value: 3}), "Incorrect state");
    await expectRevert(realitycards2.payArtist(), "Incorrect state");
    await expectRevert(realitycards2.payMarketCreator(), "Incorrect state");
    await expectRevert(realitycards2.payCardAffiliate(8), "Incorrect state");
    // increment state
    await realitio.setResult(1);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    var state = await realitycards2.state.call();
    assert.equal(3,state);
    // currently in state 'WITHDRAW' the following should all fail 
    await expectRevert(realitycards2.lockMarket(), "Incorrect state");
    await expectRevert(realitycards2.setWinner(3), "Incorrect state");
    await expectRevert(realitycards2.collectRentAllCards(), "Incorrect state");
    await expectRevert(realitycards2.newRental(0,maxuint256,zeroAddress,0), "Incorrect state");
    await expectRevert(realitycards2.exit(0), "Incorrect state");
    await expectRevert(realitycards2.sponsor({value: 3}), "Incorrect state");
  });

it('check oracleResolutionTime and marketLockingTime expected failures', async () => {
    // someone else deploys question to realitio
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
    var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
    var timeout = 86400;
    var templateId = 2;
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var slug = 'y'; 
    // resolution time before locking, expect failure
    var oracleResolutionTime = 69419;
    var marketLockingTime = 69420; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress,affiliateAddress,cardRecipients, question), "Oracle resolution time error");
    // resolution time > 1 weeks after locking, expect failure
    var oracleResolutionTime = 604810;
    var marketLockingTime = 0; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress, affiliateAddress,cardRecipients, question), "Oracle resolution time error");
    // resolution time < 1 week  after locking, no failure
    var oracleResolutionTime = 604790;
    var marketLockingTime = 0; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var slug = 'z'; 
    await rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress, affiliateAddress,cardRecipients, question);
    // same time, no failure
    var oracleResolutionTime = 0;
    var marketLockingTime = 0; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var slug = 'a'; 
    await rcfactory.createMarket(0,'0x0',timestamps, tokenURIs, artistAddress, affiliateAddress,cardRecipients, question);
  });

  it('test longestTimeHeld & longestOwner', async () => {
    await depositDai(10,user0);
    await newRental(1,2,user0);
    // await newRental(web3.utils.toWei('1', 'ether'),2,web3.utils.toWei('10', 'ether'),user0 ); 
    await time.increase(time.duration.days(1)); 
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
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
    // await realitycards.determineWinner();
    await realitycards.claimCard(0,{from:user1});
    await realitycards.claimCard(1,{from:user1});
    await realitycards.claimCard(2,{from:user2});
    await expectRevert(realitycards.claimCard(2,{from:user2}),"Already claimed");
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user1);
    var owner = await realitycards.ownerOf(2);
    assert.equal(owner,user2);
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test exit but then can rent again', async () => {
    // setup
    await depositDai(144,user0);
    await depositDai(144,user1);
    await newRental(10,0,user0);
    await newRental(144,0,user1);
    await time.increase(time.duration.hours(1)); 
    await realitycards.collectRentAllCards();
    // exit, ownership reverts back to 1
    await realitycards.exit(0,{ from: user1 });
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user0);
    // user1 rents again should be new owner
    await newRental(144,0,user1);
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user1);
    await time.increase(time.duration.hours(1)); 
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user1);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
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
    // var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user1,0);
    // assert.equal(depositSpecific,0);
    var deposit = await treasury.deposits.call(user1); 
    assert.equal(deposit,0);
    // pass an hour and then exit so user 2 has insufficinet card deposit but there is still some, should return to zero
    await time.increase(time.duration.days(3)); 
    await realitycards.exit(0,{ from: user2 });
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner, user0);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
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
    await expectRevert(realitycards3.newRental(web3.utils.toWei('150', 'ether'),maxuint256,zeroAddress,2,{ from: user0}), "Incorrect state");
    // advance time so its in the past, should work
    await time.increase(time.duration.weeks(8)); 
    await realitycards3.newRental(web3.utils.toWei('150', 'ether'),maxuint256,zeroAddress,2,{ from: user0})
    // check that it won't increment state twice
    await realitycards3.newRental(web3.utils.toWei('200', 'ether'),maxuint256,zeroAddress,2,{ from: user0})
    var state = await realitycards3.state();
    assert.equal(state,1);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
});

it('check that non markets cannot call market only functions on Treasury', async () => {
    await expectRevert(treasury.payRent(user0,user0), "Not authorised");
    await expectRevert(treasury.payout(user0,0), "Not authorised");
    await expectRevert(treasury.updateUserBid(user0,0,0), "Not authorised");
    await expectRevert(treasury.sponsor(), "Not authorised");
    await expectRevert(treasury.processHarbergerPayment(user0,user0,0), "Not authorised");
    await expectRevert(treasury.updateLastRentalTime(user0), "Not authorised");
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
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),'500',zeroAddress,0,{ from: user0}), "Limit too low");
    // second: limit is below rent owed and below total deposit
    // rent a card for one day only
    await newRentalCustomTimeLimit(1,1,0,user0);
    await newRentalCustomTimeLimit(5,1,0,user1);
    // do a minor interval to check it isnt reverting yet
    await time.increase(time.duration.hours(11));
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    await time.increase(time.duration.weeks(10));
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
    // check that only owned for 1 day
    var timeHeld = await realitycards.timeHeld.call(1, user3);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // check that it reverted
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user2);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test timeHeldLimit failures both newRental and updateTimeHeldLimit', async() => {
    await depositDai(144,user0);
    await depositDai(144,user1);
    // first: check timeHeldLimit cant be below ten mins
    await expectRevert(realitycards.newRental(web3.utils.toWei('1', 'ether'),'500',zeroAddress,0,{ from: user0}), "Limit too low");
    // change divisor and check it still gives the same error, set to 1 min and try 50 seconds
    await treasury.setMinRental(1440);
    // new market
    var realitycards2 = await createMarketWithArtistSet();
    await expectRevert(realitycards2.newRental(web3.utils.toWei('1', 'ether'),'50',zeroAddress,0,{ from: user0}), "Limit too low");
    // but 70 second should work
    await realitycards2.newRental(web3.utils.toWei('1', 'ether'),'70',zeroAddress,0);
    // same thing with updateeTimeHeld
    await expectRevert(realitycards2.updateTimeHeldLimit(50,0,{ from: user0}), "Limit too low");
    await time.increase(time.duration.minutes(10));
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
    // await realitycards.determineWinner();
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
    await time.increase(time.duration.minutes(10));
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
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf(0);
    assert.equal(owner,user1);
    await time.increase(time.duration.weeks(10));
    await realitycards.collectRentAllCards();
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
    await realitycards.collectRentAllCards();
    // check that only owned for 1 day
    var timeHeld = await realitycards.timeHeld.call(1, user3);
    var timeHeldShouldBe = time.duration.days(1);
    var difference = Math.abs(timeHeld.toString() - timeHeldShouldBe.toString()); 
    assert.isBelow(difference/timeHeld,0.001);
    // check that it reverted
    var owner = await realitycards.ownerOf(1);
    assert.equal(owner,user2);
    // check that 0 is turned into max
    await newRental(1,1,user0);
    await realitycards.updateTimeHeldLimit(86400,1,{from: user0});
    var limit = await realitycards.orderbook.call(1,user0);
    assert.equal(limit[1],86400);
    await realitycards.updateTimeHeldLimit(0,1,{from: user0});
    var limit = await realitycards.orderbook.call(1,user0);
    assert.equal(limit[1],(2**128)-1);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
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
    var depositShouldBe = web3.utils.toWei('144', 'ether');
    assert.equal(deposit,depositShouldBe);
    marketAddress = await rcfactory.getMostRecentMarket.call(0);
    // var depositSpecific = await treasury.cardSpecificDeposits.call(marketAddress,user0,0);
    // assert.equal(depositSpecific, web3.utils.toWei('1', 'ether'));
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
    // await realitycards.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
});

it('test winner/withdraw with invalid market and artist and creator fees', async () => {
    // 6% artist 4% creator but invalid so 0% creator
    await rcfactory.setPotDistribution(60,0,40,0,100);
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
    // await realitycards2.determineWinner();
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user2);
    await withdrawDeposit(1000,user8);
});

it('test setMaxContractBalance function and deposit limit hit', async () => {
    // change deposit balance limit to 500 ether
    await treasury.setMaxContractBalance(web3.utils.toWei('500', 'ether'));
    // 400 should work
    await depositDai(400,user0);
    // another 400 should not
    await expectRevert(treasury.deposit(user0,{value: web3.utils.toWei('500', 'ether')}), "Limit hit");
});

it('test addOrRemoveGovernor and setMarketCreationGovernorsOnly', async () => {
    // check user1 cant create market
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture; 
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    // await rcfactory.setMarketCreationGovernorsOnly();
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,{from: user1}), "Not approved");
    // first check that only owner can call
    await expectRevert(rcfactory.addOrRemoveGovernor(user1,{from: user1}), "caller is not the owner");
    // add user1 to whitelist 
    await rcfactory.addOrRemoveGovernor(user1);
    //try again, should work
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,{from: user1});
    // remove them, should fail again
    await rcfactory.addOrRemoveGovernor(user1);
    await expectRevert(rcfactory.addOrRemoveGovernor(user1,{from: user1}), "caller is not the owner");
    // disable whitelist, should work
    await rcfactory.setMarketCreationGovernorsOnly();
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question,{from: user1});
    // re-enable whitelist, should not work again
    await rcfactory.setMarketCreationGovernorsOnly();
    await expectRevert(rcfactory.addOrRemoveGovernor(user1,{from: user1}), "caller is not the owner"); 
});

it('test rentAllCards', async () => {
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRental(10,0,user1);
    await realitycards.rentAllCards(web3.utils.toWei('100000', 'ether'));
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
    // sum of all prices is 19 + 11 = 30
    await expectRevert(realitycards.rentAllCards(web3.utils.toWei('25', 'ether')), "Prices too high"); 
    realitycards.rentAllCards(web3.utils.toWei('30', 'ether'));
    // withdraw
    await time.increase(time.duration.minutes(10));
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
    var paymentSentToUserShouldBe = web3.utils.toWei('1', 'ether');
    var difference = Math.abs(paymentSentToUser.toString()-paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.0001);
    // try again user 1
    var depositBefore = await treasury.deposits.call(user1);
    // user 1 rents
    await newRentalCustomContract(realitycards2,500,0,user0); 
    // check user 1 has 2 extra xdai
    var depositAfter = await treasury.deposits.call(user1); 
    var paymentSentToUser = depositAfter - depositBefore;
    var paymentSentToUserShouldBe = web3.utils.toWei('2', 'ether');
    var difference = Math.abs(paymentSentToUser.toString()-paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.0001);
    // try again once more for luck
    var depositBefore = await treasury.deposits.call(user0);
    // user 1 rents
    await newRentalCustomContract(realitycards2,600,0,user1); 
    // check user 1 has 500 extra xdai
    var depositAfter = await treasury.deposits.call(user0); 
    var paymentSentToUser = depositAfter - depositBefore;
    var paymentSentToUserShouldBe = web3.utils.toWei('500', 'ether');
    var difference = Math.abs(paymentSentToUser.toString()-paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.0001);
    // check user2 cant take it off them cos insufficient deposit
    await depositDai(500,user2);
    await expectRevert(newRentalCustomContract(realitycards2,700,0,user2), "Insufficient deposit");
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
});

it('test sponsor via market creation', async () => {
    await rcfactory.setSponsorshipRequired(ether('200'));
    await rcfactory.addOrRemoveGovernor(user3);
    await expectRevert(createMarketWithArtistAndCardAffiliatesAndSponsorship(100,user3), "Insufficient sponsorship");
    // undo approvals from the above as they are done again in following function
    await rcfactory.addOrRemoveArtist(user8);
    await rcfactory.addOrRemoveAffiliate(user7);
    await rcfactory.addOrRemoveCardAffiliate(user5);
    await rcfactory.addOrRemoveCardAffiliate(user6);
    await rcfactory.addOrRemoveCardAffiliate(user7);
    await rcfactory.addOrRemoveCardAffiliate(user8);
    await rcfactory.addOrRemoveCardAffiliate(user0);
    var realitycards2 = await createMarketWithArtistAndCardAffiliatesAndSponsorship(200,user3);
    var totalCollected = await realitycards2.totalCollected();
    var totalCollectedShouldBe = web3.utils.toWei('200', 'ether');
    var difference = Math.abs(totalCollected.toString()-totalCollectedShouldBe.toString());
    assert.isBelow(difference/totalCollected,0.00001);
});

it('ensure only factory can add markets', async () => {
    await expectRevert(treasury.addMarket(user3), "Not factory");
});

it('test setHotPotatoPayment', async () => {
    // first check only owner is set
    await expectRevert(rcfactory.setHotPotatoPayment(7*24, {from: user1}), "caller is not the owner");
    await rcfactory.setHotPotatoPayment(7*24, {from: user0});
    /////// SETUP //////
    var realitycards2 = await createMarketCustomMode(2);
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRentalCustomContract(realitycards2,24,0,user0); 
    var depositBefore = await treasury.deposits.call(user0);
    await newRentalCustomContract(realitycards2,590,0,user1);
    var depositAfter = await treasury.deposits.call(user0);
    var paymentSentToUser = depositAfter - depositBefore;
    var paymentSentToUserShouldBe = ether('1');
    var difference = Math.abs(paymentSentToUser.toString() - paymentSentToUserShouldBe.toString());
    assert.isBelow(difference/paymentSentToUser,0.001);
    // withdraw for next test
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user1);
});

it('check onlyOwner is on relevant Treasury functions', async () => {
    await expectRevert(treasury.setMaxContractBalance(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(treasury.setGlobalPause({from: user1}), "caller is not the owner");
    await expectRevert(treasury.setPauseMarket(realitycards.address,{from: user1}), "caller is not the owner");
});

it('check onlyOwner is on relevant Factory functions', async () => {
    await expectRevert(rcfactory.setPotDistribution(0,0,0,0,0, {from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.setHotPotatoPayment(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(treasury.setMinRental(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.addOrRemoveGovernor(user0, {from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.setMarketCreationGovernorsOnly({from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.setSponsorshipRequired(7*24, {from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.approveOrUnapproveMarket(user0, {from: user1}), "Not approved");
    await expectRevert(rcfactory.setMinimumPriceIncrease(4, {from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.setTrapCardsIfUnapproved({from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.setAdvancedWarning(23,{from: user1}), "caller is not the owner");
    await expectRevert(rcfactory.setMaximumDuration(23,{from: user1}), "caller is not the owner");
});

it('test setMinimumPriceIncrease', async () => {
    var realitycards2 = await createMarketCustomMode(0);
    /////// SETUP //////
    await depositDai(1000,user0);
    await depositDai(1000,user1);
    await newRentalCustomContract(realitycards2,1,0,user0); 
    // 5% increase, should not be owner
    await realitycards2.newRental(web3.utils.toWei('1.05', 'ether'),maxuint256,zeroAddress,0,{ from: user1});
    var owner = await realitycards2.ownerOf.call(0);
    assert.equal(user0, owner);
    // update min to 5%, try again
    await rcfactory.setMinimumPriceIncrease(5);
    var realitycards3 = await createMarketCustomMode2(0);
    await newRentalCustomContract(realitycards3,1,0,user0); 
    await realitycards3.newRental(web3.utils.toWei('1.05', 'ether'),maxuint256,zeroAddress,0,{ from: user1});
    var owner = await realitycards3.ownerOf.call(0);
    assert.equal(user1, owner);
    // check rent all cards works
    var price = await realitycards3.price(0);
    await realitycards3.rentAllCards(web3.utils.toWei('100', 'ether'),{from:user0});
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
    var slug = 'xr';
    // first, change owner
    await treasury.changeUberOwner(user5);
    // now try and change again and change factory from prevous owner, should fail
    await expectRevert(treasury.changeUberOwner(user0), "Verboten");
    await expectRevert(treasury.setFactoryAddress(user0), "Verboten");
    // deploy new factory, update address
    rcfactory2 = await RCFactory2.new(treasury.address);
    await rcfactory2.getAllMarkets(0);
    await rcfactory2.addOrRemoveCardAffiliate(user5);
    await rcfactory2.addOrRemoveCardAffiliate(user6);
    await rcfactory2.addOrRemoveCardAffiliate(user7);
    await rcfactory2.addOrRemoveCardAffiliate(user8);
    await rcfactory2.addOrRemoveCardAffiliate(user0);
    await treasury.setFactoryAddress(rcfactory2.address,{from: user5});
    await xdaiproxy.setFactoryAddress(rcfactory2.address);
    await nfthubxdai.setFactoryAddress(rcfactory2.address);
    await rcfactory2.setReferenceContractAddress(rcreference.address);
    await rcfactory2.setProxyXdaiAddress(xdaiproxy.address);
    // create market with old factory, should fail
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question), "Not factory");
    // create market with new factory and do some standard stuff
    // nfthubxdai = await NftHubXDai.new(rcfactory.address);
    await rcfactory2.setNftHubAddress(nfthubxdai.address, 100);
    await rcfactory2.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question);
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user3); 
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
    var cardRecipients = ['0x0000000000000000000000000000000000000000'];
    // first, change owner
    await rcfactory.changeUberOwner(user5);
    // now try and change again and change reference from prevous owner, should fail
    await expectRevert(rcfactory.changeUberOwner(user0), "Verboten");
    await expectRevert(rcfactory.setReferenceContractAddress(user0), "Verboten");
    // deploy new reference, update address
    rcreference2 = await RCMarket2.new();
    await rcfactory.setReferenceContractAddress(rcreference2.address, {from: user5});
    // check version has increased 
    var version = await rcfactory.referenceContractVersion.call();
    assert.equal(version,2);
    // deploy new market from new reference contract, check that price is doubling
    var slug = 'xq';
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question);
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
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user3); 
});

it('test RCProxyXdai', async () => {
    // check reverts on other functions 
    await expectRevert(xdaiproxy.saveQuestion(user0, "x", 0), "Not factory");
    await expectRevert(xdaiproxy.setWinner(user0, 0), "Not bridge");
    // test changing mainnet proxy
    mainnetproxy2 = await MainnetProxy2.new(bridge.address, realitio.address);
    await xdaiproxy.setProxyMainnetAddress(mainnetproxy2.address);
    await mainnetproxy2.setProxyXdaiAddress(xdaiproxy.address);
    await bridge.setProxyMainnetAddress(mainnetproxy2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio.setResult(2);
    // should be 69 even though 2 was set
    await time.increase(time.duration.years(1)); 
    await mainnetproxy2.getWinnerFromOracle(realitycards2.address);
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

it('check onlyOwner is on relevant xdai proxy functions', async () => {
    await expectRevert(xdaiproxy.setAmicableResolution(user0,3, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.withdrawFloat(3, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setValidator(user0, true, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setProxyMainnetAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setBridgeXdaiAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setFactoryAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(xdaiproxy.setTreasuryAddress(user0, {from: user1}), "caller is not the owner");
});

it('test RCProxyMainnet various', async () => {
    // check reverts on non owned functions 
    // await expectRevert(mainnetproxy.postQuestionToOracle(user0, "x", 0), "Not bridge");
    // test changing xdai proxy
    var xdaiproxy2 = await XdaiProxy2.new(bridge.address, rcfactory.address, treasury.address);
    await xdaiproxy2.setProxyMainnetAddress(mainnetproxy.address);
    await xdaiproxy2.setBridgeXdaiAddress(bridge.address);
    await xdaiproxy2.setFactoryAddress(rcfactory.address);
    await mainnetproxy.setProxyXdaiAddress(xdaiproxy2.address);
    await bridge.setProxyXdaiAddress(xdaiproxy2.address);
    await rcfactory.setProxyXdaiAddress(xdaiproxy2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio.setResult(2);
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket(); 
    // should be 4 even though 2 was set
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner,4);
    // test changing setBridgeMainnetAddress
    await mainnetproxy.setBridgeMainnetAddress(user0);
    var newproxy = await mainnetproxy.bridge.call();
    assert.equal(newproxy,user0);
 });

it('check onlyOwner is on relevant mainnet proxy functions', async () => {
    await expectRevert(mainnetproxy.setProxyXdaiAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setBridgeMainnetAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setNftHubAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setAlternateReceiverAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setDaiAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setRealitioAddress(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setArbitrator(user0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.setTimeout(1234, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.postQuestionToOracleAdmin(user0,"x",0, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.upgradeCardAdmin(3,"x",user4, {from: user1}), "caller is not the owner");
    await expectRevert(mainnetproxy.enableOrDisableDeposits({from: user1}), "caller is not the owner");
});

it('test RCProxyMainnet, various 2', async () => {
    // change relaitio, winner should return 69
    realitio2 = await RealitioMockup2.new();
    await mainnetproxy.setRealitioAddress(realitio2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio2.setResult(2);
    await time.increase(time.duration.years(1));
    await mainnetproxy.getWinnerFromOracle(realitycards2.address); 
    // await realitycards2.determineWinner();
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
    await bridge.setProxyMainnetAddress(user0);
    realitycards2 = await createMarketWithArtistSet();
    await mainnetproxy.postQuestionToOracleAdmin(realitycards2.address,"x",0)
    await realitio.setResult(2);
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // fix bridge, should work
    await bridge.setProxyMainnetAddress(mainnetproxy.address);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
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
    // hide it again, then check that cards cant be upgraded
    await rcfactory.approveOrUnapproveMarket(realitycards.address, {from: user1});
    hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden,false);
    await depositDai(100,user0);
    for (i = 0; i < 20; i++) {
        await newRental(1,i,user0);
    }
    await time.increase(time.duration.minutes(1));
    await realitycards.collectRentAllCards();
    await realitio.setResult(2);
    await time.increase(time.duration.years(1));
    await realitycards.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    // await realitycards.determineWinner();
    for (i = 0; i < 20; i++) {
        await realitycards.claimCard(i,{from:user0});
    }
    for (i = 0; i < 20; i++) {
        await expectRevert(realitycards.upgradeCard(i), "Upgrade blocked");
    }
    // new market, dont approve it, but switch setTrapCardsIfUnapproved to false
    realitycards2 = await createMarketWithArtistSet();
    await depositDai(100,user0);
    for (i = 0; i < 20; i++) {
        await newRentalCustomContract(realitycards2,1,i,user0);
    }
    await time.increase(time.duration.minutes(1));
    await realitycards2.collectRentAllCards();
    hidden = await rcfactory.isMarketApproved.call(realitycards2.address);
    assert.equal(hidden,false);
    await rcfactory.setTrapCardsIfUnapproved();
    var trapIfUnapproved = await rcfactory.trapIfUnapproved.call();
    assert.equal(trapIfUnapproved,false);
    await time.increase(time.duration.years(1));
    await realitycards2.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    for (i = 0; i < 20; i++) {
        await realitycards2.claimCard(i,{from:user0});
    }
    for (i = 0; i < 20; i++) {
        await realitycards2.upgradeCard(i);
    }
    await time.increase(time.duration.minutes(10));  
});

it('check cant rent or deposit if globalpause', async () => {
    // setup
    await depositDai(144,user0);
    await newRental(144,0,user0);
    await treasury.setGlobalPause();
    await expectRevert(depositDai(144,user0), "Deposits are disabled");
    await expectRevert(newRental(144,0,user1), "Rentals are disabled");
});

it('check cant rent if market paused', async () => {
    // setup
    await treasury.setPauseMarket(realitycards.address);
    depositDai(144,user0);
    // can still rent once
    await newRental(1,0,user0);
    await expectRevert(newRental(144,0,user0), "Rentals are disabled");
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user0);
});

it('test setAmicableResolution', async () => {
    // normal setup, dont call the bridge, see if payout works
    await time.increase(time.duration.years(1)); 
    await expectRevert(xdaiproxy.setAmicableResolution(realitycards.address,2, {from: user1}), "caller is not the owner");
    // first check that setWinner cannot be called directly
    await expectRevert(realitycards.setWinner(2), "Not proxy");
    await xdaiproxy.setAmicableResolution(realitycards.address,2);
    // cant call it again
    await expectRevert(realitycards.lockMarket(), "Incorrect state");
    // await realitycards.determineWinner();
    var winner = await realitycards.winningOutcome();
    assert.equal(winner,2);
    // new market, resolve the normal way, check cant use setAmicableResolution
    var realitycards2 = await createMarketWithArtistSet();
    await time.increase(time.duration.years(1)); 
    await realitycards2.lockMarket();
    await realitio.setResult(2);
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    await expectRevert(xdaiproxy.setAmicableResolution(realitycards.address,2),"Incorrect state");
});

it('test advancedWarning', async () => {
    await rcfactory.setAdvancedWarning(86400);
    var latestTime = await time.latest();
    var oneHour = new BN('3600');
    var oneYear = new BN('31104000');
    var oneHourInTheFuture = oneHour.add(latestTime);
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture; 
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    // opening time zero, should fail
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question),"Market opening time not set");
    // opening time not 1 day in the future, should fail
    var timestamps = [oneHourInTheFuture,marketLockingTime,oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question),"Market opens too soon");
    var twoDays = new BN('172800');
    var twoDaysInTheFuture = twoDays.add(latestTime);
    // opening time 2 days in the future, should not fail
    var timestamps = [twoDaysInTheFuture,marketLockingTime,oracleResolutionTime];
    rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question);
});

it('test NFT upgrade', async () => {
    await rcfactory.approveOrUnapproveMarket(realitycards.address);
    await depositDai(1000,user1);
    await depositDai(1000,user2);
    await depositDai(1000,user3);
    await newRental(10,3,user1);
    await time.increase(time.duration.weeks(4));
    await newRental(500,3,user2);
    await time.increase(time.duration.years(1));
    await realitio.setResult(3);
    await realitycards.lockMarket();
    await expectRevert(realitycards.upgradeCard(3, {from: user1}),"Incorrect state");
    await mainnetproxy.getWinnerFromOracle(realitycards.address);
    await realitycards.withdraw({from: user1});
    await expectRevert(realitycards.upgradeCard(3, {from: user2}), "Not owner");
    await realitycards.upgradeCard(3, {from: user1});
    var ownerxdai = await realitycards.ownerOf(3);
    assert.equal(ownerxdai,realitycards.address);
    var ownermainnet = await nfthubmainnet.ownerOf(3);
    assert.equal(ownermainnet,user1);
    // check token uri
    var tokenuri = await nfthubmainnet.tokenURI(3);
    assert.equal("uri",tokenuri);
    // test cant call certain functions directly
    await expectRevert(xdaiproxy.saveCardToUpgrade(3,"asdfsadf",user0), "Not market");
    await expectRevert(mainnetproxy.upgradeCard(3,"asdfsadf",user0), "Not bridge");
    // now, create new market and make sure token IDs on mainnet increment correctly
    var nftMintCount = await rcfactory.totalNftMintCount.call();
    assert.equal(nftMintCount,20);
    var realitycards2 = await createMarketWithArtistSet();
    await rcfactory.approveOrUnapproveMarket(realitycards2.address);
    await newRentalCustomContract(realitycards2,1,5,user3); 
    await time.increase(time.duration.years(1));
    await realitio.setResult(5);
    await realitycards2.lockMarket();
    await mainnetproxy.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    await realitycards2.upgradeCard(5, {from: user3});
    var ownermainnet = await nfthubmainnet.ownerOf(25);
    assert.equal(ownermainnet,user3);
    var tokenuri = await nfthubmainnet.tokenURI(25);
    assert.equal("x",tokenuri);
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user1);
    await withdrawDeposit(1000,user3);
});

it('test setMaximumDuration', async () => {
    await rcfactory.setMaximumDuration(604800); // one week
    var latestTime = await time.latest();
    var twoWeeks = new BN('1210000');
    var twoWeeksInTheFuture = twoWeeks.add(latestTime);
    var marketLockingTime = twoWeeksInTheFuture; 
    var oracleResolutionTime = twoWeeksInTheFuture;
    var timestamps = [0,marketLockingTime,oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var slug = 'r';
    // locking time two weeks should fail
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question),"Market locks too late");
    // locking time now two weeks in future should pass
    var twoDays = new BN('172800');
    var twoDaysInTheFuture = twoDays.add(latestTime);
    var marketLockingTime = twoDaysInTheFuture; 
    var oracleResolutionTime = twoDaysInTheFuture;
    var timestamps = [twoDaysInTheFuture,marketLockingTime,oracleResolutionTime];
    rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question);
});

it('test addOrRemoveArtist, addOrRemoveAffiliate, addOrRemoveCardAffiliate', async () => {
    var timestamps = [0,0,0];
    var artistAddress = user2;
    var affiliateAddress = user2;
    var cardRecipients = ['0x0000000000000000000000000000000000000000',user6,user7,user8,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user0,user2];
    // locking time two weeks should fail
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question),"Artist not approved");
    await rcfactory.addOrRemoveArtist(user2);
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question),"Affiliate not approved");
    await rcfactory.addOrRemoveAffiliate(user2);
    await expectRevert(rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question),"Card affiliate not approved");
    await rcfactory.addOrRemoveCardAffiliate(user0);
    await rcfactory.addOrRemoveCardAffiliate(user6);
    await rcfactory.addOrRemoveCardAffiliate(user7);
    await rcfactory.addOrRemoveCardAffiliate(user8);
    await rcfactory.addOrRemoveCardAffiliate(user2);
    await rcfactory.createMarket(0,'0x0',timestamps,tokenURIs,artistAddress,affiliateAddress,cardRecipients,question);
    // check that not owner cant make changes
    await expectRevert(rcfactory.addOrRemoveArtist(user4, {from: user2}), "Not approved");
    await expectRevert(rcfactory.addOrRemoveAffiliate(user4, {from: user2}), "Not approved");
    await expectRevert(rcfactory.addOrRemoveCardAffiliate(user4, {from: user2}), "Not approved");
    await rcfactory.addOrRemoveGovernor(user2);
    // should be fine now
    await rcfactory.addOrRemoveArtist(user4, {from: user2});
    await rcfactory.addOrRemoveAffiliate(user4, {from: user2});
    await rcfactory.addOrRemoveCardAffiliate(user4, {from: user2});
    // remove user 2 from whitelist and same errors 
    await rcfactory.addOrRemoveGovernor(user2);
    await expectRevert(rcfactory.addOrRemoveArtist(user4, {from: user2}), "Not approved");
    await expectRevert(rcfactory.addOrRemoveAffiliate(user4, {from: user2}), "Not approved");
    await expectRevert(rcfactory.addOrRemoveCardAffiliate(user4, {from: user2}), "Not approved");
});

it('xdai nft hub check failures', async () => {
    await expectRevert(nfthubxdai.addMarket(user0),"Not factory");
    await expectRevert(nfthubxdai.setFactoryAddress(user0, {from: user1}),"Ownable: caller is not the owner");
    await expectRevert(nfthubxdai.mintNft(user0,0,'d'),"Not factory");
    await expectRevert(nfthubxdai.transferNft(user0,user0,9),"Not market");
});

it('check token Ids of second market make sense', async () => {
    user = user0;
    await depositDai(10,user6);
    // await newRental(144,0,user);
    //second market
    realitycards2 = await createMarketWithArtistSet();
    await realitycards2.newRental(web3.utils.toWei('1', 'ether'),maxuint256,zeroAddress,0,{ from: user6});
    var ownerMarket = await realitycards2.ownerOf.call(0);
    assert.equal(ownerMarket,user6);
    var ownerNftHub = await nfthubxdai.ownerOf.call(20);
    assert.equal(ownerNftHub,user6);
});

it('test force sending Ether to Treasury via self destruct', async () => {
    selfdestruct = await SelfDestructMockup.new();
    // send ether direct to self destruct contract
    await selfdestruct.send(web3.utils.toWei('1000', 'ether')); 
    await selfdestruct.killme(treasury.address);
    // do a regs deposit
    await depositDai(100,user6);
});

it('test orderbook various', async () => {
    // Tests the following:
    // add to orderbook in correct order
    // reduces the price to match that above it in the list
    // expected revert because incorrect starting location: too high and too low
    // update bid: test all cases
    user10 = accounts[10];
    user11 = accounts[11];
    user12 = accounts[12];
    user13 = accounts[13];
    user14 = accounts[14];
    await depositDai(10,user0);
    await depositDai(10,user1);
    await depositDai(10,user2);
    await depositDai(10,user3);
    await depositDai(10,user4);
    await depositDai(10,user5);
    await depositDai(10,user6);
    await depositDai(10,user7);
    await depositDai(10,user8);
    await depositDai(10,user9);
    await depositDai(10,user10);
    await depositDai(10,user11);
    await depositDai(10,user12);
    await depositDai(10,user13);
    await depositDai(10,user14);
    // rentals: position/price
    await newRentalCustomTimeLimit(10, 1, 0,user0); // 2, 10
    await newRental(9,0,user1); // 5, 9
    await newRental(8,0,user2); // 6, 8
    await newRental(10,0,user3); // 3,1 10
    var returnedPrice = await realitycards.newRental.call(ether('10.9'),0,zeroAddress,0,{from:user4}); 
    assert.equal(returnedPrice.toString(), ether('10').toString());
    await newRental(10.9,0,user4); // 4, 10
    await newRental(20,0,user5); // 1, 20
    await newRental(5,0,user6); // 9, 5
    await newRental(8.5,0,user7); // 7, 8
    await newRental(6,0,user8); // 8, 6
    await newRental(50,0,user9); // 0, 50
    await newRentalWithStartingPosition(4.8,0,user5,user12); // 11, 4.8
    await newRentalWithStartingPosition(5,0,user5,user13); // 10, 5 // <- this one checks that it matches one above, it is not reduced
    await newRentalWithStartingPosition(4.8,0,user7,user14); // 12, 4.8
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user9);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('50', 'ether'));
    // check position and price
    // position 0
    var bid = await realitycards.orderbook.call(0,user9);
    assert.equal(bid[0],web3.utils.toWei('50', 'ether'));
    assert.equal(bid[2],user5);
    assert.equal(bid[3],realitycards.address);
    // position 1
    var bid = await realitycards.orderbook.call(0,user5);
    assert.equal(bid[0],web3.utils.toWei('20', 'ether'));
    assert.equal(bid[2],user0);
    assert.equal(bid[3],user9);
    // position 2
    var bid = await realitycards.orderbook.call(0,user0);
    assert.equal(bid[0],web3.utils.toWei('10', 'ether'));
    assert.equal(bid[1],(3600*24));
    assert.equal(bid[2],user3);
    assert.equal(bid[3],user5);
    // position 3
    var bid = await realitycards.orderbook.call(0,user3);
    assert.equal(bid[0],web3.utils.toWei('10', 'ether'));
    assert.equal(bid[2],user4);
    assert.equal(bid[3],user0);
    // position 4
    var bid = await realitycards.orderbook.call(0,user4);
    assert.equal(bid[0],web3.utils.toWei('10', 'ether'));
    assert.equal(bid[2],user1);
    assert.equal(bid[3],user3);
    // position 5
    var bid = await realitycards.orderbook.call(0,user1);
    assert.equal(bid[0],web3.utils.toWei('9', 'ether'));
    assert.equal(bid[2],user2);
    assert.equal(bid[3],user4);
    // position 6
    var bid = await realitycards.orderbook.call(0,user2);
    assert.equal(bid[0],web3.utils.toWei('8', 'ether'));
    assert.equal(bid[2],user7);
    assert.equal(bid[3],user1);
    // position 7
    var bid = await realitycards.orderbook.call(0,user7);
    assert.equal(bid[0],web3.utils.toWei('8', 'ether'));
    assert.equal(bid[2],user8);
    assert.equal(bid[3],user2);
    // position 8
    var bid = await realitycards.orderbook.call(0,user8);
    assert.equal(bid[0],web3.utils.toWei('6', 'ether'));
    assert.equal(bid[2],user6);
    assert.equal(bid[3],user7);
    // position 9
    var bid = await realitycards.orderbook.call(0,user6);
    assert.equal(bid[0],web3.utils.toWei('5', 'ether'));
    assert.equal(bid[2],user13);
    assert.equal(bid[3],user8);
    // position 10
    var bid = await realitycards.orderbook.call(0,user13);
    assert.equal(bid[0],web3.utils.toWei('5', 'ether'));
    assert.equal(bid[2],user12);
    assert.equal(bid[3],user6);
    // position 11
    var bid = await realitycards.orderbook.call(0,user12);
    assert.equal(bid[0],web3.utils.toWei('4.8', 'ether'));
    assert.equal(bid[2],user14);
    assert.equal(bid[3],user13);
    // position 12
    var bid = await realitycards.orderbook.call(0,user14);
    assert.equal(bid[0],web3.utils.toWei('4.8', 'ether'));
    assert.equal(bid[2],realitycards.address);
    assert.equal(bid[3],user12);
    // check starting position
    // starting position too high
    await expectRevert(newRental(1,0,user10), "Location too high"); 
    await expectRevert(newRentalWithStartingPosition(1,0,user9,user10), "Location too high");
    await newRentalWithStartingPosition(1,0,user6,user10);
    // starting position too low
    await expectRevert(newRentalWithStartingPosition(10,0,user1,user11), "Location too low");
    // update bid case 1A: was winner, > 10% higher, should just update price + limit
    await newRentalCustomTimeLimit(60, 1, 0,user9); 
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user9);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('60', 'ether'));
    var bid = await realitycards.orderbook.call(0,user9);
    assert.equal(bid[0],web3.utils.toWei('60', 'ether'));
    assert.equal(bid[1],(3600*24));
    assert.equal(bid[2],user5);
    assert.equal(bid[3],realitycards.address);
    // update bid case 1B: was winner, higher but < 10%, should remove
    await expectRevert(newRental(65, 0,user9), "Not 10% higher"); 
    await realitycards.exit(0,{from: user9});
    // update bid case 1Ca: was winner, lower than prevous, but still winner, just update detials
    await newRentalCustomTimeLimit(15, 2, 0,user5);
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user5);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('15', 'ether'));
    var bid = await realitycards.orderbook.call(0,user5);
    assert.equal(bid[0],web3.utils.toWei('15', 'ether'));
    assert.equal(bid[1],(3600*48));
    assert.equal(bid[2],user0);
    assert.equal(bid[3],realitycards.address);
    // update bid case 1Cb: was winner, but no longer winner, remove and add back
    await newRentalCustomTimeLimit(10.5, 0.5, 0,user5);
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user0);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('10', 'ether'));
    var bid = await realitycards.orderbook.call(0,user5);
    assert.equal(bid[0],web3.utils.toWei('10', 'ether'));
    assert.equal(bid[1],(3600*12));
    assert.equal(bid[2],user1);
    assert.equal(bid[3],user4);
    // update bid case 2A: not winner, but now is [includes check that been deleted from previous location]
    await newRentalCustomTimeLimit(100, 0.5, 0,user7);
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user7);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('100', 'ether'));
    var bid = await realitycards.orderbook.call(0,user7);
    assert.equal(bid[0],web3.utils.toWei('100', 'ether'));
    assert.equal(bid[1],(3600*12));
    assert.equal(bid[2],user0);
    assert.equal(bid[3],realitycards.address);
    var bid = await realitycards.orderbook.call(0,user2);
    assert.equal(bid[2],user8);
    var bid = await realitycards.orderbook.call(0,user8);
    assert.equal(bid[3],user2);
    // update bid case 2B: not winner, still isn't. Let's move user 8 up a few [and check moved from previous]
    await newRentalCustomTimeLimit(20, 2, 0,user8);
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user7);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('100', 'ether'));
    var bid = await realitycards.orderbook.call(0,user8);
    assert.equal(bid[0],web3.utils.toWei('20', 'ether'));
    assert.equal(bid[1],(3600*48));
    assert.equal(bid[2],user0);
    assert.equal(bid[3],user7);
    var bid = await realitycards.orderbook.call(0,user2);
    assert.equal(bid[2],user6);
    var bid = await realitycards.orderbook.call(0,user6);
    assert.equal(bid[3],user2);
});

it('test _revertToUnderbidder', async () => {
    // console.log(user0); 
    // console.log(user1);
    // console.log(user2);
    // console.log(user3); 
    // console.log(user4);
    // console.log(user5);
    // console.log(user6); 
    // console.log(user7);
    // console.log(user8);
    // console.log(user9); 
    // console.log(user10); 
    // console.log(use11); 
    // console.log(user12); 
    // console.log(user3); 
    // console.log(realitycards.address); 
    await depositDai(10,user0);
    await depositDai(10,user1);
    await depositDai(10,user2);
    await depositDai(10,user3);
    await depositDai(10,user4);
    await depositDai(10,user5);
    await depositDai(10,user6);
    await depositDai(10,user7);
    await depositDai(10,user8);
    await depositDai(10,user9);
    // rentals: position/price
    await newRentalCustomTimeLimit(10, 1, 0,user0); // 2, 10
    await newRental(9,0,user1); // 5, 9
    await newRental(8,0,user2); // 6, 8
    await newRental(10,0,user3); // 3,1 10
    await newRental(10.9,0,user4); // 4, 10
    await newRental(20,0,user5); // 1, 20
    await newRental(5,0,user6); // 9, 5
    await newRental(8.5,0,user7); // 7, 8
    await newRental(6,0,user8); // 8, 6
    await newRental(50,0,user9); // 0, 50
    // withdraw deposit of 9, will it switch to 0
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user9);
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user5);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('20', 'ether'));
    var bid = await realitycards.orderbook.call(0,user5);
    assert.equal(bid[3],realitycards.address);
    var bid = await realitycards.orderbook.call(0,user9);
    assert.equal(bid[0],0);
    // withraw deposit for next 4 in line, check it cyles through
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user5);
    await withdrawDeposit(1000,user0);
    await withdrawDeposit(1000,user3);
    await withdrawDeposit(1000,user4);
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user1);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('9', 'ether'));
    var bid = await realitycards.orderbook.call(0,user1);
    assert.equal(bid[3],realitycards.address);
    var bid = await realitycards.orderbook.call(0,user5);
    assert.equal(bid[0],0);
    var bid = await realitycards.orderbook.call(0,user0);
    assert.equal(bid[0],0);
    var bid = await realitycards.orderbook.call(0,user3);
    assert.equal(bid[0],0);
    var bid = await realitycards.orderbook.call(0,user4);
    assert.equal(bid[0],0);
});

it('test exit', async () => {
    await depositDai(10,user0);
    await depositDai(10,user1);
    await depositDai(10,user2);
    await depositDai(10,user3);
    await depositDai(10,user4);
    await depositDai(10,user5);
    // rentals: position/price
    await newRentalCustomTimeLimit(10, 1, 0,user0); // 1, 10
    await newRental(9,0,user1); // 4, 9
    await newRental(15,0,user2); // 0, 15
    await newRental(10,0,user3); // 2,  10
    await newRental(10.9,0,user4); // 3, 10
    await newRental(5,0,user5); // 5, 5
    // withdraw current owner's deposit and exit the two below it, check it goes down three steps
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000,user2);
    await realitycards.exit(0,{from: user2});
    await realitycards.exit(0,{from: user0});
    await realitycards.exit(0,{from: user3});
    await realitycards.collectRentAllCards();
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user4);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('10', 'ether'));
    var bid = await realitycards.orderbook.call(0,user4);
    assert.equal(bid[3],realitycards.address);
    // this time, current owner calls exit
    await realitycards.exit(0,{from: user4});
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,user1);
    var price = await realitycards.price.call(0);
    assert.equal(price,web3.utils.toWei('9', 'ether'));
});

it('test updateTotalRental', async () => {
    await depositDai(10,user0);
    await depositDai(100,user1);
    await depositDai(10,user2);
    await depositDai(10,user3);
    // 2 rentals same market, check correct
    await newRental(5,0,user0); 
    await newRental(3,1,user0);
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('8').toString());
    // different market, still correct?
    var realitycards2 = await createMarketWithArtistSet();
    await newRentalCustomContract(realitycards2,1,7,user0);
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('9').toString());
    // change bid, still correct?
    await newRental(6,0,user0);
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('10').toString());
    // someone else takes it off them, still correct?
    await newRental(7,0,user1);
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('4').toString());
    // change price, should not change cos not owner
    await newRental(7.5,0,user0);
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('4').toString());
    // new user exits, still correct?
    await realitycards.exit(0,{from: user1});
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('11').toString());
    // this user exits, still correct?
    await realitycards.exit(0,{from: user0});
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('4').toString());
    // increase rent to 1439 (max 1440) then rent again, check it fails
    await newRental(1435,0,user0);
    await expectRevert(newRental(5,3,user0), " Insufficient deposit");  
    // someone bids even higher, I increase my bid above what I can afford, we all run out of deposit, should not return to me
    await newRental(2000,0,user1);
    await time.increase(time.duration.weeks(1));
    await realitycards.collectRentAllCards();
    // check owned by contract
    var owner = await realitycards.ownerOf.call(0);
    assert.equal(owner,realitycards.address);
    // should only hold my 2nd market one
    var totalRentals = await treasury.userTotalRentals(user0);
    assert.equal(totalRentals.toString(),ether('1').toString());
    // going through the full list now
    // check updating bid: owner, for less, but still winner
    await newRental(10,0,user2);
    await newRental(15,0,user3);
    var totalRentals = await treasury.userTotalRentals(user3);
    assert.equal(totalRentals.toString(),ether('15').toString());
    await newRental(14,0,user3);
    var totalRentals = await treasury.userTotalRentals(user3);
    assert.equal(totalRentals.toString(),ether('14').toString());
    // check updating bid: owner, for less, not winner 
    await newRental(10,0,user3);
    var totalRentals = await treasury.userTotalRentals(user3);
    assert.equal(totalRentals.toString(),ether('0').toString());
    // check updating bid: not owner, should not be
    await newRental(10.5,0,user3);
    var totalRentals = await treasury.userTotalRentals(user3);
    assert.equal(totalRentals.toString(),ether('0').toString());
    // check updating bid: not owner, should b be
    await newRental(11,0,user3);
    var totalRentals = await treasury.userTotalRentals(user3);
    assert.equal(totalRentals.toString(),ether('11').toString());
    // check exit 
    await realitycards.exit(0,{from: user3});
    var totalRentals = await treasury.userTotalRentals(user3);
    assert.equal(totalRentals.toString(),ether('0').toString());
});

it('test cant withdraw within minimum duration', async () => {
    await depositDai(10,user0);
    await newRental(1,0,user0);
    await expectRevert(treasury.withdrawDeposit(678,{from:user0}), "Too soon");
    // pass 5 mins, no difference
    await time.increase(time.duration.minutes(5));
    await expectRevert(treasury.withdrawDeposit(678,{from:user0}), "Too soon");
    // pass 10 mins should now work
    await time.increase(time.duration.minutes(5));
    await treasury.withdrawDeposit(678,{from:user0});
});

it('test dai->xdai bridge', async () => {
    // add 1000 eth to the float
    await xdaiproxy.send(web3.utils.toWei('100', 'ether'));
    // check cant confirm deposit if not validator
    await expectRevert(xdaiproxy.confirmDaiDeposit(user1, ether('10'), 0), "Not a validator");
    // add user9 as validator
    await xdaiproxy.setValidator(user9, true);
    // backend just saw user1 send 10 eth
    await xdaiproxy.confirmDaiDeposit(user1, ether('10'), 0, {from: user9});
    // check user1 received 10 eth
    var deposit = await treasury.deposits.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // confirm again check funds not sent again
    await xdaiproxy.confirmDaiDeposit(user1, ether('10'), 0, {from: user9});
    var deposit = await treasury.deposits.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // check cant call execute when already executed
    await expectRevert(xdaiproxy.executeDaiDeposit(0), "Already executed");
    // add a second validator, new deposit, should not have executed yet
    await xdaiproxy.setValidator(user8, true);
    await xdaiproxy.confirmDaiDeposit(user2, ether('20'), 1, {from: user9});
    var deposit = await treasury.deposits.call(user2);
    assert.equal(deposit.toString(), ether('0').toString());
    // catch errors if different details
    await expectRevert(xdaiproxy.confirmDaiDeposit(user5, ether('20'), 1, {from: user8}), "Addresses don't match");
    await expectRevert(xdaiproxy.confirmDaiDeposit(user2, ether('10'), 1, {from: user8}), "Amounts don't match");
    // catch errors if call execute before confirmed
    await expectRevert(xdaiproxy.executeDaiDeposit(1), "Not confirmed");
    // second confirmation, should now execute
    await xdaiproxy.confirmDaiDeposit(user2, ether('20'), 1, {from: user8});
    var deposit = await treasury.deposits.call(user2);
    assert.equal(deposit.toString(), ether('20').toString());
    // Transfer more than the contract has
    await xdaiproxy.confirmDaiDeposit(user3, ether('150'), 2, {from: user8});
    await xdaiproxy.confirmDaiDeposit(user3, ether('150'), 2, {from: user9});
    // check user has received nothing
    var deposit = await treasury.deposits.call(user3);
    assert.equal(deposit.toString(), ether('0').toString());
    // transfer the extra, and try again
    await xdaiproxy.send(web3.utils.toWei('100', 'ether'));
    await xdaiproxy.executeDaiDeposit(2);
    var deposit = await treasury.deposits.call(user3);
    assert.equal(deposit.toString(), ether('150').toString());
    // test remove validator
    await xdaiproxy.setValidator(user8, false);
    // third transfer, should execute immediately
    await xdaiproxy.confirmDaiDeposit(user4, ether('3'), 3, {from: user9});
    var deposit = await treasury.deposits.call(user4);
    assert.equal(deposit.toString(), ether('3').toString());
    // test withdraw float
    var balanceBefore = await web3.eth.getBalance(user0);
    await xdaiproxy.withdrawFloat(ether('5'));
    var balanceAfter = await web3.eth.getBalance(user0);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var difference = Math.abs(depositWithdrawn.toString()-ether('5').toString());
    assert.isBelow(difference/deposit,0.00001);
});

it('test dai->xdai bridge if exceeds contract balance limit', async () => {
    // set Treasury max balance
    await treasury.setMaxContractBalance(web3.utils.toWei('100', 'ether'));
    // add 1000 eth to the float
    await xdaiproxy.send(web3.utils.toWei('1000', 'ether'));
    // add user9 as validator
    await xdaiproxy.setValidator(user9, true);
    // backend just saw user1 send 10 eth
    await xdaiproxy.confirmDaiDeposit(user1, ether('75'), 0, {from: user9});
    // check user1 received 10 eth
    var deposit = await treasury.deposits.call(user1);
    assert.equal(deposit.toString(), ether('75').toString());
    // repeat the above, this time it should be diverted to user's balance
    var balanceBefore = await web3.eth.getBalance(user1);
    await xdaiproxy.confirmDaiDeposit(user1, ether('75'), 1, {from: user9});
    var balanceAfter = await web3.eth.getBalance(user1);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var difference = Math.abs(depositWithdrawn.toString()-ether('75').toString());
    assert.isBelow(difference/deposit,0.00001);
});

it('test deposit dai mainnet proxy', async () => {
    // make sure ARB has enough funds
    await alternateReceiverBridge.send(web3.utils.toWei('100', 'ether'));
    // send 10 dai via mainnet
    await mainnetproxy.depositDai(web3.utils.toWei('10', 'ether'));
    // check xdai proxy now has 10 xDai
    var balance = await web3.eth.getBalance(xdaiproxy.address);
    assert.equal(balance,ether('10'));
    // add user9 as validator
    await xdaiproxy.setValidator(user9, true);
    // backend just saw user1 send 10 eth
    await xdaiproxy.confirmDaiDeposit(user1, ether('10'), 0, {from: user9});
    // check user1 received 10 eth
    var deposit = await treasury.deposits.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // disable deposits, should revert
    await mainnetproxy.enableOrDisableDeposits();
    await expectRevert(mainnetproxy.depositDai(web3.utils.toWei('10', 'ether')),"Deposits disabled");
    // enable deposits, should not revert
    await mainnetproxy.enableOrDisableDeposits();
    await mainnetproxy.depositDai(web3.utils.toWei('15', 'ether'));
    var balance = await web3.eth.getBalance(xdaiproxy.address);
    assert.equal(balance,ether('15'));
});

});


// Every possibility:

// new bid: X% higher
// new bid: not X% higher
// updating bid: owner, over X% above
// updating bid: owner, beween 0 and X% above
// updating bid: owner, less, still winner
// updating bid: owner, less, not winner
// updating bid: not owner, but should be
// updating bid: not owner, should not be.
// call exit
// run out of deposit

