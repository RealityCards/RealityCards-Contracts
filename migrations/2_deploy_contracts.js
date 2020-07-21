/* globals artifacts */
var RealityCards = artifacts.require("./RealityCards.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

var market = "pres";

if (market === "pres")
{
    var marketExpectedResolutionTime = 1604491200; //11/04/2020 @ 12:00pm (UTC)
    var numberOfTokens = 3;
    var question = 'Who will win the 2020 US General Election?␟"Donald Trump","Joe Biden","Neither or no election"␟politics␟en_US';
    var tokenName = 'PresElection';
} 
else if (market === "etherprice")
{
    var marketExpectedResolutionTime = 1593561600; //07/01/2020 @ 12:00am (UTC)
    var numberOfTokens = 6;
    var question = 'What will the USD price of Ether be closest to at the end of June 2020 UTC per coinmarketcap.com?␟"$175","$200","$225","$250","$275","$300"␟crypto␟en_US';
}
else if (market === "compoundprice")
{
    var marketExpectedResolutionTime = 1596240000; //08/01/2020 @ 12:00am (UTC)
    var numberOfTokens = 2;
    var question = 'What will the USD price of the Compound token (COMP) be at the end of July 2020 UTC per coinmarketcap.com?␟"Below $200","Above $200"␟crypto␟en_US';
}

// variables common
var templateId = 2;
var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day
var useExistingQuestion = false;

// variables test
var marketExpectedResolutionTimeTest = 0;
var timeoutTest = 30;
var questionId = '0xc8dae2bccb46477df016e190ae986d5feadd8600f445991c6b8bbe8fe70598bc';

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

module.exports = async (deployer, network) => {

    if (network === "kovan") 
    {
        deployer.deploy(RealityCards, andrewsAddress, numberOfTokens, augurCashAddressKovan, realitioAddressKovan, marketExpectedResolutionTimeTest, templateId, question, questionId, useExistingQuestion, arbitrator, timeoutTest, tokenName).then(async () => {
            instance = await RealityCards.deployed();
                
            if (market === "etherprice")
            {
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token0.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token1.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token2.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token3.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token4.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token5.json");
            } 
            else if (market === "pres")
            {
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token0.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token1.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token2.json");
            }
            else if (market === "compoundprice")
            {
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/compoundPrice/token0.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/compoundPrice/token1.json");
            }
        });
  } else if (network === "mainnet") {
    deployer.deploy(RealityCards, andrewsAddress, numberOfTokens, daiAddressMainnet, realitioAddressMainnet, marketExpectedResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout, tokenName).then(async () => {
        instance = await RealityCards.deployed();
        
            if (market === "etherPrice")
            {
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token0.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token1.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token2.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token3.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token4.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/etherPremier/token5.json");
            } 
            else if (market === "pres")
            {
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token0.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token1.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token2.json");
            }
            else if (market === "compoundprice")
            {
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/compoundPrice/token0.json");
                await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/compoundPrice/token1.json");
            }
      });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, deployedCash.address, deployedRealitio.address, marketExpectedResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeoutTest);
        });
      });
    }
  };