// read in extra arguments, this is to help deploy across multiple networks
// myArgs[0] = first extra argument.. etc
var myArgs = process.argv.slice(6, 9);

const _ = require('underscore');
const { BN, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['ipfs_hash'],
});

/* globals artifacts */
var RCTreasury = artifacts.require('./RCTreasury.sol');
var RCFactory = artifacts.require('./RCFactory.sol');
var RCMarket = artifacts.require('./RCMarket.sol');
var RCOrderbook = artifacts.require('./RCOrderbook.sol');
var NftHubL2 = artifacts.require('./nfthubs/RCNftHubL2.sol');
var NftHubL1 = artifacts.require('./nfthubs/RCNftHubL1.sol');
var RealitioMockup = artifacts.require('./mockups/RealitioMockup.sol');
var tokenMockup = artifacts.require('./mockups/tokenMockup.sol');

// variables
// TODO: update chilvers' script with the relevant addresses here https://github.com/realitio/realitio-contracts/blob/master/config/arbitrators.json
var ambAddressXdai = '0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59';
var ambAddressMainnet = '0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e';
var realitioAddress = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';
var arbAddressMainnet = '0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016'; // may not be correct
var arbAddressXdai = '0x7301CFA0e1756B71869E93d4e4Dca5c7d0eb0AA6'; // may not be correct
var kleros = '0xd47f72a2d1d0E91b0Ec5e5f5d02B2dc26d00A14D'; //double check this

// Testnet addresses
var ambAddressSokol = '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560';
var ambAddressKovan = '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560';
var realitioAddressKovan = '0x325a2e0F3CCA2ddbaeBB4DfC38Df8D19ca165b47';
var arbAddressKovan = '0xA960d095470f7509955d5402e36d9DB984B5C8E2';

// read input arguments
var ProxyL2Address = myArgs[0];
var proxyL1Address = myArgs[1];
var ipfsHashes = argv['ipfs_hash'];

// an array of market instances
var market = [];
// an array of the addresses (just a more readable way of doing market[].address)
var marketAddress = [];

module.exports = async (deployer, network, accounts) => {
  if (network === 'teststage1' || network === 'stage1') {
    // deploy treasury, factory, reference market and nft hub
    await deployer.deploy(RCTreasury);
    treasury = await RCTreasury.deployed();
    await deployer.deploy(RCFactory, treasury.address);
    factory = await RCFactory.deployed();
    await deployer.deploy(RCMarket);
    reference = await RCMarket.deployed();
    await deployer.deploy(NftHubL2, factory.address);
    nftHubL2 = await NftHubL2.deployed();
    // tell treasury about factory & ARB, tell factory about nft hub and reference
    await treasury.setFactoryAddress(factory.address);
    await treasury.setAlternateReceiverAddress(arbAddressXdai);
    await factory.setReferenceContractAddress(reference.address);
    await factory.setNftHubAddress(nftHubL2.address, 0);
    // deploy xdai proxy
    if (network === 'stage1') {
      await deployer.deploy(
        ProxyL2,
        ambAddressXdai,
        factory.address,
        treasury.address,
        realitioAddress,
        kleros
      );
    } else {
      // for sokol, deploy realitio mockup
      await deployer.deploy(RealitioMockup);
      realitio = await RealitioMockup.deployed();
      await deployer.deploy(
        ProxyL2,
        ambAddressSokol,
        factory.address,
        treasury.address,
        realitio.address,
        kleros
      );
    }
    proxyL2 = await ProxyL2.deployed();
    // tell factory about the proxy
    await factory.setProxyL2Address(proxyL2.address);

    // print out some stuff to be picked up by the deploy script ready for the next stage
    console.log('Completed stage 1');
    console.log('ProxyL2Address');
    console.log(proxyL2.address);
    console.log('RCTreasuryAddress');
    console.log(RCTreasury.address);
    console.log('RCFactoryAddress');
    console.log(RCFactory.address);
    console.log('RCMarketAddress');
    console.log(RCMarket.address);
    console.log('NFTHubL2Address');
    console.log(NftHubL2.address);
  } else if (
    network === 'teststage2' ||
    network === 'stage2' ||
    network === 'develop'
  ) {
    console.log('Begin Stage 2');
    // mainnet
    // deploy mainnet nft hub
    await deployer.deploy(NftHubL1);
    nftHubL1 = await NftHubL1.deployed();
    if (network === 'stage2') {
      // deploy mainnet proxy on mainnet
      await deployer.deploy(
        proxyL1,
        ambAddressMainnet,
        realitioAddress,
        arbAddressMainnet
      );
    } else {
      // deploy mainnet proxy on Kovan
      await deployer.deploy(
        proxyL1,
        ambAddressKovan,
        realitioAddressKovan,
        arbAddressKovan
      );
    }

    proxyL1 = await proxyL1.deployed();
    // set xdai proxy address
    await proxyL1.setProxyL2Address(ProxyL2Address);

    console.log('Completed stage 2');

    // this text is used in the deploy script to locate the correct address
    console.log('TheNFTHubMainnetAddress');
    console.log(NftHubL1.address);
    console.log('TheproxyL1Address');
    console.log(proxyL1.address);
  } else if (network === 'teststage3' || network === 'stage3') {
    console.log('Begin Stage 3');
    // xdai
    // set mainnet proxy address
    proxyL2 = await ProxyL2.deployed();
    await proxyL2.setProxyL1Address(proxyL1Address);
    console.log('Completed Stage 3');

    /**************************************
     *                                     *
     *     GRAPH TESTING WHOOT WHOOT!      *
     *                                     *
     **************************************/
  } else if (network === 'graphTesting') {
    console.log('Local Graph Testing, whoot whoot');

    // mockups
    await deployer.deploy(
      tokenMockup,
      'Token name',
      'TKN',
      '150000000000000000000000',
      accounts[0]
    );
    erc20 = await tokenMockup.deployed();
    await deployer.deploy(RealitioMockup);
    realitio = await RealitioMockup.deployed();

    // deploy treasury, factory, reference market and nft hub
    await deployer.deploy(RCTreasury, erc20.address);
    treasury = await RCTreasury.deployed();
    await deployer.deploy(
      RCFactory,
      treasury.address,
      realitio.address,
      realitio.address
    );
    factory = await RCFactory.deployed();
    await deployer.deploy(RCMarket);
    reference = await RCMarket.deployed();
    await deployer.deploy(RCOrderbook, factory.address, treasury.address);
    orderbook = await RCOrderbook.deployed();
    await deployer.deploy(NftHubL2, factory.address, ZERO_ADDRESS);
    nftHubL2 = await NftHubL2.deployed();
    await deployer.deploy(NftHubL1);
    nftHubL1 = await NftHubL1.deployed();
    // tell treasury and factory about various things
    await treasury.setFactoryAddress(factory.address);
    await treasury.setOrderbookAddress(orderbook.address);
    await factory.setReferenceContractAddress(reference.address);
    await factory.setOrderbookAddress(orderbook.address);
    await factory.setNftHubAddress(nftHubL2.address, 0);
    // disable whitelist
    await treasury.toggleWhitelist();
    // fund accounts
    for (let index = 0; index < 101; index++) {
      await erc20.transfer(accounts[index], '1000000000000000000000', {
        from: accounts[0],
      });
    }

    /***************************************
     *                                     *
     *    START LOCAL TESTING SETUP HERE   *
     *                                     *
     **************************************/

    // create a market with one of the ipfs hashes, options passed in must be in curly braces{}
    // all other values are the default values (4 cards, starting right away, closing in one year)
    // TAKE CARE, Misspelling an option will silently fail
    // TAKE CARE, if using the same ipfs for two markets, the second market won't be displayed in the UI - the slug should be unique
    await createMarket({ ipfs: ipfsHashes[0] });
    console.log('New market here: ', market[0].address);
    // market is an array of market objects, this is how you can access a market and call its methods (rent, exit, withdraw winnings)

    // create 6 markets (#1-6)
    await createMarket({
      ipfs: ipfsHashes[1],
      closeTime: time.duration.weeks(3),
    });
    await createMarket({
      ipfs: ipfsHashes[2],
      closeTime: time.duration.weeks(4),
    });
    await createMarket({
      ipfs: ipfsHashes[3],
      closeTime: time.duration.weeks(5),
    });
    await createMarket({
      ipfs: ipfsHashes[4],
      closeTime: time.duration.weeks(3),
    });

    await factory.setPotDistribution('100', '110', '120', '130', '140', {
      from: accounts[0],
    });
    await factory.changeArtistApproval(
      '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      {
        from: accounts[0],
      }
    );
    await factory.changeAffiliateApproval(
      '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      {
        from: accounts[0],
      }
    );
    await factory.changeCardAffiliateApproval(
      '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      {
        from: accounts[0],
      }
    );

    await createMarket({
      ipfs: ipfsHashes[5],
      closeTime: time.duration.weeks(4),
      artistAddress: '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      affiliateAddress: '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      cardAffiliate: [
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      ],
    });
    await createMarket({
      ipfs: ipfsHashes[6],
      closeTime: time.duration.weeks(5),
      artistAddress: '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      affiliateAddress: '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      cardAffiliate: [
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
        '0xa4F068F78e7020544C7215F6f920F0B468874a01',
      ],
    });

    console.log('Markets #1-6 deployed');

    // make some deposits
    for (let index = 0; index < 20; index++) {
      await depositDai(600, accounts[index]);
    }

    console.log('Deposits done');

    //rent a card, if the price is not specified it will rent at 10% higher than the current price (or 1 if current is 0)
    await rent({ from: accounts[1], market: market[0], outcome: 0 });
    // skip some time
    await time.increase(time.duration.days(3));
    // exit position
    await exit({ from: accounts[1], market: market[0], outcome: 0 });

    console.log('Test rent done');

    // account1 setup: rent 4 winnings cards, 6 losing cards, 6 locked cards

    // 3 locked cards (market#1)
    await rent({
      from: accounts[1],
      market: market[1],
      outcome: 0,
      price: '20',
    });
    await time.increase(time.duration.hours(2));
    await exit({ from: accounts[1], market: market[1], outcome: 0 });

    await rent({
      from: accounts[1],
      market: market[1],
      outcome: 1,
      price: '10',
    });
    await time.increase(time.duration.hours(4));
    await exit({ from: accounts[1], market: market[1], outcome: 1 });

    await rent({
      from: accounts[1],
      market: market[1],
      outcome: 2,
      price: '5',
    });
    await time.increase(time.duration.hours(6));
    await exit({ from: accounts[1], market: market[1], outcome: 2 });

    // 3 locked cards (market#2)
    await rent({
      from: accounts[1],
      market: market[2],
      outcome: 2,
      price: '4',
    });
    await time.increase(time.duration.hours(3));
    await exit({ from: accounts[1], market: market[2], outcome: 2 });

    await rent({
      from: accounts[1],
      market: market[2],
      outcome: 1,
      price: '8',
    });
    await time.increase(time.duration.hours(5));
    await exit({ from: accounts[1], market: market[2], outcome: 1 });

    await rent({
      from: accounts[1],
      market: market[2],
      outcome: 0,
      price: '66',
    });
    await time.increase(time.duration.hours(7));
    await exit({ from: accounts[1], market: market[2], outcome: 0 });

    console.log('Locked cards done');

    // 4 winnings cards (market#3)
    await rent({
      from: accounts[1],
      market: market[3],
      outcome: 0,
      price: '4',
    });
    await time.increase(time.duration.hours(12));
    await exit({ from: accounts[1], market: market[3], outcome: 0 });

    await rent({
      from: accounts[1],
      market: market[4],
      outcome: 1,
      price: '8',
    });
    await time.increase(time.duration.hours(5));
    await exit({ from: accounts[1], market: market[4], outcome: 1 });

    await rent({
      from: accounts[1],
      market: market[5],
      outcome: 2,
      price: '16',
    });
    await time.increase(time.duration.hours(7));
    await exit({ from: accounts[1], market: market[5], outcome: 2 });

    await rent({
      from: accounts[1],
      market: market[6],
      outcome: 3,
      price: '32',
    });
    await time.increase(time.duration.hours(9));
    await exit({ from: accounts[1], market: market[6], outcome: 3 });

    console.log('Winning cards done');

    // 6 losing cards
    await rent({ from: accounts[1], market: market[3], outcome: 1 });
    await time.increase(time.duration.hours(1));
    await exit({ from: accounts[1], market: market[3], outcome: 1 });

    await rent({ from: accounts[1], market: market[3], outcome: 2 });
    await time.increase(time.duration.hours(1));
    await exit({ from: accounts[1], market: market[3], outcome: 2 });

    await rent({ from: accounts[1], market: market[4], outcome: 2 });
    await time.increase(time.duration.hours(1));
    await exit({ from: accounts[1], market: market[4], outcome: 2 });

    await rent({ from: accounts[1], market: market[4], outcome: 3 });
    await time.increase(time.duration.hours(1));
    await exit({ from: accounts[1], market: market[4], outcome: 3 });

    await rent({
      from: accounts[1],
      market: market[5],
      outcome: 3,
    });
    await time.increase(time.duration.hours(1));
    await exit({ from: accounts[1], market: market[5], outcome: 3 });

    await rent({
      from: accounts[1],
      market: market[6],
      outcome: 0,
    });
    await time.increase(time.duration.hours(1));
    await exit({ from: accounts[1], market: market[6], outcome: 0 });

    console.log('Losing cards done');

    // skip more time to make sure all markets are past their closing time
    await time.increase(time.duration.weeks(5));

    // lock 2 markets (#1 and #2)
    await market[1].lockMarket();
    await market[2].lockMarket();

    // close 4 markets (#3-6)
    await closeMarket({
      market: market[3],
      winningOutcome: 69,
    });
    await closeMarket({
      market: market[4],
      winningOutcome: 69,
    });
    await closeMarket({
      market: market[5],
      winningOutcome: 2,
    });
    await closeMarket({
      market: market[6],
      winningOutcome: 3,
    });

    await market[3].claimCard(0, { from: accounts[1] });
    await market[3].upgradeCard(0, { from: accounts[1] });

    console.log('Closed markets done');

    // account#1 setup: rent some cards from market 0
    await rent({ from: accounts[1], market: market[0], outcome: 1, price: 5 });
    await rent({ from: accounts[1], market: market[0], outcome: 2, price: 10 });
    // set users to market#0's leaderboard and orderbook (outcome 0)
    await rent({ from: accounts[2], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(11));
    await rent({ from: accounts[3], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(22));
    await rent({ from: accounts[4], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(33));
    await rent({ from: accounts[5], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(44));
    await rent({ from: accounts[7], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(55));
    await rent({ from: accounts[8], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(66));
    await rent({ from: accounts[9], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(77));
    await rent({ from: accounts[10], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(88));
    await rent({ from: accounts[11], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(99));
    await rent({ from: accounts[12], market: market[0], outcome: 0 });
    await time.increase(time.duration.hours(200));

    console.log('Market#0 rents done');

    // create 2 markets (#7-8)
    await createMarket({
      ipfs: ipfsHashes[7],
      numberOfCards: 6,
      closeTime: time.duration.weeks(24),
    });
    await createMarket({
      ipfs: ipfsHashes[8],
      numberOfCards: 10,
      closeTime: time.duration.weeks(4),
    });

    // account#1 setup: rent some cards from markets 7 and 8
    await rent({ from: accounts[1], market: market[7], outcome: 0 });
    await time.increase(time.duration.hours(24));
    await rent({ from: accounts[1], market: market[7], outcome: 2, price: 7 });
    await rent({ from: accounts[1], market: market[7], outcome: 4, price: 9 });
    await time.increase(time.duration.hours(15));
    await rent({ from: accounts[1], market: market[8], outcome: 1 });
    await rent({ from: accounts[1], market: market[8], outcome: 3, price: 2 });
    await time.increase(time.duration.hours(18));
    await rent({ from: accounts[1], market: market[8], outcome: 5, price: 4 });
    await rent({ from: accounts[1], market: market[8], outcome: 7, price: 6 });
    await time.increase(time.duration.hours(10));
    await rent({ from: accounts[1], market: market[8], outcome: 9 });
    // high prices for market#10's cards
    await rent({
      from: accounts[14],
      market: market[7],
      outcome: 0,
      price: '10000',
    });
    await rent({
      from: accounts[15],
      market: market[7],
      outcome: 1,
      price: '33000',
    });
    await rent({
      from: accounts[16],
      market: market[7],
      outcome: 2,
      price: '67890',
    });

    console.log('Markets#7-8 deployed');

    // create 2 markets (#9-10)
    await createMarket({
      ipfs: ipfsHashes[9],
      numberOfCards: 5,
      closeTime: time.duration.weeks(1),
    });
    await createMarket({
      ipfs: ipfsHashes[10],
      numberOfCards: 2,
      closeTime: time.duration.days(1),
    });

    // account#1 setup: rent some cards from markets 9 and 10
    await rent({ from: accounts[1], market: market[9], outcome: 3, price: 5 });
    await rent({ from: accounts[1], market: market[9], outcome: 4, price: 10 });
    await rent({ from: accounts[1], market: market[10], outcome: 0 });

    await rent({
      from: accounts[13],
      market: market[9],
      outcome: 0,
      timeLimit: 960,
    });
    await time.increase(time.duration.minutes(16));
    await rent({ from: accounts[1], market: market[9], outcome: 0 });

    console.log('Markets#9-10 deployed');

    // create 2 markets with a delayed start (#11-12) - coming soon markets
    await createMarket({
      ipfs: ipfsHashes[11],
      openTime: time.duration.weeks(3),
      closeTime: time.duration.weeks(4),
    });
    await createMarket({
      ipfs: ipfsHashes[12],
      openTime: time.duration.days(2),
      closeTime: time.duration.weeks(9),
    });

    // await sponsor({
    //   market: market[11],
    //   amount: 500,
    //   from: accounts[20],
    // });
    // await market[11].sponsor(web3.utils.toWei('600', 'ether'), {
    //   from: accounts[21],
    // });
    // await market[11].sponsor(web3.utils.toWei('200', 'ether'), {
    //   from: accounts[20],
    // });

    console.log('Markets#11-12 deployed');

    // create 1 market (#13) - random texts
    await createMarket({ ipfs: ipfsHashes[12], numberOfCards: 2 });

    console.log('Market#13 deployed');

    // Extra for testing stuff
    //await market[3].withdraw({ from: accounts[1] })

    await factory.setAdvancedWarning('86400', { from: accounts[0] });
    await time.increase(time.duration.hours(1));
    await factory.setMaximumDuration('604800', { from: accounts[0] });

    // you can force updating the state of an open market by calling collect for all cards (do this for all open markets)
    await market[0].collectRentAllCards();
    await market[7].collectRentAllCards();
    await market[8].collectRentAllCards();
    await market[9].collectRentAllCards();
    await market[10].collectRentAllCards();

    console.log('Collect rents from open markets');

    /* MARKET LEDGER
     * -------------------
     * Market#0  - open, 4 cards, 1 year until closed
     * Market#1  - locked, 4 cards
     * Market#2  - locked, 4 cards
     * Market#3  - closed, 4 cards, winning 0
     * Market#4  - closed, 4 cards, winning 1
     * Market#5  - closed, 4 cards, winning 2
     * Market#6  - closed, 4 cards, winning 3
     * Market#7  - open,  6 cards, 6 months until closed (high prices / expired cards)
     * Market#8  - open, 10 cards, 1 month until closed
     * Market#9  - open,  5 cards, 1 week until closed
     * Market#10 - open,  2 cards, 1 day until closed
     * Market#11 - coming soon, 4 cards, 3 weeks until open (short question)
     * Market#12 - coming soon, 4 cards, 2 days until open (long question)
     * Market#13 - open, 2 cards (testing ipfs strings)
     * -------------------
     * account#1 - 6 locked cards, 
     *             4 winning cards, 
     *             6 losing cards, 
     *             10 trophy cards,
     *             10 owned cards,
     *             14 active positions 
     * 
     * market#0, outcome#0 - 11 accounts leaderboard,
     *                       11 accounts orderbook   
     * /

    /**************************************
     *                                     *
     *    END LOCAL TESTING SETUP HERE     *
     *                                     *
     **************************************/

    console.log('treasury.address: ', treasury.address);
    console.log('factory.address: ', factory.address);
    console.log('orderbook.address: ', orderbook.address);
  } else {
    console.log('No deploy script for this network');
  }
};

async function createMarket(options) {
  // default values if no parameter passed
  // timestamps are in seconds from now
  var question = 'Test 6␟"X","Y","Z"␟news-politics␟en_US';
  var defaults = {
    mode: 0, // mode, 0 = classic, 1 = winner takes all, 2 = hot potato
    ipfs: 0x0, // ipfs hash
    openTime: 0, // seconds delay before market opens
    closeTime: 31536000, // seconds delay from now before market closes - default 31536000 = 1 year
    resolveTime: 0, // seconds delay from close before market resolves
    numberOfCards: 4, // the number of cards to create
    artistAddress: ZERO_ADDRESS,
    affiliateAddress: ZERO_ADDRESS,
    cardAffiliate: [ZERO_ADDRESS], // remember this is an array
    sponsorship: 0,
  };
  options = setDefaults(options, defaults);
  // assemble arrays
  var openTime = new BN(options.openTime).add(await time.latest());
  var closeTime = new BN(options.closeTime).add(await time.latest());
  var resolveTime = new BN(options.resolveTime).add(closeTime);
  var timestamps = [openTime, closeTime, resolveTime];
  var tokenURIs = [];
  for (i = 0; i < options.numberOfCards; i++) {
    tokenURIs.push('x');
  }

  await factory.createMarket(
    options.mode,
    options.ipfs,
    timestamps,
    tokenURIs,
    options.artistAddress,
    options.affiliateAddress,
    options.cardAffiliate,
    question,
    options.sponsorship
  );
  var recentMarketAddress = await factory.getMostRecentMarket.call(0);
  marketAddress.push(recentMarketAddress);
  market.push(await RCMarket.at(await factory.getMostRecentMarket.call(0)));
  await factory.changeMarketApproval(recentMarketAddress);
}

async function closeMarket(options) {
  var defaults = {
    market: market[0],
    winningOutcome: 0,
  };
  options = setDefaults(options, defaults);

  await options.market.lockMarket();
  await realitio.setResult(options.winningOutcome);
  await options.market.getWinnerFromOracle();
}

async function depositDai(amount, user) {
  amount = web3.utils.toWei(amount.toString(), 'ether');
  await erc20.approve(treasury.address, amount, { from: user });
  await treasury.deposit(amount, user, { from: user });
}

function setDefaults(options, defaults) {
  return _.defaults({}, _.clone(options), defaults);
}

async function rent(options) {
  var defaults = {
    market: market[0],
    outcome: 0,
    from: 0x00,
    timeLimit: 0,
    startingPosition: ZERO_ADDRESS,
  };
  options = setDefaults(options, defaults);
  let newPrice = web3.utils.toWei('1', 'ether');

  try {
    if (options.price) {
      newPrice = web3.utils.toWei(options.price.toString(), 'ether');
    } else {
      const currentPrice = await options.market.cardPrice(options.outcome);
      const currentPriceBN = new BN(currentPrice);
      newPrice = currentPriceBN.add(currentPriceBN.div(new BN('10')));
      if (!newPrice.isZero()) {
        newPrice = newPrice.toString();
      } else {
        newPrice = web3.utils.toWei('1', 'ether');
      }
    }
    await options.market.newRental(
      newPrice,
      options.timeLimit,
      options.startingPosition,
      options.outcome,
      { from: options.from }
    );
  } catch (err) {
    console.log(
      err,
      `on rent from account:${options.from}, market: ${
        options.market.address
      }, card: ${options.outcome}, price: ${web3.utils.fromWei(
        newPrice,
        'ether'
      )}, timeLimit: ${options.timeLimit}`
    );
  }
}

async function exit(options) {
  var defaults = {
    market: market[0],
    outcome: 0,
    from: 0x00,
  };
  options = setDefaults(options, defaults);

  await options.market.exit(options.outcome, { from: options.from });
}

async function sponsor(options) {
  var defaults = {
    market: market[0],
    amount: 0,
    from: 0x00,
  };
  options = setDefaults(options, defaults);

  var amount = web3.utils.toWei(options.amount.toString(), 'ether');
  await erc20.approve(treasury.address, amount, { from: options.from });
  await options.market.sponsor(amount, {
    from: options.from,
  });
}

// Most recent deployments:

// Treasury: 0x23142EfEb9D8261292c7B12371E9f8688a7C7142
// Factory: 0xe7e5A63E548C03C8e2e3B49bAEAf7967114FEc62
// Orderbook: 0x622a94374B854B079f8941279543E38fd8ca2b58
