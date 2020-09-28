/* globals artifacts */
var RealityCardsFactory = artifacts.require("./RealityCardsFactory.sol");
var RealityCardsMarket = artifacts.require("./RealityCardsMarket.sol");
var RealityCardsMarketLite = artifacts.require("./RealityCardsMarketLite.sol");
var RealityCardsMarketXdai = artifacts.require("./RealityCardsMarketXdai.sol");

// KOVAN ADDRESSES
const cashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

module.exports = async (deployer, network) => 
{
    if (network === "kovan") 
    {
        deployer.deploy(RealityCardsFactory, cashAddressKovan, realitioAddressKovan).then(async () => {
            return deployer.deploy(RealityCardsMarket, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                return deployer.deploy(RealityCardsMarketLite, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                    return deployer.deploy(RealityCardsMarketXdai, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                        market = await RealityCardsMarket.deployed();
                        marketLite = await RealityCardsMarketLite.deployed();
                        marketXdai = await RealityCardsMarketXdai.deployed();
                        factory = await RealityCardsFactory.deployed();
                        await factory.setLibraryAddress(market.address);
                        await factory.setLibraryAddressLite(marketLite.address);
                        await factory.setLibraryAddressXdai(marketXdai.address);
                    });
                });
            });
        });      
    } 
    else if (network === "mainnet") 
    {
        deployer.deploy(RealityCardsFactory, daiAddressMainnet, realitioAddressMainnet).then(async () => {
            return deployer.deploy(RealityCardsMarket, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                return deployer.deploy(RealityCardsMarketLite, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                    market = await RealityCardsMarket.deployed();
                    marketLite = await RealityCardsMarketLite.deployed();
                    factory = await RealityCardsFactory.deployed();
                    await factory.setLibraryAddress(market.address);
                    await factory.setLibraryAddressLite(marketLite.address);
                });
            });
        }); 
    }
    else if (network === "xdai") 
    {
        deployer.deploy(RealityCardsFactory, cashAddressKovan, realitioAddressKovan).then(async () => {
            return deployer.deploy(RealityCardsMarketXdai, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                marketXdai = await RealityCardsMarketXdai.deployed();
                factory = await RealityCardsFactory.deployed();
                await factory.setLibraryAddressXdai(marketXdai.address);
            }); 
        });      
    } 
  };