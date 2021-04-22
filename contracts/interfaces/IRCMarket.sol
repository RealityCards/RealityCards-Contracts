// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.3;

interface IRCMarket {
    enum States {CLOSED, OPEN, LOCKED, WITHDRAW}

    function tokenPrice(uint256) external view returns (uint256);

    function isMarket() external view returns (bool);

    function timeLastCollected(uint256) external view returns (uint256);

    function sponsor() external payable;

    function initialize(
        uint256 _mode,
        uint32[] calldata _timestamps,
        uint256 _numberOfTokens,
        uint256 _totalNftMintCount,
        address _artistAddress,
        address _affiliateAddress,
        address[] calldata _cardAffiliateAddresses,
        address _marketCreatorAddress
    ) external;

    function tokenURI(uint256) external view returns (string memory);

    function ownerOf(uint256 tokenId) external view returns (address);

    function state() external view returns (States);

    function setWinner(uint256) external;

    function collectRentAllCards() external;

    function collectRentSpecificCards(uint256[] calldata _cards) external;

    function exitAll() external;

    function exit(uint256) external;

    function marketLockingTime() external returns (uint32);

    function updateCard(
        uint256 card,
        address user,
        uint256 rentCollected,
        uint256 collectedUntil
    ) external;

    function transferCard(
        address _oldOwner,
        address _newOwner,
        uint256 _token,
        uint256 _price
    ) external;
}
