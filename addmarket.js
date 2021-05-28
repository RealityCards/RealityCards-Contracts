//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
var factoryAddress = '0x31fE0805b91c4B87CB564A47d1dB42cE8fe84bff'; //new testnet on Sokol
// var factoryAddress = '0x5b7477AcFa49Cc71530A1119ddbC0d3c30ac8ffE'; // unaudited.rc.io

// variables market specific
var marketOpeningTime = 1622221200;
var marketLockingTime = 1623456000;
var oracleResolutionTime = 1623456000;
var ipfsHash = 'QmVJW526du9RuBAn1LAc4YKvjCtVvYAMATnXsjQxhFxaec';
var question = 'What will the Matacritic review score of Ratchet and Clank: Rift Apart be at the end of June 11th 2021 UTC?␟"Below 85","85 or above"␟other␟en_US';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime, marketLockingTime, oracleResolutionTime];
var tokenURIs = [
  'https://cdn.realitycards.io/nftmetadata/ratchet/token0.json',
  'https://cdn.realitycards.io/nftmetadata/ratchet/token1.json',
];

module.exports = function () {
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
    // await factory.changeMarketApproval(lastAddress);
    // console.log("Market approved");
    process.exit();
  }
  createMarket();

};