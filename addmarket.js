//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
//var factoryAddress = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
var factoryAddress = '0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7'; //beta on xDai

// variables market specific
var marketOpeningTime = 0;
var marketLockingTime = 1615680000; 
var oracleResolutionTime = 1615680000; 
var ipfsHash = 'QmdokjFZoaHWYymqZFFftStQ9eheTnx4j2MKoHpVH3PGyE';
var question = 'What will Team Thunderforces win ratio be this Saturday 13th March?';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000','0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/nftmetadata/thunderforce/token0.json',
    'https://cdn.realitycards.io/nftmetadata/thunderforce/token1.json',
    'https://cdn.realitycards.io/nftmetadata/thunderforce/token2.json',
    'https://cdn.realitycards.io/nftmetadata/thunderforce/token3.json',
    'https://cdn.realitycards.io/nftmetadata/thunderforce/token4.json',
]; 

module.exports = function() {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING XDAI MARKET");
    var transaction = await factory.createMarket(
        0,
        '0x0',
        timestamps,
        tokenURIs,
        artistAddress,
        affiliateAddress,
        cardAffiliateAddresses,
        question,
        slug,
      );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);
    process.exit();
  }
  createMarket();
};
