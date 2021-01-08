const { BN, time } = require('@openzeppelin/test-helpers')
const argv = require('minimist')(process.argv.slice(2), {
  string: ['ipfs_hash']
})

/* globals artifacts */
var RealityCardsTreasury = artifacts.require('./RCTreasury.sol')
var RealityCardsFactory = artifacts.require('./RCFactory.sol')
var RealityCardsMarketXdaiV1 = artifacts.require('./RCMarketXdaiV1.sol')

// MAINNET ADDRESSES
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47'

module.exports = async (deployer, network, accounts) => {
  if (network === 'xdai') {
    deployer.deploy(RealityCardsTreasury).then(async () => {
      treasury = await RealityCardsTreasury.deployed()
      return deployer
        .deploy(RealityCardsFactory, treasury.address, realitioAddressMainnet)
        .then(async () => {
          factory = await RealityCardsFactory.deployed()
          return deployer.deploy(RealityCardsMarketXdaiV1).then(async () => {
            marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed()
            await factory.setReferenceContractAddress(0, marketXdaiV1.address)
            await treasury.setFactoryAddress(factory.address)
          })
        })
    })
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

    await deployer.deploy(RealityCardsTreasury)
    treasury = await RealityCardsTreasury.deployed()

    await deployer.deploy(RealityCardsFactory, treasury.address, accounts[0])

    factory = await RealityCardsFactory.deployed()

    await deployer.deploy(
      RealityCardsMarketXdaiV1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    )

    marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed()

    await treasury.setFactoryAddress(factory.address)
    await factory.setReferenceContractAddress(0, marketXdaiV1.address)

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
    var tokenName = 'PresElection'
    var ipfsHashes = argv['ipfs_hash']

    await time.increase(time.duration.weeks(1))

    const artistAddress = andrewsAddress

    // market 1
    await factory.createMarket(
      0,
      ipfsHashes[0],
      timestamps,
      tokenURIs,
      artistAddress,
      question,
      tokenName
    )

    var marketAddress = await factory.getMostRecentMarket.call(0)
    console.log('marketAddress #1: ', marketAddress)

    realitycards = await RealityCardsMarketXdaiV1.at(marketAddress)
    var marketLockingTime = await realitycards.marketLockingTime.call()
    console.log('marketLockingTime: ', marketLockingTime.toString())
    var marketOpeningTime = await realitycards.marketOpeningTime.call()
    console.log('marketOpeningTime: ', marketOpeningTime.toString())
    var marketState = await realitycards.state.call()
    console.log('marketState: ', marketState.toString())

    // market 2
    let threeWeeks = new BN('1814400')
    let threeWeeksInTheFuture = threeWeeks.add(latestTime)
    timestamps = [latestTime, threeWeeksInTheFuture, threeWeeksInTheFuture]

    await factory.createMarket(
      0,
      ipfsHashes[1],
      timestamps,
      tokenURIs,
      artistAddress,
      question,
      tokenName
    )

    var marketAddress2 = await factory.getMostRecentMarket.call(0)
    console.log('marketAddress #2: ', marketAddress2)

    realitycards2 = await RealityCardsMarketXdaiV1.at(marketAddress2)

    // TIME: 1 week
    await time.increase(time.duration.weeks(1))

    // 4 users renting the first card of market#1
    for (var i = 1; i <= 10; i++) {
      // user0 = 1 dai
      // user1 = 2
      // user2 = 3
      // user3 = 4
      // user0 = 5
      // user1 = 6
      // user2 = 7
      // user3 = 8
      // user0 = 9
      // user1 = 10

      let user = accounts[(i - 1) % 4]
      let amount = web3.utils.toWei(i.toString(), 'ether')
      await realitycards.newRental(amount, 0, 0, { from: user, value: amount })

      await time.increase(time.duration.hours(Math.floor(Math.random() * 9))) // hold for a few hours
    }

    // 4 users each renting a card of market#2
    for (var i = 1; i < 5; i++) {
      user = accounts[(i - 1) % 4]
      amount = web3.utils.toWei((i * 2).toString(), 'ether')
      await realitycards2.newRental(amount, 0, (i - 1) % 4, {
        from: user,
        value: amount
      })
    }

    // TIME: 5 hours
    await time.increase(time.duration.hours(5))

    // Same 4 users = deposit 50dai, change price of the card they own, withdraw 1dai
    for (var i = 1; i < 5; i++) {
      user = accounts[i - 1]
      more = i * 2 * (1 + (i * 2) / 10)
      amount = web3.utils.toWei(more.toString(), 'ether')

      await treasury.deposit(user, {
        from: user,
        value: web3.utils.toWei('50', 'ether')
      })

      await realitycards2.newRental(amount, 0, i - 1, {
        from: user
      })

      await treasury.withdrawDeposit(web3.utils.toWei('1', 'ether'), {
        from: user
      })
    }

    // user0 exits & withdraws all deposit
    await realitycards2.exit(0, {
      from: user0
    })
    let depositOfUser0 = await treasury.deposits.call(user0)
    await treasury.withdrawDeposit(depositOfUser0, {
      from: user0
    })

    // Uncomment the following lines to test the values when the market is locked
    // await time.increase(time.duration.weeks(2))
    // await realitycards2.lockMarket()

    // market 3
    let threeDays = new BN('259200')
    let threeDaysInTheFuture = threeDays.add(latestTime)
    timestamps = [latestTime, threeDaysInTheFuture, threeDaysInTheFuture]

    await factory.createMarket(
      0,
      ipfsHashes[2],
      timestamps,
      tokenURIs,
      artistAddress,
      question,
      tokenName
    )

    var marketAddress3 = await factory.getMostRecentMarket.call(0)
    console.log('marketAddress #3: ', marketAddress3)

    realitycards3 = await RealityCardsMarketXdaiV1.at(marketAddress3)

    // user8 renting a bunch of cards to test the active positions table
    await rent(user8, realitycards2, '1')
    await time.increase(time.duration.hours(Math.floor(Math.random() * 12) + 1))
    await rent(user7, realitycards2, '1')

    await rent(user8, realitycards2, '0')
    await rent(user8, realitycards2, '2')
    await time.increase(time.duration.hours(Math.floor(Math.random() * 12) + 1))
    await rent(user7, realitycards2, '2')

    await rent(user8, realitycards, '3')
    await time.increase(time.duration.hours(Math.floor(Math.random() * 12) + 1))
    await rent(user7, realitycards, '3')

    await rent(user8, realitycards, '2')

    await time.increase(time.duration.hours(Math.floor(Math.random() * 12) + 1))

    // lock and determine winner for market 2
    await time.increase(time.duration.weeks(3))
    await realitycards2.lockMarket()
    await time.increase(time.duration.hours(24))
    await realitycards2.determineWinner2('1')

    // Collect rent for all cards
    await realitycards.collectRentAllTokens()
    await realitycards.collectRentAllTokens()
    await realitycards.collectRentAllTokens()

    // Test ownership time with exact values (NEW MARKET)

    // market 4
    // latestTime = await time.latest()
    // threeWeeksInTheFuture = threeWeeks.add(latestTime)
    // timestamps = [latestTime, threeWeeksInTheFuture, threeWeeksInTheFuture]

    // await factory.createMarket(
    //   0,
    //   ipfsHashes[3],
    //   timestamps,
    //   tokenURIs,
    //   artistAddress,
    //   question,
    //   tokenName
    // )

    // var marketAddress4 = await factory.getMostRecentMarket.call(0)
    // console.log('marketAddress #4: ', marketAddress4)

    // realitycards4 = await RealityCardsMarketXdaiV1.at(marketAddress4)

    // marketState = await realitycards4.state.call()
    // console.log('marketState: ', marketState.toString())

    // price = await web3.utils.toWei('10', 'ether')
    // deposit = await web3.utils.toWei('40', 'ether')
    // await realitycards4.newRental(price, 0, '0', {
    //   from: user8,
    //   value: deposit
    // })

    // await time.increase(time.duration.days(4))
    // await realitycards4.collectRentAllTokens()

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

      tokenPrice = await market.price(tokenId)
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
