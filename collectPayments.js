const realityCardsFactory = artifacts.require("RCFactory");
const realityCardsTreasury = artifacts.require("RCTreasury");
const RCMarket = artifacts.require("RCMarket");
const RCNFTHub = artifacts.require("RCNftHubL2");
const { on } = require("events");
const fs = require("fs");
const fetch = require("node-fetch");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { execSync } = require("child_process");
let myArgs = process.argv.slice(1, 9);

// truffle exec collectPayments.js --network matic

const matic_Factory = "0xFAc70001831b8608AB4616c9FeEaf20EEA1018d5"; // V1.1
const nftHubAddress = "0xE7C721CF66D1666d59Bb88427978FF515bFFf492";

module.exports = async () => {
  factoryAddress = eval(myArgs[4] + "_Factory");
  let factory = await realityCardsFactory.at(factoryAddress);
  let nftHub = await RCNFTHub.at(nftHubAddress);

  console.log("Factory address ", factoryAddress);

  let markets = await factory.getAllMarkets(0);
  console.log("Number of markets ", markets.length);
  for (let i = 0; i < markets.length; i++) {
    const element = markets[i];
    console.log("Checking market ", element);
    if (await factory.isMarketApproved(element)) {
      const market = await RCMarket.at(element);
      if ((await market.state()) == 3 && !(await market.creatorPaid()) && (await market.winningOutcome()) < (await market.numberOfCards())) {
        console.log("Paying creator on market ", element);
        await market.payMarketCreator();
        console.log("Finished payment");
      }
    }
  }
  console.log("All done, bye bye");
};
