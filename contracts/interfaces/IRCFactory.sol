// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

import "./IRealitio.sol";
import "./IRCTreasury.sol";
import "./IRCMarket.sol";
import "./IRCNftHubL2.sol";
import "./IRCOrderbook.sol";

interface IRCFactory {
    function createMarket(
        uint32 _mode,
        string memory _ipfsHash,
        uint32[] memory _timestamps,
        string[] memory _tokenURIs,
        address _artistAddress,
        address _affiliateAddress,
        address[] memory _cardAffiliateAddresses,
        string calldata _realitioQuestion,
        uint256 _sponsorship
    ) external returns (address);

    // view functions

    function nfthub() external view returns (IRCNftHubL2);

    function treasury() external view returns (IRCTreasury);

    function orderbook() external view returns (IRCOrderbook);

    function realitio() external view returns (IRealitio);

    function getAllMarkets(IRCMarket.Mode _mode)
        external
        view
        returns (address[] memory);

    function getMostRecentMarket(IRCMarket.Mode _mode)
        external
        view
        returns (address);

    function referenceContractAddress() external view returns (address);

    function referenceContractVersion() external view returns (uint256);

    function sponsorshipRequired() external view returns (uint256);

    function advancedWarning() external view returns (uint32);

    function maximumDuration() external view returns (uint32);

    function minimumDuration() external view returns (uint32);

    function marketCreationGovernorsOnly() external view returns (bool);

    function approvedAffiliatesOnly() external view returns (bool);

    function approvedArtistsOnly() external view returns (bool);

    function arbitrator() external view returns (address);

    function timeout() external view returns (uint32);

    function nftMintingLimit() external view returns (uint256);

    function getPotDistribution() external view returns (uint256[5] memory);

    function minimumPriceIncreasePercent() external view returns (uint256);

    function isMarketApproved(address) external view returns (bool);

    function getOracleSettings()
        external
        view
        returns (
            IRealitio oracle,
            address arbitratorAddress,
            uint32 _timeout
        );

    // only Governors
    function changeMarketApproval(address _market) external;

    function addArtist(address _newArtist) external;

    function removeArtist(address _oldArtist) external;

    function addAffiliate(address _newAffiliate) external;

    function removeAffiliate(address _oldAffiliate) external;

    function addCardAffiliate(address _newCardAffiliate) external;

    function removeCardAffiliate(address _oldCardAffiliate) external;

    // only Owner
    function setTimeout(uint32 _newTimeout) external;

    function setMaxRentIterations(uint256 _rentLimit) external;

    function setArbitrator(address _newAddress) external;

    function setRealitioAddress(address _newAddress) external;

    function maxRentIterations() external view returns (uint256);

    function setNFTMintingLimit(uint256 _mintLimit) external;

    function setMinimumPriceIncreasePercent(uint256 _percentIncrease) external;

    function setPotDistribution(
        uint256 _artistCut,
        uint256 _winnerCut,
        uint256 _creatorCut,
        uint256 _affiliateCut,
        uint256 _cardAffiliateCut
    ) external;

    function changeMarketCreationGovernorsOnly() external;

    function changeApprovedArtistsOnly() external;

    function changeApprovedAffilliatesOnly() external;

    function setSponsorshipRequired(uint256 _amount) external;

    function setAdvancedWarning(uint32 _newAdvancedWarning) external;

    function setMaximumDuration(uint32 _newMaximumDuration) external;

    function setMinimumDuration(uint32 _newMinimumDuration) external;

    function addGovernor(address _newGovernor) external;

    function removeGovernor(address _oldGovernor) external;

    // only UberOwner
    function setReferenceContractAddress(address _newAddress) external;

    function setOrderbookAddress(IRCOrderbook _newAddress) external;

    function setNftHubAddress(IRCNftHubL2 _newAddress) external;
}
