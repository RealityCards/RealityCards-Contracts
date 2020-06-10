/* globals artifacts */
var RealityCards = artifacts.require("./RealityCards.sol");
var CashMockup = artifacts.require("./mockups/CashMockup.sol");
var RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");

// variables
var marketExpectedResolutionTime = 1591120800;
var marketExpectedResolutionTimeTest = 0;
var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
var numberOfTokensTest = 3;
var numberOfTokens = 11;
var templateId = 2;
var question = 'Who will win the 2020 US General Election?␟"Donald Trump","Joe Biden","Neither"␟politics␟en_US';
var questionId = '0xc8dae2bccb46477df016e190ae986d5feadd8600f445991c6b8bbe8fe70598bc';
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day
var timeoutTest = 30;
var useExistingQuestion = false;

// KOVAN ADDRESSES
const augurCashAddressKovan = '0x86309723166C177591960E5A9a5ecb7056564331';
const realitioAddressKovan = '0x50E35A1ED424aB9C0B8C7095b3d9eC2fb791A168';

// MAINNET ADDRESSES
const daiAddressMainnet = '0x6b175474e89094c44da98b954eedeac495271d0f';
const realitioAddressMainnet = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';

module.exports = async (deployer, network) => {

    if (network === "kovan") {
        deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, augurCashAddressKovan, realitioAddressKovan, marketExpectedResolutionTimeTest, templateId, question, questionId, useExistingQuestion, arbitrator, timeoutTest).then(async () => {
          instance = await RealityCards.deployed();

          await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token0.json");
          await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token1.json");
          await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/presElection/token2.json");

        // for (i = 0; i < numberOfTokensMain; i++) {
        //   await instance.mintNfts("https://raw.githubusercontent.com/RealityCards/RealityCards-Contracts/master/nftmetadata/etherPrice/token1.json");
        // }
        });
  } else if (network === "pends") {
    deployer.deploy(RealityCards, andrewsAddress, numberOfTokens, daiAddressMainnet, realitioAddressMainnet, marketExpectedResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeout).then(async () => {
        instance = await RealityCards.deployed();
        
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token0.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token1.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token2.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token3.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token4.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token5.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token6.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token7.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token8.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token9.json");
        await instance.mintNfts("https://cdn.realitycards.io/nftmetadata/hackMoney/token10.json");
        

      });

  } else if (network === "development") {
      deployer.deploy(CashMockup).then((deployedCash) => {
        return deployer.deploy(RealitioMockup).then((deployedRealitio) => {
            return deployer.deploy(RealityCards, andrewsAddress, numberOfTokensTest, deployedCash.address, deployedRealitio.address, marketExpectedResolutionTime, templateId, question, questionId, useExistingQuestion, arbitrator, timeoutTest);
        });
      });
    }
  };