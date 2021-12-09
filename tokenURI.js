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
  //   let approvedMarkets = await fetchApprovedMarkets();
  let approvedMarkets = ["0x91Fa0D3d0Dc27D19Dd7C3abC0eD35682951Bf947"]; // for quick testing only use 1 market
  let card = 0; // for quick testing only use 1 card

  for (let i = 0; i < approvedMarkets.length; i++) {
    const market = await RCMarket.at(approvedMarkets[i]);

    let numberOfCards = await market.numberOfCards();

    for (let j = 0; j < numberOfCards; j++) {
      const card = j;
      const tokenID = await market.tokenIds(card);
      let json = await fetchJSON(tokenID);
      json = await generateNewJSON(market, card, json);
      console.log("final json", json);
      const ipfsHash = await pinToIPFS(json);
      console.log(" final ipfs hash:", ipfsHash, ":");

      updateURI(tokenID, ipfsHash);
    }
  }

  await updateURI();
  process.exit();

  async function fetchApprovedMarkets() {
    // let markets = await factory.getAllMarkets(0);
    // console.log("All Markets ", markets, markets.length);
    // let approvedMarkets = [];
    // for (let i = 0; i < markets.length; i++) {
    //   const element = markets[i];
    //   console.log("Checking market ", element);
    //   if (await factory.isMarketApproved(element)) {
    //     approvedMarkets.push(element);
    //   }
    // }
    // console.log("Aproved Markets ", approvedMarkets, approvedMarkets.length);

    // for speed just use the cached list here
    approvedMarkets = [
      "0x91Fa0D3d0Dc27D19Dd7C3abC0eD35682951Bf947",
      "0x2b6fc19Bf843FdE5157016573Aa4e5ed78c77D8b",
      "0x9fF7605E7A54010f484FC37230d1d55cA468a2cA",
      "0xfe64297f90ee02bd521BDb9804bF740133D8F77A",
      "0xA16568B0D3d30268Fbb90FcFFE2686cc832d20F5",
      "0x3E0C6358cf9f017fD479a7888281d38737f262Ab",
      "0x5b3cC1128ec8750A071a4d76AF497884d789A952",
      "0xD40fdb7aC31B39074C28974648C28423043B41c0",
      "0x2aD3383d68A0362f5FA8B3D1528D4B4E3d4C3aFF",
      "0xe2b2Ab9D9f574FaFDE18aB52c44CBfd53203E0dA",
      "0xdD09D94099Af8E1dac02346148C44455DD890468",
      "0x0b9B4a13DAF2C8ED0FE5016AA7DD52A0FAB96463",
      "0x0D4A3fe83ba38468bD9b0c15a7fC85E94108F43f",
      "0x5DDF0e0b6a62e72a435433820778f2B8E6F8c7aD",
      "0x1497f11a8b47bb76A2a3DDb85631d00a135Ed28E",
      "0xB2FbE6610EBF58aB3E4Dd0B543c7FED56ECe6603",
      "0x03afda31d81e1486FA3A7A8fF19BBb2eBB662998",
      "0x5303C5Ea3382C63241624d0c2227B2BB9D39866b",
      "0x99e02936c7966278B79713cEa611F7f6257B1Bc1",
      "0x0fb3B1b64543B6A62742e94C5cd505Efd09B2752",
      "0x32e26E1280b1642Bcef6D517690311a30677561e",
      "0x384A71bE5d340B4F99C1DeAb18EC3A4919Ff9972",
      "0x02B5b93AB2C812ce0D728fD78f4f9460B384beF3",
      "0x242d73ddFd08F0c78F7fa64d56F380Bc2062543a",
      "0x3c846E2f2DaA5dbE2e4fCCbB728c5Cb9574bDc20",
      "0x58274C2406Ae07c5a8C20dff4F9a0968d821Fb59",
      "0xfb65F80bb488a338c283f09Bdb5827CC712F1fA0",
      "0x276b3CA94A731F40072A4B69A337eFf73a600F61",
      "0xf5e3258165beB2756eBD1438fAcb88C600F8f661",
      "0x22960E68d9aC699fea9408A2658e7839432a6ccc",
      "0x26E92a0B7aB015c11F483FEAc2Cb6e91A6A444ED",
      "0x214e09fC23927cC91CfD9C6e5B52DCc9893e415A",
      "0x4e973ad28e3600EeF9a6CeFB20656751f97999E7",
      "0xcbfBeBB5Fd50Da4d46e742bbe9b1113fE0e84c85",
      "0xeD87C52AD9a8F40E6411bcDe580B18B28C6bFCc2",
      "0x1d5Bf33d72A09804046891ee010C4c20652DcF63",
      "0x52E3C6A27042F30b2628213882d5ecbA4AFe67F8",
      "0x229A596b52AcDc23Cd2A146B64cB8EbA7a75e48d",
      "0xA976D935549a2F0f65193aA6b943f1fC31F38297",
      "0x6Ca81980FC877F9021A39a456D2BA38eF55CF2e9",
      "0x9DAe5A0c630eB5501C86fDd30F73fdc21659ED9e",
      "0xBfddB57B691123C59778Fb7c4371f310b60dF7Fe",
      "0x1C3d8e4462a84B859f677815127f30e4AC930227",
      "0xa6dE54EDa5969FAAaC82dc375901bEE76Bc2E9f6",
    ];

    return approvedMarkets;
  }

  async function fetchJSON(tokenID) {
    const tokenURI = await nftHub.tokenURI(tokenID);
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
      suffix = "-winner";
    } else {
      suffix = "-loser";
    }
    newJSON.image = oldJSON.image.slice(0, oldJSON.image.length - 4) + suffix + oldJSON.image.slice(-4);

    // attributes
    newJSON.attributes = [
      {
        display_type: "date",
        trait_type: "Event Start",
        value: (await market.marketOpeningTime()).toString(),
      },
      {
        display_type: "date",
        trait_type: "Event End",
        value: (await market.marketLockingTime()).toString(),
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
  }

  async function isMarketLocked(marketAddress) {
    const market = await RCMarket.at(marketAddress);
    return 3 == (await market.state());
  }
};
