// read in extra arguments, this is to help deploy across multiple networks
// myArgs[0] = first extra argument.. etc
var myArgs = process.argv.slice(6, 9)

const { BN, time } = require('@openzeppelin/test-helpers')
const argv = require('minimist')(process.argv.slice(2), {
  string: ['ipfs_hash']
})

/* globals artifacts */
var RCTreasury = artifacts.require("./RCTreasury.sol");
var RCFactory = artifacts.require("./RCFactory.sol");
var RCMarket = artifacts.require("./RCMarket.sol")
var NftHubXDai = artifacts.require('./nfthubs/RCNftHubXdai.sol');
var NftHubMainnet = artifacts.require('./nfthubs/RCNftHubMainnet.sol');
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyXdai.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyMainnet.sol');
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");
var BridgeMockup = artifacts.require("./mockups/BridgeMockup.sol");
var DaiMockup = artifacts.require("./mockups/DaiMockup.sol");

// variables
// TODO: update chilvers' script with the relevant addresses here https://github.com/realitio/realitio-contracts/blob/master/config/arbitrators.json
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59';
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e';
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';
var arbAddressMainnet = '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016';
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D';
var daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f'

// Testnet addresses
var ambAddressSokol = '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560'
var ambAddressKovan = '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560'
var realitioAddressKovan = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47'
var arbAddressKovan = '0xA960d095470f7509955d5402e36d9DB984B5C8E2'
// this is just a blank ERC20 contract
var daiAddressKovan = '0xd133b22BCCcb3Cd3ca752D206b0632932D530Fda'

// sets xDaiProxy as the first argument passed in
var xdaiProxyAddress = myArgs[0]

// sets mainnetProxyAddress as the second argument passed in
var mainnetProxyAddress = myArgs[1]

// an array of market instances
var market = [];
// an array of the addresses (just a more readable way of doing market[].address)
var marketAddress = [];

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
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(factory.address);
    await factory.setReferenceContractAddress(reference.address);
    await factory.setNftHubAddress(nfthubxdai.address);
    // deploy xdai proxy
    if (network === 'stage1') {
      await deployer.deploy(
        XdaiProxy,
        ambAddressXdai,
        factory.address,
        treasury.address
      )
    } else {
      await deployer.deploy(
        XdaiProxy,
        ambAddressSokol,
        factory.address,
        treasury.address
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
    await setupLocalDeployments();
    // START TEST DEPOYMENTS FROM HERE

    //create a market, no parameters means it'll use the default values
    await createMarket();
    console.log(market[0]);


    // END TEST DEPLOYMENTS HERE
    console.log('factory.address: ', factory.address)
    console.log('treasury.address: ', treasury.address)
  } else {
    console.log('No deploy script for this network')
  }
};

async function setupLocalDeployments() {
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
  await deployer.deploy(RCTreasury);
  treasury = await RCTreasury.deployed();
  await deployer.deploy(RCFactory, treasury.address);
  factory = await RCFactory.deployed();
  await deployer.deploy(RCMarket);
  reference = await RCMarket.deployed();
  await deployer.deploy(NftHubXDai, factory.address);
  nfthubxdai = await NftHubXDai.deployed();
  await deployer.deploy(NftHubMainnet);
  nfthubmainnet = await NftHubMainnet.deployed();
  // tell treasury about factory, tell factory about nft hub and reference
  await treasury.setFactoryAddress(factory.address);
  await factory.setReferenceContractAddress(reference.address);
  await factory.setNftHubAddress(nfthubxdai.address, 0);
  // mockups 
  await deployer.deploy(RealitioMockup);
  realitio = await RealitioMockup.deployed();
  await deployer.deploy(BridgeMockup);
  bridge = await BridgeMockup.deployed();
  await deployer.deploy(DaiMockup);
  dai = await DaiMockup.deployed();
  // deploy bridge contracts
  await deployer.deploy(XdaiProxy, bridge.address, factory.address, treasury.address);
  xdaiproxy = await XdaiProxy.deployed();
  await deployer.deploy(MainnetProxy, bridge.address, realitio.address, nfthubmainnet.address, realitio.address, dai.address, kleros.address);
  // ^^ the second realitio.address is ARB, its fine, we're not testing ARB yet
  mainnetproxy = await MainnetProxy.deployed();
  // tell the factory, mainnet proxy and bridge the xdai proxy address
  await factory.setProxyXdaiAddress(xdaiproxy.address);
  await mainnetproxy.setProxyXdaiAddress(xdaiproxy.address);
  await bridge.setProxyXdaiAddress(xdaiproxy.address);
  // tell the xdai proxy and bridge the mainnet proxy address
  await xdaiproxy.setProxyMainnetAddress(mainnetproxy.address);
  await bridge.setProxyMainnetAddress(mainnetproxy.address);
  await nfthubmainnet.setProxyMainnetAddress(mainnetproxy.address);

}

async function createMarket(options) {
  // default values if no parameter passed
  // mode, 0 = classic, 1 = winner takes all, 2 = hot potato
  // timestamps are in seconds from now
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var defaults = {
    mode: 0,
    openTime: 0,
    closeTime: 31536000,
    resolveTime: 31536000,
    numberOfCards: 4,
    artistAddress: zeroAddress,
    affiliateAddress: zeroAddress,
    cardAffiliate: [zeroAddress],
  };
  options = setDefaults(options, defaults);
  // assemble arrays
  var closeTime = new BN(options.closeTime).add(await time.latest());
  var resolveTime = new BN(options.resolveTime).add(await time.latest());
  var timestamps = [options.openTime, closeTime, resolveTime];
  var tokenURIs = [];
  for (i = 0; i < options.numberOfCards; i++) {
    tokenURIs.push("x");
  }

  await rcfactory.createMarket(
    options.mode,
    "0x0",
    timestamps,
    tokenURIs,
    options.artistAddress,
    options.affiliateAddress,
    options.cardAffiliate,
    question
  );
  marketAddress.push(await rcfactory.getMostRecentMarket.call(0));
  market.push(await RCMarket.at(await rcfactory.getMostRecentMarket.call(0)));
}

async function depositDai(amount, user) {
  amount = web3.utils.toWei(amount.toString(), "ether");
  await treasury.deposit(user, { from: user, value: amount });
}

function setDefaults(options, defaults) {
  return _.defaults({}, _.clone(options), defaults);
}

async function newRental(options) {
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

const rent = (user, market, tokenId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let tokenPrice = '0'
      let newPrice = '0'
      let dep = 0
      let ran = 1

      tokenPrice = await market.tokenPrice(tokenId)
      newPrice = parseInt(tokenPrice) + 0.11 * parseInt(tokenPrice)
      if (newPrice == 0) {
        newPrice = 1 + Math.floor(Math.random() * 6) + 1
        newPrice = await web3.utils.toWei(newPrice.toString(), 'ether')
      }
      ran = Math.floor(Math.random() * 23) + 1
      dep = newPrice / ran
      await market.newRental(newPrice.toString(), 0, tokenId, {
        from: user,
        value: dep
      })
      resolve('done!')
    } catch (err) {
      console.log('RENT CARD ERROR: ', err)
      reject(err)
    }
  })
}

// Most recent deployments:

// Treasury: 0xbfD33bb4e15140FcdC713e00fFA16bB86C8afe00
// Factory: 0x060e1BF56e238F3263fC9870c472936EEc09CeEb
// Proxy mainnet: 0x9ACd4771D37bc9994410084173Bd049936c8E054