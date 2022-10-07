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

const SRC = ""; // put the event name in here (the folder it is stored in)
// truffle exec tokenURI.js --network matic

const matic_Factory = "0xFAc70001831b8608AB4616c9FeEaf20EEA1018d5"; // V1.1
const nftHubAddress = "0xE7C721CF66D1666d59Bb88427978FF515bFFf492";

module.exports = async () => {
  factoryAddress = eval(myArgs[4] + "_Factory");
  let factory = await realityCardsFactory.at(factoryAddress);
  let nftHub = await RCNFTHub.at(nftHubAddress);

  console.log("Factory address ", factoryAddress);

  // let temptoken = [108];
  // let images = ["https://cdn.realitycards.io/V1/ChristiesXOpenSea/Tom-Sachs.loser"];
  // for (let i = 0; i < temptoken.length; i++) {
  //   const element = temptoken[i];

  //   let json = await fetchJSON(element);

  //   json.image = images[i] + ".png";

  //   await updateURI(element, await pinToIPFS(json));
  // }

  // let approvedMarkets = await fetchApprovedMarkets();
  let approvedMarkets = ["0xC50276e4A0AD0AB88D9bABe89E332C2E6A0B2260", "0x15E45E0BCC0A33eD5F498B490070A3fF491A7B87"]; // for quick testing only use 1 market

  for (let i = 0; i < approvedMarkets.length; i++) {
    const market = await RCMarket.at(approvedMarkets[i]);

    let numberOfCards = await market.numberOfCards();

    for (let j = 0; j < numberOfCards; j++) {
      const card = j;
      const tokenID = await market.tokenIds(card);
      let json = await fetchJSON(tokenID);
      console.log("fetched token ", tokenID.toString());
      json = await generateNewJSON(market, card, json);
      console.log("final json", json);
      const ipfsHash = await pinToIPFS(json);
      console.log(" final ipfs hash:", ipfsHash, ":");

      await updateURI(tokenID, ipfsHash);
      console.log("Updated token ", tokenID.toString());
    }
  }

  console.log("All done, bye bye");
  process.exit();

  async function fetchApprovedMarkets() {
    let markets = await factory.getAllMarkets(0);
    console.log("All Markets ", markets, markets.length);
    let approvedMarkets = [];
    for (let i = 0; i < markets.length; i++) {
      const element = markets[i];
      console.log("Checking market ", element);
      if ((await factory.isMarketApproved(element)) && (await isMarketLocked(element))) {
        approvedMarkets.push(element);
      }
    }
    console.log("Aproved Markets ", approvedMarkets, approvedMarkets.length);

    return approvedMarkets;
  }

  async function fetchJSON(tokenID) {
    let tokenURI = await nftHub.tokenURI(tokenID);
    let tokenJSON;
    if (tokenURI.slice(0, 4) == "ipfs") {
      tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
      tokenJSON = await fetch(tokenURI, { method: "Get" }).then((res) => res.json());
    } else {
      tokenJSON = await fetch(tokenURI, { method: "Get" }).then((res) => res.json());
    }
    return tokenJSON;
  }

  async function generateNewJSON(market, card, oldJSON) {
    let newJSON = {
      name: oldJSON.name,
      description: oldJSON.description,
      affiliation: oldJSON.affiliation,
    };
    const winner = card == (await market.winningOutcome());
    let suffix;
    if (winner) {
      suffix = ".winner";
    } else {
      suffix = ".loser";
    }
    let imageType;
    if (oldJSON.image.slice(-4) == ".jpg") {
      imageType = ".png";
    } else {
      imageType = oldJSON.image.slice(-4);
    }
    newJSON.image = oldJSON.image.slice(0, oldJSON.image.length - 4) + suffix + imageType;

    // attributes
    newJSON.attributes = [
      {
        display_type: "date",
        trait_type: "Event End",
        value: (await market.marketLockingTime()).toString(),
      },
      {
        display_type: "date",
        trait_type: "Event Start",
        value: (await market.marketOpeningTime()).toString(),
      },
    ];

    newJSON.external_url = "https://beta.realitycards.io/cards/" + (await factory.addressToSlug(market.address)) + "/" + card;

    return newJSON;
  }
  async function pinToIPFS(json) {
    fs.writeFileSync("output/token.json", JSON.stringify(json), (err) => {
      if (err) throw err;
      console.log("written json to file");
    });
    let pinResult = await execSync('curl -s -F file=@output/token.json "https://api.thegraph.com/ipfs/api/v0/add"').toString();
    let ipfsHash = "ipfs://" + JSON.parse(pinResult).Hash;
    return ipfsHash;
  }

  async function updateURI(tokenID, ipfsHash) {
    console.log("Updating token ", tokenID.toString(), " with hash ", ipfsHash);
    await nftHub.setTokenURI(tokenID, ipfsHash, { gas: 70000 });

    // api not availiable on polygon yet
    // await updateOpenSeaMetaData(tokenID);
  }

  async function updateOpenSeaMetaData(tokenID) {
    const url = "https://api.opensea.io/api/v1/asset/" + nftHubAddress + "/" + tokenID + "/?force_update=true";
    await fetch(url);
    console.log("Done with ", tokenID);
  }

  async function isMarketLocked(marketAddress) {
    const market = await RCMarket.at(marketAddress);
    return 3 == (await market.state());
  }
};
