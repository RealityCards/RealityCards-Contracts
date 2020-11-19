const { BN, time } = require('@openzeppelin/test-helpers');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['ipfs_hash'],
});

/* globals artifacts */
var RealityCardsTreasury = artifacts.require('./RCTreasury.sol');
var RealityCardsFactory = artifacts.require('./RCFactory.sol');
var RealityCardsMarketXdaiV1 = artifacts.require('./RCMarketXdaiV1.sol');

// MAINNET ADDRESSES
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

module.exports = async (deployer, network, accounts) => {
  if (network === 'xdai') {
    deployer.deploy(RealityCardsTreasury).then(async () => {
      treasury = await RealityCardsTreasury.deployed();
      return deployer
        .deploy(RealityCardsFactory, treasury.address, realitioAddressMainnet)
        .then(async () => {
          factory = await RealityCardsFactory.deployed();
          return deployer.deploy(RealityCardsMarketXdaiV1).then(async () => {
            marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
            await factory.setReferenceContractAddress(0, marketXdaiV1.address);
            await treasury.setFactoryAddress(factory.address);
          });
        });
    });
  } else if (network === 'graphTesting') {
    console.log('Local Graph Testing, whoot whoot');

    user0 = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
    user4 = accounts[4];
    user5 = accounts[5];
    user6 = accounts[6];
    user7 = accounts[7];
    user8 = accounts[8];
    andrewsAddress = accounts[9];

    // print accounts
    accounts.map((account, index) =>
      console.log('Account' + index + ': ', account)
    );

    await deployer.deploy(RealityCardsTreasury);
    treasury = await RealityCardsTreasury.deployed();

    await deployer.deploy(RealityCardsFactory, treasury.address, accounts[0]);

    factory = await RealityCardsFactory.deployed();

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
    );

    marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();

    await treasury.setFactoryAddress(factory.address);
    await factory.setReferenceContractAddress(0, marketXdaiV1.address);

    // create market
    var tokenURIs = [
      'https://cdn.realitycards.io/nftmetadata/uni/token0.json',
      'https://cdn.realitycards.io/nftmetadata/uni/token1.json',
      'https://cdn.realitycards.io/nftmetadata/uni/token2.json',
      'https://cdn.realitycards.io/nftmetadata/uni/token3.json',
    ];

    var sixtySeconds = 60;
    var latestTime = new BN(Date.now() / 1000 + sixtySeconds);
    var oneYear = new BN('31104000');
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [latestTime, marketLockingTime, oracleResolutionTime];
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
    var tokenName = 'PresElection';
    var ipfsHash = argv['ipfs_hash'];

    await time.increase(time.duration.weeks(1));

    const artistAddress = andrewsAddress;

    await factory.createMarket(
      0,
      ipfsHash,
      timestamps,
      tokenURIs,
      artistAddress,
      question,
      tokenName
    );

    var marketAddress = await factory.getMostRecentMarket.call(0);

    realitycards = await RealityCardsMarketXdaiV1.at(marketAddress);
    var marketLockingTime = await realitycards.marketLockingTime.call();
    console.log('marketLockingTime: ', marketLockingTime.toString());
    var marketOpeningTime = await realitycards.marketOpeningTime.call();
    console.log('marketOpeningTime: ', marketOpeningTime.toString());
    var marketState = await realitycards.state.call();
    console.log('marketState: ', marketState.toString());

    await time.increase(time.duration.weeks(3));

    // for (var i = 0; i < 6; i++) {
    //   let more = (i + 1) * (1 + i / 10); // atleast more than 10%
    //   let amount = web3.utils.toWei(more.toString(), 'ether');
    //   let user = user0;
    //   i % 6 == 0
    //     ? (user = user0)
    //     : i % 5 == 1
    //     ? (user = user1)
    //     : i % 5 == 2
    //     ? (user = user2)
    //     : i % 5 == 3
    //     ? (user = user3)
    //     : i % 5 == 4
    //     ? (user = user4)
    //     : i % 5 == 5
    //     ? (user = user2)
    //     : (user = user5);

    //   await treasury.deposit(user, {
    //     from: user,
    //     value: amount + Math.floor(Math.random() * 9),
    //   });

    //   await realitycards.newRental(amount, 0, 0, { from: user });

    //   let numberOfDaysHeld = 3 + Math.floor(Math.random() * 3);

    //   await time.increase(time.duration.days(numberOfDaysHeld)); // enough time to ensure deposit runs out
    // }

    console.log('factory.address: ', factory.address);
    console.log('treasury.address: ', treasury.address);
    console.log('marketXdaiV1.address: ', marketXdaiV1.address);
    console.log('marketAddress: ', marketAddress);
  } else {
    console.log('No deploy script for this network');
  }
};
