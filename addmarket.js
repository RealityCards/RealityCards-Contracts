//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
//var factoryAddress = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
//var factoryAddress = '0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7'; //beta on xDai
//var factoryAddress = '0x76d22B0065Ada142207E2cDce12322FB3F8c0bAA'; //dev on Sokol
var factoryAddress = '0xe04C6208051Eef95eE7c89E329Ec9dA18e148421'; // usertesting on Sokol

/* 
1. Use ./EventMaker.sh to generate the .json files
2. find the pictures and check the names match the names in the .json files
3. upload the pictures to DigitalOcean in the folder specified in the .json files
4. inside the event folder get IPFS hash using: curl -F file=@event.json "https://api.thegraph.com/ipfs/api/v0/add"
5. fill in the rest of this script with the IPFS hash, question, LockingTime and the correct number of token.json lines
6. back in the root folder run: truffle exec addmarket.js --network teststage1 
7. do event
8. use remix to close the market, the market address is given when you create it, remember the cards are 0 index. So the first card is result 0
*/

// variables market specific
var marketOpeningTime = 0;
var marketLockingTime = 1618527600;
var oracleResolutionTime = 1618527600;
var ipfsHash = 'QmVCHu1bo1j33ik6SHfmVu8seDXZhaB1ZjQ2ZfBqj3wytF';
var question = 'What is the weather now?';
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