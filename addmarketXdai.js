//require("dotenv").config();

var realityCardsFactory = artifacts.require("RealityCardsFactory");
var realityCardsMarket = artifacts.require("RealityCardsMarketXdai");

var factoryAddress = '0x2f61b382a49E746bdf9A0bcC834C9ea0Ad3538b0';

// variables market specific
var marketOpeningTime = 1;
var marketLockingTime = 1602460801; // Monday, 12-Oct-20 00:00:01 UTC
var oracleResolutionTime = 1602460801; // Monday, 12-Oct-20 00:00:01 UTC
var numberOfTokens = 6;
var question = 'na';
var tokenName = "RealityCards_ETHPRICE";

// variables COMMON
var templateId = 2;
var andrewsAddress = "0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0";
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var timeout = 30;
// var marketOpeningTime = 100;
// var marketLockingTime = 100; //09/13/2020 @ 3:00am (UTC)
// var oracleResolutionTime = 100; //09/13/2020 @ 9:00am (UTC)

module.exports = function() {
  async function createMarket() {
    //create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING XDAI MARKET");
    var transaction = await factory.createMarket(
      2,
      '0x0',
      andrewsAddress,
      numberOfTokens,
      marketOpeningTime,
      marketLockingTime,
      oracleResolutionTime,
      templateId,
      question,
      arbitrator,
      timeout,
      tokenName
    );
    var lastAddress = await factory.mostRecentContract.call();
    console.log("Market created at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);

    //mint nfts
    let market = await realityCardsMarket.at(lastAddress);
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPrice3/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPrice3/token1.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPrice3/token2.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPrice3/token3.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPrice3/token4.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPrice3/token5.json");
    console.log("NFTs minted");
    process.exit();
  }
  createMarket();
};

// for remix
// 0x8bD9600Ec3a996FDf83ce89CEfFf50610BC3F0E5,0,0,0,0,0,0xc8dae2bccb46477df016e190ae986d5feadd8600f445991c6b8bbe8fe70598bc,false,0x8bD9600Ec3a996FDf83ce89CEfFf50610BC3F0E5,30,0
