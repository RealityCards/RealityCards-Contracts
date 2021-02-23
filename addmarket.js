//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x6f8d1Fd9EF676ccD19046723A0eb1C20Fe217463';


// variables market specific
var marketLockingTime = 1617231600; 
var oracleResolutionTime = 1617231600; 
var question = 'Test11␟"X","Y","Z"␟news-politics␟en_US';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [0,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/version1/meme/token0.json',
    'https://cdn.realitycards.io/version1/meme/token1.json',
    'https://cdn.realitycards.io/version1/meme/token2.json',
    'https://cdn.realitycards.io/version1/meme/token3.json',
    'https://cdn.realitycards.io/version1/meme/token4.json',
    'https://cdn.realitycards.io/version1/meme/token5.json',
]; 

module.exports = function() {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING MARKET");
    var transaction = await factory.createMarket(
        0,
        'QmXDtbowCXhhKtKyqWh5jRzn8uP8NWyeUE3aBdhTbCeAFA',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardAffiliateAddresses,
        question,
      );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);
    process.exit();
  }
  createMarket();
};

// address: 0x69aBeB96F2c62CA2bDa622Fdf315E11D5460383B