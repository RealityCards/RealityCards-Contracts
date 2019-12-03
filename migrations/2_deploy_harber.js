/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var Artwork = artifacts.require("./ERC721Full.sol");

const whiskeyFundsAccount = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0'; 
const augurCashAddress = '0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6';
const deployedERC721Contract = '0x7c868BeA1a1fEC229b79F7B193DF256CcF87359C';


module.exports = function(deployer, network) {
  if(network === "kovan") {
    // deploy with mnemonic provider
    deployer.deploy(Harber, whiskeyFundsAccount, deployedERC721Contract, augurCashAddress);

    // if(network === "kovan") {
    //   // deploy with mnemonic provider
    //   deployer.deploy(Artwork, "Harber.io", "HARB").then((deployedArtwork) => {
    //     console.log(deployedArtwork.address);
    //     return deployer.deploy(Harber, whiskeyFundsAccount, deployedArtwork.address, augurCashAddress);
    //   });
  } else {
    // development deploy
    deployer.deploy(Artwork, "Harber.io", "HARB").then((deployedArtwork) => {
      return deployer.deploy(Harber, whiskeyFundsAccount, deployedArtwork.address, augurCashAddress);
    });
  }

};