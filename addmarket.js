//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x31fE0805b91c4B87CB564A47d1dB42cE8fe84bff'; //new testnet on Sokol
// var factoryAddress = '0x5b7477AcFa49Cc71530A1119ddbC0d3c30ac8ffE'; // unaudited.rc.io

// variables market specific
var marketOpeningTime = 0;
var marketLockingTime = 1620601200; 
var oracleResolutionTime = 1620601200; 
var ipfsHash = 'QmbnDYXiiBaSuGN3AomoVfC6DU7Ei6adwk7YrEfrv9C7Yk';
var question = 'Will the majority of the Long March 5B rocket land on land or water?␟"Land","Water"␟other␟en_US';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000','0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime,marketLockingTime,oracleResolutionTime];
var tokenURIs = [
    'https://cdn.realitycards.io/nftmetadata/rocketlanding/token0.json',
    'https://cdn.realitycards.io/nftmetadata/rocketlanding/token1.json',
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
    await factory.changeMarketApproval(lastAddress);
    console.log("Market approved");
    process.exit();
  }
  createMarket();
  
};