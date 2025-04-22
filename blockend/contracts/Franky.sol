// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IL2Registrar.sol";
import {IFrankyAgentAccountImplementation} from "./interfaces/IFrankyAgentAccountImplementation.sol";

contract Franky {
    struct Device {
        string deviceMetadata;
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
        string characterConfig;
        address owner;
        uint256 perApiCallFee;
        uint8 status;
    }

    uint256 public devicesCount = 0;
    uint256 public agentsCount = 0;
    uint32 public protocolFeeInBps = 0;

    address public frankyAgentAccountImplemetation;
    address public frankyENSRegistrar;

    mapping(address => Device) public devices;

    mapping(address => address) public deviceRegistered;

    mapping(address => mapping(address => bool)) public ownerDevices;

    mapping(address => Agent) public agents;

    mapping(address => mapping(address => bool)) public deviceAgents;

    mapping(address => mapping(address => bytes32)) public agentsKeyHash;

    mapping(address => address) public embeddedToServerWallets;

    constructor(
        address _frankyAgentAccountImplemetation,
        uint32 _protocolFeeInBps
    ) {
        frankyAgentAccountImplemetation = _frankyAgentAccountImplemetation;
        protocolFeeInBps = _protocolFeeInBps;
    }

    event AgentCreated(
        address indexed agentAddress,
        address indexed deviceAddress,
        string avatar,
        string subname,
        address owner,
        uint256 perApiCallFee,
        string characterConfig,
        bool isPublic
    );
    event ApiKeyRegenerated(address indexed agentAddress, bytes32 keyHash);
    event DeviceRegistered(
        address indexed deviceAddress,
        address indexed owner,
        string deviceMetadata,
        string ngrokLink,
        uint256 hostingFee
    );
    event Initialized(address indexed frankyENSRegistrar);
    event ServerWalletConfigured(
        address indexed embeddedWalletAddress,
        address indexed serverWalletAddress
    );

    // function intialize(address _frankyENSRegistrar) external {
    //     require(
    //         frankyENSRegistrar == address(0),
    //         "Franky: Already initialized"
    //     );
    //     frankyENSRegistrar = _frankyENSRegistrar;
    //     emit Initialized(_frankyENSRegistrar);
    // }

    function configureServerWallet(address serverWalletAddress) external {
        require(
            embeddedToServerWallets[msg.sender] == address(0),
            "Server wallet already configured"
        );
        embeddedToServerWallets[msg.sender] = serverWalletAddress;
        emit ServerWalletConfigured(msg.sender, serverWalletAddress);
    }

    function registerDevice(
        string calldata deviceMetadata,
        string calldata ngrokLink,
        uint256 hostingFee,
        address deviceAddress,
        bytes32 verificationHash,
        bytes calldata signature
    ) external {
        address recoveredAddress = recoverSigner(verificationHash, signature);

        require(recoveredAddress == deviceAddress, "Invalid signature");

        devices[deviceAddress] = Device({
            deviceMetadata: deviceMetadata,
            ngrokLink: ngrokLink,
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
            deviceMetadata,
            ngrokLink,
            hostingFee
        );
    }

    function createAgent(
        string calldata avatar,
        string calldata subname,
        string memory characterConfig,
        address deviceAddress,
        uint256 perApiCallFee,
        bool isPublic
    ) external {
        // require(frankyENSRegistrar != address(0), "Registrar not initialized");
        require(devices[deviceAddress].isRegistered, "Device not registered");
        address agentAddress = _deployAgentAccount(
            subname,
            msg.sender,
            keccak256(abi.encodePacked(characterConfig))
        );
        // require(
        //     IL2Registrar(frankyENSRegistrar).available(subname),
        //     "ENS Subname Already taken"
        // );
        // IL2Registrar(frankyENSRegistrar).register(subname, agentAddress);
        // IFrankyAgentAccountImplementation(agentAddress).setCharacterAndUrl(
        //     characterConfig,
        //     devices[deviceAddress].ngrokLink,
        //     avatar
        // );
        agents[agentAddress] = Agent({
            agentAddress: agentAddress,
            deviceAddress: deviceAddress,
            subname: subname,
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
            subname,
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
        address agentAddress
    ) external view returns (bool) {
        return
            agents[agentAddress].owner == caller ||
            embeddedToServerWallets[caller].balance >=
            agents[agentAddress].perApiCallFee;
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

    function isHostingAgent(
        address deviceAddress,
        address agentAddress
    ) external view returns (bool) {
        return deviceAgents[deviceAddress][agentAddress];
    }

    function getKeyHash(
        address agentAddress,
        address caller
    ) external view returns (bytes32) {
        return agentsKeyHash[agentAddress][caller];
    }

    function isAgentPublic(address agentAddress) external view returns (bool) {
        return agents[agentAddress].status == 2;
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
