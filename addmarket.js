//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
// var factoryAddress = '0x31fE0805b91c4B87CB564A47d1dB42cE8fe84bff'; //new testnet on Sokol
var factoryAddress = '0x5b7477AcFa49Cc71530A1119ddbC0d3c30ac8ffE'; // unaudited.rc.io

// curl -F file=@event.json "https://api.thegraph.com/ipfs/api/v0/add"
// truffle exec addmarket.js --network xdai

// variables market specific
var marketOpeningTime = 1621209600;
var marketLockingTime = 1621814400;
var oracleResolutionTime = 1621814400;
var ipfsHash = 'QmQjyoQsfWSsi9EwecqgUS6Lw64ajeJHem45R7tWEnjgN9';
var question = 'Will the twitter account @elonmusk publish a self made tweet referencing DOGE between the 17th and 23rd May (inclusive, UTC time)?␟"Yes","No"␟other␟en_US';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime, marketLockingTime, oracleResolutionTime];
var tokenURIs = [
  'https://cdn.realitycards.io/nftmetadata/dogelon/token0.json',
  'https://cdn.realitycards.io/nftmetadata/dogelon/token1.json',
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