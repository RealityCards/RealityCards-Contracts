const { assert, artifacts } = require("hardhat");
const { BN, expectRevert, ether, expectEvent, balance, time } = require("@openzeppelin/test-helpers");
const _ = require("underscore");
const { current } = require("@openzeppelin/test-helpers/src/balance");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { object } = require("underscore");
const { createSolutionBuilderHost } = require("typescript");

// main contracts
const RCFactory = artifacts.require("./RCFactory.sol");
const RCTreasury = artifacts.require("./RCTreasury.sol");
const RCMarket = artifacts.require("./RCMarket.sol");
const NftHubXDai = artifacts.require("./nfthubs/RCNftHubXdai.sol");
const NftHubMainnet = artifacts.require("./nfthubs/RCNftHubMainnet.sol");
const XdaiProxy = artifacts.require("./bridgeproxies/RCProxyXdai.sol");
const MainnetProxy = artifacts.require("./bridgeproxies/RCProxyMainnet.sol");
const RCOrderbook = artifacts.require('./RCOrderbook.sol');
// mockups
const RealitioMockup = artifacts.require("./mockups/RealitioMockup.sol");
const BridgeMockup = artifacts.require("./mockups/BridgeMockup.sol");
const AlternateReceiverBridgeMockup = artifacts.require("./mockups/AlternateReceiverBridgeMockup.sol");
const SelfDestructMockup = artifacts.require("./mockups/SelfDestructMockup.sol");
const DaiMockup = artifacts.require("./mockups/DaiMockup.sol");
const NoFallback = artifacts.require("./mockups/noFallback.sol");
const kleros = "0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D";
const zeroAddress = "0x0000000000000000000000000000000000000000";



const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

module.exports = class TestEnviroment {
    constructor(accounts) {
        this.aliases = {
            admin: accounts[0],
            alice: accounts[1],
            bob: accounts[2],
            carol: accounts[3],
            dan: accounts[4],
            eve: accounts[5],
            frank: accounts[6],
            grace: accounts[7],
            harold: accounts[8],
            ivan: accounts[9],
        };
        Object.keys(this.aliases).forEach((alias) => {
            if (!this.aliases[alias]) delete this.aliases[alias];
        });
        this.configs = {
            MAX_DELETIONS: 50,
            LOOP_LIMIT: 100,
        }
        this.constants = Object.assign(
            {},
            require("@openzeppelin/test-helpers").constants
        );
        this.testHelpers = Object.assign(
            {},
            require("@openzeppelin/test-helpers")
        );
        this.contracts = {};
    }

    errorHandler(err) {
        if (err) throw err;
    }

    async setup(deployOpts = {}) {
        // main contracts
        this.contracts.treasury = await RCTreasury.new();
        this.contracts.factory = await RCFactory.new(this.contracts.treasury.address);
        this.contracts.reference = await RCMarket.new();
        this.contracts.orderbook = await RCOrderbook.new(this.contracts.factory.address, this.contracts.treasury.address);
        // nft hubs
        this.contracts.nfthubxdai = await NftHubXDai.new(this.contracts.factory.address);
        this.contracts.nfthubmainnet = await NftHubMainnet.new();
        // tell treasury about factory, tell factory about nft hub and reference
        await this.contracts.treasury.setFactoryAddress(this.contracts.factory.address);
        await this.contracts.factory.setReferenceContractAddress(this.contracts.reference.address);
        await this.contracts.factory.setNftHubAddress(this.contracts.nfthubxdai.address, 0);
        await this.contracts.treasury.setNftHubAddress(this.contracts.nfthubxdai.address);
        await this.contracts.factory.setOrderbookAddress(this.contracts.orderbook.address);
        await this.contracts.treasury.setOrderbookAddress(this.contracts.orderbook.address);
        // mockups
        this.contracts.realitio = await RealitioMockup.new();
        this.contracts.bridge = await BridgeMockup.new();
        this.contracts.alternateReceiverBridge = await AlternateReceiverBridgeMockup.new();
        this.contracts.dai = await DaiMockup.new();
        // bridge contracts
        this.contracts.xdaiproxy = await XdaiProxy.new(this.contracts.bridge.address, this.contracts.factory.address, this.contracts.treasury.address, this.contracts.realitio.address, this.contracts.realitio.address);
        this.contracts.mainnetproxy = await MainnetProxy.new(this.contracts.bridge.address, this.contracts.nfthubmainnet.address, this.contracts.alternateReceiverBridge.address, this.contracts.dai.address);
        // tell the factory, mainnet proxy and bridge the xdai proxy address
        await this.contracts.factory.setProxyXdaiAddress(this.contracts.xdaiproxy.address);
        await this.contracts.mainnetproxy.setProxyXdaiAddress(this.contracts.xdaiproxy.address);
        await this.contracts.bridge.setProxyXdaiAddress(this.contracts.xdaiproxy.address);
        // tell the xdai proxy, nft mainnet hub and bridge the mainnet proxy address
        await this.contracts.xdaiproxy.setProxyMainnetAddress(this.contracts.mainnetproxy.address);
        await this.contracts.bridge.setProxyMainnetAddress(this.contracts.mainnetproxy.address);
        await this.contracts.nfthubmainnet.setProxyMainnetAddress(this.contracts.mainnetproxy.address);
        // tell the treasury about the ARB
        await this.contracts.treasury.setAlternateReceiverAddress(this.contracts.alternateReceiverBridge.address);
        // market creation, start off without any.
        this.contracts.markets = [];
        this.contracts.markets.push(await this.createMarket())
    }


    setDefaults = (options, defaults) => {
        return _.defaults({}, _.clone(options), defaults);
    }

    async createMarket(options) {
        // default values if no parameter passed
        // mode, 0 = classic, 1 = winner takes all, 2 = safe mode
        // timestamps are in seconds from now
        var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
        var defaults = {
            mode: 0,
            openTime: 0,
            closeTime: 31536000,
            resolveTime: 31536000,
            numberOfCards: 4,
            artistAddress: zeroAddress,
            affiliateAddress: zeroAddress,
            cardAffiliate: [zeroAddress],
        };
        options = this.setDefaults(options, defaults);
        // assemble arrays
        var closeTime = new BN(options.closeTime).add(await time.latest());
        var resolveTime = new BN(options.resolveTime).add(await time.latest());
        var timestamps = [options.openTime, closeTime, resolveTime];
        var tokenURIs = [];
        for (let i = 0; i < options.numberOfCards; i++) {
            tokenURIs.push("x");
        }
        await this.contracts.factory.setProxyXdaiAddress(this.contracts.xdaiproxy.address);
        await this.contracts.factory.createMarket(
            options.mode,
            "0x0",
            timestamps,
            tokenURIs,
            options.artistAddress,
            options.affiliateAddress,
            options.cardAffiliate,
            question
        );
        return RCMarket.at(await this.contracts.factory.getMostRecentMarket.call(0));
    }
    async newRental(options) {
        var defaults = {
            market: markets[0],
            outcome: 0,
            price: 1,
            from: this.aliases.alice,
            timeLimit: 0,
            startingPosition: zeroAddress,
        };
        options = setDefaults(options, defaults);
        options.price = web3.utils.toWei(options.price.toString(), "ether");
        return await options.market.newRental(options.price, options.timeLimit, options.startingPosition, options.outcome, { from: options.from });
    }

    async deposit(amount, user) {
        amount = web3.utils.toWei(amount.toString(), "ether");
        await this.contracts.treasury.deposit(user, { from: user, value: amount });
    }

    async withdrawDeposit(amount, userx) {
        amount = web3.utils.toWei(amount.toString(), "ether");
        await treasury.withdrawDeposit(amount, true, { from: userx });
    }

    async rentDue(startTx, endTx, price) {
        let startTime = (await web3.eth.getBlock(startTx.receipt.blockNumber)).timestamp;
        let endTime = (await web3.eth.getBlock(endTx.receipt.blockNumber)).timestamp;
        let rentDue = ether(price).muln(endTime - startTime).divn(86400);
        return rentDue
    }

    async newRental(options) {
        var defaults = {
            market: this.contracts.markets[0],
            outcome: 0,
            price: 1,
            from: this.aliases.alice,
            timeLimit: 0,
            startingPosition: zeroAddress,
        };
        options = this.setDefaults(options, defaults);
        options.price = web3.utils.toWei(options.price.toString(), "ether");
        let receipt = await options.market.newRental(options.price, options.timeLimit, options.startingPosition, options.outcome, { from: options.from });
        return receipt;
    }

    async NoFallback() {
        return await NoFallback.new()
    }

    async SelfDestructMockup() {
        return await SelfDestructMockup.new()
    }

    async checkOrderbook(expectedResult) {
        var defaults = {
            from: this.aliases.alice,
            market: this.contracts.markets[0].address,
            next: this.contracts.markets[0].address,
            prev: this.contracts.markets[0].address,
            outcome: 0,
            price: 1,
            timeLimit: 0,
        };
        expectedResult = this.setDefaults(expectedResult, defaults);
        expectedResult.price = web3.utils.toWei(expectedResult.price.toString(), "ether");
        let index = await this.contracts.orderbook.index(expectedResult.market, expectedResult.from, expectedResult.outcome);
        let bid = await this.contracts.orderbook.user(expectedResult.from, index);
        assert.equal(bid[0], expectedResult.market, "Bid is for incorrect Market")
        assert.equal(bid[1], expectedResult.next, "Next user in list is incorrect");
        assert.equal(bid[2], expectedResult.prev, "Prev user in list is incorrect");
        assert.equal(bid[3], expectedResult.outcome, "Bid is for incorrect Outcome");
        assert.equal(bid[4].toString(), expectedResult.price, "Bid price is incorrect");
        assert.equal(bid[5], expectedResult.timeLimit, "Time limit doesn't match");
        return expectedResult
    }

    async checkOwner(expectedResult) {
        var defaults = {
            from: this.aliases.alice,
            market: this.contracts.markets[0].address,
            outcome: 0,
        };
        expectedResult = this.setDefaults(expectedResult, defaults);

        // check the orderbook thinks they are the owner
        let index = await this.contracts.orderbook.index(expectedResult.market, expectedResult.market, expectedResult.outcome);
        let bid = await this.contracts.orderbook.user(expectedResult.market, index);
        assert.equal(bid[0], expectedResult.market, "Bid is for incorrect Market")
        assert.equal(bid[1], expectedResult.from, "Market doesn't think this is the owner");
        assert.equal(bid[3], expectedResult.outcome, "Bid is for incorrect Outcome");
    }

    populateBidArray(bids, options) {
        var defaults = {
            market: this.contracts.markets[0],
            outcome: 0,
        };
        options = this.setDefaults(options, defaults);

        for (let index = 0; index < bids.length; index++) {
            if (index == 0) {
                bids[index].prev = options.market.address
                console.log("first bid");
            } else {
                bids[index].prev = bids[index - 1].from
                console.log("further bid");
            }
            if (index == bids.length - 1) {
                bids[index].next = options.market.address
            } else {
                bids[index].next = bids[index + 1].from
            }
        }
        return bids
    }

    swapBids(bids, pos1, pos2) {
        let temp1 = bids[pos1]
        let temp2 = bids[pos2]

        bids[pos1].next = temp2.next;
        bids[pos1].prev = temp2.prev;

        // WIP, finish swappping bid positions
        return bids
    }

    async cleanup() {
        for (const [key, value] of Object.entries(this.aliases)) {
            try {
                await this.withdrawDeposit(9999, value);
            } catch (error) {
                // console.log("failed withdraw", error)
            }
        }
    }
};
