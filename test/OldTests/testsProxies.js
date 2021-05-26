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
var NftHubL2 = artifacts.require('./nfthubs/RCNftHubXdai.sol');
var NftHubL1 = artifacts.require('./nfthubs/RCNftHubL1.sol');
var ProxyL2 = artifacts.require('./bridgeproxies/RCProxyL2.sol');
var ProxyL1 = artifacts.require('./bridgeproxies/RCProxyL1.sol');
var RCOrderbook = artifacts.require('./RCOrderbook.sol');
// mockups
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");
var BridgeMockup = artifacts.require("./mockups/BridgeMockup.sol");
var AlternateReceiverBridgeMockup = artifacts.require("./mockups/AlternateReceiverBridgeMockup.sol");
var SelfDestructMockup = artifacts.require("./mockups/SelfDestructMockup.sol");
var DaiMockup = artifacts.require("./mockups/DaiMockup.sol");
const tokenMockup = artifacts.require("./mockups/tokenMockup.sol");
// redeploys
var RCFactory2 = artifacts.require('./RCFactoryV2.sol');
var ProxyL12 = artifacts.require('./mockups/redeploys/RCProxyL1V2.sol');
var ProxyL22 = artifacts.require('./mockups/redeploys/RCProxyL2V2.sol');
var RCMarket2 = artifacts.require('./mockups/redeploys/RCMarketXdaiV2.sol');
var BridgeMockup2 = artifacts.require('./mockups/redeploys/BridgeMockupV2.sol');
var RealitioMockup2 = artifacts.require("./mockups/redeploys/RealitioMockupV2.sol");
// arbitrator
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D';

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('TestProxies', (accounts) => {

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
  var cardRecipients = ['0x0000000000000000000000000000000000000000'];

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

    // main contracts
    treasury = await RCTreasury.new(erc20.address);
    rcfactory = await RCFactory.new(treasury.address);
    rcreference = await RCMarket.new();
    rcorderbook = await RCOrderbook.new(rcfactory.address, treasury.address);
    // nft hubs
    nftHubL2 = await NftHubL2.new(rcfactory.address);
    nftHubL1 = await NftHubL1.new();
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(rcfactory.address);
    await rcfactory.setReferenceContractAddress(rcreference.address);
    await rcfactory.setNftHubAddress(nftHubL2.address, 0);
    await treasury.setNftHubAddress(nftHubL2.address);
    await rcfactory.setOrderbookAddress(rcorderbook.address);
    await treasury.setOrderbookAddress(rcorderbook.address);
    // mockups 
    realitio = await RealitioMockup.new();
    bridge = await BridgeMockup.new();
    alternateReceiverBridge = await AlternateReceiverBridgeMockup.new();
    dai = await DaiMockup.new();
    // bridge contracts
    proxyL2 = await ProxyL2.new(bridge.address, rcfactory.address, treasury.address, realitio.address, realitio.address);
    proxyL1 = await ProxyL1.new(bridge.address, nftHubL1.address, alternateReceiverBridge.address, dai.address);
    // tell the factory, mainnet proxy and bridge the xdai proxy address
    await rcfactory.setProxyL2Address(proxyL2.address);
    await proxyL1.setProxyL2Address(proxyL2.address);
    await bridge.setProxyL2Address(proxyL2.address);
    // tell the xdai proxy, nft mainnet hub and bridge the mainnet proxy address
    await proxyL2.setProxyL1Address(proxyL1.address);
    await bridge.setProxyL1Address(proxyL1.address);
    await nftHubL1.setProxyL1Address(proxyL1.address);
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
      0,
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
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
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
      0,
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
    var timestamps = [0, marketLockingTime, oracleResolutionTime];
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

  it('test RCProxyL1 various', async () => {
    // test changing xdai proxy
    var proxyL22 = await ProxyL22.new(bridge.address, rcfactory.address, treasury.address, realitio.address, treasury.address);
    await proxyL22.setProxyL1Address(proxyL1.address);
    await proxyL22.setBridgeXdaiAddress(bridge.address);
    await proxyL22.setFactoryAddress(rcfactory.address);
    await proxyL1.setProxyL2Address(proxyL22.address);
    await bridge.setProxyL2Address(proxyL22.address);
    await rcfactory.setProxyL2Address(proxyL22.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio.setResult(2);
    await time.increase(time.duration.years(1));
    await realitycards2.lockMarket();
    // should be 4 even though 2 was set
    await proxyL22.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner, 4);
    // test changing setBridgeMainnetAddress
    await proxyL1.setBridgeMainnetAddress(user0);
    var newproxy = await proxyL1.bridge.call();
    assert.equal(newproxy, user0);
  });


  it('test RCProxyL1, various 2', async () => {
    // change relaitio, winner should return 69
    realitio2 = await RealitioMockup2.new();
    await proxyL2.setRealitioAddress(realitio2.address);
    realitycards2 = await createMarketWithArtistSet();
    await realitio2.setResult(2);
    await time.increase(time.duration.years(1));
    await proxyL2.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    var winner = await realitycards2.winningOutcome();
    assert.equal(winner, 69);
    // change arbitrator
    await proxyL2.setArbitrator(user0);
    var newarb = await proxyL2.arbitrator.call();
    assert.equal(newarb, user0)
    // change timeout
    await proxyL2.setTimeout(69);
    var newtime = await proxyL2.timeout.call();
    assert.equal(newtime, 69)
  });

  it('test setAmicableResolution', async () => {
    // normal setup, dont call the bridge, see if payout works
    await time.increase(time.duration.years(1));
    await expectRevert(proxyL2.setAmicableResolution(realitycards.address, 2, { from: user1 }), "caller is not the owner");
    // first check that setWinner cannot be called directly
    await expectRevert(realitycards.setWinner(2), "Not proxy");
    await proxyL2.setAmicableResolution(realitycards.address, 2);
    // cant call it again
    await expectRevert(realitycards.lockMarket(), "Incorrect state");
    // await realitycards.determineWinner();
    var winner = await realitycards.winningOutcome();
    assert.equal(winner, 2);
    // new market, resolve the normal way, check cant use setAmicableResolution
    var realitycards2 = await createMarketWithArtistSet();
    await time.increase(time.duration.years(1));
    await realitycards2.lockMarket();
    await realitio.setResult(2);
    await proxyL2.getWinnerFromOracle(realitycards2.address);
  });


  it('test NFT upgrade', async () => {
    // need to implement check that user has already claimed card (and market is over)
    // before trying to exit them on a withdraw, then this test can be re-instated.
    await rcfactory.changeMarketApproval(realitycards.address);
    await depositDai(1000, user1);
    await depositDai(1000, user2);
    await depositDai(1000, user3);
    await newRental(10, 3, user1);
    await time.increase(time.duration.weeks(4));
    await newRental(500, 3, user2);
    await time.increase(time.duration.years(1));
    await realitio.setResult(3);
    await expectRevert(realitycards.claimCard(3, { from: user1 }), "Incorrect state");
    await realitycards.lockMarket();
    await realitycards.claimCard(3, { from: user1 })
    await expectRevert(realitycards.upgradeCard(3, { from: user1 }), "Incorrect state");
    await proxyL2.getWinnerFromOracle(realitycards.address);
    await realitycards.withdraw({ from: user1 });
    await expectRevert(realitycards.upgradeCard(3, { from: user2 }), "Not owner");
    await realitycards.upgradeCard(3, { from: user1 });
    var ownerxdai = await realitycards.ownerOf(3);
    assert.equal(ownerxdai, realitycards.address);
    var ownermainnet = await nftHubL1.ownerOf(3);
    assert.equal(ownermainnet, user1);
    // check token uri
    var tokenuri = await nftHubL1.tokenURI(3);
    assert.equal("uri", tokenuri);
    // test cant call certain functions directly
    await expectRevert(proxyL2.saveCardToUpgrade(3, "asdfsadf", user0), "Not market");
    await expectRevert(proxyL1.upgradeCard(3, "asdfsadf", user0), "Not bridge");
    // now, create new market and make sure token IDs on mainnet increment correctly
    var nftMintCount = await rcfactory.totalNftMintCount.call();
    assert.equal(nftMintCount, 20);
    var realitycards2 = await createMarketWithArtistSet();
    await rcfactory.changeMarketApproval(realitycards2.address);
    await newRentalCustomContract(realitycards2, 1, 5, user3);
    await time.increase(time.duration.years(1));
    await realitio.setResult(5);
    await realitycards2.lockMarket();
    await proxyL2.getWinnerFromOracle(realitycards2.address);
    // await realitycards2.determineWinner();
    await realitycards2.claimCard(5, { from: user3 })
    await realitycards2.upgradeCard(5, { from: user3 });
    var ownermainnet = await nftHubL1.ownerOf(25);
    assert.equal(ownermainnet, user3);
    var tokenuri = await nftHubL1.tokenURI(25);
    assert.equal("x", tokenuri);
    await time.increase(time.duration.minutes(10));
    await withdrawDeposit(1000, user1);
    await withdrawDeposit(1000, user3);
  });


  it('test dai->xdai bridge', async () => {
    // add 1000 eth to the float
    await erc20.approve(proxyL2.address, ether('1000'));
    await proxyL2.topupFloat(ether('100'));
    // check cant confirm deposit if not validator
    await expectRevert(proxyL2.confirmDaiDeposit(user1, ether('10'), 0), "Not a validator");
    // add user9 as validator
    await proxyL2.setValidator(user9, true);
    // backend just saw user1 send 10 eth
    await proxyL2.confirmDaiDeposit(user1, ether('10'), 0, { from: user9 });
    // check user1 received 10 eth
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // confirm again check funds not sent again
    await proxyL2.confirmDaiDeposit(user1, ether('10'), 0, { from: user9 });
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // check cant call execute when already executed
    await expectRevert(proxyL2.executeDaiDeposit(0), "Already executed");
    // add a second validator, new deposit, should not have executed yet
    await proxyL2.setValidator(user8, true);
    await proxyL2.confirmDaiDeposit(user2, ether('20'), 1, { from: user9 });
    var deposit = await treasury.userDeposit.call(user2);
    assert.equal(deposit.toString(), ether('0').toString());
    // catch errors if different details
    await expectRevert(proxyL2.confirmDaiDeposit(user5, ether('20'), 1, { from: user8 }), "Addresses don't match");
    await expectRevert(proxyL2.confirmDaiDeposit(user2, ether('10'), 1, { from: user8 }), "Amounts don't match");
    // catch errors if call execute before confirmed
    await expectRevert(proxyL2.executeDaiDeposit(1), "Not confirmed");
    // second confirmation, should now execute
    await proxyL2.confirmDaiDeposit(user2, ether('20'), 1, { from: user8 });
    var deposit = await treasury.userDeposit.call(user2);
    assert.equal(deposit.toString(), ether('20').toString());
    // Transfer more than the contract has
    await proxyL2.confirmDaiDeposit(user3, ether('150'), 2, { from: user8 });
    await proxyL2.confirmDaiDeposit(user3, ether('150'), 2, { from: user9 });
    // check user has received nothing
    var deposit = await treasury.userDeposit.call(user3);
    assert.equal(deposit.toString(), ether('0').toString());
    // transfer the extra, and try again
    await proxyL2.topupFloat(ether('100'));
    await proxyL2.executeDaiDeposit(2);
    var deposit = await treasury.userDeposit.call(user3);
    assert.equal(deposit.toString(), ether('150').toString());
    // test remove validator
    await proxyL2.setValidator(user8, false);
    // third transfer, should execute immediately
    await proxyL2.confirmDaiDeposit(user4, ether('3'), 3, { from: user9 });
    var deposit = await treasury.userDeposit.call(user4);
    assert.equal(deposit.toString(), ether('3').toString());
    // test withdraw float
    var balanceBefore = await erc20.balanceOf(user0);
    await proxyL2.withdrawFloat(ether('5'));
    var balanceAfter = await erc20.balanceOf(user0);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var difference = Math.abs(depositWithdrawn.toString() - ether('5').toString());
    assert.isBelow(difference / deposit, 0.00001);
  });

  it('test dai->xdai bridge if exceeds contract balance limit', async () => {
    // set Treasury max balance
    await treasury.setMaxContractBalance(web3.utils.toWei('100', 'ether'));
    // add 1000 eth to the float
    await erc20.approve(proxyL2.address, ether('1000'));
    await erc20.transfer(proxyL2.address, ether('1000'));
    // add user9 as validator
    await proxyL2.setValidator(user9, true);
    // backend just saw user1 send 10 eth
    await proxyL2.confirmDaiDeposit(user1, ether('75'), 0, { from: user9 });
    // check user1 received 10 eth
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('75').toString());
    // repeat the above, this time it should be diverted to user's balance
    var balanceBefore = await erc20.balanceOf(user1);
    await proxyL2.confirmDaiDeposit(user1, ether('75'), 1, { from: user9 });
    var balanceAfter = await erc20.balanceOf(user1);
    var depositWithdrawn = await balanceAfter - balanceBefore;
    var difference = Math.abs(depositWithdrawn.toString() - ether('75').toString());
    console.log("before", balanceBefore.toString());
    console.log("after", balanceAfter.toString());
    assert.isBelow(difference / deposit, 0.00001);
  });

  it('test deposit dai mainnet proxy', async () => {
    // make sure ARB has enough funds
    await alternateReceiverBridge.send(web3.utils.toWei('100', 'ether'));
    // send 10 dai via mainnet
    await proxyL1.depositDai(web3.utils.toWei('10', 'ether'));
    // check xdai proxy now has 10 xDai
    var balance = await web3.eth.getBalance(proxyL2.address);
    assert.equal(balance, ether('10'));
    // add user9 as validator
    await proxyL2.setValidator(user9, true);
    // backend just saw user1 send 10 eth
    await proxyL2.confirmDaiDeposit(user1, ether('10'), 0, { from: user9 });
    // check user1 received 10 eth
    var deposit = await treasury.userDeposit.call(user1);
    assert.equal(deposit.toString(), ether('10').toString());
    // disable deposits, should revert
    await proxyL1.changeDepositsEnabled();
    await expectRevert(proxyL1.depositDai(web3.utils.toWei('10', 'ether')), "Deposits disabled");
    // enable deposits, should not revert
    await proxyL1.changeDepositsEnabled();
    await proxyL1.depositDai(web3.utils.toWei('15', 'ether'));
    var balance = await web3.eth.getBalance(proxyL2.address);
    assert.equal(balance, ether('15'));
  });




});