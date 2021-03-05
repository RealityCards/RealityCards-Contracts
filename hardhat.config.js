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
  },
  networks: {
    hardhat: {
      gas: 12500000,
      gasPrice: 12500000,
      blockGasLimit: 12500000,
      gasPrice: 1,
    },
  },
};
