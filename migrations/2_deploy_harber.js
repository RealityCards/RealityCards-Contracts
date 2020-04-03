/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var MintNFTs = artifacts.require("./MintNFTs.sol");
var Token = artifacts.require("./ERC721Full.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var DaiVatMockup = artifacts.require("./mockups/DaiVatMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

// variables
const marketedExpectedResolutionTime = 0;
const andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const vatDaiAddressKovan = '0x45013273bEd0835d19864C6Bcf162BC7cF88c47d'; //just the mockup deployed via remix
const _addressOfRealitioContract = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

module.exports = function (deployer, network) {

  if (network === "kovan") {
    deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddressKovan, vatDaiAddressKovan, augurMarketAddressKovan, augurOICashAddressKovan, augurMainAddressKovan, marketedExpectedResolutionTime);
    }).then((deployedHarber) => {
      return deployer.deploy(MintNFTs, Token.address, deployedHarber.address);
    });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(DaiVatMockup).then((deployedDaiVat) => {
          return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(Token, "Harber.io", "HARB" ).then((deployedToken) => {
              return deployer.deploy(Harber, andrewsAddress, deployedToken.address, deployedCash.address, deployedDaiVat.address, deployedRealitio.address, marketedExpectedResolutionTime).then((deployedHarber) => {
                return deployer.deploy(MintNFTs, Token.address, deployedHarber.address);
              });
            });
          });
        });
      });
    }
  };