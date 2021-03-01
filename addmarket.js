//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
//var factoryAddress = '0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7'; //beta on xDai

// variables market specific
var marketOpeningTime = 0;
var marketLockingTime = 1614978000; 
var oracleResolutionTime = 1614978000; 
var ipfsHash = 'QmWVz1ZohpnHWmq3qTyKqLavHfHva82Foy7MMJ9sbW6JT7';
var question = 'What will the price of Gamestop stock be at the closing bell on Friday 5th March?';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/nftmetadata/gme/token0.json',
    'https://cdn.realitycards.io/nftmetadata/gme/token1.json',
    'https://cdn.realitycards.io/nftmetadata/gme/token2.json',
    'https://cdn.realitycards.io/nftmetadata/gme/token3.json',
    'https://cdn.realitycards.io/nftmetadata/gme/token4.json',
]; 

module.exports = function() {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING MARKET");
    var transaction = await factory.createMarket(
        0,
        ipfsHash,
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
