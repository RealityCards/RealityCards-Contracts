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
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
    ]; // 20 tokens

    var sixtySeconds = 60;
    var latestTime = new BN(Date.now() / 1000 + sixtySeconds);
    console.log("latestTime.toString()");
    console.log(latestTime.toString());
    var oneYear = new BN("31104000");
    var oneYearInTheFuture = oneYear.add(latestTime);
    var marketLockingTime = oneYearInTheFuture;
    console.log("marketLockingTime...........");
    console.log(marketLockingTime.toString());
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
    console.log("marketLockingTime");
    console.log(marketLockingTime.toString());
    var marketOpeningTime = await realitycards.marketOpeningTime.call();
    console.log("marketOpeningTime.toString()");
    console.log(marketOpeningTime.toString());
    var marketState = await realitycards.state.call();
    console.log("marketState.toString()");
    console.log(marketState.toString());

    amount = web3.utils.toWei((2).toString(), "ether");
    await treasury.deposit({ from: user0, value: amount });
    amount2 = web3.utils.toWei((4).toString(), "ether");
    await treasury.deposit({ from: user1, value: amount2 });

    price = web3.utils.toWei((2).toString(), "ether");
    console.log("pre rental");
    await realitycards.newRental(price, 1, { from: user0 });
    console.log("rental happened");
    price2 = web3.utils.toWei((4).toString(), "ether");
    console.log("pre rental2");
    await realitycards.newRental(price2, 1, { from: user1 });
    console.log("rental happened2");

    marketState = await realitycards.state.call();
    console.log("marketState.toString()");
    console.log(marketState.toString());

    console.log("factory.address: ", factory.address);
    console.log("treasury.address: ", treasury.address);
    console.log("marketXdaiV1.address: ", marketXdaiV1.address);
    console.log("marketAddress: ", marketAddress);
  } else {
    console.log("No deploy script for this network");
  }
};
