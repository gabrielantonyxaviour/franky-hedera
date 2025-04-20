// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFrankyAgentAccountImplementation {
    function initialize(
        string memory _subname,
        address _owner,
        address _franky,
        address _registry
    ) external;
    function setCharacterAndUrl(
        string memory character,
        string memory url,
        string memory avatar
    ) external;
}
