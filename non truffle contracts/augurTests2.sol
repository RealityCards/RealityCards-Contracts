pragma solidity 0.5.10;

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

interface Augur {
    function getMarketOutcomes(IMarket _market) external view returns (bytes32[] memory _outcomes);
}

contract MyContract {

    address public marketAddress = 0x45f3736A96450C451fD58a4e199FaC561AA02c64;
    
    IMarket public market = IMarket(marketAddress);
    ShareToken completeSets = ShareToken(0x493785FaD8122a26A5ED33e0E81E20b33B689e63);
    Cash cash = Cash(0x74c7D5734A9Ebdd34845e132bEB9B759e1E3a98e);
    Augur augur = Augur(0xeD7e993fb7Da1d48E671df1Aa8B07fc96BF60442);

    function callFaucetAndApprove() public 
    {
        cash.faucet(100000000000000000000);
        cash.approve(augurMain,(2**256)-1);
    }
    
    function buyCompleteSets() public {
        completeSets.publicBuyCompleteSets(market,100000000);
    }
    
    function sellCompleteSets() public {
        completeSets.publicSellCompleteSets(market,100000000);
    }
    
    function getBalance(address _owner) public view returns(uint256)
    {
       return (cash.balanceOf(_owner));
    }
    
    function getWinner(uint256 _outcome) public view returns(uint256)
    {
        return market.getWinningPayoutNumerator(_outcome);
    }
    
    function getOutcomes() public view returns (bytes32[] memory _outcomes) {
        return augur.getMarketOutcomes(market);
    }
}
