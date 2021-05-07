const TestEnviroment = require('./helpers/TestEnviroment');

contract("RealityCardsTests", (accounts) => {
    const rc = new TestEnviroment(accounts.slice(0, 4));
    const { admin, alice, bob } = rc.aliases;
    const { MAX_UINT256, ZERO_ADDRESS } = rc.constants;
    let markets = []
    let treasury, factory, orderbook

    beforeEach(async function () {
        await rc.setup();
        ({ treasury, factory, orderbook, markets } = rc.contracts);
    });

    describe.only("Orderbook tests ", () => {
        it("my first test here", async () => {

        })
    })

    it("my second test here", async () => {

    });
})