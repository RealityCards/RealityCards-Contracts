/* globals artifacts */
var RCTreasury = artifacts.require("./RCTreasury.sol");
var RCFactory = artifacts.require("./RCFactory.sol");
var RCMarket = artifacts.require("./RCMarket.sol")
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyXdai.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyMainnet.sol');

// variables
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59';
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e';
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

// UPDATE THIS AFTER STAGE 1
var xdaiProxyAddress = '0x5DAfe4Cd7032D7561237d3dED60c97739252ca61';

// UPDATE THIS AFTER STAGE 2
var mainnetProxyAddress = '0x978Fb2916dfA4C8eb9B8De1E479484fFca956f21';

module.exports = async (deployer, network) => 
{
    if (network === "stage1") // xdai
    {
        // main contracts
        await deployer.deploy(RCTreasury);
        treasury = await RCTreasury.deployed();
        await deployer.deploy(RCFactory,treasury.address);
        rcfactory = await RCFactory.deployed();
        await deployer.deploy(RCMarket);
        rcreference = await RCMarket.deployed();
        // set treasury and factory
        await treasury.setFactoryAddress(rcfactory.address);
        await rcfactory.setReferenceContractAddress(rcreference.address);
        // deploy xdai proxy
        await deployer.deploy(XdaiProxy, ambAddressXdai, rcfactory.address);
        xdaiproxy = await XdaiProxy.deployed();
        // tell factory about it 
        await rcfactory.setOracleProxyXdaiAddress(xdaiproxy.address);
    } 
    else if (network === "stage2") // mainnet
    {
        // deploy mainnet proxy
        await deployer.deploy(MainnetProxy, ambAddressMainnet, realitioAddress);
        mainnetproxy = await MainnetProxy.deployed();
        // set xdai proxy address
        await mainnetproxy.setOracleProxyXdaiAddress(xdaiProxyAddress);
    } 
    else if (network === "stage3") // xdai
    {
        // set mainnet proxy address
        xdaiproxy = await XdaiProxy.deployed();
        await xdaiproxy.setOracleProxyMainnetAddress(mainnetProxyAddress);
    } 
};

// Most recent deployments:

// Treasury: 0x7ea6bcd32FD6140d7123E922A4E764D58fa6b441
// Factory: 0xBf4992e9f896D6bE553ef70D58a6454ABBEA2534
// ProxyXdai: 0x5DAfe4Cd7032D7561237d3dED60c97739252ca61
// ProxyMainnet: 0x978Fb2916dfA4C8eb9B8De1E479484fFca956f21