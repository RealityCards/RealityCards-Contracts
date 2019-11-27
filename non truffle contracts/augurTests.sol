pragma solidity 0.5.10;

//ShareToken is at 0x88316706a2bfe905E2dd1bA3589811e882DD1D16
//market is at 0xe5bCC21654b0c68892FE6E6fe86F4f93853B1AA1

interface IMarket 
{
    function getWinningPayoutNumerator(uint256 _outcome) external view returns (uint256);
}

interface ShareToken 

{
    function publicBuyCompleteSets(IMarket _market, uint256 _amount) external returns (bool)  ;
    function publicSellCompleteSets(IMarket _market, uint256 _amount) external returns (uint256 _creatorFee, uint256 _reportingFee) ;
}

interface Cash 
{
    function approve(address _spender, uint256 _amount) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function faucet(uint256 _amount) external;
}

contract MyContract {
    
    ShareToken completeSets = ShareToken(0x88316706a2bfe905E2dd1bA3589811e882DD1D16);
    // IMarket market = IMarket(0xe5bCC21654b0c68892FE6E6fe86F4f93853B1AA1); //https://v2.augur.net/#!/market?id=0xe5bCC21654b0c68892FE6E6fe86F4f93853B1AA1- OPEN 
    IMarket market = IMarket(0xf72A93d1b0c728C58B72b008C9b2FeAb82288a13); //resolved
    Cash cash = Cash(0xa836c1D6a35A443FD6F8d5d4A9cf5b1664bF76D6);

    function callfaucet() public 
    {
        cash.faucet(100000000000000000000);
    }
    
    function buyCompleteSets() public {
        completeSets.publicBuyCompleteSets(market,100000000);
    }
    
    function sellCompleteSets() public {
        completeSets.publicSellCompleteSets(market,100000000);
    }
    
    function approve() public
    {
        cash.approve(0xe2020A4a6B0a5D6C74c358e09B2b4758b5Cdb91C,(2**256)-1);
    }
    
    function getBalance(address _owner) public view returns(uint256)
    {
       return (cash.balanceOf(_owner));
    }
    
    function getWinner(uint256 _outcome) public view returns(uint256)
    {
        return market.getWinningPayoutNumerator(_outcome);
    }
}
