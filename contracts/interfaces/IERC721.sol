// SPDX-License-Identifier: UNDEFINED
pragma solidity 0.8.4;

interface IERC721 {
    function mintNft(
        uint256,
        string calldata,
        address
    ) external;
}
