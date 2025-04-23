export const FRANKY_ADDRESS = "0x0316A38DFD902528147fFf5D394ccB3C6d13ed8f";

export const FRANKY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_frankyAgentAccountImplemetation",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "_protocolFeeInBps",
        "type": "uint32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "FailedDeployment",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "avatar",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "subname",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "perApiCallFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "characterConfig",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isPublic",
        "type": "bool"
      }
    ],
    "name": "AgentCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "keyHash",
        "type": "bytes32"
      }
    ],
    "name": "ApiKeyRegenerated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "deviceMetadata",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "ngrokLink",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "hostingFee",
        "type": "uint256"
      }
    ],
    "name": "DeviceRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "frankyENSRegistrar",
        "type": "address"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "embeddedWalletAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "serverWalletAddress",
        "type": "address"
      }
    ],
    "name": "ServerWalletConfigured",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "agents",
    "outputs": [
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "subname",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "characterConfig",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "perApiCallFee",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "agentsCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "agentsKeyHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      }
    ],
    "name": "allowApiCall",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "embeddedWalletAddress",
        "type": "address"
      }
    ],
    "name": "checkAvailableCredits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "serverWalletAddress",
        "type": "address"
      }
    ],
    "name": "configureServerWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "avatar",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "subname",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "characterConfig",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "perApiCallFee",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isPublic",
        "type": "bool"
      }
    ],
    "name": "createAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "deviceAgents",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "deviceRegistered",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "devices",
    "outputs": [
      {
        "internalType": "string",
        "name": "deviceMetadata",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "ngrokLink",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "hostingFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "agentCount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "devicesCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "embeddedToServerWallets",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "frankyAgentAccountImplemetation",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "frankyENSRegistrar",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      }
    ],
    "name": "getAgent",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "agentAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "deviceAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "subname",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "characterConfig",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "perApiCallFee",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "status",
            "type": "uint8"
          }
        ],
        "internalType": "struct Franky.Agent",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      }
    ],
    "name": "getDevice",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "deviceMetadata",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "ngrokLink",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "deviceAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "hostingFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "agentCount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isRegistered",
            "type": "bool"
          }
        ],
        "internalType": "struct Franky.Device",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "getKeyHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRandomBytes32",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      }
    ],
    "name": "getSmartAccountAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      }
    ],
    "name": "isAgentPublic",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      }
    ],
    "name": "isDeviceOwned",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      }
    ],
    "name": "isHostingAgent",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isRegisteredDevice",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "ownerDevices",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolFeeInBps",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "_signature",
        "type": "bytes"
      }
    ],
    "name": "recoverSigner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "agentAddress",
        "type": "address"
      }
    ],
    "name": "regenerateApiKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "deviceMetadata",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "ngrokLink",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "hostingFee",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "verificationHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "registerDevice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export const FRANY_INDEXER_API = 'https://8287-124-123-105-119.ngrok-free.app/subgraphs/name/graph-indexer'

export const FRANKY_SERVER_WALLET_BUCKET = 'franky-agents-xyz-server-wallets'
export const FRANKY_AGENTS_BUCKET = 'franky-agents-xyz-character'
export const FRANKY_DEVICES_BUCKET = 'franky-agents-xyz-devices'