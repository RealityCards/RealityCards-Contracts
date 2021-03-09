require("@nomiclabs/hardhat-truffle5");
require("solidity-coverage");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    artifacts: "./artifactsBuidler",
    tests: "./test/live",
  },
  networks: {
    hardhat: {
      gas: 10000000,
      blockGasLimit: 10000000,
      gasPrice: 1,
    },
  },
};
