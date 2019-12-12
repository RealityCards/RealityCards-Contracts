/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var HarberSimple = artifacts.require("./HarberSimple.sol");
var Token = artifacts.require("./ERC721Full.sol");

const whiskeyFundsAccount = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0'; 

// FOR AUGUR KOVAN TESTNET ONLY
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';
const augurMarketAddress = '0x182932bF8585d7CB89686aC1826025916A44Ae03';
const augurCompleteSetsAddress = '0x88316706a2bfe905E2dd1bA3589811e882DD1D16';
const augurMainAddress = '0xe2020A4a6B0a5D6C74c358e09B2b4758b5Cdb91C';

module.exports = function(deployer, network) {
  
  /// LITE VERSION- DOES NOT DEPLOY ERC271
  // if(network === "kovan") {
  //   deployer.deploy(Harber, whiskeyFundsAccount, deployedERC721Contract, augurCashAddress);

  /// FULL VERSION- DEPLOYS ERC271
    if(network === "kovan") {
      deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
        return deployer.deploy(Harber, whiskeyFundsAccount, deployedToken.address, augurCashAddress, augurMarketAddress,augurCompleteSetsAddress, augurMainAddress);
      });
  } else {
    // development deploy
    deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, whiskeyFundsAccount, deployedToken.address, augurCashAddress, augurMarketAddress,augurCompleteSetsAddress, augurMainAddress);
    });
  }

};