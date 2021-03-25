const { BN, time } = require('@openzeppelin/test-helpers')
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
var ARBMockup = artifacts.require('./mockups/AlternateReceiverBridgeMockup.sol')

// variables
// TODO: update chilvers' script with the relevant addresses here https://github.com/realitio/realitio-contracts/blob/master/config/arbitrators.json
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59'
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e'
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47'
var arbAddressMainnet = '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016'
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D'

// UPDATE THIS AFTER STAGE 1
var xdaiProxyAddress = '0x9e15161380f76311Ed7C33AdFF52f928Fb27D84D'

// UPDATE THIS AFTER STAGE 2
var mainnetProxyAddress = '0x5a38d0f63f72a882fd78a1dfdaa18bb5a041f9cf'

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
    await factory.setNftHubAddress(nfthubxdai.address)
    // deploy xdai proxy
    await deployer.deploy(
      XdaiProxy,
      ambAddressXdai,
      rcfactory.address,
      treasury.address,
      realitioAddress,
      arbAddressMainnet
    )
    xdaiproxy = await XdaiProxy.deployed()
    // tell factory about the proxy
    await factory.setProxyXdaiAddress(xdaiproxy.address)
  } else if (network === 'stage2') {
    // mainnet
    // deploy mainnet proxy
    // realitoaddress and Daimockup need changing for live deployment
    await deployer.deploy(
      MainnetProxy,
      ambAddressMainnet,
      realitioAddress,
      arbAddressMainnet,
      DaiMockup
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
    realitio = await RealitioMockup.deployed()
    await deployer.deploy(BridgeMockup)
    bridge = await BridgeMockup.deployed()
    await deployer.deploy(DaiMockup)
    dai = await DaiMockup.deployed()
    await deployer.deploy(ARBMockup)
    arb = await ARBMockup.deployed()
    // deploy bridge contracts
    await deployer.deploy(
      XdaiProxy,
      bridge.address,
      factory.address,
      treasury.address,
      realitioAddress,
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

    // create market #1
    var tokenURIs = [
      'https://cdn.realitycards.io/nftmetadata/uni/token0.json',
      'https://cdn.realitycards.io/nftmetadata/uni/token1.json',
      'https://cdn.realitycards.io/nftmetadata/uni/token2.json',
      'https://cdn.realitycards.io/nftmetadata/uni/token3.json'
    ]

    var sixtySeconds = 60
    var latestTime = await time.latest()
    var oneYear = new BN('31104000')
    var oneYearInTheFuture = oneYear.add(latestTime)
    var marketLockingTime = oneYearInTheFuture
    var oracleResolutionTime = oneYearInTheFuture
    var timestamps = [latestTime, marketLockingTime, oracleResolutionTime]
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US'
    var ipfsHashes = argv['ipfs_hash']

    await time.increase(time.duration.weeks(1))

    const artistAddress = '0x0000000000000000000000000000000000000000'
    const affiliateAddress = '0x0000000000000000000000000000000000000000'
    const cardAffiliateAddress = ['0x0000000000000000000000000000000000000000']

    // market 1
    await factory.createMarket(
      0,
      ipfsHashes[0],
      timestamps,
      tokenURIs,
      artistAddress,
      affiliateAddress,
      cardAffiliateAddress,
      question
    )

    var marketAddress = await factory.getMostRecentMarket.call(0)
    console.log('marketAddress #1: ', marketAddress)

    realitycards = await RCMarket.at(marketAddress)
    var marketLockingTime = await realitycards.marketLockingTime.call()
    console.log('marketLockingTime: ', marketLockingTime.toString())
    var marketOpeningTime = await realitycards.marketOpeningTime.call()
    console.log('marketOpeningTime: ', marketOpeningTime.toString())
    var marketState = await realitycards.state.call()
    console.log('marketState: ', marketState.toString())

    console.log('factory.address: ', factory.address)
    console.log('treasury.address: ', treasury.address)
  } else {
    console.log('No deploy script for this network')
  }
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
