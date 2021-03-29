// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library SafeMath64 {
    using SafeMath for uint256;

    function add(uint64 a, uint64 b) internal pure returns (uint64) {
        return SafeCast.toUint64(uint256(a).add(uint256(b)));
    }
    function sub(uint64 a, uint64 b) internal pure returns (uint64) {
        return SafeCast.toUint64(uint256(a).sub(uint256(b)));
    }
    function mul(uint64 a, uint64 b) internal pure returns (uint64) {
        return SafeCast.toUint64(uint256(a).mul(uint256(b)));
    }
    function div(uint64 a, uint64 b) internal pure returns (uint64) {
        return SafeCast.toUint64(uint256(a).div(uint256(b)));
    }
}
