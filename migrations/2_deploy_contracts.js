// read in extra arguments, this is to help deploy across multiple networks
// myArgs[0] = first extra argument.. etc
var myArgs = process.argv.slice(6, 9)

const _ = require("underscore");
const { BN, time } = require('@openzeppelin/test-helpers');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['ipfs_hash']
})

/* globals artifacts */
var RCTreasury = artifacts.require("./RCTreasury.sol");
var RCFactory = artifacts.require("./RCFactory.sol");
var RCMarket = artifacts.require("./RCMarket.sol")
var NftHubXDai = artifacts.require('./nfthubs/RCNftHubXdai.sol');
var NftHubMainnet = artifacts.require('./nfthubs/RCNftHubL1.sol');
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyL2.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyL1.sol');
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");
var BridgeMockup = artifacts.require("./mockups/BridgeMockup.sol");
var DaiMockup = artifacts.require("./mockups/DaiMockup.sol");
var ARBMockup = artifacts.require('./mockups/AlternateReceiverBridgeMockup.sol')

// variables
// TODO: update chilvers' script with the relevant addresses here https://github.com/realitio/realitio-contracts/blob/master/config/arbitrators.json
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59';
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e';
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';
var arbAddressMainnet = '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016'; // may not be correct
var arbAddressXdai = '0x7301CFA0e1756B71869E93d4e4Dca5c7d0eb0AA6'; // may not be correct
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D'; //double check this
var daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f'

// Testnet addresses
var ambAddressSokol = '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560'
var ambAddressKovan = '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560'
var realitioAddressKovan = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47'
var arbAddressKovan = '0xA960d095470f7509955d5402e36d9DB984B5C8E2'
// this is just a blank ERC20 contract
var daiAddressKovan = '0xd133b22BCCcb3Cd3ca752D206b0632932D530Fda'

// read input arguments
var xdaiProxyAddress = myArgs[0]
var mainnetProxyAddress = myArgs[1]
var ipfsHashes = argv['ipfs_hash']

// an array of market instances
var market = [];
// an array of the addresses (just a more readable way of doing market[].address)
var marketAddress = [];
var zeroAddress = "0x0000000000000000000000000000000000000000";

module.exports = async (deployer, network, accounts) => {
  if (network === 'teststage1' || network === 'stage1') {
    // xdai
    // deploy treasury, factory, reference market and nft hub
    await deployer.deploy(RCTreasury);
    treasury = await RCTreasury.deployed();
    await deployer.deploy(RCFactory, treasury.address);
    factory = await RCFactory.deployed();
    await deployer.deploy(RCMarket);
    reference = await RCMarket.deployed();
    await deployer.deploy(NftHubXDai, factory.address);
    nfthubxdai = await NftHubXDai.deployed();
    // tell treasury about factory & ARB, tell factory about nft hub and reference
    await treasury.setFactoryAddress(factory.address);
    await treasury.setAlternateReceiverAddress(arbAddressXdai);
    await factory.setReferenceContractAddress(reference.address);
    await factory.setNftHubAddress(nfthubxdai.address, 0);
    // deploy xdai proxy
    if (network === 'stage1') {
      await deployer.deploy(
        XdaiProxy,
        ambAddressXdai,
        factory.address,
        treasury.address,
        realitioAddress,
        kleros
      )
    } else {
      // for sokol, deploy realitio mockup
      await deployer.deploy(RealitioMockup);
      realitio = await RealitioMockup.deployed();
      await deployer.deploy(
        XdaiProxy,
        ambAddressSokol,
        factory.address,
        treasury.address,
        realitio.address,
        kleros
      )
    }
    xdaiproxy = await XdaiProxy.deployed()
    // tell factory about the proxy
    await factory.setProxyXdaiAddress(xdaiproxy.address)

    // print out some stuff to be picked up by the deploy script ready for the next stage
    console.log('Completed stage 1')
    console.log('xDaiProxyAddress')
    console.log(xdaiproxy.address)
    console.log('RCTreasuryAddress')
    console.log(RCTreasury.address)
    console.log('RCFactoryAddress')
    console.log(RCFactory.address)
    console.log('RCMarketAddress')
    console.log(RCMarket.address)
    console.log('NFTHubXDAIAddress')
    console.log(NftHubXDai.address)
  } else if (network === 'teststage2' || network === 'stage2' || network === 'develop') {
    console.log('Begin Stage 2')
    // mainnet
    // deploy mainnet nft hub
    await deployer.deploy(NftHubMainnet)
    nfthubmainnet = await NftHubMainnet.deployed()
    if (network === 'stage2') {
      // deploy mainnet proxy on mainnet
      await deployer.deploy(MainnetProxy, ambAddressMainnet, realitioAddress, arbAddressMainnet);
    } else {
      // deploy mainnet proxy on Kovan
      await deployer.deploy(MainnetProxy, ambAddressKovan, realitioAddressKovan, arbAddressKovan);
    }

    mainnetproxy = await MainnetProxy.deployed();
    // set xdai proxy address
    await mainnetproxy.setProxyXdaiAddress(xdaiProxyAddress);

    console.log("Completed stage 2")

    // this text is used in the deploy script to locate the correct address
    console.log('TheNFTHubMainnetAddress')
    console.log(NftHubMainnet.address)
    console.log('TheMainnetProxyAddress')
    console.log(MainnetProxy.address)

  } else if (network === 'teststage3' || network === 'stage3') {
    console.log('Begin Stage 3')
    // xdai
    // set mainnet proxy address
    xdaiproxy = await XdaiProxy.deployed();
    await xdaiproxy.setProxyMainnetAddress(mainnetProxyAddress);
    console.log('Completed Stage 3')

  } else if (network === 'graphTesting') {
    console.log('Local Graph Testing, whoot whoot')

    user0 = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
    user3 = accounts[3]
    user4 = accounts[4]
    user5 = accounts[5]
    user6 = accounts[6]
    user7 = accounts[7]
    user8 = accounts[8]
    andrewsAddress = accounts[9]

    // print accounts
    accounts.map((account, index) =>
      console.log('Account' + index + ': ', account)
    )

    // deploy treasury, factory, reference market and nft hub
    await deployer.deploy(RCTreasury)
    treasury = await RCTreasury.deployed()
    await deployer.deploy(RCFactory, treasury.address)
    factory = await RCFactory.deployed()
    await deployer.deploy(RCMarket)
    reference = await RCMarket.deployed()
    await deployer.deploy(NftHubXDai, factory.address)
    nfthubxdai = await NftHubXDai.deployed()
    await deployer.deploy(NftHubMainnet)
    nfthubmainnet = await NftHubMainnet.deployed()
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(factory.address)
    await factory.setReferenceContractAddress(reference.address)
    await factory.setNftHubAddress(nfthubxdai.address, 0)
    // mockups
    await deployer.deploy(RealitioMockup)
    var realitio = await RealitioMockup.deployed()
    await deployer.deploy(BridgeMockup)
    var bridge = await BridgeMockup.deployed()
    await deployer.deploy(DaiMockup)
    var dai = await DaiMockup.deployed()
    await deployer.deploy(ARBMockup)
    var arb = await ARBMockup.deployed()
    await treasury.setAlternateReceiverAddress(arb.address)
    // deploy bridge contracts
    await deployer.deploy(
      XdaiProxy,
      bridge.address,
      factory.address,
      treasury.address,
      realitio.address,
      arbAddressMainnet
    )
    xdaiproxy = await XdaiProxy.deployed()
    await deployer.deploy(
      MainnetProxy,
      bridge.address,
      nfthubmainnet.address,
      arb.address,
      dai.address,
    )
    mainnetproxy = await MainnetProxy.deployed()
    // tell the factory, mainnet proxy and bridge the xdai proxy address
    await factory.setProxyXdaiAddress(xdaiproxy.address)
    await mainnetproxy.setProxyXdaiAddress(xdaiproxy.address)
    await bridge.setProxyXdaiAddress(xdaiproxy.address)
    // tell the xdai proxy and bridge the mainnet proxy address
    await xdaiproxy.setProxyMainnetAddress(mainnetproxy.address)
    await bridge.setProxyMainnetAddress(mainnetproxy.address)
    await nfthubmainnet.setProxyMainnetAddress(mainnetproxy.address)
    //var tempMarket;

    /***************************************
     *                                     *
     *    START LOCAL TESTING SETUP HERE   *
     *                                     *
     **************************************/


    // Make some deposits
    await depositDai(100, user0)
    await depositDai(100, user1)
    await depositDai(100, user2)

    // create a new market with all default values
    await createMarket()
    console.log('new market here: ', marketAddress[0])

    // marketAddress is an array of the market addresses, market is an array of market objects
    // so market[x].address == marketAddress[x]

    // create a market with one of the ipfs hashes, options passed in must be in cruly braces{}
    // TAKE CARE, Misspelling an option will silently fail
    await createMarket({ ipfs: ipfsHashes[0] })
    console.log('market with ipfs hash here: ', marketAddress[1])

    //rent a card, by default this is user0, market[0], card 0, 1 xDai
    await rent()

    // rent in the last market we made
    tempMarket = market[market.length - 1] //don't use a fixed index, incase we later create a market before this one
    await rent({ market: tempMarket })
    // same bidder, just increase the price from default 1, to 2 xDai/day
    await rent({ market: tempMarket, price: 2 })
    // new bidder and higher price
    await rent({ market: tempMarket, price: 3, from: user1 })
    // bid on a different outcome (outcome is zero index)
    await rent({ market: tempMarket, outcome: 1 })
    await rent({ market: tempMarket, outcome: 1, price: 3, from: user1 })

    console.log('renting in market ', tempMarket.address)

    await time.increase(time.duration.weeks(1))

    //tempMarket we copied from market[] so it's a market object which means we can call functions directly
    await tempMarket.collectRentAllCards()
    var countCards = await tempMarket.numberOfTokens()
    console.log('Number of cards in this market:', countCards.toString())


    // create a market with a delayed start, 10 cards and an ipfs hash 
    await createMarket({ openTime: 120, numberOfCards: 10, ipfs: ipfsHashes[1] })




    /**************************************
    *                                     *
    *    END LOCAL TESTING SETUP HERE     *
    *                                     *
    **************************************/


    console.log('factory.address: ', factory.address)
    console.log('treasury.address: ', treasury.address)
  } else {
    console.log('No deploy script for this network')
  }
};

async function createMarket(options) {
  // default values if no parameter passed
  // timestamps are in seconds from now
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var defaults = {
    mode: 0, // mode, 0 = classic, 1 = winner takes all, 2 = hot potato
    ipfs: 0x0, // ipfs hash
    openTime: 0, // seconds delay before market opens
    closeTime: 31536000, // seconds delay from now before market closes - default 31536000 = 1 year
    resolveTime: 0, // seconds delay from close before market resolves
    numberOfCards: 4, // the number of cards to create
    artistAddress: zeroAddress,
    affiliateAddress: zeroAddress,
    cardAffiliate: [zeroAddress], // remember this is an array
  };
  options = setDefaults(options, defaults);
  // assemble arrays
  var closeTime = new BN(options.closeTime).add(await time.latest());
  var resolveTime = new BN(options.resolveTime).add(closeTime);
  var timestamps = [options.openTime, closeTime, resolveTime];
  var tokenURIs = [];
  for (i = 0; i < options.numberOfCards; i++) {
    tokenURIs.push("x");
  }

  await factory.createMarket(
    options.mode,
    options.ipfs,
    timestamps,
    tokenURIs,
    options.artistAddress,
    options.affiliateAddress,
    options.cardAffiliate,
    question
  );
  marketAddress.push(await factory.getMostRecentMarket.call(0));
  market.push(await RCMarket.at(await factory.getMostRecentMarket.call(0)));
}

async function depositDai(amount, user) {
  amount = web3.utils.toWei(amount.toString(), "ether");
  await treasury.deposit(user, { from: user, value: amount });
}

function setDefaults(options, defaults) {
  return _.defaults({}, _.clone(options), defaults);
}

async function rent(options) {
  var defaults = {
    market: market[0],
    outcome: 0,
    price: 1,
    from: user0,
    timeLimit: 0,
    startingPosition: zeroAddress,
  };
  options = setDefaults(options, defaults);
  options.price = web3.utils.toWei(options.price.toString(), "ether");
  await options.market.newRental(options.price, options.timeLimit, options.startingPosition, options.outcome, { from: options.from });
}

// Most recent deployments:

// Treasury: 0xbfD33bb4e15140FcdC713e00fFA16bB86C8afe00
// Factory: 0x060e1BF56e238F3263fC9870c472936EEc09CeEb
// Proxy mainnet: 0x9ACd4771D37bc9994410084173Bd049936c8E054