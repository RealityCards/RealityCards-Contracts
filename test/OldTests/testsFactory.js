const { assert } = require('hardhat');
const {
  BN,
  expectRevert,
  ether,
  expectEvent,
  balance,
  time
} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

// main contracts
var RCFactory = artifacts.require('./RCFactory.sol');
var RCTreasury = artifacts.require('./RCTreasury.sol');
var RCMarket = artifacts.require('./RCMarket.sol');
var NftHubL2 = artifacts.require('./nfthubs/RCNftHubL2.sol');
var NftHubL1 = artifacts.require('./nfthubs/RCNftHubL1.sol');
var RCOrderbook = artifacts.require('./RCOrderbook.sol');
// mockups
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

var SelfDestructMockup = artifacts.require("./mockups/SelfDestructMockup.sol");
var DaiMockup = artifacts.require("./mockups/DaiMockup.sol");
const tokenMockup = artifacts.require("./mockups/tokenMockup.sol");
// used where the address isn't important but can't be zero
const dummyAddress = '0x0000000000000000000000000000000000000001';

// arbitrator
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D';

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('TestFactory', (accounts) => {

  var realitycards;
  var tokenURIs = ['x', 'x', 'x', 'uri', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x']; // 20 tokens
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
  var cardRecipients = [];

  beforeEach(async () => {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    erc20 = await tokenMockup.new("Dai", "Dai", ether("10000000"), user0);
    for (let index = 0; index < 10; index++) {
      user = eval("user" + index);
      erc20.transfer(user, ether("1000"), { from: user0 });
    }
    // mockups 
    realitio = await RealitioMockup.new();
    dai = await DaiMockup.new();
    // main contracts
    treasury = await RCTreasury.new(erc20.address);
    rcfactory = await RCFactory.new(treasury.address, realitio.address, kleros);
    rcreference = await RCMarket.new();
    rcorderbook = await RCOrderbook.new(treasury.address);
    // nft hubs
    nftHubL2 = await NftHubL2.new(rcfactory.address, dummyAddress);
    nftHubL1 = await NftHubL1.new();
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(rcfactory.address);
    await rcfactory.setReferenceContractAddress(rcreference.address);
    await rcfactory.setNftHubAddress(nftHubL2.address);
    await treasury.setOrderbookAddress(rcorderbook.address);
    await treasury.toggleWhitelist();

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
      0,
    );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards = await RCMarket.at(marketAddress);
    await rcfactory.changeMarketApproval(marketAddress);
  });

  async function createMarketWithArtistSet() {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
    var artistAddress = user8;
    await rcfactory.addArtist(user8);
    var affiliateAddress = user7;
    await rcfactory.addAffiliate(user7);
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
      0,
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
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
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
      0,
    );
    var marketAddress = await rcfactory.getMostRecentMarket.call(mode);
    realitycards2 = await RCMarket.at(marketAddress);
    await rcfactory.changeMarketApproval(marketAddress);
    return realitycards2;
  }

  async function createMarketCustomMode2(mode) {
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
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
      0,
    );
    var marketAddress = await rcfactory.getMostRecentMarket.call(mode);
    realitycards2 = await RCMarket.at(marketAddress);
    await rcfactory.changeMarketApproval(marketAddress);
    return realitycards2;
  }

  async function createMarketWithArtistAndCardAffiliatesAndSponsorship(amount, user) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
    var artistAddress = user8;
    var affiliateAddress = user7;
    var slug = 'y';
    var cardRecipients = [user5, user6, user7, user8, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0];
    await rcfactory.addCardAffiliate(user5);
    await rcfactory.addCardAffiliate(user6);
    await rcfactory.addCardAffiliate(user7);
    await rcfactory.addCardAffiliate(user8);
    await rcfactory.addCardAffiliate(user0);
    await rcfactory.addAffiliate(user7);
    await rcfactory.addArtist(user8);
    await erc20.approve(treasury.address, amount, { from: user })
    await rcfactory.createMarket(
      0,
      '0x0',
      timestamps,
      tokenURIs,
      artistAddress,
      affiliateAddress,
      cardRecipients,
      question,
      amount, { from: user }
    );
    var marketAddress = await rcfactory.getMostRecentMarket.call(0);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function depositDai(amount, user) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await erc20.approve(treasury.address, amount, { from: user })
    await treasury.deposit(amount, user, { from: user });
  }

  async function newRental(price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price, 0, zeroAddress, outcome, { from: user });
  }

  async function newRentalWithStartingPosition(price, outcome, position, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price, 0, position, outcome, { from: user });
  }

  async function newRentalWithDeposit(price, outcome, user, dai) {
    price = web3.utils.toWei(price.toString(), 'ether');
    dai = web3.utils.toWei(dai.toString(), 'ether');
    await realitycards.newRental(price, 0, zeroAddress, outcome, { from: user, value: dai });
  }

  async function newRentalCustomContract(contract, price, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await contract.newRental(price, maxuint256.toString(), zeroAddress, outcome, { from: user });
  }

  async function newRentalWithDepositCustomContract(contract, price, outcome, user, dai) {
    price = web3.utils.toWei(price.toString(), 'ether');
    dai = web3.utils.toWei(dai.toString(), 'ether');
    await contract.newRental(price, maxuint256.toString(), zeroAddress, outcome, { from: user, value: dai });
  }

  async function newRentalCustomTimeLimit(price, timelimit, outcome, user) {
    price = web3.utils.toWei(price.toString(), 'ether');
    await realitycards.newRental(price, (timelimit * 3600 * 24).toString(), zeroAddress, outcome, { from: user });
  }

  async function userRemainingDeposit(outcome, userx) {
    await realitycards.userRemainingDeposit.call(outcome, { from: userx });
  }

  async function withdraw(userx) {
    await realitycards.withdraw({ from: userx });
  }

  async function withdrawDeposit(amount, userx) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await treasury.withdrawDeposit(amount, true, { from: userx });
  }

  function accessControl(user, role) {
    let roleHash = web3.utils.soliditySha3(role)
    let errorMsg = "AccessControl: account " + user.toLowerCase() + " is missing role " + roleHash
    return errorMsg
  }

  it('test changeGovernorApproval and changeMarketCreationGovernorsOnly', async () => {
    // check user1 cant create market
    var latestTime = await time.latest();
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    // await rcfactory.changeMarketCreationGovernorsOnly();
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0, { from: user1 }), "Not approved");
    // add user1 to whitelist 
    await rcfactory.addGovernor(user1);
    //try again, should work
    await rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0, { from: user1 });
    // remove them, should fail again
    await rcfactory.removeGovernor(user1);
    await expectRevert(rcfactory.removeGovernor(user1, { from: user1 }), "Not approved");
    // disable whitelist, should work
    await rcfactory.changeMarketCreationGovernorsOnly();
    await rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0, { from: user1 });
    // re-enable whitelist, should not work again
    await rcfactory.changeMarketCreationGovernorsOnly();
    await expectRevert(rcfactory.removeGovernor(user1, { from: user1 }), "Not approved");
  });


  it('test sponsor via market creation', async () => {
    await rcfactory.setSponsorshipRequired(ether('200'));
    await rcfactory.addGovernor(user3);
    await expectRevert(createMarketWithArtistAndCardAffiliatesAndSponsorship(100, user3), "Insufficient sponsorship");
    // undo approvals from the above as they are done again in following function
    await rcfactory.addArtist(user8);
    await rcfactory.addAffiliate(user7);
    await rcfactory.addCardAffiliate(user5);
    await rcfactory.addCardAffiliate(user6);
    await rcfactory.addCardAffiliate(user7);
    await rcfactory.addCardAffiliate(user8);
    await rcfactory.addCardAffiliate(user0);
    var realitycards2 = await createMarketWithArtistAndCardAffiliatesAndSponsorship(200, user3);
    var totalRentCollected = await realitycards2.totalRentCollected();
    var totalRentCollectedShouldBe = web3.utils.toWei('200', 'ether');
    var difference = Math.abs(totalRentCollected.toString() - totalRentCollectedShouldBe.toString());
    assert.isBelow(difference / totalRentCollected, 0.00001);
  });

  it('test setMinimumPriceIncrease', async () => {
    var realitycards2 = await createMarketCustomMode(0);
    /////// SETUP //////
    await depositDai(1000, user0);
    await depositDai(1000, user1);
    await newRentalCustomContract(realitycards2, 1, 0, user0);
    // 5% increase, should not be owner
    await realitycards2.newRental(web3.utils.toWei('1.05', 'ether'), maxuint256, zeroAddress, 0, { from: user1 });
    var owner = await realitycards2.ownerOf.call(0);
    assert.equal(user0, owner);
    // update min to 5%, try again
    await rcfactory.setMinimumPriceIncreasePercent(5);
    var realitycards3 = await createMarketCustomMode2(0);
    await newRentalCustomContract(realitycards3, 1, 0, user0);
    await realitycards3.newRental(web3.utils.toWei('1.05', 'ether'), maxuint256, zeroAddress, 0, { from: user1 });
    var owner = await realitycards3.ownerOf.call(0);
    assert.equal(user1, owner);
    // check rent all cards works
    var price = await realitycards3.cardPrice(0);
    await realitycards3.rentAllCards(web3.utils.toWei('100', 'ether'), { from: user0 });
    var price = await realitycards3.cardPrice(0);
    var priceShouldBe = ether('1.1025');
    assert.equal(price.toString(), priceShouldBe.toString());
  });


  it('test changeMarketApproval', async () => {
    await rcfactory.changeMarketApproval(realitycards.address);
    // first, check that recent market is hidden
    var hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden, false);
    // atttempt to unhide it with someone not on the whitelist
    await expectRevert(rcfactory.changeMarketApproval(realitycards.address, { from: user1 }), "Not approved");
    // add user 1 and try again, check that its not hidden
    await rcfactory.addGovernor(user1);
    await rcfactory.changeMarketApproval(realitycards.address, { from: user1 });
    hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden, true);
    // hide it again, then check that cards cant be upgraded
    await rcfactory.changeMarketApproval(realitycards.address, { from: user1 });
    hidden = await rcfactory.isMarketApproved.call(realitycards.address);
    assert.equal(hidden, false);
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
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    // opening time zero, should fail
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0), "Market opening time not set");
    // opening time not 1 day in the future, should fail
    var timestamps = [oneHourInTheFuture, marketLockingTime, oracleResolutionTime];
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0), "Market opens too soon");
    var twoDays = new BN('172800');
    var twoDaysInTheFuture = twoDays.add(latestTime);
    // opening time 2 days in the future, should not fail
    var timestamps = [twoDaysInTheFuture, marketLockingTime, oracleResolutionTime];
    rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0);
  });

  it('test setMaximumDuration', async () => {
    await rcfactory.setMaximumDuration(604800); // one week
    var latestTime = await time.latest();
    var twoWeeks = new BN('1210000');
    var twoWeeksInTheFuture = twoWeeks.add(latestTime);
    var marketLockingTime = twoWeeksInTheFuture;
    var oracleResolutionTime = twoWeeksInTheFuture;
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
    var artistAddress = '0x0000000000000000000000000000000000000000';
    var affiliateAddress = '0x0000000000000000000000000000000000000000';
    var slug = 'r';
    // locking time two weeks should fail
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0), "Market locks too late");
    // locking time now two weeks in future should pass
    var twoDays = new BN('172800');
    var twoDaysInTheFuture = twoDays.add(latestTime);
    var marketLockingTime = twoDaysInTheFuture.add(twoDays);
    var oracleResolutionTime = twoDaysInTheFuture.add(twoDays);
    var timestamps = [twoDaysInTheFuture, marketLockingTime, oracleResolutionTime];
    rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0);
  });


  it('test addArtist, addAffiliate, addCardAffiliate', async () => {
    let now = await time.latest();
    let oneDay = new BN('86400');
    var timestamps = [now, now.add(oneDay), now.add(oneDay)];
    var artistAddress = user2;
    var affiliateAddress = user2;
    var cardRecipients = ['0x0000000000000000000000000000000000000000', user6, user7, user8, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user0, user2];
    // locking time two weeks should fail
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0), "Artist not approved");
    await rcfactory.addArtist(user2);
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0), "Affiliate not approved");
    await rcfactory.addAffiliate(user2);
    await expectRevert(rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0), "Card affiliate not approved");
    await rcfactory.addCardAffiliate(user0);
    await rcfactory.addCardAffiliate(user6);
    await rcfactory.addCardAffiliate(user7);
    await rcfactory.addCardAffiliate(user8);
    await rcfactory.addCardAffiliate(user2);
    await rcfactory.createMarket(0, '0x0', timestamps, tokenURIs, artistAddress, affiliateAddress, cardRecipients, question, 0);
    // check that not owner cant make changes
    await expectRevert(rcfactory.addArtist(user4, { from: user2 }), "Not approved");
    await expectRevert(rcfactory.addAffiliate(user4, { from: user2 }), "Not approved");
    await expectRevert(rcfactory.addCardAffiliate(user4, { from: user2 }), "Not approved");
    await rcfactory.addGovernor(user2);
    // should be fine now
    await rcfactory.addArtist(user4, { from: user2 });
    await rcfactory.addAffiliate(user4, { from: user2 });
    await rcfactory.addCardAffiliate(user4, { from: user2 });
    // remove user 2 from whitelist and same errors 
    await rcfactory.removeGovernor(user2);
    await expectRevert(rcfactory.addArtist(user4, { from: user2 }), "Not approved");
    await expectRevert(rcfactory.addAffiliate(user4, { from: user2 }), "Not approved");
    await expectRevert(rcfactory.addCardAffiliate(user4, { from: user2 }), "Not approved");
  });

  it('test getAllMarkets', async () => {
    // check the value
    var marketArray = await rcfactory.getAllMarkets(0);
    assert.equal(marketArray[0], realitycards.address);
  });

});