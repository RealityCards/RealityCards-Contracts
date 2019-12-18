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
    
    ShareToken completeSets = ShareToken(0x63cbfEb0Cf1EE91Ca1689d8dbBa143bbf8Fd0fd1);
    // IMarket market = IMarket(0x4Ca5B2E0A87325F962208561E87c82638cc384Ca); //live
    IMarket market = IMarket(0x3276323FCcAA197DCCe782CCF783120D78D57cE6); //resolved
    Cash cash = Cash(0x0802563FB6CfA1f07363D3aBf529F7b3999096f6);
    address augurMain = 0x62214e5c919332AC17c5e5127383B84378Ef9C1d;

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
        cash.approve(augurMain,(2**256)-1);
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
