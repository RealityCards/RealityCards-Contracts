const { scripts, ConfigManager } = require("@openzeppelin/cli");
const { time } = require("@openzeppelin/test-helpers");
const { add, push, create } = scripts;

/* globals artifacts */
var RealityCardsTestDai = artifacts.require("./RCTestDAI.sol");
var RealityCardsTreasury = artifacts.require("./RCTreasury.sol");
var RealityCardsFactory = artifacts.require("./RCFactory.sol");
var RealityCardsMarketXdaiV1 = artifacts.require("./RCMarketXdaiV1.sol");

// MAINNET ADDRESSES
const daiAddressMainnet = "0x6b175474e89094c44da98b954eedeac495271d0f";
const realitioAddressMainnet = "0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47";

// XDAI ADDRESSES
const dummyAddresss = "0x34a971ca2fd6da2ce2969d716df922f17aaa1db0";

module.exports = async (deployer, networkName, accounts) => {
  if (networkName === "xdai") {
    deployer.deploy(RealityCardsTreasury).then(async () => {
      treasury = await RealityCardsTreasury.deployed();
      return deployer
        .deploy(RealityCardsFactory, dummyAddresss, treasury.address)
        .then(async () => {
          factory = await RealityCardsFactory.deployed();
          return deployer
            .deploy(RealityCardsMarketXdaiV1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            .then(async () => {
              marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
              await factory.setReferenceContractAddress(
                0,
                marketXdaiV1.address
              );
            });
        });
    });
  } else if (networkName === "graphTesting") {
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

    await deployer.deploy(RealityCardsTestDai, "10000" + "000000000000000000", {
      from: user0,
    });
    testDai = await RealityCardsTestDai.deployed();

    await deployer.deploy(
      RealityCardsFactory,
      testDai.address,
      treasury.address
    );

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
    var numberOfTokens = 20;
    var marketLockingTime = await time.latest();
    var oracleResolutionTime = await time.latest();
    var timestamps = [marketLockingTime, oracleResolutionTime];
    var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
    var arbitrator = user1;
    var timeout = 86400;
    var tokenName = "PresElection";
    await factory.createMarket(
      0,
      "0x0",
      user0,
      numberOfTokens,
      timestamps,
      question,
      arbitrator,
      timeout,
      tokenName
    );

    // mint cards
    var marketAddress = await factory.getMostRecentMarket.call(0);
    realitycards = await RealityCardsMarketXdaiV1.at(marketAddress);
    for (i = 0; i < 20; i++) {
      await realitycards.mintNfts("uri", { from: user0 });
    }

    // rent card
    // await testDai.approve(marketXdaiV1.address, "100" + "000000000000000000", {
    //   from: user0,
    // });
    // console.log("testDai.balanceOf(user0)");
    // console.log((await testDai.balanceOf(user0)).toString());

    amount = web3.utils.toWei((1).toString(), "ether");
    await treasury.deposit({ from: user0, value: amount });

    price = web3.utils.toWei((2).toString(), "ether");
    await realitycards.newRental(price, 1, { from: user0 });

    console.log("factory.address: ", factory.address);
    console.log("treasury.address: ", treasury.address);
    console.log("marketXdaiV1.address: ", marketXdaiV1.address);
    console.log("marketAddress: ", marketAddress);
  } else {
    console.log("No deploy script for this network");
  }
};
