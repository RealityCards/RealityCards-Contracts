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
var RCOrderbook = artifacts.require('./RCOrderbook.sol');
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
// arbitrator
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D';

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('TestProxies', (accounts) => {

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
    rcorderbook = await RCOrderbook.new(rcfactory.address, treasury.address);
    // nft hubs
    nfthubxdai = await NftHubXDai.new(rcfactory.address);
    nfthubmainnet = await NftHubMainnet.new();
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(rcfactory.address);
    await rcfactory.setReferenceContractAddress(rcreference.address);
    await rcfactory.setNftHubAddress(nfthubxdai.address, 0);
    await rcfactory.setOrderbookAddress(rcorderbook.address);
    await treasury.setOrderbookAddress(rcorderbook.address);
    // mockups 
    realitio = await RealitioMockup.new();
    bridge = await BridgeMockup.new();
    alternateReceiverBridge = await AlternateReceiverBridgeMockup.new();
    dai = await DaiMockup.new();
    // bridge contracts
    xdaiproxy = await XdaiProxy.new(bridge.address, rcfactory.address, treasury.address, realitio.address, realitio.address);
    mainnetproxy = await MainnetProxy.new(bridge.address, nfthubmainnet.address, alternateReceiverBridge.address, dai.address);
    // tell the factory, mainnet proxy and bridge the xdai proxy address
    await rcfactory.setProxyXdaiAddress(xdaiproxy.address);
    await mainnetproxy.setProxyXdaiAddress(xdaiproxy.address);
    await bridge.setProxyXdaiAddress(xdaiproxy.address);
    // tell the xdai proxy, nft mainnet hub and bridge the mainnet proxy address
    await xdaiproxy.setProxyMainnetAddress(mainnetproxy.address);
    await bridge.setProxyMainnetAddress(mainnetproxy.address);
    await nfthubmainnet.setProxyMainnetAddress(mainnetproxy.address);
    // tell the treasury about the ARB
	await treasury.setAlternateReceiverAddress(alternateReceiverBridge.address);
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
    await rcfactory.changeArtistApproval(user8);
    var affiliateAddress = user7;
    await rcfactory.changeAffiliateApproval(user7);
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
    await treasury.withdrawDeposit(amount,true,{ from: userx});
  }

it('test RCProxyMainnet various', async () => {
    // test changing xdai proxy
    var xdaiproxy2 = await XdaiProxy2.new(bridge.address, rcfactory.address, treasury.address, realitio.address, treasury.address);
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
    await xdaiproxy2.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner,4);
    // test changing setBridgeMainnetAddress
    await mainnetproxy.setBridgeMainnetAddress(user0);
    var newproxy = await mainnetproxy.bridge.call();
    assert.equal(newproxy,user0);
 });


it('test RCProxyMainnet, various 2', async () => {
    // change relaitio, winner should return 69
    realitio2 = await RealitioMockup2.new();
    await xdaiproxy.setRealitioAddress(realitio2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio2.setResult(2);
    await time.increase(time.duration.years(1));
    await xdaiproxy.getWinnerFromOracle(realitycards2.address); 
    // await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner,69);
    // change arbitrator
    await xdaiproxy.setArbitrator(user0);
    var newarb = await xdaiproxy.arbitrator.call();
    assert.equal(newarb,user0)
    // change timeout
    await xdaiproxy.setTimeout(69);
    var newtime = await xdaiproxy.timeout.call();
    assert.equal(newtime,69)
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
    await xdaiproxy.getWinnerFromOracle(realitycards2.address);
    await expectRevert(xdaiproxy.setAmicableResolution(realitycards.address,2),"Incorrect state");
});


it('test NFT upgrade', async () => {
    await rcfactory.changeMarketApproval(realitycards.address);
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
    await xdaiproxy.getWinnerFromOracle(realitycards.address);
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
    await rcfactory.changeMarketApproval(realitycards2.address);
    await newRentalCustomContract(realitycards2,1,5,user3); 
    await time.increase(time.duration.years(1));
    await realitio.setResult(5);
    await realitycards2.lockMarket();
    await xdaiproxy.getWinnerFromOracle(realitycards2.address);
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
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // confirm again check funds not sent again
    await xdaiproxy.confirmDaiDeposit(user1, ether('10'), 0, {from: user9});
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // check cant call execute when already executed
    await expectRevert(xdaiproxy.executeDaiDeposit(0), "Already executed");
    // add a second validator, new deposit, should not have executed yet
    await xdaiproxy.setValidator(user8, true);
    await xdaiproxy.confirmDaiDeposit(user2, ether('20'), 1, {from: user9});
    var deposit = await treasury.userDeposit.call(user2);
    assert.equal(deposit.toString(), ether('0').toString());
    // catch errors if different details
    await expectRevert(xdaiproxy.confirmDaiDeposit(user5, ether('20'), 1, {from: user8}), "Addresses don't match");
    await expectRevert(xdaiproxy.confirmDaiDeposit(user2, ether('10'), 1, {from: user8}), "Amounts don't match");
    // catch errors if call execute before confirmed
    await expectRevert(xdaiproxy.executeDaiDeposit(1), "Not confirmed");
    // second confirmation, should now execute
    await xdaiproxy.confirmDaiDeposit(user2, ether('20'), 1, {from: user8});
    var deposit = await treasury.userDeposit.call(user2);
    assert.equal(deposit.toString(), ether('20').toString());
    // Transfer more than the contract has
    await xdaiproxy.confirmDaiDeposit(user3, ether('150'), 2, {from: user8});
    await xdaiproxy.confirmDaiDeposit(user3, ether('150'), 2, {from: user9});
    // check user has received nothing
    var deposit = await treasury.userDeposit.call(user3);
    assert.equal(deposit.toString(), ether('0').toString());
    // transfer the extra, and try again
    await xdaiproxy.send(web3.utils.toWei('100', 'ether'));
    await xdaiproxy.executeDaiDeposit(2);
    var deposit = await treasury.userDeposit.call(user3);
    assert.equal(deposit.toString(), ether('150').toString());
    // test remove validator
    await xdaiproxy.setValidator(user8, false);
    // third transfer, should execute immediately
    await xdaiproxy.confirmDaiDeposit(user4, ether('3'), 3, {from: user9});
    var deposit = await treasury.userDeposit.call(user4);
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
    var deposit = await treasury.userDeposit.call(user1);
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
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // disable deposits, should revert
    await mainnetproxy.changeDepositsEnabled();
    await expectRevert(mainnetproxy.depositDai(web3.utils.toWei('10', 'ether')),"Deposits disabled");
    // enable deposits, should not revert
    await mainnetproxy.changeDepositsEnabled();
    await mainnetproxy.depositDai(web3.utils.toWei('15', 'ether'));
    var balance = await web3.eth.getBalance(xdaiproxy.address);
    assert.equal(balance,ether('15'));
});




});