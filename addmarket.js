const realityCardsFactory = artifacts.require("RCFactory");
const fs = require('fs');
let myArgs = process.argv.slice(1, 9);

const SRC = "testing" // put the event name in here (the folder it is stored in)
// truffle exec addmarket.js --network matic

// first part of name should match the network name truffle uses
const teststage1_Factory = '0xe1Ab9305DA70b865d610116163A82E1fDF6cCcFD'; //testnet on Sokol
const xdai_Factory = '0x5b7477AcFa49Cc71530A1119ddbC0d3c30ac8ffE'; //unaudited beta on xDai
const dev_Factory = '0x76d22B0065Ada142207E2cDce12322FB3F8c0bAA'; //dev on Sokol
// const matic_Factory = '0x67E63bd4ea7a1114A7C452D28f2305744fee4dC0' //beta on Matic
const matic_Factory = '0xFe69EAbF9b278a8c2B59F60Dbb8c284C81C21Fa1' //dev on Matic


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
    console.log("ipfs hash ", ipfsHash);
    console.log("timestamps", timestamps);
    console.log("tokenURIs", tokenURIs);
    console.log("artistAddress", artistAddress);
    console.log("affiliateAddress", affiliateAddress);
    console.log("cardAffiliateAddresses", cardAffiliateAddresses);
    console.log("question", question);
    console.log("sponsorship", sponsorship);
    var transaction = await factory.createMarket(
      0,
      ipfsHash,
      timestamps,
      tokenURIs,
      artistAddress,
      affiliateAddress,
      cardAffiliateAddresses,
      question,
      sponsorship
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
    sponsorship = CONFIG.sponsorship

  } catch (err) {
    console.log(err)
    return
  }
  factoryAddress = eval(myArgs[4] + '_Factory')

  await createMarket();
  process.exit();
};