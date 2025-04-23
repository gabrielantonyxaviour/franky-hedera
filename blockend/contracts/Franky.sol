// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./HederaTokenService.sol";
import {IFrankyAgentAccountImplementation} from "./interfaces/IFrankyAgentAccountImplementation.sol";

contract Franky is HederaTokenService {
    struct Device {
        string deviceMetadataTopicId;
        address deviceAddress;
        uint256 hostingFee;
        uint256 agentCount;
        bool isRegistered;
    }

    struct Agent {
        uint256 agentTokenId;
        address deviceAddress;
        string subdomain;
        string characterConfigTopicId;
        address owner;
        uint256 perApiCallFee;
        uint8 status;
    }

    uint256 public devicesCount = 0;
    uint256 public agentsCount = 0;
    uint32 public protocolFeeInBps = 0;

    address public frankyAgentAccountImplemetation;
    address public frankyAgentsNftAddress;

    mapping(address => Device) public devices;

    mapping(address => address) public deviceRegistered;

    mapping(address => mapping(address => bool)) public ownerDevices;

    mapping(uint256 => Agent) public agents;

    mapping(address => mapping(uint256 => bool)) public deviceAgents;

    mapping(uint256 => mapping(address => bytes32)) public agentsKeyHash;

    mapping(address => address) public embeddedToServerWallets;

    constructor(
        address _frankyAgentAccountImplemetation,
        uint32 _protocolFeeInBps
    ) {
        frankyAgentAccountImplemetation = _frankyAgentAccountImplemetation;
        frankyAgentsNftAddress = address(0);
        protocolFeeInBps = _protocolFeeInBps;
    }

    event AgentCreated(
        uint256 indexed agentTokenId,
        address indexed deviceAddress,
        string subdomain,
        address owner,
        uint256 perApiCallFee,
        string characterConfigTopicId,
        bool isPublic
    );
    event ApiKeyRegenerated(address indexed agentTokenId, bytes32 keyHash);
    event DeviceRegistered(
        address indexed deviceAddress,
        address indexed owner,
        string deviceMetadataTopicId,
        uint256 hostingFee
    );
    event ServerWalletConfigured(
        address indexed embeddedWalletAddress,
        address indexed serverWalletAddress
    );

    function configureServerWallet(address serverWalletAddress) external {
        require(
            embeddedToServerWallets[msg.sender] == address(0),
            "Server wallet already configured"
        );
        embeddedToServerWallets[msg.sender] = serverWalletAddress;
        emit ServerWalletConfigured(msg.sender, serverWalletAddress);
    }
    function registerDevice(
        string calldata deviceMetadataTopicId,
        uint256 hostingFee,
        address deviceAddress,
        bytes32 verificationHash,
        bytes calldata signature
    ) external {
        address recoveredAddress = recoverSigner(verificationHash, signature);

        require(recoveredAddress == deviceAddress, "Invalid signature");

        devices[deviceAddress] = Device({
            deviceMetadataTopicId: deviceMetadataTopicId,
            deviceAddress: deviceAddress,
            agentCount: 0,
            hostingFee: hostingFee,
            isRegistered: true
        });

        ownerDevices[msg.sender][deviceAddress] = true;

        devicesCount++;

        emit DeviceRegistered(
            deviceAddress,
            msg.sender,
            deviceMetadataTopicId,
            hostingFee
        );
    }

    function createAgent(
        string calldata subdomain,
        string memory characterConfig,
        address deviceAddress,
        uint256 perApiCallFee,
        bool isPublic
    ) external {
        require(devices[deviceAddress].isRegistered, "Device not registered");

        agents[agentAddress] = Agent({
            agentAddress: agentAddress,
            deviceAddress: deviceAddress,
            subdomain: subdomain,
            characterConfig: characterConfig,
            perApiCallFee: perApiCallFee,
            owner: msg.sender,
            status: isPublic ? 2 : 1
        });

        agentsKeyHash[agentAddress][msg.sender] = getRandomBytes32();
        deviceAgents[deviceAddress][agentAddress] = true;
        devices[deviceAddress].agentCount++;
        emit AgentCreated(
            agentAddress,
            deviceAddress,
            avatar,
            subdomain,
            msg.sender,
            perApiCallFee,
            agents[agentAddress].characterConfig,
            isPublic
        );
        emit ApiKeyRegenerated(
            agentAddress,
            agentsKeyHash[agentAddress][msg.sender]
        );
        agentsCount++;
    }

    function regenerateApiKey(address agentAddress) external {
        if (agents[agentAddress].status == 1) {
            require(
                msg.sender == agents[agentAddress].owner,
                "Not device owner"
            );
            agentsKeyHash[agentAddress][msg.sender] = getRandomBytes32();
            emit ApiKeyRegenerated(
                agentAddress,
                agentsKeyHash[agentAddress][msg.sender]
            );
        } else if (agents[agentAddress].status == 2) {
            agentsKeyHash[agentAddress][msg.sender] = getRandomBytes32();
            emit ApiKeyRegenerated(
                agentAddress,
                agentsKeyHash[agentAddress][msg.sender]
            );
        } else {
            revert("Agent not active");
        }
    }

    function checkAvailableCredits(
        address embeddedWalletAddress
    ) public view returns (uint256 amount) {
        return embeddedToServerWallets[embeddedWalletAddress].balance;
    }

    function isDeviceOwned(
        address owner,
        address deviceAddress
    ) external view returns (bool) {
        return ownerDevices[owner][deviceAddress];
    }

    function allowApiCall(
        address caller,
        uint256 agentTokenId
    ) external view returns (bool) {
        return
            agents[agentTokenId].owner == caller ||
            embeddedToServerWallets[caller].balance >=
            agents[agentTokenId].perApiCallFee;
    }

    function isRegisteredDevice() external view returns (bool) {
        return devices[msg.sender].isRegistered;
    }

    function getDevice(
        address deviceAddress
    ) external view returns (Device memory) {
        require(devices[deviceAddress].isRegistered, "Device not registered");
        return devices[deviceAddress];
    }

    function getAgent(
        uint256 agentTokenId
    ) external view returns (Agent memory) {
        require(agents[agentTokenId].status != 0, "Agent not active");
        return agents[agentTokenId];
    }

    function recoverSigner(
        bytes32 _hash,
        bytes memory _signature
    ) public pure returns (address) {
        require(_signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Extract r, s, v from the signature
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature 'v' value");

        // Recover the message signer
        return ecrecover(_hash, v, r, s);
    }

    function prefixedHash(bytes32 _hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
            );
    }

    function isHostingAgent(
        address deviceAddress,
        uint256 agentTokenId
    ) external view returns (bool) {
        return deviceAgents[deviceAddress][agentTokenId];
    }

    function getKeyHash(
        uint256 agentTokenId,
        address caller
    ) external view returns (bytes32) {
        return agentsKeyHash[agentTokenId][caller];
    }

    function isAgentPublic(uint256 agentTokenId) external view returns (bool) {
        return agents[agentTokenId].status == 2;
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
