pragma solidity 0.4.20;

interface IMarket {
    function getNumTicks() view returns(uint256);
}

interface ICompleteSets {
    function publicBuyCompleteSets(IMarket _market, uint256 _amount) payable;
}

interface ERC20 {
    function approve(address _spender, uint256 _value) public returns (bool);
}

contract MyContract {
    
    uint public numTicks;
    
    ICompleteSets completeSets = ICompleteSets(0x48fcc9d538b9c86ba9d35b3eb0e7f64ee2b4664f);
    IMarket market = IMarket(0x448d1d8280844513c38b2b73bde8a539d0022954);
    //Augur.sol address: 0x990b2d2af7e87cd015a607c3a95d7622c9bbede1 [this is what the tx is sent to per metamask GUI]
    //LegacyReputationToken address: 0x903e028cb6752c9079bcf1b6bfae182d873b4b23 [this is what works when I do it via remix]
    //Cash.sol address: 0x2da4d465978981bd75bbac4c9f3bda10be0b465c [this is what the tx is sent to per etherscan when it originally said Augur.sol]
    ERC20 erc20 = ERC20(0x2da4d465978981bd75bbac4c9f3bda10be0b465c);
    
    function Approve () public {
        erc20.approve(0x990b2d2af7e87cd015a607c3a95d7622c9bbede1, 2^256-1);
    }
    
    function getNumTicksLocal() public {
        numTicks = market.getNumTicks();
    }
    
    function buyCompleteSets() public payable {
        uint256 setsToBuy = msg.value / market.getNumTicks();
        completeSets.publicBuyCompleteSets.value(msg.value)(market,setsToBuy);
    }
}

