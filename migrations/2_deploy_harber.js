/* globals artifacts */
var Harber = artifacts.require("./Harber.sol");
var mintNFTs = artifacts.require("./mintNFTs.sol");
var Token = artifacts.require("./ERC721Full.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var MarketMockup = artifacts.require("./mockups/MarketMockup.sol");
var ShareTokenMockup = artifacts.require("./mockups/ShareTokenMockup.sol");

// variables
const marketedExpectedResolutionTime = 0;
const andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x0802563FB6CfA1f07363D3aBf529F7b3999096f6';
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
const augurShareTokenAddressKovan = '0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1';
const augurMainAddressKovan = '0x62214e5c919332AC17c5e5127383B84378Ef9C1d';

module.exports = function (deployer, network) {

  if (network === "kovan") {
    deployer.deploy(Token, "Harber.io", "HARB").then((deployedToken) => {
      return deployer.deploy(Harber, andrewsAddress, deployedToken.address, augurCashAddressKovan, augurMarketAddressKovan, augurShareTokenAddressKovan, augurMainAddressKovan, marketedExpectedResolutionTime);
    }).then((deployedHarber) => {
      return deployer.deploy(mintNFTs, Token.address, deployedHarber.address);
    });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(MarketMockup).then((deployedMarket) => {
          const augurMarketAddressLocal = [deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address,deployedMarket.address ];
          return deployer.deploy(ShareTokenMockup, deployedCash.address).then((deployedShareToken) => {
            return deployer.deploy(Token, "Harber.io", "HARB" ).then((deployedToken) => {
              return deployer.deploy(Harber, andrewsAddress, deployedToken.address, deployedCash.address, augurMarketAddressLocal, deployedShareToken.address, augurMainAddressKovan, marketedExpectedResolutionTime).then((deployedHarber) => {
                return deployer.deploy(mintNFTs, Token.address, deployedHarber.address);
              });
            });
          });
        });
      });
    }
  };