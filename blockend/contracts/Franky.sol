// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IL2Registrar.sol";
import {Character, IFrankyAgentAccountImplementation} from "./interfaces/IFrankyAgentAccountImplementation.sol";

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
        string subname;
        Character characterConfig;
        string secrets;
        bytes32 secretsHash;
        address owner;
        uint256 perApiCallFee;
        uint8 status;
    }

    uint256 public devicesCount = 0;
    uint256 public agentsCount = 0;
    uint32 public protocolFeeInBps = 0;

    address public immutable frankyToken;
    address public frankyAgentAccountImplemetation;
    address public frankyENSRegistrar;

    mapping(address => Device) public devices;

    mapping(address => address) public deviceRegistered;

    mapping(address => mapping(address => bool)) public ownerDevices;

    mapping(address => Agent) public agents;

    mapping(address => mapping(address => bool)) public deviceAgents;

    mapping(address => mapping(address => bytes32)) public agentsKeyHash;

    mapping(address => address) public reownToMetal;

    constructor(
        address _frankyAgentAccountImplemetation,
        address _frankyToken,
        uint32 _protocolFeeInBps
    ) {
        frankyAgentAccountImplemetation = _frankyAgentAccountImplemetation;
        frankyToken = _frankyToken;
        protocolFeeInBps = _protocolFeeInBps;
    }

    event DeviceRegistered(
        address indexed deviceAddress,
        address indexed owner,
        string deviceModel,
        string ram,
        string storageCapacity,
        string cpu,
        string ngrokLink,
        uint256 hostingFee
    );
    event AgentCreated(
        address indexed agentAddress,
        address indexed deviceAddress,
        string subname,
        address owner,
        uint256 perApiCallFee,
        bytes32 secretsHash,
        Character characterConfig,
        string secrets,
        bool isPublic
    );
    event MetalWalletConfigured(
        address indexed deviceAddress,
        address indexed metalUserAddress
    );
    event ApiKeyRegenerated(address indexed agentAddress, bytes32 keyHash);
    event Initialized(address indexed frankyENSRegistrar);

    function intialize(address _frankyENSRegistrar) external {
        require(
            frankyENSRegistrar == address(0),
            "Franky: Already initialized"
        );
        frankyENSRegistrar = _frankyENSRegistrar;
        emit Initialized(_frankyENSRegistrar);
    }

    function configureMetalWallet(address metalUserAddress) public {
        require(
            reownToMetal[msg.sender] == address(0),
            "Metal Wallet Already configured"
        );
        reownToMetal[msg.sender] = metalUserAddress;
        emit MetalWalletConfigured(msg.sender, metalUserAddress);
    }

    function registerDevice(
        string calldata deviceModel,
        string calldata ram,
        string calldata storageCapacity,
        string calldata cpu,
        string calldata ngrokLink,
        uint256 hostingFee,
        address deviceAddress,
        bytes32 verificationHash,
        bytes calldata signature
    ) external {
        // Recover the signer's address from the signature
        address recoveredAddress = recoverSigner(verificationHash, signature);

        // Verify that the recovered address matches the device address
        require(recoveredAddress == deviceAddress, "Invalid signature");

        // Register the device
        devices[deviceAddress] = Device({
            deviceModel: deviceModel,
            ram: ram,
            storageCapacity: storageCapacity,
            cpu: cpu,
            ngrokLink: ngrokLink,
            deviceAddress: deviceAddress,
            agentCount: 0,
            hostingFee: hostingFee,
            isRegistered: true
        });

        // Add the device ID to the owner's list of devices
        ownerDevices[msg.sender][deviceAddress] = true;

        // Assign a new device ID
        devicesCount++;

        // Emit the DeviceRegistered event
        emit DeviceRegistered(
            deviceAddress,
            msg.sender,
            deviceModel,
            ram,
            storageCapacity,
            cpu,
            ngrokLink,
            hostingFee
        );
    }

    function createAgent(
        string calldata subname,
        Character memory characterConfig,
        string calldata secrets,
        bytes32 secretsHash,
        address deviceAddress,
        uint256 perApiCallFee,
        bool isPublic
    ) external {
        require(frankyENSRegistrar != address(0), "Registrar not initialized");
        require(devices[deviceAddress].isRegistered, "Device not registered");
        address agentAddress = _deployAgentAccount(
            subname,
            msg.sender,
            secretsHash
        );
        require(
            IL2Registrar(frankyENSRegistrar).available(subname),
            "ENS Subname Already taken"
        );
        IL2Registrar(frankyENSRegistrar).register(subname, agentAddress);
        IFrankyAgentAccountImplementation(agentAddress).setCharacterAndUrl(
            characterConfig,
            devices[deviceAddress].ngrokLink
        );
        // Create the agent

        agents[agentAddress] = Agent({
            agentAddress: agentAddress,
            deviceAddress: deviceAddress,
            subname: subname,
            characterConfig: characterConfig,
            secrets: secrets,
            secretsHash: secretsHash,
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
            subname,
            msg.sender,
            perApiCallFee,
            agents[agentAddress].secretsHash,
            agents[agentAddress].characterConfig,
            agents[agentAddress].secrets,
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

    function checkAvailableCredits() public view returns (uint256 amount) {
        return IERC20(frankyToken).balanceOf(reownToMetal[msg.sender]);
    }

    function isDeviceOwned(
        address owner,
        address deviceAddress
    ) external view returns (bool) {
        return ownerDevices[owner][deviceAddress];
    }

    function allowApiCall(
        address caller,
        address agentAddress
    ) external view returns (bool) {
        return
            agents[agentAddress].owner == caller ||
            IERC20(frankyToken).balanceOf(reownToMetal[caller]) >=
            agents[agentAddress].perApiCallFee;
    }

    function isDeviceRegistered(
        address deviceAddress
    ) external view returns (bool) {
        return devices[deviceAddress].isRegistered;
    }

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

    function isHostingAgent(address agentAddress) external view returns (bool) {
        return deviceAgents[msg.sender][agentAddress];
    }

    function getKeyHash(address agentAddress) external view returns (bytes32) {
        return agentsKeyHash[agentAddress][msg.sender];
    }

    function _deployAgentAccount(
        string memory subname,
        address owner,
        bytes32 salt
    ) internal returns (address instance) {
        instance = Clones.cloneDeterministic(
            frankyAgentAccountImplemetation,
            salt
        );
        IFrankyAgentAccountImplementation(instance).initialize(
            subname,
            owner,
            address(this),
            address(IL2Registrar(frankyENSRegistrar).registry())
        );

        return instance;
    }

    function getSmartAccountAddress(
        bytes32 salt
    ) public view returns (address) {
        return
            Clones.predictDeterministicAddress(
                frankyAgentAccountImplemetation,
                salt
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
