//require("dotenv").config();

// curl -F file=@event.json "https://api.thegraph.com/ipfs/api/v0/add"
// truffle exec addmarket.js --network teststage1

var realityCardsFactory = artifacts.require("RCFactory");
//var factoryAddress = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
//var factoryAddress = '0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7'; //beta on xDai
// var factoryAddress = '0x76d22B0065Ada142207E2cDce12322FB3F8c0bAA'; //dev on Sokol
const factoryAddress = '0xbCD485e40C3ca8A08c6c0e6080ccc7e7066b1356'; // Mumbai

// variables market specific
var marketOpeningTime = 0;
var marketLockingTime = 1621423800;
var oracleResolutionTime = 1621423800;
var ipfsHash = 'QmdWBMbrFY9LvMmEYmdntS1LNbxWu7vh7CMZyvv8PyKg8g';
var question = 'What will the state of Starship SN11 be at the end of this week?';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime, marketLockingTime, oracleResolutionTime];
var tokenURIs = [
  'https://cdn.realitycards.io/nftmetadata/release/token0.json',
  'https://cdn.realitycards.io/nftmetadata/release/token1.json',
  'https://cdn.realitycards.io/nftmetadata/release/token2.json',
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
    process.exit();
  }
  createMarket();
};