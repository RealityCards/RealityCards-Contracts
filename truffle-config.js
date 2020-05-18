require("dotenv").config();

const path = require("path");
const HDWalletProvider = require("truffle-hdwallet-provider");
const INFURA_KEY = process.env.INFURA_KEY;
const MNEMONIC = process.env.MNEMONIC;

module.exports = {
  plugins: ["truffle-security"],
  contracts_build_directory: path.join(__dirname, "./artifactsTruffle"),
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    mainnet: {
      provider: () => {
        return new HDWalletProvider(
          MNEMONIC,
          `https://mainnet.infura.io/v3/${INFURA_KEY}`
        );
      },
      network_id: 1,
      gas: 4000000,
      gasPrice: 20000000000, // 20 gwei
    },
    ropsten: {
      provider: () => {
        return new HDWalletProvider(
          MNEMONIC,
          `https://ropsten.infura.io/v3/${INFURA_KEY}`
        );
      },
      network_id: 3,
      gas: 15000000,
    },
    rinkeby: {
      provider: () => {
        return new HDWalletProvider(
          MNEMONIC,
          `https://rinkeby.infura.io/v3/${INFURA_KEY}`
        );
      },
      network_id: 4,
      gas: 15000000,
    },
    goerli: {
      provider: () => {
        return new HDWalletProvider(
          MNEMONIC,
          `https://goerli.infura.io/v3/${INFURA_KEY}`
        );
      },
      network_id: 5,
      gas: 15000000,
    },
    kovan: {
      provider: () => {
        return new HDWalletProvider(
          MNEMONIC,
          `https://kovan.infura.io/v3/${INFURA_KEY}`
        );
      },
      network_id: 42,
      gas: 9000000,
      gasPrice: 1000000000, // 1 gwei
    },
  },
  compilers: {
    solc: {
      version: "0.5.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      },
    },
  },
};
