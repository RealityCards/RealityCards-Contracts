/* globals artifacts */
var RCTreasury = artifacts.require("./RCTreasury.sol");
var RCFactory = artifacts.require("./RCFactory.sol");
var RCMarket = artifacts.require("./RCMarket.sol")
var NftHub = artifacts.require('./RCNftHub.sol');
var XdaiProxy = artifacts.require('./bridgeproxies/RCProxyXdai.sol');
var MainnetProxy = artifacts.require('./bridgeproxies/RCProxyMainnet.sol');

// variables
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59';
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e';
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';
var arbAddressMainnet = '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016';

// UPDATE THIS AFTER STAGE 1
var xdaiProxyAddress = '0x9e15161380f76311Ed7C33AdFF52f928Fb27D84D';

// UPDATE THIS AFTER STAGE 2
var mainnetProxyAddress = '0x5a38d0f63f72a882fd78a1dfdaa18bb5a041f9cf';

module.exports = async (deployer, network) => 
{
    if (network === "stage1") // xdai
    {
        // deploy treasury, factory, reference market and nft hub
        await deployer.deploy(RCTreasury);
        treasury = await RCTreasury.deployed();
        await deployer.deploy(RCFactory,treasury.address);
        rcfactory = await RCFactory.deployed();
        await deployer.deploy(RCMarket);
        rcreference = await RCMarket.deployed();
        await deployer.deploy(NftHub,rcfactory.address);
        xdainfthub = await NftHub.deployed();
        // tell treasury about factory, tell factory about nft hub and reference
        await treasury.setFactoryAddress(rcfactory.address);
        await rcfactory.setReferenceContractAddress(rcreference.address);
        await rcfactory.setNftHubAddress(xdainfthub.address);
        // deploy xdai proxy
        await deployer.deploy(XdaiProxy, ambAddressXdai, rcfactory.address, treasury.address);
        xdaiproxy = await XdaiProxy.deployed();
        // tell factory about the proxy
        await rcfactory.setProxyXdaiAddress(xdaiproxy.address);
    } 
    else if (network === "stage2") // mainnet
    {
        // deploy mainnet proxy
        await deployer.deploy(MainnetProxy, ambAddressMainnet, realitioAddress, arbAddressMainnet);
        mainnetproxy = await MainnetProxy.deployed();
        // set xdai proxy address
        await mainnetproxy.setProxyXdaiAddress(xdaiProxyAddress);
    } 
    else if (network === "stage3") // xdai
    {
        // set mainnet proxy address
        xdaiproxy = await XdaiProxy.deployed();
        await xdaiproxy.setProxyMainnetAddress(mainnetProxyAddress);
    } 
};

// Most recent deployments:

// Treasury: 0xbfD33bb4e15140FcdC713e00fFA16bB86C8afe00
// Factory: 0x060e1BF56e238F3263fC9870c472936EEc09CeEb
// Proxy mainnet: 0x9ACd4771D37bc9994410084173Bd049936c8E054