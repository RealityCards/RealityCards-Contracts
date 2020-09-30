/* globals artifacts */
var RealityCardsTreasury = artifacts.require("./RealityCardsTreasury.sol");
var RealityCardsFactory = artifacts.require("./RealityCardsFactory.sol");
var RealityCardsMarket = artifacts.require("./RealityCardsMarket.sol");
var RealityCardsMarketLite = artifacts.require("./RealityCardsMarketLite.sol");
var RealityCardsMarketXdai = artifacts.require("./RealityCardsMarketXdai.sol");
var RealityCardsMarketXdaiV1 = artifacts.require("./RealityCardsMarketXdaiV1.sol")

// KOVAN ADDRESSES
const cashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

// XDAI ADDRESSES
const dummyAddresss = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0';

module.exports = async (deployer, network) => 
{
    if (network === "xdai") 
    {
        // deployer.deploy(RealityCardsTreasury).then(async () => {
        //     treasury = await RealityCardsTreasury.deployed();
        //     return deployer.deploy(RealityCardsFactory, dummyAddresss, dummyAddresss,treasury.address).then(async () => {
        //         factory = await RealityCardsFactory.deployed();
        //         return deployer.deploy(RealityCardsMarketXdaiV1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
        //             marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
        //             await factory.setLibraryAddressXdaiV1(marketXdaiV1.address);
        //         }); 
        //     }); 
        // });      
    } 
    else if (network === "kovan") 
    {
        deployer.deploy(RealityCardsTreasury).then(async () => {
            treasury = await RealityCardsTreasury.deployed();
            return deployer.deploy(RealityCardsFactory, dummyAddresss, dummyAddresss,treasury.address).then(async () => {
                factory = await RealityCardsFactory.deployed();
                return deployer.deploy(RealityCardsMarketXdaiV1, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                    marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
                    await factory.setLibraryAddressXdaiV1(marketXdaiV1.address);
                }); 
            }); 
        });      
    } 
};