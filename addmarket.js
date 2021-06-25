const realityCardsFactory = artifacts.require("RCFactory");
const fs = require('fs');
let myArgs = process.argv.slice(1, 9);

const SRC = "vaxxed" // put the event name in here (the folder it is stored in)
// truffle exec addmarket.js --network xdai

// first part of name should match the network name truffle uses
const teststage1_Factory = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
const xdai_Factory = '0x3b557a58E5c6c4Df3e3307F9c7f5ce46472d80F7'; //beta on xDai
const dev_Factory = '0x76d22B0065Ada142207E2cDce12322FB3F8c0bAA'; //dev on Sokol
const matic_Factory = '0x67E63bd4ea7a1114A7C452D28f2305744fee4dC0' //beta on Matic


module.exports = async () => {
  async function createMarket() {
    // create market
    let factory = await realityCardsFactory.at(factoryAddress);
    if (artistAddress != "0x0000000000000000000000000000000000000000") {
      console.log("Checking artist approval")
      let approved = await factory.isArtistApproved();
      if (!approved) {
        await factory.changeArtistApproval(artistAddress)
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
      question
    );

    var lastAddress = await factory.getMostRecentMarket.call(0);
    console.log("Market created at address: ", lastAddress);
    console.log("Block number: ", transaction.receipt.blockNumber);


  }
  let factoryAddress, question
  try {
    const jsonString = fs.readFileSync('./events/' + SRC + '/config.json')
    const CONFIG = JSON.parse(jsonString)
    timestamps = [CONFIG.start, CONFIG.end, CONFIG.end];
    question = CONFIG.oracle
    artistAddress = CONFIG.artist
    affiliateAddress = CONFIG.affiliate
    cardAffiliateAddresses = CONFIG.cardAffiliates
    tokenURIs = CONFIG.tokenURIs
    ipfsHash = CONFIG.ipfs

  } catch (err) {
    console.log(err)
    return
  }
  factoryAddress = eval(myArgs[4] + '_Factory')

  await createMarket();
  process.exit();
};