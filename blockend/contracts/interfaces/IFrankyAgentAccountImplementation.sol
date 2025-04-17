// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Character {
    string name;
    string description;
    string personality;
    string scenario;
    string first_mes;
    string mes_example;
    string creatorcomment;
    string tags;
    string talkativeness;
}

interface IFrankyAgentAccountImplementation {
    function initialize(
        string memory _subname,
        address _owner,
        address _franky,
        address _registry
    ) external;
    function setCharacterAndUrl(
        Character memory character,
        string memory url
    ) external;
}
