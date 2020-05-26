/* globals artifacts */
var RealityCards = artifacts.require("./RealityCards.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

// variables
var marketExpectedResolutionTime = 1590753600;
var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
var numberOfTokensTest = 2;
var numberOfTokensMain = 2;
var templateId = 2;
var question = 'What will the ether price be at 1pm UTC May 29th 2020? ␟"Above $200","Below $200"␟crypto␟en_US';
var questionId = '0xa1addab1dcb7b73cd2a513dd5c34130bd946adb82e42f2c8205a0c7c09ddab2b';
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 43200; // 86400 = 1 day
var useExistingQuestion = true;

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

module.exports = async (deployer, network) => {

  if (network === "kovan") {
    deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, augurCashAddressKovan, realitioAddressKovan, marketExpectedResolutionTime, templateId, question, arbitrator, timeout).then(async () => {
      instance = await RealityCards.deployed();
    for (i = 0; i < numberOfTokensMain; i++) {
      await instance.mintNfts("uri");
    }
    });
    
  } else if (network === "mainnet") {
    deployer.deploy(RealityCards, andrewsAddress, numberOfTokensMain, daiAddressMainnet, realitioAddressMainnet, marketExpectedResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout);

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, deployedCash.address, deployedRealitio.address, marketExpectedResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout);
        });
      });
    }
  };