//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x6f8d1Fd9EF676ccD19046723A0eb1C20Fe217463';


// variables market specific
var marketLockingTime = 1614556800; 
var oracleResolutionTime = 1614556800; 
var question = 'Test11␟"X","Y","Z"␟news-politics␟en_US';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [0,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/version1/ethereum/token0.json',
    'https://cdn.realitycards.io/version1/ethereum/token1.json',
    'https://cdn.realitycards.io/version1/ethereum/token2.json',
    'https://cdn.realitycards.io/version1/ethereum/token3.json',
]; 

module.exports = function() {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    console.log("CREATING MARKET");
    var transaction = await factory.createMarket(
        0,
        'Qma5jNTWwpxBdbj981jCiMrvAS2wmTLWiYdCBFGpBqXNn8',
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

// address: 0xC07034d55894e652D9b59ad380Bc72459Bc33510