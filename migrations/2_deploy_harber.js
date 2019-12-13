/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var HarberSimple = artifacts.require("./HarberSimple.sol");
var Token = artifacts.require("./ERC721Full.sol");

const whiskeyFundsAccount = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0'; 

// FOR AUGUR KOVAN TESTNET ONLY
const augurCashAddress = '0x0802563FB6CfA1f07363D3aBf529F7b3999096f6';
const augurMarketAddress = '0x4Ca5B2E0A87325F962208561E87c82638cc384Ca';
const augurShareTokenAddress = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';

module.exports = function(deployer, network) {
  
  /// LITE VERSION- DOES NOT DEPLOY ERC271
  // if(network === "kovan") {
  //   deployer.deploy(Harber, whiskeyFundsAccount, deployedERC721Contract, augurCashAddress);

  /// FULL VERSION- DEPLOYS ERC271
    if(network === "kovan") {
      deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
        return deployer.deploy(Harber, whiskeyFundsAccount, deployedToken.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress);
      });
  } else {
    // development deploy
    deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, whiskeyFundsAccount, deployedToken.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress);
    });
  }

};