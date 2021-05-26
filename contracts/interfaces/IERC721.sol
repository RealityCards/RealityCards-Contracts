// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.4;

interface IERC721 {
    function mint(
        uint256,
        string calldata,
        address
    ) external;
}
