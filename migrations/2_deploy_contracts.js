const { BN, time } = require('@openzeppelin/test-helpers')
const _ = require('underscore')
const argv = require('minimist')(process.argv.slice(2), {
  string: ['ipfs_hash']
})

/* globals artifacts */
var RCTreasury = artifacts.require('./RCTreasury.sol')
var RCFactory = artifacts.require('./RCFactory.sol')
var RCMarket = artifacts.require('./RCMarket.sol')
var NftHubXDai = artifacts.require('./nfthubs/RCNftHubXdai.sol')
var NftHubMainnet = artifacts.require('./nfthubs/RCNftHubMainnet.sol')
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyXdai.sol')
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyMainnet.sol')
var RealitioMockup = artifacts.require('./mockups/RealitioMockup.sol')
var BridgeMockup = artifacts.require('./mockups/BridgeMockup.sol')
var DaiMockup = artifacts.require('./mockups/DaiMockup.sol')

// variables
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59'
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e'
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47'
var arbAddressMainnet = '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016'
var daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f'

// UPDATE THIS AFTER STAGE 1
var xdaiProxyAddress = '0x9e15161380f76311Ed7C33AdFF52f928Fb27D84D'

// UPDATE THIS AFTER STAGE 2
var mainnetProxyAddress = '0x5a38d0f63f72a882fd78a1dfdaa18bb5a041f9cf'

var ipfsHashes = argv['ipfs_hash']

// an array of market instances
var market = []
// an array of the addresses (just a more readable way of doing market[].address)
var marketAddress = []
var zeroAddress = '0x0000000000000000000000000000000000000000'

module.exports = async (deployer, network, accounts) => {
  if (network === 'stage1') {
    // xdai
    // deploy treasury, factory, reference market and nft hub
    await deployer.deploy(RCTreasury)
    treasury = await RCTreasury.deployed()
    await deployer.deploy(RCFactory, treasury.address)
    factory = await RCFactory.deployed()
    await deployer.deploy(RCMarket)
    reference = await RCMarket.deployed()
    await deployer.deploy(NftHubXDai, factory.address)
    nfthubxdai = await NftHubXDai.deployed()
    // tell treasury about factory, tell factory about nft hub and reference
    await treasury.setFactoryAddress(factory.address)
    await factory.setReferenceContractAddress(reference.address)
    await factory.setNftHubAddress(nfthubxdai.address, 0)
    // deploy xdai proxy
    await deployer.deploy(
      XdaiProxy,
      ambAddressXdai,
      factory.address,
      treasury.address
    )
    xdaiproxy = await XdaiProxy.deployed()
    // tell factory about the proxy
    await factory.setProxyXdaiAddress(xdaiproxy.address)
  } else if (network === 'stage2') {
    // mainnet
    // deploy mainnet nft hub
    await deployer.deploy(NftHubMainnet)
    nfthubmainnet = await NftHubMainnet.deployed()
    // deploy mainnet proxy
    await deployer.deploy(
      MainnetProxy,
      ambAddressMainnet,
      realitioAddress,
      nfthubmainnet.address,
      arbAddressMainnet,
      daiAddressMainnet
    )
    mainnetproxy = await MainnetProxy.deployed()
    // set xdai proxy address
    await mainnetproxy.setProxyXdaiAddress(xdaiProxyAddress)
  } else if (network === 'stage3') {
    // xdai
    // set mainnet proxy address
    xdaiproxy = await XdaiProxy.deployed()
    await xdaiproxy.setProxyMainnetAddress(mainnetProxyAddress)
  } else if (network === 'graphTesting') {
    console.log('Local Graph Testing, whoot whoot')

    // Time skipping solver
    let block = await web3.eth.getBlock('latest')
    const preTimeSkippingBlockTimestamp = block.timestamp

    // Log all account addresses
    accounts.map((account, index) =>
      console.log('Account ' + index + ' : ', account)
    )

    // -------------------------------
    // Deploying the initial contracts
    // -------------------------------
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
    // mockups for testing purposes
    await deployer.deploy(RealitioMockup)
    realitio = await RealitioMockup.deployed()
    await deployer.deploy(BridgeMockup)
    bridge = await BridgeMockup.deployed()
    await deployer.deploy(DaiMockup)
    dai = await DaiMockup.deployed()
    // deploy bridge contracts
    await deployer.deploy(
      XdaiProxy,
      bridge.address,
      factory.address,
      treasury.address
    )
    xdaiproxy = await XdaiProxy.deployed()
    await deployer.deploy(
      MainnetProxy,
      bridge.address,
      realitio.address,
      nfthubmainnet.address,
      realitio.address,
      dai.address
    )
    // ^^ the second realitio.address is ARB, its fine, we're not testing ARB yet
    mainnetproxy = await MainnetProxy.deployed()
    // tell the factory, mainnet proxy and bridge the xdai proxy address
    await factory.setProxyXdaiAddress(xdaiproxy.address)
    await mainnetproxy.setProxyXdaiAddress(xdaiproxy.address)
    await bridge.setProxyXdaiAddress(xdaiproxy.address)
    // tell the xdai proxy and bridge the mainnet proxy address
    await xdaiproxy.setProxyMainnetAddress(mainnetproxy.address)
    await bridge.setProxyMainnetAddress(mainnetproxy.address)
    await nfthubmainnet.setProxyMainnetAddress(mainnetproxy.address)

    /***************************************
     *                                     *
     *    START LOCAL TESTING SETUP HERE   *
     *                                     *
     **************************************/

    // Deposit from 101 accounts
    for (let i = 0; i < accounts.length; i++) {
      await depositDai((100 * i + 1) % 5, accounts[i])
    }

    // Create a market
    await createMarket({ ipfs: ipfsHashes[0] })
    console.log('market with ipfs hash here: ', marketAddress[0])

    // Rent the first card by all 101 accounts
    for (let i = 0; i < accounts.length; i++) {
      await rent({ market: market[0], from: accounts[i] })
      await time.increase(time.duration.minutes(i + 1))
    }

    // Collect rent to show accurate info
    await market[0].collectRentAllCards()

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
}

async function createMarket(options) {
  // default values if no parameter passed
  // timestamps are in seconds from now
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US'
  var defaults = {
    mode: 0, // mode, 0 = classic, 1 = winner takes all, 2 = hot potato
    ipfs: 0x0, // ipfs hash
    openTime: 0, // seconds delay before market opens
    closeTime: 31536000, // seconds delay from now before market closes - default 31536000 = 1 year
    resolveTime: 0, // seconds delay from close before market resolves
    numberOfCards: 4, // the number of cards to create
    artistAddress: zeroAddress,
    affiliateAddress: zeroAddress,
    cardAffiliate: [zeroAddress] // remember this is an array
  }
  options = setDefaults(options, defaults)
  // assemble arrays
  var closeTime = new BN(options.closeTime).add(await time.latest())
  var resolveTime = new BN(options.resolveTime).add(closeTime)
  var timestamps = [options.openTime, closeTime, resolveTime]
  var tokenURIs = []
  for (i = 0; i < options.numberOfCards; i++) {
    tokenURIs.push('x')
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
  )
  marketAddress.push(await factory.getMostRecentMarket.call(0))
  market.push(await RCMarket.at(await factory.getMostRecentMarket.call(0)))
}

async function closeMarket(market, winningOutcome) {
  await market.lockMarket()
  await realitio.setResult(winningOutcome)
  await mainnetproxy.getWinnerFromOracle(market.address)
  await market.determineWinner()
}

async function depositDai(amount, user) {
  amount = web3.utils.toWei(amount.toString(), 'ether')
  await treasury.deposit(user, { from: user, value: amount })
}

function setDefaults(options, defaults) {
  return _.defaults({}, _.clone(options), defaults)
}

async function rent(options) {
  var defaults = {
    market: market[0],
    outcome: 0,
    from: 0x00,
    timeLimit: 0,
    startingPosition: zeroAddress
  }
  options = setDefaults(options, defaults)

  let newPrice = web3.utils.toWei('1', 'ether')
  if (options.price) {
    newPrice = web3.utils.toWei(options.price.toString(), 'ether')
  } else {
    const currentPrice = await options.market.price(options.outcome)
    const currentPriceBN = new BN(currentPrice)
    newPrice = currentPriceBN.add(currentPriceBN.div(new BN('10')))
    if (!newPrice.isZero()) {
      newPrice = newPrice.toString()
    } else {
      newPrice = web3.utils.toWei('1', 'ether')
    }
  }
  await options.market.newRental(
    newPrice,
    options.timeLimit,
    //options.startingPosition,
    options.outcome,
    { from: options.from }
  )
}

// Most recent deployments:

// Treasury: 0xa02a47b0dcdB907964411af1052c38747395E08D
// Factory: 0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7
// Proxy mainnet: [none]
