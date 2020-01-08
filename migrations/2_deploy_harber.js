/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var Token = artifacts.require("./ERC721Full.sol");
// var localCash = artifacts.require("./Cash.sol");

// production:
// const andrewsAddress = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0'; 
// dev:
const andrewsAddress = '0x84CAbF995E9Af67B6d73232C2D5E9fBeBEF92224'; //this is user9

// FOR AUGUR KOVAN TESTNET ONLY
const augurCashAddress = '0x0802563FB6CfA1f07363D3aBf529F7b3999096f6';
const augurMarketAddress = [
  '0xDa2574884E4F324fc09276194fE603c1F57f71f3',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A']; //0x3276323FCcAA197DCCe782CCF783120D78D57cE6 this has worked before
const augurShareTokenAddress = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';
const marketedExpectedResolutionTime = 0;

module.exports = function(deployer, network) {
  

  /// FULL VERSION- DEPLOYS ERC271
    if(network === "kovan") {
      deployer.deploy(Token, "Harber.io", "HARB", andrewsAddress).then((deployedToken) => {
        return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress, marketedExpectedResolutionTime);
      });
  } else {
    // development deploy
    deployer.deploy(Token, "Harber.io", "HARB", andrewsAddress).then((deployedToken) => {
      return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress, marketedExpectedResolutionTime);
    });

  }

};