// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IL2Registrar.sol";
import "./interfaces/IFrankyAgentAccountImplementation.sol";

contract Franky {
    struct Device {
        string deviceModel;
        string ram;
        string storageCapacity;
        string cpu;
        string ngrokLink;
        address deviceAddress;
        uint256 hostingFee;
        uint256 agentCount;
        bool isRegistered;
    }

    struct Agent {
        address agentAddress;
        address deviceAddress;
        string prefix;
        string config;
        string secrets;
        bytes32 secretsHash;
        address owner;
        uint256 perApiCallFee;
        uint8 status;
    }

    uint256 public devicesCount = 0;
    uint256 public agentsCount = 0;
    uint32 public protocolFeeInBps = 0;

    constructor() {}

    function intialize(address _frankyENSRegistrar) external {
        emit Initialized(_frankyENSRegistrar);
    }

    function registerDevice() external {}

    function createAgent(uint256 perApiCallFee, bool isPublic) external {}

    function regenerateApiKey(address agentAddress) external {}

    function getDevice(
        address deviceAddress
    ) external view returns (Device memory) {
        require(devices[deviceAddress].isRegistered, "Device not registered");
        return devices[deviceAddress];
    }

    function getAgent(
        address agentAddress
    ) external view returns (Agent memory) {
        require(agents[agentAddress].status != 0, "Agent not active");
        return agents[agentAddress];
    }

    function prefixedHash(bytes32 _hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
            );
    }

    function getRandomBytes32() public view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    blockhash(block.number - 1)
                )
            );
    }
}
