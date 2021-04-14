// SPDX-License-Identifier: UNDEFINED
pragma solidity ^0.7.5;

interface IRCMarket {
    enum States {CLOSED, OPEN, LOCKED, WITHDRAW}

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

    function collectRentAllCards() external;

    function collectRentSpecificCards(uint256[] calldata _cards) external;

    function exitAll() external;

    function exitSpecificCards(uint256[] calldata _cards, address _user)
        external;

    function marketLockingTime() external returns (uint32);

    function transferCard(
        address _oldOwner,
        address _newOwner,
        uint256 _token
    ) external;
}
