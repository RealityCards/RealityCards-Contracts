/* globals artifacts */
var RealityCards = artifacts.require("./RealityCards.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

// variables
var marketExpectedResolutionTime = 0;
var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
var numberOfTokens = 20;
var templateId = 2;
var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
var arbitrator = "0xA6EAd513D05347138184324392d8ceb24C116118";
var timeout = 86400;

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

module.exports = function (deployer, network) {

  if (network === "kovan") {
    deployer.deploy(Token, "harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(RealityCards, andrewsAddress, deployedToken.address, augurCashAddressKovan, realitioAddressKovan, marketExpectedResolutionTime);
    }).then((deployedHarber) => {
      return deployer.deploy(MintNFTs, Token.address, deployedHarber.address);
    });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(RealityCards, andrewsAddress, numberOfTokens, deployedCash.address, deployedRealitio.address, marketExpectedResolutionTime, templateId, question, arbitrator, timeout);
        });
      });
    }
  };