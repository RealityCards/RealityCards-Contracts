usePlugin("@nomiclabs/buidler-truffle5");

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
    version: "0.6.6",
    optimizer: {
      enabled: true,
      runs: 1
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    buidlerevm: {
      gas: 10000000,
      blockGasLimit: 10000000,
      gasPrice: 1
    } 
  }
};
