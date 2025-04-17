// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StringUtils} from "@ensdomains/ens-contracts/contracts/utils/StringUtils.sol";

import {IL2Registrar} from "./interfaces/IL2Registrar.sol";
import {IL2Registry} from "./interfaces/IL2Registry.sol";

/// @dev This is an example registrar contract that is mean to be modified.
contract FrankyENSRegistrar is IL2Registrar {
    using StringUtils for string;

    /// @notice Emitted when a new name is registered
    /// @param label The registered label (e.g. "name" in "name.eth")
    /// @param owner The owner of the newly registered name
    event NameRegistered(string indexed label, address indexed owner);

    /// @notice The chainId for the current chain
    uint256 public chainId;

    /// @notice The coinType for the current chain (ENSIP-11)
    uint256 public immutable coinType;

    /// @notice The owner of this contract
    address public immutable franky;

    /// @notice The L2Registry contract
    IL2Registry private immutable _registry;

    /// @notice Initializes the registrar with a registry contract
    /// @param _inputRegistry Address of the L2Registry contract
    constructor(address _inputRegistry, address _franky) {
        // Save the chainId in memory (can only access this in assembly)
        assembly {
            sstore(chainId.slot, chainid())
        }

        // Calculate the coinType for the current chain according to ENSIP-11
        coinType = (0x80000000 | chainId) >> 0;

        // Save the registry address
        _registry = IL2Registry(_inputRegistry);
        franky = _franky;
    }

    modifier onlyFranky() {
        require(msg.sender == franky, "Not authorized");
        _;
    }

    function register(
        string calldata label,
        address owner
    ) external onlyFranky {
        bytes32 node = _labelToNode(label);
        bytes memory addr = abi.encodePacked(owner); // Convert address to bytes

        _registry.setAddr(node, coinType, addr);

        _registry.setAddr(node, 60, addr);

        _registry.createSubnode(
            _registry.baseNode(),
            label,
            owner,
            new bytes[](0)
        );
        emit NameRegistered(label, owner);
    }

    function available(string calldata label) external view returns (bool) {
        bytes32 node = _labelToNode(label);
        uint256 tokenId = uint256(node);

        try _registry.ownerOf(tokenId) {
            return false;
        } catch {
            if (label.strlen() >= 3) {
                return true;
            }
            return false;
        }
    }

    function _labelToNode(
        string calldata label
    ) private view returns (bytes32) {
        return _registry.makeNode(_registry.baseNode(), label);
    }

    function registry() external view returns (IL2Registry) {
        return _registry;
    }
}
