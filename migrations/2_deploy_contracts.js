/* globals artifacts */
var RealityCards = artifacts.require("./RealityCards.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

// variables
var marketExpectedResolutionTime = 0;
var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
var numberOfTokensTest = 2;
var numberOfTokensMain = 2;
var templateId = 2;
var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400;

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';

module.exports = function (deployer, network) {

  if (network === "kovan") {
    deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, augurCashAddressKovan, realitioAddressKovan, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);

  } else if (network === "mainnet") {
    deployer.deploy(RealitioMockup).then((deployedRealitio) => {
      return deployer.deploy(RealityCards, andrewsAddress, numberOfTokensMain, daiAddressMainnet, deployedRealitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);
    });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, deployedCash.address, deployedRealitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);
        });
      });
    }
  };