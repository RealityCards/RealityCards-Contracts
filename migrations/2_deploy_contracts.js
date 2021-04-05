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
    // accounts.map((account, index) =>
    //   console.log('Account ' + index + ' : ', account)
    // )

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

    console.log('Initial contracts deployed')

    /***************************************
     *                                     *
     *    START LOCAL TESTING SETUP HERE   *
     *                                     *
     **************************************/

    // create a market with one of the ipfs hashes, options passed in must be in curly braces{}
    // all other values are the default values (4 cards, starting right away, closing in one year)
    // TAKE CARE, Misspelling an option will silently fail
    // TAKE CARE, if using the same ipfs for two markets, the second market won't be displayed in the UI - the slug should be unique
    await createMarket({ ipfs: ipfsHashes[0] })
    console.log('New market here: ', market[0].address)
    // market is an array of market objects, this is how you can access a market and call its methods (rent, exit, withdraw winnings)

    // create 6 markets (#1-6)
    await createMarket({
      ipfs: ipfsHashes[1],
      closeTime: time.duration.weeks(3)
    })
    await createMarket({
      ipfs: ipfsHashes[2],
      closeTime: time.duration.weeks(4)
    })
    await createMarket({
      ipfs: ipfsHashes[3],
      closeTime: time.duration.weeks(5)
    })
    await createMarket({
      ipfs: ipfsHashes[4],
      closeTime: time.duration.weeks(3)
    })
    await createMarket({
      ipfs: ipfsHashes[5],
      closeTime: time.duration.weeks(4)
    })
    await createMarket({
      ipfs: ipfsHashes[6],
      closeTime: time.duration.weeks(5)
    })

    console.log('Markets #1-6 deployed')

    // make some deposits
    await depositDai(500, accounts[0])
    await depositDai(900, accounts[1])
    await depositDai(500, accounts[2])
    await depositDai(500, accounts[3])
    await depositDai(500, accounts[4])
    await depositDai(500, accounts[5])
    await depositDai(500, accounts[6])
    await depositDai(500, accounts[7])
    await depositDai(500, accounts[8])
    await depositDai(500, accounts[9])
    await depositDai(500, accounts[10])
    await depositDai(500, accounts[11])
    await depositDai(500, accounts[12])

    console.log('Deposits done')

    //rent a card, if the price is not specified it will rent at 10% higher than the current price (or 1 if current is 0)
    await rent({ from: accounts[1], market: market[0], outcome: 0 })
    // skip some time
    await time.increase(time.duration.days(3))
    // exit position
    await exit({ from: accounts[1], market: market[0], outcome: 0 })

    console.log('Test rent done')

    // account1 setup: rent 4 winnings cards, 6 losing cards, 6 locked cards

    // 3 locked cards (market#1)
    await rent({
      from: accounts[1],
      market: market[1],
      outcome: 0,
      price: '20'
    })
    await time.increase(time.duration.hours(2))
    await exit({ from: accounts[1], market: market[1], outcome: 0 })

    await rent({
      from: accounts[1],
      market: market[1],
      outcome: 1,
      price: '10'
    })
    await time.increase(time.duration.hours(4))
    await exit({ from: accounts[1], market: market[1], outcome: 1 })

    await rent({ from: accounts[1], market: market[1], outcome: 2, price: '5' })
    await time.increase(time.duration.hours(6))
    await exit({ from: accounts[1], market: market[1], outcome: 2 })

    // 3 locked cards (market#2)
    await rent({ from: accounts[1], market: market[2], outcome: 2, price: '4' })
    await time.increase(time.duration.hours(3))
    await exit({ from: accounts[1], market: market[2], outcome: 2 })

    await rent({ from: accounts[1], market: market[2], outcome: 1, price: '8' })
    await time.increase(time.duration.hours(5))
    await exit({ from: accounts[1], market: market[2], outcome: 1 })

    await rent({
      from: accounts[1],
      market: market[2],
      outcome: 0,
      price: '66'
    })
    await time.increase(time.duration.hours(7))
    await exit({ from: accounts[1], market: market[2], outcome: 0 })

    console.log('Locked cards done')

    // 4 winnings cards (market#3)
    await rent({ from: accounts[1], market: market[3], outcome: 0, price: '4' })
    await time.increase(time.duration.hours(12))
    await exit({ from: accounts[1], market: market[3], outcome: 0 })

    await rent({ from: accounts[1], market: market[4], outcome: 1, price: '8' })
    await time.increase(time.duration.hours(5))
    await exit({ from: accounts[1], market: market[4], outcome: 1 })

    await rent({
      from: accounts[1],
      market: market[5],
      outcome: 2,
      price: '16'
    })
    await time.increase(time.duration.hours(7))
    await exit({ from: accounts[1], market: market[5], outcome: 2 })

    await rent({
      from: accounts[1],
      market: market[6],
      outcome: 3,
      price: '32'
    })
    await time.increase(time.duration.hours(9))
    await exit({ from: accounts[1], market: market[6], outcome: 3 })

    console.log('Winning cards done')

    // 6 losing cards
    await rent({ from: accounts[1], market: market[3], outcome: 1 })
    await time.increase(time.duration.hours(1))
    await exit({ from: accounts[1], market: market[3], outcome: 1 })

    await rent({ from: accounts[1], market: market[3], outcome: 2 })
    await time.increase(time.duration.hours(1))
    await exit({ from: accounts[1], market: market[3], outcome: 2 })

    await rent({ from: accounts[1], market: market[4], outcome: 2 })
    await time.increase(time.duration.hours(1))
    await exit({ from: accounts[1], market: market[4], outcome: 2 })

    await rent({ from: accounts[1], market: market[4], outcome: 3 })
    await time.increase(time.duration.hours(1))
    await exit({ from: accounts[1], market: market[4], outcome: 3 })

    await rent({
      from: accounts[1],
      market: market[5],
      outcome: 3
    })
    await time.increase(time.duration.hours(1))
    await exit({ from: accounts[1], market: market[5], outcome: 3 })

    await rent({
      from: accounts[1],
      market: market[6],
      outcome: 0
    })
    await time.increase(time.duration.hours(1))
    await exit({ from: accounts[1], market: market[6], outcome: 0 })

    console.log('Losing cards done')

    // skip more time to make sure all markets are past their closing time
    await time.increase(time.duration.weeks(5))

    // lock 2 markets (#1 and #2)
    await market[1].lockMarket()
    await market[2].lockMarket()

    // close 4 markets (#3-6)
    await closeMarket({ market: market[3], winningOutcome: 0 })
    await closeMarket({ market: market[4], winningOutcome: 1 })
    await closeMarket({ market: market[5], winningOutcome: 2 })
    await closeMarket({ market: market[6], winningOutcome: 3 })

    console.log('Closed markets done')

    // account#1 setup: rent some cards from market 0
    await rent({ from: accounts[1], market: market[0], outcome: 1, price: 5 })
    await rent({ from: accounts[1], market: market[0], outcome: 2, price: 10 })
    // set users to market#0's leaderboard and orderbook (outcome 0)
    await rent({ from: accounts[2], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(11))
    await rent({ from: accounts[3], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(22))
    await rent({ from: accounts[4], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(33))
    await rent({ from: accounts[5], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(44))
    await rent({ from: accounts[7], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(55))
    await rent({ from: accounts[8], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(66))
    await rent({ from: accounts[9], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(77))
    await rent({ from: accounts[10], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(88))
    await rent({ from: accounts[11], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(99))
    await rent({ from: accounts[12], market: market[0], outcome: 0 })
    await time.increase(time.duration.hours(200))

    console.log('Market#0 rents done')

    // create 2 markets (#7-8)
    await createMarket({
      ipfs: ipfsHashes[7],
      numberOfCards: 6,
      closeTime: time.duration.weeks(24)
    })
    await createMarket({
      ipfs: ipfsHashes[8],
      numberOfCards: 10,
      closeTime: time.duration.weeks(4)
    })

    // account#1 setup: rent some cards from markets 7 and 8
    await rent({ from: accounts[1], market: market[7], outcome: 0 })
    await time.increase(time.duration.hours(24))
    await rent({ from: accounts[1], market: market[7], outcome: 2, price: 7 })
    await rent({ from: accounts[1], market: market[7], outcome: 4, price: 9 })
    await time.increase(time.duration.hours(15))
    await rent({ from: accounts[1], market: market[8], outcome: 1 })
    await rent({ from: accounts[1], market: market[8], outcome: 3, price: 2 })
    await time.increase(time.duration.hours(18))
    await rent({ from: accounts[1], market: market[8], outcome: 5, price: 4 })
    await rent({ from: accounts[1], market: market[8], outcome: 7, price: 6 })
    await time.increase(time.duration.hours(10))
    await rent({ from: accounts[1], market: market[8], outcome: 9 })
    // high prices for market#10's cards
    await rent({
      from: accounts[2],
      market: market[7],
      outcome: 0,
      price: '10000'
    })
    await rent({
      from: accounts[2],
      market: market[7],
      outcome: 1,
      price: '33000'
    })
    await rent({
      from: accounts[2],
      market: market[7],
      outcome: 2,
      price: '67890'
    })
    await rent({
      from: accounts[2],
      market: market[7],
      outcome: 3,
      price: '100000'
    })
    await rent({
      from: accounts[2],
      market: market[7],
      outcome: 4,
      price: '1000000'
    })
    await rent({
      from: accounts[2],
      market: market[7],
      outcome: 5,
      price: '1000000000'
    })

    console.log('Markets#7-8 deployed')

    // create 2 markets (#9-10)
    await createMarket({
      ipfs: ipfsHashes[9],
      numberOfCards: 5,
      closeTime: time.duration.weeks(1)
    })
    await createMarket({
      ipfs: ipfsHashes[10],
      numberOfCards: 2,
      closeTime: time.duration.days(1)
    })

    // account#1 setup: rent some cards from markets 9 and 10
    await rent({ from: accounts[1], market: market[9], outcome: 3, price: 5 })
    await rent({ from: accounts[1], market: market[9], outcome: 4, price: 10 })
    await rent({ from: accounts[1], market: market[10], outcome: 0 })

    console.log('Markets#9-10 deployed')

    // create 2 markets with a delayed start (#11-12) - coming soon markets
    await createMarket({
      ipfs: ipfsHashes[11],
      openTime: time.duration.weeks(3),
      closeTime: time.duration.weeks(4)
    })
    await createMarket({
      ipfs: ipfsHashes[12],
      openTime: time.duration.days(2),
      closeTime: time.duration.weeks(9)
    })

    console.log('Markets#11-12 deployed')

    // create 1 market (#13) - random texts
    await createMarket({ ipfs: ipfsHashes[12], numberOfCards: 2 })

    console.log('Market#13 deployed')

    // you can force updating the state of an open market by calling collect for all cards (do this for all open markets)
    await market[0].collectRentAllCards()
    await market[7].collectRentAllCards()
    await market[8].collectRentAllCards()
    await market[9].collectRentAllCards()
    await market[10].collectRentAllCards()

    console.log('Collect rents from open markets')

    /* MARKET LEDGER
     * -------------------
     * Market#0  - open, 4 cards, 1 year until closed
     * Market#1  - locked, 4 cards
     * Market#2  - locked, 4 cards
     * Market#3  - closed, 4 cards, winning 0
     * Market#4  - closed, 4 cards, winning 1
     * Market#5  - closed, 4 cards, winning 2
     * Market#6  - closed, 4 cards, winning 3
     * Market#7  - open,  6 cards, 6 months until closed (high prices / expired cards)
     * Market#8  - open, 10 cards, 1 month until closed
     * Market#9  - open,  5 cards, 1 week until closed
     * Market#10 - open,  2 cards, 1 day until closed
     * Market#11 - coming soon, 4 cards, 3 weeks until open (short question)
     * Market#12 - coming soon, 4 cards, 2 days until open (long question)
     * Market#13 - open, 2 cards (testing ipfs strings)
     * -------------------
     * account#1 - 6 locked cards, 
     *             4 winning cards, 
     *             6 losing cards, 
     *             10 trophy cards,
     *             10 owned cards,
     *             14 active positions 
     * 
     * market#0, outcome#0 - 11 accounts leaderboard,
     *                       11 accounts orderbook   
     * /

    /**************************************
     *                                     *
     *    END LOCAL TESTING SETUP HERE     *
     *                                     *
     **************************************/

    console.log('Setup done!')
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
  var openTime = new BN(options.openTime).add(await time.latest())
  var closeTime = new BN(options.closeTime).add(await time.latest())
  var resolveTime = new BN(options.resolveTime).add(closeTime)
  var timestamps = [openTime, closeTime, resolveTime]
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

async function closeMarket(options) {
  var defaults = {
    market: market[0],
    winningOutcome: 0
  }
  options = setDefaults(options, defaults)

  await options.market.lockMarket()
  await realitio.setResult(options.winningOutcome)
  await mainnetproxy.getWinnerFromOracle(options.market.address)
  await options.market.determineWinner()
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

async function exit(options) {
  var defaults = {
    market: market[0],
    outcome: 0,
    from: 0x00
  }
  options = setDefaults(options, defaults)

  await options.market.exit(options.outcome, { from: options.from })
}

// Most recent deployments:

// Treasury: 0xa02a47b0dcdB907964411af1052c38747395E08D
// Factory: 0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7
// Proxy mainnet: [none]
