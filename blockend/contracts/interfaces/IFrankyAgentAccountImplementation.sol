// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFrankyAgentAccountImplementation {
    function initialize(
        string memory _subname,
        address _owner,
        address _franky,
        address _registry
    ) external;
    function setNgrokUrl(string memory url) external;
}
