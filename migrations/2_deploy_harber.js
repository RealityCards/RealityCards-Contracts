/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var mintNFTs = artifacts.require("./mintNFTs.sol");
var Token = artifacts.require("./ERC721Full.sol");
var Cash = artifacts.require("./Cash.sol");

// production:
// const andrewsAddress = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0'; 
// dev:
const andrewsAddress = '0x84CAbF995E9Af67B6d73232C2D5E9fBeBEF92224'; //this is user9

// FOR AUGUR KOVAN TESTNET ONLY
const augurCashAddress = '0x0802563FB6CfA1f07363D3aBf529F7b3999096f6';
const augurMarketAddress = [
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  //15 above 5 below
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A', 
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A']; 
const augurShareTokenAddress = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
const augurMainAddress = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';
const marketedExpectedResolutionTime = 0;

module.exports = function(deployer, network) {
  if(network === "rinkeby" || network === "mainnet") {
    async function getCashContractInstance() {
    cash = await Cash.at(augurCashAddress);
    }
    getCashContractInstance();
  }

  //deploy the token contract (which Harber needs the address of)
  deployer.deploy(Token, "Harber.io", "HARB", andrewsAddress).then((deployedToken) => {
    //deploy Harber (which mint NFTs needs the address of)
    return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddress, augurMarketAddress,augurShareTokenAddress, augurMainAddress, marketedExpectedResolutionTime);
  }).then((deployedHarber) => {
    //deploy mintNFTs, which does what it says on the tin
    return deployer.deploy(mintNFTs, Token.address, deployedHarber.address );
  });
  
};