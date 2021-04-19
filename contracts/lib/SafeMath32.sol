// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library SafeMath32 {
    using SafeMath for uint256;

    function add(uint32 a, uint32 b) internal pure returns (uint32) {
        return SafeCast.toUint32(uint256(a).add(uint256(b)));
    }
    function sub(uint32 a, uint32 b) internal pure returns (uint32) {
        return SafeCast.toUint32(uint256(a).sub(uint256(b)));
    }
    function mul(uint32 a, uint32 b) internal pure returns (uint32) {
        return SafeCast.toUint32(uint256(a).mul(uint256(b)));
    }
    function div(uint32 a, uint32 b) internal pure returns (uint32) {
        return SafeCast.toUint32(uint256(a).div(uint256(b)));
    }
}