const { BN, time } = require("openzeppelin-test-helpers");

/* globals artifacts */
var RealityCardsTreasury = artifacts.require("./RCTreasury.sol");
var RealityCardsFactory = artifacts.require("./RCFactory.sol");
var RealityCardsMarketXdaiV1 = artifacts.require("./RCMarketXdaiV1.sol");

// MAINNET ADDRESSES
const daiAddressMainnet = "0x6b175474e89094c44da98b954eedeac495271d0f";
const realitioAddressMainnet = "0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47";

// XDAI ADDRESSES
const dummyAddresss = "0x34a971ca2fd6da2ce2969d716df922f17aaa1db0";

module.exports = async (deployer, network, accounts) => {
  if (network === "xdai") {
    deployer.deploy(RealityCardsTreasury).then(async () => {
      treasury = await RealityCardsTreasury.deployed();
      return deployer
        .deploy(RealityCardsFactory, treasury.address, realitioAddressMainnet)
        .then(async () => {
          factory = await RealityCardsFactory.deployed();
          return deployer.deploy(RealityCardsMarketXdaiV1).then(async () => {
            marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
            await factory.setReferenceContractAddress(0, marketXdaiV1.address);
          });
        });
    });
  } else if (network === "graphTesting") {
    console.log("Local Graph Testing, whoot whoot");

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
      console.log("Account" + index + ": ", account)
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

    await factory.setReferenceContractAddress(0, marketXdaiV1.address);

    // create market
    var tokenURIs = [
      "https://cdn.realitycards.io/nftmetadata/uni/token0.json",
      "https://cdn.realitycards.io/nftmetadata/uni/token1.json",
      "https://cdn.realitycards.io/nftmetadata/uni/token2.json",
      "https://cdn.realitycards.io/nftmetadata/uni/token3.json",
    ];

    var sixtySeconds = 60;
    var latestTime = new BN(Date.now() / 1000 + sixtySeconds);
    var oneYear = new BN("31104000");
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    var oracleResolutionTime = oneYearInTheFuture;
    var timestamps = [latestTime, marketLockingTime, oracleResolutionTime];
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
    var tokenName = "PresElection";

    await time.increase(time.duration.weeks(1));

    await factory.createMarket(
      0,
      "0x0",
      user0,
      timestamps,
      tokenURIs,
      question,
      tokenName
    );

    var marketAddress = await factory.getMostRecentMarket.call(0);

    realitycards = await RealityCardsMarketXdaiV1.at(marketAddress);
    var marketLockingTime = await realitycards.marketLockingTime.call();
    console.log("marketLockingTime: ", marketLockingTime.toString());
    var marketOpeningTime = await realitycards.marketOpeningTime.call();
    console.log("marketOpeningTime: ", marketOpeningTime.toString());
    var marketState = await realitycards.state.call();
    console.log("marketState: ", marketState.toString());

    await time.increase(time.duration.weeks(3));

    for (var i = 0; i < 6; i++) {
      let more = (i + 1) * (1 + i / 10); // atleast more than 10%
      let amount = web3.utils.toWei(more.toString(), "ether");
      let user = user0;
      i % 6 == 0
        ? (user = user0)
        : i % 5 == 1
        ? (user = user1)
        : i % 5 == 2
        ? (user = user2)
        : i % 5 == 3
        ? (user = user3)
        : i % 5 == 4
        ? (user = user4)
        : i % 5 == 5
        ? (user = user2)
        : (user = user5);

      await treasury.deposit({
        from: user,
        value: amount + Math.floor(Math.random() * 9),
      });
      await realitycards.newRental(amount, 0, { from: user });

      let numberOfDaysHeld = 3 + Math.floor(Math.random() * 3);

      await time.increase(time.duration.days(numberOfDaysHeld)); // enough time to ensure deposit runs out
    }

    console.log("factory.address: ", factory.address);
    console.log("treasury.address: ", treasury.address);
    console.log("marketXdaiV1.address: ", marketXdaiV1.address);
    console.log("marketAddress: ", marketAddress);
  } else {
    console.log("No deploy script for this network");
  }
};
