pragma solidity 0.5.10;

//ShareToken is at 0x88316706a2bfe905E2dd1bA3589811e882DD1D16
//market is at 0xe5bCC21654b0c68892FE6E6fe86F4f93853B1AA1

interface IMarket { }

interface ShareToken 

{
    function publicBuyCompleteSets(IMarket _market, uint256 _amount) external returns (bool)  ;
    function publicSellCompleteSets(IMarket _market, uint256 _amount) external returns (uint256 _creatorFee, uint256 _reportingFee) ;
}

interface Cash 
{
    function approve(address _spender, uint256 _amount) external returns (bool);
}

contract MyContract {
    
    ShareToken completeSets = ShareToken(0x88316706a2bfe905E2dd1bA3589811e882DD1D16);
    IMarket market = IMarket(0xe5bCC21654b0c68892FE6E6fe86F4f93853B1AA1);
    Cash cash = Cash(0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6);
    // ERC20 erc20 = ERC20(0x2da4d465978981bd75bbac4c9f3bda10be0b465c);
    
    // function Approve () public {
    //     erc20.approve(0x990b2d2af7e87cd015a607c3a95d7622c9bbede1, 2^256-1);
    // }
    
    function buyCompleteSets() public {
        completeSets.publicBuyCompleteSets(market,100000000);
    }
    
    function approve() public
    {
        cash.approve(0xe2020A4a6B0a5D6C74c358e09B2b4758b5Cdb91C,(2**256)-1);
    }
}
