/* globals artifacts */
var RealityCardsTreasury = artifacts.require("./RCTreasury.sol");
var RealityCardsFactory = artifacts.require("./RCFactory.sol");
var RealityCardsMarketXdaiV1 = artifacts.require("./RCMarketXdaiV1.sol")


// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

// XDAI ADDRESSES
const dummyAddresss = '0x34a971ca2fd6da2ce2969d716df922f17aaa1db0';

module.exports = async (deployer, network) => 
{
    if (network === "xdai") 
    {
        deployer.deploy(RealityCardsTreasury).then(async () => {
            treasury = await RealityCardsTreasury.deployed();
            return deployer.deploy(RealityCardsFactory,dummyAddresss,treasury.address).then(async () => {
                factory = await RealityCardsFactory.deployed();
                return deployer.deploy(RealityCardsMarketXdaiV1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0).then(async () => {
                    marketXdaiV1 = await RealityCardsMarketXdaiV1.deployed();
                    await factory.setReferenceContractAddress(0,marketXdaiV1.address);
                }); 
            }); 
        });      
    } 
    else 
    {
        console.log("No deploy script for this network")   
    } 
};