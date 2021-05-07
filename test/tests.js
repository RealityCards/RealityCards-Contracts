const TestEnviroment = require('./helpers/TestEnviroment');

contract("RealityCardsTests", (accounts) => {
    const rc = new TestEnviroment(accounts);
    const { admin, alice, bob, carol, dan } = rc.aliases;
    const { MAX_UINT256, ZERO_ADDRESS } = rc.constants;
    const { expectRevert, time, ether, balance } = rc.testHelpers;

    beforeEach(async function () {
        await rc.setup();
        ({ treasury, factory, orderbook, markets, xdaiproxy } = rc.contracts);
    });

    describe.only("Treasury tests ", () => {
        it("Ensure only factory can add markets", async () => {
            // prove Factory can create a market
            var nextMarket = markets.length;
            // Assert this market doesn't exist yet
            assert.equal(typeof markets[nextMarket] === "undefined", true);
            markets.push(await rc.createMarket());
            // Assert this market now exists
            assert.equal(typeof markets[nextMarket] === "undefined", false);
            // Non-factory try and add a market
            await expectRevert(treasury.addMarket(alice), "Not factory");
        });

        it("check that non markets cannot call market only functions on Treasury", async () => {
            // only testing invalid responses, valid responses checked in each functions own test
            await expectRevert(treasury.payRent(user0), "Not authorised");
            await expectRevert(treasury.payout(user0, 0), "Not authorised");
            await expectRevert(treasury.sponsor(), "Not authorised");
            await expectRevert(treasury.updateLastRentalTime(user0), "Not authorised");
        });

        it("check that non owners cannot call owner only functions on Treasury", async () => {
            // only testing invalid responses, valid responses checked in each functions own test
            await expectRevert(treasury.setMinRental(10, { from: alice }), "Ownable: caller is not the owner");
            await expectRevert(treasury.setMaxContractBalance(10, { from: alice }), "Ownable: caller is not the owner");
            await expectRevert(treasury.setMaxBidLimit(10, { from: alice }), "Ownable: caller is not the owner");
            await expectRevert(treasury.setAlternateReceiverAddress(ZERO_ADDRESS, { from: alice }), "Ownable: caller is not the owner");
            await expectRevert(treasury.changeGlobalPause({ from: alice }), "Ownable: caller is not the owner");
            await expectRevert(treasury.changePauseMarket(ZERO_ADDRESS, { from: alice }), "Ownable: caller is not the owner");
        });

        it("check that inferior owners cannot call uberOwner functions on Treasury", async () => {
            // only testing invalid responses, valid responses checked in each functions own test
            await expectRevert(treasury.setFactoryAddress(markets[0].address, { from: alice }), "Extremely Verboten");
            await expectRevert(treasury.changeUberOwner(user2, { from: alice }), "Extremely Verboten");
        });

        it("test setMinRental", async () => {
            // set value
            await treasury.setMinRental(24);
            // check value
            assert.equal(await treasury.minRentalDayDivisor(), 24);
            // change the value (it might already have been 24)
            await treasury.setMinRental(48);
            // check again
            assert.equal(await treasury.minRentalDayDivisor(), 48);
        });

        it("test setMaxContractBalance function and deposit limit hit", async () => {
            // change deposit balance limit to 500 ether
            await treasury.setMaxContractBalance(web3.utils.toWei("500", "ether"));
            // 400 should work
            await rc.deposit(alice, 400);
            // another 400 should not
            await expectRevert(treasury.deposit(alice, { value: web3.utils.toWei("400", "ether") }), "Limit hit");
        });

        it("test setMaxBidLimit", async () => {
            // set value
            await treasury.setMaxBidLimit(20);
            // check value
            assert.equal(await treasury.maxBidCountLimit(), 20);
            // change the value (it might already have been 20)
            await treasury.setMaxBidLimit(35);
            // check again
            assert.equal(await treasury.maxBidCountLimit(), 35);
        });

        it("test setAlternateReciverAddress", async () => {
            // check for zero address
            await expectRevert(treasury.setAlternateReceiverAddress(ZERO_ADDRESS), "Must set an address");
            // set value
            await treasury.setAlternateReceiverAddress(user9);
            // check value
            assert.equal(await treasury.alternateReceiverBridgeAddress(), user9);
            // change the value
            await treasury.setAlternateReceiverAddress(user8);
            // check again
            assert.equal(await treasury.alternateReceiverBridgeAddress(), user8);
        });

        it("test changeGlobalPause", async () => {
            var globalPauseState = await treasury.globalPause();
            // change value
            await treasury.changeGlobalPause();
            // check value
            assert.equal(await treasury.globalPause(), !globalPauseState);
            await expectRevert(treasury.withdrawDeposit(1, true), "Withdrawals are disabled");
            // change it back
            await treasury.changeGlobalPause();
            // check again
            assert.equal(await treasury.globalPause(), globalPauseState);
        });

        it("test changePauseMarket", async () => {
            // we don't check for zero address or even that it's actaully a market
            var pauseMarketState = await treasury.marketPaused(ZERO_ADDRESS);
            // change value
            await treasury.changePauseMarket(ZERO_ADDRESS);
            // check value
            assert.equal(await treasury.marketPaused(ZERO_ADDRESS), !pauseMarketState);
            // change it back
            await treasury.changePauseMarket(ZERO_ADDRESS);
            // check again
            assert.equal(await treasury.marketPaused(ZERO_ADDRESS), pauseMarketState);
        });

        it("test setFactoryAddress", async () => {
            // check for zero address
            await expectRevert.unspecified(treasury.setFactoryAddress(ZERO_ADDRESS));
            // set value
            await treasury.setFactoryAddress(user9);
            // check value
            assert.equal(await treasury.factoryAddress(), user9);
            // change the value
            await treasury.setFactoryAddress(user8);
            // check again
            assert.equal(await treasury.factoryAddress(), user8);
        });

        it("test changeUberOwner", async () => {
            // check for zero address
            await expectRevert.unspecified(treasury.changeUberOwner(ZERO_ADDRESS));
            // set value
            await treasury.changeUberOwner(user9);
            // check value
            assert.equal(await treasury.uberOwner(), user9);
            // change the value
            await expectRevert(treasury.changeUberOwner(user2, { from: user1 }), "Extremely Verboten");
            await treasury.changeUberOwner(user8, { from: user9 });
            // check again
            assert.equal(await treasury.uberOwner(), user8);
        });

        it("test deposit", async () => {
            // check for zero address
            await expectRevert(treasury.deposit(alice), "Must deposit something");
            await expectRevert(treasury.deposit(ZERO_ADDRESS, { value: 1 }), "Must set an address");
            // make some deposits
            await rc.deposit(alice, 10);
            await rc.deposit(bob, 20);
            // check the individual and total deposit amounts
            assert.equal((await treasury.userDeposit(alice)).toString(), ether("10").toString());
            assert.equal((await treasury.userDeposit(bob)).toString(), ether("20").toString());
            assert.equal((await treasury.totalDeposits()).toString(), ether("30").toString());
        });

        it("test withdrawDeposit", async () => {
            // global pause checked in it's own test
            // can't withdraw if theres nothing to withdraw
            await expectRevert(treasury.withdrawDeposit(1, true), "Nothing to withdraw");
            // lets check we get all our funds back
            await rc.deposit(bob, 100); // just so the contract has spare funds
            // record the users balance
            var tracker = await balance.tracker(alice);
            const startBalance = await tracker.get()
            // make a deposit and get a receipt to find the gas cost
            var txReceipt = await treasury.deposit(user1, { value: ether("10"), from: alice });
            var gasUsed = txReceipt.receipt.gasUsed;
            // let some time pass
            await time.increase(time.duration.minutes(10));
            // withdraw some deposit locally (getting a receipt again)
            txReceipt = await treasury.withdrawDeposit(ether("5"), true, { from: alice });
            gasUsed += txReceipt.receipt.gasUsed;
            // withdraw the rest via the bridge (getting a receipt again)
            txReceipt = await treasury.withdrawDeposit(ether("5"), false, { from: alice });
            gasUsed += txReceipt.receipt.gasUsed;
            // check the balance is correct (minus gas cost)
            const currentBalance = await tracker.get()
            assert.equal(startBalance.toString(), (currentBalance.add(web3.utils.toBN(gasUsed))).toString());

            // check no rent collected yet
            assert.equal((await treasury.marketBalance()).toString(), 0);
            await rc.newRental({ from: bob })
            // can't withdraw too quickly ( ͡° ͜ʖ ͡°)	
            await expectRevert(treasury.withdrawDeposit(1, true, { from: bob }), "Too soon");
            await time.increase(time.duration.days(1));
            // now we can partial withdraw 
            await treasury.withdrawDeposit(ether("10"), true, { from: bob });
            // check we collected some rent
            assert(await treasury.marketBalance() != 0, "Rent wasn't collected");
            // check we still own the card
            assert.equal((await markets[0].ownerOf(0)), bob)
            await time.increase(time.duration.days(1));
            // withdraw everything, but lets go via the bridge this time
            await treasury.withdrawDeposit(ether("100"), false, { from: bob });
            // check we don't own the card or have any bids
            assert.equal((await markets[0].ownerOf(0)), markets[0].address);
            assert.equal((await treasury.userTotalBids(bob)), 0);

            // test the value transfer sucess
            noFallback = await NoFallback.new();
            await noFallback.deposit(treasury.address, { value: ether('10') });
            await expectRevert(noFallback.withdrawDeposit(treasury.address, ether('10')), "Transfer failed");
        });

        it("check cant rent or deposit if globalpause", async () => {
            // check it works normally
            await rc.deposit(alice, 10);
            await rc.newRental({ from: alice });
            // turn on global pause
            await treasury.changeGlobalPause();
            // now it should revert
            await expectRevert(rc.deposit(alice, 100), "Deposits are disabled");
            await expectRevert(rc.newRental({ from: alice }), "Rentals are disabled");
            // change it back
            await treasury.changeGlobalPause();
            // and it works again
            await rc.deposit(alice, 100);
            await rc.newRental({ outcome: 1, from: alice });
        });

        it("check cant rent if market paused", async () => {
            // setup
            markets.push(await rc.createMarket());
            // check it works normally
            await rc.deposit(alice, 100);
            await rc.newRental();
            // turn on market pause
            await treasury.changePauseMarket(markets[0].address);
            // we can still deposit
            await rc.deposit(alice, 144);
            // we can't use that market
            await expectRevert(rc.newRental(), "Rentals are disabled");
            // we can use a different market
            await rc.newRental({ market: markets[1] });
            await time.increase(time.duration.minutes(10));
            await rc.withdrawDeposit(1000, alice);
        });

        it("test force sending Ether to Treasury via self destruct", async () => {
            selfdestruct = await SelfDestructMockup.new();
            // send ether direct to self destruct contract
            await selfdestruct.send(web3.utils.toWei("1000", "ether"));
            await selfdestruct.killme(treasury.address);
            // do a regs deposit
            await rc.deposit(100, user6);
        });

        it("test updateUserBids", async () => {

            // setup
            markets.push(await rc.createMarket());
            await rc.deposit(alice, 10);
            await rc.deposit(bob, 100);
            await rc.deposit(carol, 10);
            await rc.deposit(dan, 10);
            // make a rental, check it updates the userBids
            await rc.newRental({ price: 5 });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("5").toString());
            // make another rental and check again
            await rc.newRental({ price: 3, outcome: 1 });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("8").toString());
            // different market this time
            await rc.newRental({ price: 1, market: markets[1] });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("9").toString());
            // increase bid, still correct?
            await rc.newRental({ price: 6 });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("10").toString());
            // decrease bid, still correct? user0=8
            await rc.newRental({ price: 4 });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("8").toString());
            // someone else takes it off them, are both correct? user0=8 user1=7
            await rc.newRental({ from: bob, price: 7 });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("8").toString());
            var totalRentals = await treasury.userTotalBids(bob);
            assert.equal(totalRentals.toString(), ether("7").toString());
            // change tokenPrice, check both are correct user0=12 user1=7
            await rc.newRental({ price: 8 });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("12").toString());
            var totalRentals = await treasury.userTotalBids(bob);
            assert.equal(totalRentals.toString(), ether("7").toString());
            // new user exits, still correct? user0=12 user1=0
            await markets[0].exit(0, { from: bob });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("12").toString());
            var totalRentals = await treasury.userTotalBids(bob);
            assert.equal(totalRentals.toString(), ether("0").toString());
            // this user exits, still correct?
            await markets[0].exit(0, { from: alice });
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("4").toString());
            // increase rent to 1439 (max 1440) then rent again, check it fails
            await rc.newRental({ price: 1435 });
            await expectRevert(rc.newRental({ price: 5, outcome: 3 }), " Insufficient deposit");
            // someone bids even higher, I increase my bid above what I can afford, we all run out of deposit, should not return to me
            await rc.newRental({ price: 2000, from: bob });
            await time.increase(time.duration.weeks(1));
            await markets[0].collectRentAllCards();
            // check owned by contract
            var owner = await markets[0].ownerOf.call(0);
            assert.equal(owner, markets[0].address);
        });

        it("test withdraw deposit after market close", async () => {
            // create a market that'll expire soon
            markets.push(await rc.createMarket({ closeTime: time.duration.weeks(1), resolveTime: time.duration.weeks(1) }));
            await rc.deposit(alice, 100);
            await rc.newRental({ market: markets[1] });
            await time.increase(time.duration.weeks(1));
            //await market[1].collectRentAllCards();
            //await market[1].lockMarket();
            await rc.withdrawDeposit(1000, alice);
        });

        it("check bids are exited when user withdraws everything", async () => {
            await rc.deposit(alice, 100);
            await rc.newRental({ price: 5 });
            await time.increase(time.duration.days(1));
            await rc.withdrawDeposit(5, alice);
            var totalRentals = await treasury.userTotalBids(alice);
            assert.equal(totalRentals.toString(), ether("5").toString());

            await rc.withdrawDeposit(1000, alice);
            var owner = await markets[0].ownerOf.call(0);
            assert.notEqual(owner, alice);
        });

        it.only("check payRent", async () => {
            // global pause tested in it's own test
            // setup alternative market and bid on it
            markets.push(await rc.createMarket());
            await rc.deposit(alice, 100);
            await rc.newRental({ from: alice, market: markets[1] });

            assert.equal((await treasury.userDeposit(alice)).toString(), ether('100').toString());
            // depsoit some dai and confirm all values
            await rc.deposit(bob, 100);
            assert.equal((await treasury.userDeposit(bob)).toString(), ether('100').toString());
            assert.equal((await treasury.marketPot(markets[1].address)).toString(), '0');
            assert.equal((await treasury.totalMarketPots()).toString(), '0');
            assert.equal((await treasury.totalDeposits()).toString(), ether('200').toString());

            //pay some rent
            var txReceipt = await markets[1].newRental.call(ether('50'), 0, ZERO_ADDRESS, 0, { from: alice });
            var startTime = (await web3.eth.getBlock(txReceipt.receipt.blockNumber)).timestamp;
            await time.increase(time.duration.days(1));
            txReceipt = await markets[0].collectRentAllCards();
            var endTime = (await web3.eth.getBlock(txReceipt.receipt.blockNumber)).timestamp;
            // must perform calcualtion in this order to avoid rounding
            var rentDue = ether('50').muln(endTime - startTime).divn(86400);
            console.log(rentDue.toString())
            console.log((await treasury.userDeposit(alice)).toString())
            // check the values have all been correcly adjusted
            assert.equal((await treasury.userDeposit(alice)).toString(), (ether('100').sub(rentDue)).toString());
            assert.equal((await treasury.marketPot(markets[0].address)).toString(), rentDue.toString());
            assert.equal((await treasury.totalMarketPots()).toString(), rentDue.toString());
            assert.equal((await treasury.totalDeposits()).toString(), (ether('200').sub(rentDue)).toString());

        });

        it("check payout", async () => {
            // global pause tested in it's own test
            // depsoit some dai and confirm all values
            markets.push(await rc.createMarket({ closeTime: time.duration.days(3), resolveTime: time.duration.days(3) }));
            await rc.deposit(alice, 100);
            await rc.deposit(bob, 100);
            assert.equal((await treasury.userDeposit(alice)).toString(), ether('100').toString());
            assert.equal((await treasury.userDeposit(bob)).toString(), ether('100').toString());
            assert.equal((await treasury.marketPot(markets[1].address)).toString(), '0');
            assert.equal((await treasury.totalMarketPots()).toString(), '0');
            assert.equal((await treasury.totalDeposits()).toString(), ether('200').toString());

            // rent seperate cards
            await rc.newRental({ from: alice, price: 50, market: markets[1], outcome: 0 })
            await rc.newRental({ from: bob, price: 50, market: markets[1], outcome: 1 })
            // make the market expire
            await time.increase(time.duration.days(3));
            await markets[1].lockMarket();

            // card 0 won, user0 should get the payout
            await xdaiproxy.setAmicableResolution(markets[1].address, 0)
            await markets[1].withdraw({ from: alice });

            // check the values have all been correcly adjusted
            assert.equal((await treasury.userDeposit(alice)).toString(), (ether('200').toString()));
            assert.equal((await treasury.userDeposit(bob)).toString(), (ether('0').toString()));
            assert.equal((await treasury.marketPot(markets[1].address)).toString(), '0');
            assert.equal((await treasury.totalMarketPots()).toString(), '0');
            assert.equal((await treasury.totalDeposits()).toString(), ether('200').toString());

        });
    })

    it("my second test here", async () => {

    });
})