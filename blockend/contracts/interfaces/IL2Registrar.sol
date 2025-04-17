// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IL2Registry} from "./IL2Registry.sol";

interface IL2Registrar {
    function registry() external view returns (IL2Registry);
    function register(string calldata label, address owner) external;
    function available(string memory label) external returns (bool);
}
