/* globals artifacts */
var RealityCardsTreasury = artifacts.require("./RCTreasury.sol");
var RealityCardsFactory = artifacts.require("./RCFactory.sol");
var RealityCardsMarketXdaiV1 = artifacts.require("./RCMarketXdaiV1.sol")


// MAINNET ADDRESSES
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

module.exports = async (deployer, network) => 
{
    if (network === "xdai") 
    {
        deployer.deploy(RealityCardsTreasury).then(async () => {
            treasury = await RealityCardsTreasury.deployed();
            return deployer.deploy(RealityCardsFactory,treasury.address,realitioAddressMainnet).then(async () => {
                factory = await RealityCardsFactory.deployed();
                return deployer.deploy(RealityCardsMarketXdaiV1).then(async () => {
                    marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
                    await factory.setReferenceContractAddress(0,marketXdaiV1.address);
                    await treasury.setFactoryAddress(factory.address);
                });    
            }); 
        });      
    } 
    else 
    {
        console.log("No deploy script for this network")   
    } 
};