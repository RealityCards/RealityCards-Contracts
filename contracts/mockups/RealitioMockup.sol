pragma solidity 0.5.13;

import "./../utils/SafeMath.sol";

// this is only for ganache testing. Public chain deployments will use the existing Realitio contracts. 

contract RealitioMockup

{

    uint result;
    uint stfu;
    string gtfo;
    address reported;
    uint32 getrekt;
    bytes32 = pls;

    function setResult(uint _result) public
    {
        result = _result;
    }

    function askQuestion(uint256 template_id, string calldata question, address arbitrator, uint32 timeout, uint32 opening_ts, uint256 nonce) external payable returns (bytes32) {
        // to get rid of compiler warnings:
        stfu = template_id;
        stfu = nonce;
        gtfo = question;
        reported = arbitrator;
        getrekt = timeout;
        getrekt = opening_ts;
        return 0x8d293509129e26299990826db10c48241be5f59f2e4f61c0c9d550e4451e1a38;
    }

    function resultFor(bytes32 question_id) external view returns (bytes32) {
        pls = question_id;
        return bytes32(result);
    }

}

