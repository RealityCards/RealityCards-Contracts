usePlugin("@nomiclabs/buidler-truffle5");
const HDWalletProvider = require('truffle-hdwallet-provider');
const mnemonic = 'defense ready lady corn other ride rapid collect avocado tongue price nut'; // pls dont steal my testnet ether 
const kovanProviderUrl = 'https://kovan.infura.io/v3/d460ac4e71f24d869c8b75119ebe4213';

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await web3.eth.getAccounts();

  for (const account of accounts) {
    console.log(account);
  }
});

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    version: "0.6.6",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    buidlerevm: {
      gas: 10000000,
      blockGasLimit: 10000000,
      gasPrice: 1
    } ,
    // kovan: {
    //   network_id: 42,
    //   accounts: {
    //     mnemonic: mnemonic,
    //   },
    //   url: kovanProviderUrl,
    //   // provider: new HDWalletProvider(mnemonic, kovanProviderUrl, 0),
    //   gas: 9900000, //10m is 1000000000
    //   gasPrice: 1000000000, // 1 gwei
    //   skipDryRun: true,
    // },
  }
};
