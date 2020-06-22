require("dotenv").config();

const path = require("path");
const HDWalletProvider = require("truffle-hdwallet-provider");
const INFURA_KEY = process.env.INFURA_KEY;
const MNEMONIC = process.env.MNEMONIC;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;

module.exports = {
  plugins: ["truffle-plugin-verify"],
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
      gas: 10000000,
      gasPrice: 48000000000, // 20 gwei
      networkCheckTimeout: 12000,
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
      networkCheckTimeout:6000,
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
  api_keys: {
    etherscan: ETHERSCAN_KEY
  },
    verify: {
    preamble: `Created by Andrew Stanger

    ██████╗ ███████╗ █████╗ ██╗     ██╗████████╗██╗   ██╗ ██████╗ █████╗ ██████╗ ██████╗ ███████╗
    ██╔══██╗██╔════╝██╔══██╗██║     ██║╚══██╔══╝╚██╗ ██╔╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
    ██████╔╝█████╗  ███████║██║     ██║   ██║    ╚████╔╝ ██║     ███████║██████╔╝██║  ██║███████╗
    ██╔══██╗██╔══╝  ██╔══██║██║     ██║   ██║     ╚██╔╝  ██║     ██╔══██║██╔══██╗██║  ██║╚════██║
    ██║  ██║███████╗██║  ██║███████╗██║   ██║      ██║   ╚██████╗██║  ██║██║  ██║██████╔╝███████║
    ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝      ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝`
  }
};
