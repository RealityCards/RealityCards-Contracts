// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

interface IRCMarket {
    enum States {CLOSED, OPEN, LOCKED, WITHDRAW}

    function getTokenPrice(uint256) external view returns (uint256);

    function isMarket() external view returns (bool);

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

    function collectRentAllCards() external returns (bool);

    function exitAll() external;

    function exit(uint256) external;

    function marketLockingTime() external returns (uint32);

    function getTimeLastCollected(uint256 _actualTokenId)
        external
        returns (uint256 _timeCollected);

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
        uint256 _price,
        uint256 _timeLimit
    ) external;
}
