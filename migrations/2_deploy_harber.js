/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var Token = artifacts.require("./Token.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

// variables
const marketExpectedResolutionTime = 0;
const andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

module.exports = function (deployer, network) {

  if (network === "kovan") {
    deployer.deploy(Token, "harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddressKovan, realitioAddressKovan, marketExpectedResolutionTime);
    }).then((deployedHarber) => {
      return deployer.deploy(MintNFTs, Token.address, deployedHarber.address);
    });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(Harber, andrewsAddress, deployedCash.address, deployedRealitio.address, marketExpectedResolutionTime);
          });
      });
    }
  };