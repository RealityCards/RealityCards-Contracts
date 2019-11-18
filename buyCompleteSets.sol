pragma solidity 0.4.20;

import "./completesets.sol";

contract buyCompleteSets {
    
    IMarket marketAddress = IMarket(0x448d1d8280844513c38b2b73bde8a539d0022954);
    CompleteSets importedContract = CompleteSets(0x48fcc9d538b9c86ba9d35b3eb0e7f64ee2b4664f);

    function buyCompleteSet () public payable 
    {
    uint256 setsToBuy = msg.value / 10000;
    importedContract.publicBuyCompleteSets.value(msg.value)(marketAddress,setsToBuy);
    
    }
}
