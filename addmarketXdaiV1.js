//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x7b74bDe552304f464e6Cb68f374f6fa8f2cE42eC';


// variables market specific
var marketLockingTime = 1601251201; // Monday, 28-Sep-20 00:00:01 UTC in RFC 2822
var oracleResolutionTime = 1601251201; // Monday, 28-Sep-20 00:00:01 UTC in RFC 2822
var question = 'na';
var tokenName = "RealityCards_UNIPRICE";
var artistAddress = "0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0";

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [0,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/nftmetadata/uni/token0.json',
    'https://cdn.realitycards.io/nftmetadata/uni/token1.json',
    'https://cdn.realitycards.io/nftmetadata/uni/token2.json',
    'https://cdn.realitycards.io/nftmetadata/uni/token3.json'
]; 

module.exports = function() {
  async function createMarket() {
    //create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING XDAI MARKET");
    var transaction = await factory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        question,
        tokenName
      );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created and NFTs minted at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);
    process.exit();
  }
  createMarket();
};
