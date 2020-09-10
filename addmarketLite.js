var realityCardsFactory = artifacts.require("RealityCardsFactory");
var realityCardsMarketLite = artifacts.require("RealityCardsMarketLite");

var factoryAddress = process.env.FACTORY_ADDRESS;

// variables market specific
var marketLockingTime = 1600041601; //Monday, 14-Sep-20 00:00:01 UTC
var oracleResolutionTime = 1600041601; //Monday, 14-Sep-20 00:00:01 UTC
var numberOfTokens = 8;
var question = 'Who will win the 2020 US Tennis Open Mens Singles?␟"Novak Djokovic","Dominic Thiem","Daniil Medvedev","Stefanos Tsitsipas","Alexander Zverev","Matteo Berrettini","David Goffin","Someone else"␟sport␟en_US';

// variables COMMON
var templateId = 2;
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day

// kovan overrides (*COMMENT OUT IF MAINNET*)
var timeout = 30;
var marketLockingTime = 100; //09/13/2020 @ 3:00am (UTC)
var oracleResolutionTime = 100; //09/13/2020 @ 9:00am (UTC)

module.exports = function() {
    
  async function createMarketLite() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING LITE MARKET");
    await factory.createMarketLite(numberOfTokens, marketLockingTime, oracleResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout);
    var lastAddress = await factory.mostRecentContract.call();
    console.log("Lite Market created at address: ",lastAddress);

    //mint nfts
    let market = await realityCardsMarketLite.at(lastAddress);
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    await market.mintNfts("https://cdn.realitycards.io/nftmetadata/tennis/token0.json");
    console.log("Fake NFTs minted");
    console.log("[safe to exit]");

  }
  createMarketLite();
}


// for remix
// 0x8bD9600Ec3a996FDf83ce89CEfFf50610BC3F0E5,0,0,0,0,0,0xc8dae2bccb46477df016e190ae986d5feadd8600f445991c6b8bbe8fe70598bc,false,0x8bD9600Ec3a996FDf83ce89CEfFf50610BC3F0E5,30,0