//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x853aA66d14c332f590427994d49BE2EAe8bF8F88';


// variables market specific
var marketLockingTime = 0; 
var oracleResolutionTime = 0; 
var question = 'Test1␟"X","Y","Z"␟news-politics␟en_US';
var eventDetails = ['RCToken','y']; 
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardSpecificAffiliateAddresses = ['0x0000000000000000000000000000000000000000','0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [0,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/nftmetadata/uni/token0.json',
    'https://cdn.realitycards.io/nftmetadata/uni/token1.json',
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
        cardSpecificAffiliateAddresses,
        question,
        eventDetails,
      );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created and NFTs minted at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);
    process.exit();
  }
  createMarket();
};
