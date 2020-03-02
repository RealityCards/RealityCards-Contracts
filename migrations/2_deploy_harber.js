/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var mintNFTs = artifacts.require("./mintNFTs.sol");
var Token = artifacts.require("./ERC721Full.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var MarketMockup = artifacts.require("./mockups/MarketMockup.sol");
var OICashMockup = artifacts.require("./mockups/OICashMockup.sol");

// variables
const marketedExpectedResolutionTime = 0;
const andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';

// KOVAN ADDRESSES
const augurMarketAddressKovan = [
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
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A',
  '0xA830e8A271909b2407985F95921E5dD4AD1d859A'
];
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const augurOICashAddressKovan = '0xbD41281dE5E4cA62602ed7c134f46d831A340B78';
const augurMainAddressKovan = '0x98976c6B72858DF90751Bc327353bB9F46a4Aa5D';

module.exports = function (deployer, network) {

  if (network === "kovan") {
    deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddressKovan, augurMarketAddressKovan, augurOICashAddressKovan, augurMainAddressKovan, marketedExpectedResolutionTime);
    }).then((deployedHarber) => {
      return deployer.deploy(mintNFTs, Token.address, deployedHarber.address);
    });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(MarketMockup).then((deployedMarket) => {
          const augurMarketAddressLocal = [deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address ];
          return deployer.deploy(OICashMockup, deployedCash.address).then((deployedOICash) => {
            return deployer.deploy(Token, "Harber.io", "HARB" ).then((deployedToken) => {
              return deployer.deploy(Harber, andrewsAddress, deployedToken.address, deployedCash.address, augurMarketAddressLocal, deployedOICash.address, augurMainAddressKovan, marketedExpectedResolutionTime).then((deployedHarber) => {
                return deployer.deploy(mintNFTs, Token.address, deployedHarber.address);
              });
            });
          });
        });
      });
    }
  };