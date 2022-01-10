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

// truffle exec userPayments.js --network matic

const matic_Factory = "0xFAc70001831b8608AB4616c9FeEaf20EEA1018d5"; // V1.1
const nftHubAddress = "0xE7C721CF66D1666d59Bb88427978FF515bFFf492";

module.exports = async () => {
  factoryAddress = eval(myArgs[4] + "_Factory");
  let factory = await realityCardsFactory.at(factoryAddress);
  let nftHub = await RCNFTHub.at(nftHubAddress);
  let user = "0xD9FaAE28C0D3B09Ac229226dC9736dBfb08eE029";
  let totalRentPaid = 0;
  let totalWinnings = 0;

  console.log("Factory address ", factoryAddress);

  // await calculateWinnings("0xC50276e4A0AD0AB88D9bABe89E332C2E6A0B2260", user);

  let markets = await factory.getAllMarkets(0);
  console.log("Number of markets ", markets.length);
  for (let i = 54; i < markets.length; i++) {
    const element = markets[i];
    if (await factory.isMarketApproved(element)) {
      const market = await RCMarket.at(element);
      const state = await market.state();
      if (state == 3 && (await market.winningOutcome()) < (await market.numberOfCards())) {
        // market is resolved and valid
        const rentPaid = parseInt((await market.rentCollectedPerUser(user)).toString());
        totalRentPaid = totalRentPaid + rentPaid;
        const marketSlug = await factory.addressToSlug(element);
        console.log("Market: ", marketSlug);
        const winnings = await calculateWinnings(element, user);
        console.log("User has paid ", rentPaid, " and won ", winnings);
        totalWinnings = totalWinnings + winnings;
      } else if (state == 1 || state == 2) {
        // market is unresolved
        const rentPaid = parseInt((await market.rentCollectedPerUser(user)).toString());
        totalRentPaid = totalRentPaid + rentPaid;
        const marketSlug = await factory.addressToSlug(element);
        console.log("Market: ", marketSlug, " is still active");
        console.log("User has paid ", rentPaid);
      } else {
        // market is invalid or not open yet
      }
    }
  }
  console.log("User paid in total: ", totalRentPaid.toString());
  console.log("User won in total: ", totalWinnings);
  console.log("All done, bye bye");

  async function calculateWinnings(marketAddress, user) {
    const market = await RCMarket.at(marketAddress);
    const winningOutcome = await market.winningOutcome();
    const totalRentCollected = parseInt((await market.totalRentCollected()).toString());
    const prizePot = Math.floor((totalRentCollected * 980) / 1000);
    const cardInfo = await market.card(winningOutcome);
    const totalTimeHeld = parseInt(cardInfo.totalTimeHeld.toString());
    const userTimeHeld = parseInt((await market.timeHeld(winningOutcome, user)).toString());
    const userCut = userTimeHeld / totalTimeHeld;
    const winnings = Math.floor(prizePot * userCut);

    // console.log("Total collected ", totalRentCollected);
    // console.log("Prize Pot ", prizePot);
    // console.log("User time held ", userTimeHeld);
    // console.log("Total time held ", totalTimeHeld);
    // console.log("Percentage of Pot ", userCut);
    // console.log("User winnings ", winnings);

    return winnings;
  }
};
