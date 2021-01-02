/* globals artifacts */
var RCTreasury = artifacts.require("./RCTreasury.sol");
var RCFactory = artifacts.require("./RCFactory.sol");
var RCMarket = artifacts.require("./RCMarket.sol")
var XdaiNftHub = artifacts.require('./nfthubs/RCNftHubXdai.sol');
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyXdai.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyMainnet.sol');

// variables
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59';
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e';
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

// UPDATE THIS AFTER STAGE 1
var xdaiProxyAddress = '0xf15C6a9809fe81e9C053F993067FdA5A2e2842Ed';

// UPDATE THIS AFTER STAGE 2
var mainnetProxyAddress = '0x9ACd4771D37bc9994410084173Bd049936c8E054';

module.exports = async (deployer, network) => 
{
    if (network === "stage1") // xdai
    {
        // deploy treasury, factory, and reference market
        await deployer.deploy(RCTreasury);
        treasury = await RCTreasury.deployed();
        await deployer.deploy(RCFactory,treasury.address);
        rcfactory = await RCFactory.deployed();
        await deployer.deploy(RCMarket);
        rcreference = await RCMarket.deployed();
        // tell treasury about the factory
        await treasury.setFactoryAddress(rcfactory.address);
        // tell factory about the reference market
        await rcfactory.setReferenceContractAddress(rcreference.address);
        // deploy xdai nft hub
        await deployer.deploy(XdaiNftHub,rcfactory.address);
        xdainfthub = await XdaiNftHub.deployed();
        // deploy xdai proxy
        await deployer.deploy(XdaiProxy, ambAddressXdai, rcfactory.address);
        xdaiproxy = await XdaiProxy.deployed();
        // tell factory about nft hub and the proxy
        await rcfactory.setOracleProxyXdaiAddress(xdaiproxy.address);
        await rcfactory.setNftHubXdaiAddress(xdainfthub.address);
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

// Treasury: 0xbfD33bb4e15140FcdC713e00fFA16bB86C8afe00
// Factory: 0x060e1BF56e238F3263fC9870c472936EEc09CeEb
// Proxy mainnet: 0x9ACd4771D37bc9994410084173Bd049936c8E054