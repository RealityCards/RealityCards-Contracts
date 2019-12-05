/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var HarberSimple = artifacts.require("./HarberSimple.sol");
var Token = artifacts.require("./ERC721Full.sol");

const whiskeyFundsAccount = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0'; 
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';
const deployedERC721Contract = '0x7c868BeA1a1fEC229b79F7B193DF256CcF87359C';


module.exports = function(deployer, network) {
  
  /// LITE VERSION- DOES NOT DEPLOY ERC271
  // if(network === "kovan") {
  //   deployer.deploy(Harber, whiskeyFundsAccount, deployedERC721Contract, augurCashAddress);

  /// FULL VERSION- DEPLOYS ERC271
    if(network === "kovan") {
      deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
        return deployer.deploy(Harber, whiskeyFundsAccount, deployedToken.address, augurCashAddress);
      });
  } else {
    // development deploy
    deployer.deploy(HarberSimple);
    deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, whiskeyFundsAccount, deployedToken.address, augurCashAddress);
    });
  }

};