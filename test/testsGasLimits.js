const { assert } = require('hardhat');
const {
  BN,
  expectRevert,
  ether,
  expectEvent,
  balance,
  time
} = require('@openzeppelin/test-helpers');

// chose the test to run by setting this to the number, or 0 to ignore these tests.
var testChoice = 4;
// 1 = test maximum number of bids/user
// 2 = test maximum number of bids/user - with underbidders
// 3 = test maximum number of cards/market

// maximum time to run tests for, remember Ctrl+C can cancel early
var timeoutSeconds = 100000;

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

var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D';

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

contract('TestTreasury', (accounts) => {

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
    mainnetproxy = await MainnetProxy.new(bridge.address, realitio.address, nfthubmainnet.address, alternateReceiverBridge.address, dai.address, kleros);
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
    );
    var marketAddress = await rcfactory.getMostRecentMarket.call(mode);
    realitycards2 = await RCMarket.at(marketAddress);
    return realitycards2;
  }

  async function depositDai(amount, user) {
    amount = web3.utils.toWei(amount.toString(), 'ether');
    await treasury.deposit(user, { from: user, value: amount });
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
    await treasury.withdrawDeposit(amount, { from: userx });
  }

  if (testChoice == 1) {
    it('test maximum number of bids/user', async () => {
      var bidsPerMarket = 1; //max is 20
      var dummyMarkets = 0;

      user = user0;
      var i = 0;
      var j = 0;
      var k = 0;
      var markets = [];
      var originalMarket = await rcfactory.getMostRecentMarket.call(0);
      markets.push(originalMarket);
      console.log('original market: ', markets[markets.length - 1]);
      tokenPrice = web3.utils.toWei('1', 'ether');
      withdrawAmount = tokenPrice * 20;
      console.log('starting loop');
      while (true) {
        // we're stuck here now, hold on tight!
        k++
        console.log('iteration k ', k);
        await depositDai(100, user);
        for (j = dummyMarkets; j < k; j++) {
          // start slowly, 1 market at a time
          //console.log('Market index ', j);
          tempMarket = await RCMarket.at(markets[j]);


          for (i = 0; i < bidsPerMarket; i++) {
            //await newRental(1,i,user);
            await tempMarket.newRental(tokenPrice, 0, zeroAddress, i, { from: user });
          }
        }
        console.log('Dummy Markets ', dummyMarkets);
        console.log('About to withdraw from ', (k * i) - dummyMarkets);

        //var market = await treasury.totalDeposits();
        //console.log(market.toString());
        await time.increase(time.duration.seconds(600));

        //await withdrawDeposit(web3.utils.toWei('100', 'ether'),user);
        await treasury.withdrawDeposit(web3.utils.toWei('100000', 'ether'), { from: user });

        await time.increase(time.duration.seconds(600));

        var userBids = await treasury.userTotalBids(user);
        console.log(userBids.toString());
        //console.log(user);

        // create another market for the next loop and add it to the array
        var latestTime = await time.latest();
        var oneYear = new BN('31104000');
        var oneYearInTheFuture = oneYear.add(latestTime);
        var marketLockingTime = oneYearInTheFuture;
        var oracleResolutionTime = oneYearInTheFuture;
        var timestamps = [0, marketLockingTime, oracleResolutionTime];
        var artistAddress = '0x0000000000000000000000000000000000000000';
        var affiliateAddress = '0x0000000000000000000000000000000000000000';
        var tokenURIs = ['x', 'x', 'x', 'uri', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x']; // 20 tokens
        var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
        var cardRecipients = ['0x0000000000000000000000000000000000000000']
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
        markets.push(await rcfactory.getMostRecentMarket.call(0));
        console.log('new market: ', markets[markets.length - 1]);
      }

    }).timeout(timeoutSeconds);
  }
  if (testChoice == 2) {
    it('test maximum number of bids/user - with underbidders', async () => {
      var bidsPerMarket = 1; //max is 20
      var dummyMarkets = 0;
      var dummyUsers = 9;
      var totalMarkets = 45;

      user = user0;
      var i = 0;
      var j = 0;
      var k = 0;
      var markets = [];
      var originalMarket = await rcfactory.getMostRecentMarket.call(0);
      markets.push(originalMarket);
      console.log('original market: ', markets[markets.length - 1]);
      tokenPrice = web3.utils.toWei('1', 'ether');
      priceInt = 1;
      withdrawAmount = tokenPrice * 20;
      console.log('starting loop');

      //create markets
      for (i = 0; i < totalMarkets; i++) {
        // create another market for the next loop and add it to the array
        var latestTime = await time.latest();
        var oneYear = new BN('31104000');
        var oneYearInTheFuture = oneYear.add(latestTime);
        var marketLockingTime = oneYearInTheFuture;
        var oracleResolutionTime = oneYearInTheFuture;
        var timestamps = [0, marketLockingTime, oracleResolutionTime];
        var artistAddress = '0x0000000000000000000000000000000000000000';
        var affiliateAddress = '0x0000000000000000000000000000000000000000';
        var tokenURIs = ['x', 'x', 'x', 'uri', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x']; // 20 tokens
        var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
        var cardRecipients = ['0x0000000000000000000000000000000000000000']
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
        markets.push(await rcfactory.getMostRecentMarket.call(0));
        console.log('new market: ', markets[markets.length - 1]);
      }

      //dummy users placing high bids to burn their deposit fast
      for (m = 1; m < dummyUsers + 1; m++) {
        user = eval("user" + m);
        await depositDai(10, user);
        tokenPrice = web3.utils.toWei('10', 'ether');
        console.log('Placing high bid for user ', user);
        console.log('Market index ', m);
        tempMarket = await RCMarket.at(markets[m]);
        await tempMarket.newRental(tokenPrice, 0, zeroAddress, 0, { from: user });
      }

      startPrice = 1;
      // dummy users placing incremental bids on the same cards
      for (m = 1; m < dummyUsers + 1; m++) {
        user = eval("user" + m);
        //increase the price for each user
        startPrice = startPrice * 1.1;
        tokenPrice = web3.utils.toWei(startPrice.toString(), 'ether');
        console.log('Placing bids for user ', user);
        //place bids
        for (j = 10; j < totalMarkets - 10; j++) {
          console.log('Market index ', j);
          tempMarket = await RCMarket.at(markets[j]);
          await tempMarket.newRental(tokenPrice, 0, zeroAddress, 0, { from: user });
        }
      }


      await time.increase(time.duration.weeks(5));

      // go through the dummy markets and rent collect to burn user deposits
      for (j = 0; j < 10; j++) {
        tempMarket = await RCMarket.at(markets[j]);
        await tempMarket.collectRentAllCards();
        console.log('colleced rent on ', markets[j]);
        user = eval("user" + j);
        var deposit = await treasury.userDeposit.call(user);
        console.log('user deposit left ', deposit.toString());
      }

      console.log('Dummy bids placed, time accelerated ');

      // this is the main user we care about
      startPrice = startPrice * 1.1;
      tokenPrice = web3.utils.toWei(startPrice.toString(), 'ether')
      user = user0
      await depositDai(100, user);
      for (j = 10; j < totalMarkets - 10; j++) {
        tempMarket = await RCMarket.at(markets[j]);
        await tempMarket.newRental(tokenPrice, 0, zeroAddress, 0, { from: user });
      }
      //console.log('Dummy Markets ', dummyMarkets);
      console.log('About to withdraw main user ',);
      var userBids = await treasury.userTotalBids(user);
      console.log(userBids.toString());
      console.log('main user is: ', user);
      var owner = await tempMarket.ownerOf(0)
      console.log('card owner is ', owner)

      //var market = await treasury.totalDeposits();
      //console.log(market.toString());
      await time.increase(time.duration.seconds(600));

      //await withdrawDeposit(web3.utils.toWei('100', 'ether'),user);
      await treasury.withdrawDeposit(web3.utils.toWei('10000', 'ether'), { from: user });

      await time.increase(time.duration.seconds(600));

      var userBids = await treasury.userTotalBids(user);
      console.log(userBids.toString());
      //console.log(user);


    }).timeout(timeoutSeconds);
  }
  if (testChoice == 3) {
    it('test maximum number of cards/market', async () => {
      var markets = [];
      var tokenURIs = ['x']; // Start with 1 token
      
      //create markets
      while (true) {
        // create another market for the next loop and add it to the array
        var latestTime = await time.latest();
        var oneYear = new BN('31104000');
        var oneYearInTheFuture = oneYear.add(latestTime);
        var marketLockingTime = oneYearInTheFuture;
        var oracleResolutionTime = oneYearInTheFuture;
        var timestamps = [0, marketLockingTime, oracleResolutionTime];
        var artistAddress = '0x0000000000000000000000000000000000000000';
        var affiliateAddress = '0x0000000000000000000000000000000000000000';
        var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
        var cardRecipients = ['0x0000000000000000000000000000000000000000']
        console.log('number of cards', tokenURIs.length);
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
        markets.push(await rcfactory.getMostRecentMarket.call(0));
        console.log('new market: ', markets[markets.length - 1]);
        tokenURIs.push('X');
      }
    }).timeout(timeoutSeconds);
  }

  if (testChoice == 4) {
    it('test maximum number of cards/market', async () => {
      var markets = [];
      var tokenURIs = ['x']; // Start with 1 token
      var tokenPrice = web3.utils.toWei('1', 'ether')
      //create markets
      while (true) {
        // create another market for the next loop and add it to the array
        var latestTime = await time.latest();
        var oneYear = new BN('31104000');
        var oneYearInTheFuture = oneYear.add(latestTime);
        var marketLockingTime = oneYearInTheFuture;
        var oracleResolutionTime = oneYearInTheFuture;
        var timestamps = [0, marketLockingTime, oracleResolutionTime];
        var artistAddress = '0x0000000000000000000000000000000000000000';
        var affiliateAddress = '0x0000000000000000000000000000000000000000';
        var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
        var cardRecipients = ['0x0000000000000000000000000000000000000000']
        console.log('number of cards', tokenURIs.length);
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
        markets.push(await rcfactory.getMostRecentMarket.call(0));
        console.log('new market: ', markets[markets.length - 1]);
        tempMarket = await RCMarket.at(markets[markets.length - 1]);
        await depositDai(100, user0);
        for (i = 0; i < tokenURIs.length; i++) {
          //await newRental(1,i,user);
          await tempMarket.newRental(tokenPrice, 0, zeroAddress, i, { from: user0 });
        }

        await time.increase(time.duration.seconds(600));
        console.log('collecing rent on all cards ')
        await tempMarket.collectRentAllCards();
        await time.increase(time.duration.seconds(600));
        //await withdrawDeposit(web3.utils.toWei('100', 'ether'),user);
        await treasury.withdrawDeposit(web3.utils.toWei('10000', 'ether'), { from: user0 });

        tokenURIs.push('X');
      }
    }).timeout(timeoutSeconds);
  }
});