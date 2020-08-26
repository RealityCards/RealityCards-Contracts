var RealityCardsFactory = artifacts.require("contracts//RealityCardsFactory.sol");

// variables market specific
var marketLockingTime = 1600041601; //Monday, 14-Sep-20 00:00:01 UTC
var oracleResolutionTime = 1600041601; //Monday, 14-Sep-20 00:00:01 UTC
var numberOfTokens = 8;
var question = 'Who will win the 2020 US Tennis Open Mens Singles?␟"Novak Djokovic","Dominic Thiem","Daniil Medvedev","Stefanos Tsitsipas","Alexander Zverev","Matteo Berrettini","David Goffin","Someone else"␟sport␟en_US';
var tokenName = 'RealityCards_2020usopen';

// variables common
var templateId = 2;
var andrewsAddress = '0x34A971cA2fd6DA2Ce2969D716dF922F17aAA1dB0';
var arbitrator = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D"; //kleros 4lyfe
var timeout = 86400; // 86400 = 1 day
var useExistingQuestion = false;

// variables test
var timeoutTest = 30;
var marketLockingTimeTest = 100; //09/13/2020 @ 3:00am (UTC)
var oracleResolutionTimeTest = 100; //09/13/2020 @ 9:00am (UTC)
var questionId = '0xc8dae2bccb46477df016e190ae986d5feadd8600f445991c6b8bbe8fe70598bc';

module.exports = function(callback) {
    RealityCardsFactory.deployed().then(function(f) {f.createMarket(andrewsAddress, numberOfTokens, augurCashAddressKovan, realitioAddressKovan, marketLockingTimeTest, oracleResolutionTimeTest, templateId, question, questionId, useExistingQuestion, arbitrator, timeoutTest, tokenName).then(function(f) {console.log(f)})});
}