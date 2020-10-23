//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var RealityCardsMarketXdaiV1 = artifacts.require("RCMarketXdaiV1");

var factoryAddress = '0xE5e255D75E1606BE6795b94A6d04A5C4d53eAa9A';

// variables market specific
var marketLockingTime = 1601251201; // Monday, 28-Sep-20 00:00:01 UTC in RFC 2822
var oracleResolutionTime = 1601251201; // Monday, 28-Sep-20 00:00:01 UTC in RFC 2822
var numberOfTokens = 4;
var question = 'na';
var tokenName = "RealityCards_UNIPRICE";

// variables COMMON
var andrewsAddress = "0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0";
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var timeout = 30;
// var marketLockingTime = 100; //09/13/2020 @ 3:00am (UTC)
// var oracleResolutionTime = 100; //09/13/2020 @ 9:00am (UTC)

var timestamps = [marketLockingTime,oracleResolutionTime];

module.exports = function() {
  async function createMarket() {
    //create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING XDAI MARKET");
    var transaction = await factory.createMarket(
      0,
      '0x0',
      andrewsAddress,
      numberOfTokens,
      timestamps,
      question,
      arbitrator,
      timeout,
      tokenName
    );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);

    //mint nfts
    let market = await RealityCardsMarketXdaiV1.at(lastAddress);
    await market.mintNfts(
      "https://cdn.realitycards.io/nftmetadata/uni/token0.json"
    );
    await market.mintNfts(
      "https://cdn.realitycards.io/nftmetadata/uni/token1.json"
    );
    await market.mintNfts(
      "https://cdn.realitycards.io/nftmetadata/uni/token2.json"
    );
    await market.mintNfts(
      "https://cdn.realitycards.io/nftmetadata/uni/token3.json"
    );
    console.log("NFTs minted");
    process.exit();
  }
  createMarket();
};
