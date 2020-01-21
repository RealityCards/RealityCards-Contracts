import Harber from "./contracts/Harber.json";
import Cash from "./contracts/CashMockup.json";
import ERC721Full from "./contracts/ERC721Full.json";

// todo: read env var for fallback
const fallbackUrl = "wss://mainnet.infura.io/ws/v3/e811479f4c414e219e7673b6671c2aba";

const options = {
  web3: {
    block: false,
    fallback: {
      type: "ws",
      url: fallbackUrl,
    },
  },
  contracts: [
    Harber, 
    ERC721Full,
    Cash
  ],
  syncAlways: true,
  polls: {
    accounts: 1500,
  },
};

export default options;
