//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
//var factoryAddress = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
//var factoryAddress = '0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7'; //beta on xDai
// var factoryAddress = '0x76d22B0065Ada142207E2cDce12322FB3F8c0bAA'; //dev on Sokol
const factoryAddress = '0x67E63bd4ea7a1114A7C452D28f2305744fee4dC0' //beta on Matic

// curl -F file=@event.json "https://api.thegraph.com/ipfs/api/v0/add"
// truffle exec addmarket.js --network xdai

// variables market specific
var marketOpeningTime = 1623065400;
var marketLockingTime = 1623553200;
var oracleResolutionTime = 1623553200;
const sponsorship = 0;
var ipfsHash = 'QmdPAunojHHr71g9tF1JDS5f6NL2TpeBNRDHPMbsrpHptt';
var question = 'At the 2021 Westminster Dog Show which group will the Best in Show winner come from?␟“Herding”,“Hound”,“Non Sporting”,“Sporting”,“Terrier”,“Toy”,“Working”␟other␟en_US';
var artistAddress = "0x0000000000000000000000000000000000000000";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime, marketLockingTime, oracleResolutionTime];
var tokenURIs = [
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token0.json',
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token1.json',
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token2.json',
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token3.json',
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token4.json',
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token5.json',
  'https://cdn.realitycards.io/nftmetadata/WestminsterDogs/token6.json',
];

module.exports = function () {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    if (artistAddress != "0x0000000000000000000000000000000000000000") {
      console.log("Checking artist approval")
      let approved = await factory.isArtistApproved();
      if (!approved) {
        await factory.setArtistApproval(artistAddress)
      }
    }
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
      sponsorship,
    );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);
    process.exit();
  }
  createMarket();
};

/* for quick copy/paste, remember to change the URL:
'https://cdn.realitycards.io/nftmetadata/eurovision/token0.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token1.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token2.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token3.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token4.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token5.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token6.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token7.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token8.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token9.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token10.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token11.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token12.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token13.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token14.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token15.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token16.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token17.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token18.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token19.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token20.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token21.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token22.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token23.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token24.json',
'https://cdn.realitycards.io/nftmetadata/eurovision/token25.json',
*/