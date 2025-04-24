// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./hedera/HederaTokenService.sol";
import "./hedera/KeyHelper.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {IFrankyAgentAccountImplementation} from "./interfaces/IFrankyAgentAccountImplementation.sol";

contract Franky is HederaTokenService, KeyHelper {
    struct Device {
        string deviceMetadata;
        address deviceAddress;
        address owner;
        uint256 hostingFee;
        uint256 agentCount;
        bool isRegistered;
    }

    struct Agent {
        uint256 tokenId;
        address smartAccountAddress;
        address deviceAddress;
        string subdomain;
        bytes[] characterConfig;
        address owner;
        uint256 perApiCallFee;
        uint8 status;
    }

    struct ServerWallet {
        address owner;
        address walletAddress;
        bytes encryptedPrivateKey;
        bytes32 privateKeyHash;
    }

    uint256 public devicesCount = 0;
    uint256 public agentsCount = 0;

    address public frankyAgentAccountImplemetation;
    address public frankyAgentsNftAddress;
    address public owner;

    mapping(address => uint256) public claimmables;

    mapping(address => Device) public devices;

    mapping(address => address) public deviceRegistered;

    mapping(address => mapping(address => bool)) public ownerDevices;

    mapping(address => Agent) public agents;

    mapping(address => mapping(address => bool)) public deviceAgents;

    mapping(address => mapping(address => bytes32)) public agentsKeyHash;

    mapping(address => ServerWallet) public serverWalletsMapping;

    constructor(
        address _frankyAgentAccountImplemetation,
        string memory name,
        string memory symbol,
        string memory memo
    ) payable {
        IHederaTokenService.RoyaltyFee[]
            memory royaltyFees = new IHederaTokenService.RoyaltyFee[](1);
        royaltyFees[0] = IHederaTokenService.RoyaltyFee({
            numerator: 1,
            denominator: 10,
            amount: 100000000, // Fallback fee of 1 HBAR in tinybars (1 HBAR = 1e8 tinybars)
            tokenId: address(0),
            useHbarsForPayment: true,
            feeCollector: msg.sender
        });
        IHederaTokenService.FixedFee[]
            memory fixedFees = new IHederaTokenService.FixedFee[](0);
        IHederaTokenService.HederaToken memory token;
        token.name = name;
        token.symbol = symbol;
        token.memo = memo;
        token.treasury = address(this);
        IHederaTokenService.TokenKey[]
            memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = getSingleKey(
            KeyType.SUPPLY,
            KeyValueType.CONTRACT_ID,
            address(this)
        );
        token.tokenKeys = keys;
        (
            int responseCode,
            address createdToken
        ) = createNonFungibleTokenWithCustomFees(token, fixedFees, royaltyFees);
        require(responseCode == HederaResponseCodes.SUCCESS, "FAILED");
        frankyAgentsNftAddress = createdToken;
        frankyAgentAccountImplemetation = _frankyAgentAccountImplemetation;
        owner = msg.sender;
        emit FrankyAgentsNftCreated(createdToken);
    }

    event FrankyAgentsNftCreated(address nftAddress);

    event AgentCreated(
        uint256 indexed agentTokenId,
        address indexed agentAddress,
        address indexed deviceAddress,
        string subdomain,
        address owner,
        uint256 perApiCallFee,
        bytes[] characterConfig,
        bool isPublic
    );
    event ApiKeyRegenerated(address indexed agentAddress, bytes32 keyHash);
    event DeviceRegistered(
        address indexed deviceAddress,
        address indexed owner,
        string deviceMetadata,
        uint256 hostingFee
    );
    event ServerWalletConfigured(
        address indexed walletAddress,
        address indexed serverWalletAddress,
        bytes encryptedPrivateKey,
        bytes32 privateKeyHash
    );

    function configureServerWallet(
        address walletAddress,
        bytes memory encryptedPrivateKey,
        bytes32 privateKeyHash
    ) external {
        require(
            serverWalletsMapping[msg.sender].walletAddress == address(0),
            "Server wallet already configured"
        );
        serverWalletsMapping[msg.sender] = ServerWallet({
            owner: msg.sender,
            walletAddress: walletAddress,
            encryptedPrivateKey: encryptedPrivateKey,
            privateKeyHash: privateKeyHash
        });
        emit ServerWalletConfigured(
            msg.sender,
            walletAddress,
            encryptedPrivateKey,
            privateKeyHash
        );
    }

    function registerDevice(
        string calldata deviceMetadata,
        uint256 hostingFee,
        address deviceAddress,
        bytes32 verificationHash,
        bytes calldata signature
    ) external {
        address recoveredAddress = recoverSigner(verificationHash, signature);

        require(recoveredAddress == deviceAddress, "Invalid signature");

        devices[deviceAddress] = Device({
            deviceMetadata: deviceMetadata,
            deviceAddress: deviceAddress,
            owner: msg.sender,
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
            hostingFee
        );
    }

    function createAgent(
        string calldata subdomain,
        bytes[] memory characterConfig,
        address deviceAddress,
        uint256 perApiCallFee,
        bool isPublic
    ) external payable {
        require(devices[deviceAddress].isRegistered, "Device not registered");
        require(
            msg.value >= devices[deviceAddress].hostingFee,
            "Insufficient Fee"
        );

        address agentAddress = _deployAgentAccount(
            subdomain,
            msg.sender,
            keccak256(characterConfig[0])
        );
        (int responseCode, int64 newTotalSupply, ) = mintToken(
            frankyAgentsNftAddress,
            0,
            characterConfig
        );
        uint256 tokenId = uint256(uint64(newTotalSupply)) - 1;
        require(
            responseCode == HederaResponseCodes.SUCCESS,
            "Failed to mint NFT"
        );
        agents[agentAddress] = Agent({
            tokenId: tokenId,
            smartAccountAddress: agentAddress,
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
            tokenId,
            agentAddress,
            deviceAddress,
            subdomain,
            msg.sender,
            perApiCallFee,
            characterConfig,
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
        address walletAddress
    ) public view returns (uint256 amount) {
        return serverWalletsMapping[walletAddress].walletAddress.balance;
    }

    function isDeviceOwned(
        address _owner,
        address deviceAddress
    ) external view returns (bool) {
        return ownerDevices[_owner][deviceAddress];
    }

    function allowApiCall(
        address caller,
        address agentAddress
    ) external view returns (bool) {
        return
            agents[agentAddress].owner == caller ||
            serverWalletsMapping[caller].walletAddress.balance >=
            agents[agentAddress].perApiCallFee;
    }

    function isRegisteredDevice(address caller) external view returns (bool) {
        return devices[caller].isRegistered;
    }

    function canDecryptServerWallet(
        address caller,
        address serverWalletAddress
    ) external view returns (bool) {
        return
            devices[caller].isRegistered ||
            serverWalletsMapping[caller].walletAddress == serverWalletAddress;
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

    function _deployAgentAccount(
        string memory subname,
        address _owner,
        bytes32 salt
    ) internal returns (address instance) {
        instance = Clones.cloneDeterministic(
            frankyAgentAccountImplemetation,
            salt
        );
        IFrankyAgentAccountImplementation(instance).initialize(
            subname,
            _owner,
            address(this)
        );
        return instance;
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

    receive() external payable {
        claimmables[owner] = msg.value;
    }

    fallback() external payable {
        claimmables[owner] = msg.value;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function claimHBAR() external {
        uint256 amount = claimmables[msg.sender];
        require(amount > 0, "Nothing to claim");
        claimmables[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
