//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x76d22B0065Ada142207E2cDce12322FB3F8c0bAA';


// variables market specific
var marketLockingTime = 1613952000; 
var oracleResolutionTime = 1613952000; 
var question = 'Which card will earn the least rent this week?';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
//var marketLockingTime = 100; 
//var oracleResolutionTime = 100; 

var timestamps = [0,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/nftmetadata/lowrent/token0.json',
    'https://cdn.realitycards.io/nftmetadata/lowrent/token1.json',
    'https://cdn.realitycards.io/nftmetadata/lowrent/token2.json',
    'https://cdn.realitycards.io/nftmetadata/lowrent/token3.json',
]; 

module.exports = function() {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING MARKET");
    var transaction = await factory.createMarket(
        0,
        '0x0',
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
