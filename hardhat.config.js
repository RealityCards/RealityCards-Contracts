require("@nomiclabs/hardhat-truffle5");
require("solidity-coverage");
require("hardhat-gas-reporter");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  paths: {
    artifacts: "./artifactsBuidler",
    tests: "./test",
  },
  networks: {
    hardhat: {
      gas: 19000000,
      blockGasLimit: 19000000,
      gasPrice: 1,
      accounts: {
        count: 2000,
      }
    },
  },
};
