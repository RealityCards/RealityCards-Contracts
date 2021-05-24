//require("dotenv").config();

var realityCardsFactory = artifacts.require("RCFactory");
// var factoryAddress = '0x31fE0805b91c4B87CB564A47d1dB42cE8fe84bff'; //new testnet on Sokol
// const factoryAddress = '0x52d51E427E334C02abD0FF83cE5CAadA99aFCF23'; // dev.rc.io
var factoryAddress = '0x5b7477AcFa49Cc71530A1119ddbC0d3c30ac8ffE'; // unaudited.rc.io

// curl -F file=@event.json "https://api.thegraph.com/ipfs/api/v0/add"
// truffle exec addmarket.js --network xdai

// variables market specific
var marketOpeningTime = 1621854000;
var marketLockingTime = 1622322000;
var oracleResolutionTime = 1622322000;
var ipfsHash = 'QmRvSnTMHJJ1k5ZGi9dxcMrzcXn1MeR2jt1BhQrqXdrbbx';
var question = 'Who will win the 2021 UEFA Champions League Final?␟"Manchester City","Chelsea"␟other␟en_US';
var artistAddress = "0x74B4B8C7cb9A594a6440965f982deF10BB9570b9";
var affiliateAddress = "0x0000000000000000000000000000000000000000";
var cardAffiliateAddresses = ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'];

// kovan overrides (*COMMENT OUT IF MAINNET*)
// var marketLockingTime = 100; 
// var oracleResolutionTime = 100; 

var timestamps = [marketOpeningTime, marketLockingTime, oracleResolutionTime];
var tokenURIs = [
  'https://cdn.realitycards.io/nftmetadata/ChampionsLeague/token0.json',
  'https://cdn.realitycards.io/nftmetadata/ChampionsLeague/token1.json',
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