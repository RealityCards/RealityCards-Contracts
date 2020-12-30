//require("dotenv").config();

var realityCardsFactory = artifacts.require("RealityCardsFactory");
var realityCardsMarket = artifacts.require("RealityCardsMarketXdai");

var factoryAddress = '0xAc10E57949B159D297E56Ee57d81746F60223b88';

// variables market specific
var marketOpeningTime = 0; 
var marketLockingTime = 1612137600; 
var oracleResolutionTime = 1612137600; 
var numberOfTokens = 6;
var question = 'na';
var tokenName = "RealityCards_XrpPrice";

// variables COMMON
var templateId = 2;
var andrewsAddress = "0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0";
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var timeout = 30;
// var marketOpeningTime = 100;
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

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
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/xrpPrice/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/xrpPrice/token1.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/xrpPrice/token2.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/xrpPrice/token3.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/xrpPrice/token4.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/xrpPrice/token5.json");
    await market.openMarket();
    console.log("NFTs minted");
    process.exit();
  }
  createMarket();
};
