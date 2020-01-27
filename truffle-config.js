const path = require("path");
const HDWalletProvider = require('truffle-hdwallet-provider');
const mnemonic = 'defense ready lady corn other ride rapid collect avocado tongue price nut'; // pls dont steal my testnet ether 
const mainnetProviderUrl = 'https://mainnet.infura.io/v3/e811479f4c414e219e7673b6671c2aba'; 
const rinkebyProviderUrl = 'https://rinkeby.infura.io/v3/e811479f4c414e219e7673b6671c2aba';
const kovanProviderUrl = 'https://kovan.infura.io/v3/d460ac4e71f24d869c8b75119ebe4213';



module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  plugins: [ "truffle-security" ],
  contracts_build_directory: path.join(__dirname, "app/src/contracts"),
  networks: {
    // mainnet: {
    //   network_id: 1,
    //   provider: new HDWalletProvider(mnemonic, mainnetProviderUrl, 0),
    //   gas: 4700000,
    //   gasPrice: 5000000000, // 5 gwei
    //   skipDryRun: true,
    // },
    // rinkeby: {
    //   network_id: 4,
    //   provider: new HDWalletProvider(mnemonic, rinkebyProviderUrl, 0),
    //   gas: 4700000,
    //   gasPrice: 10000000000, // 10 gwei
    //   skipDryRun: true,
    // },
    kovan: {
      network_id: 42,
      provider: new HDWalletProvider(mnemonic, kovanProviderUrl, 0),
      gas: 10000000,
      gasPrice: 1000000000, // 1 gwei
      skipDryRun: true,
    },
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      gas: 10000000,
      gasPrice: 100000000, // 0.1 gwei
    },
    proxy: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 9545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      gasPrice: 0, // 1 gwei
    },
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 5, //in gwei
    },
  },
  compilers: {
    solc: {
      version: "0.5.13",  // ex:  "0.4.20". (Default: Truffle's installed solc)
    },
  },
};
