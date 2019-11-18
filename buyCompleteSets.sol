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
    ERC20 erc20 = ERC20(0x48fcc9d538b9c86ba9d35b3eb0e7f64ee2b4664f);
    
    function Approve () public {
        erc20.approve(address(this), 2^256-1);
    }
    
    function getNumTicksLocal() public {
        numTicks = market.getNumTicks();
    }
    
    function buyCompleteSets() public payable {
        uint256 setsToBuy = msg.value / market.getNumTicks();
        completeSets.publicBuyCompleteSets.value(msg.value)(market,setsToBuy);
    }
}

