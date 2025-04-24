export const FRANKY_ADDRESS = "0x9636a17f6318988ee01dbeCeADc8C589C218c4e4";
export const FRANKY_CONTRACT_ID = '0.0.5898159';
export const FRANKY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_frankyAgentAccountImplemetation",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "memo",
        "type": "string"
      }
    ],
    "stateMutability": "payable",
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
        "internalType": "uint256",
        "name": "agentTokenId",
        "type": "uint256"
      },
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
        "name": "subdomain",
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
        "internalType": "bytes[]",
        "name": "characterConfig",
        "type": "bytes[]"
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
        "indexed": false,
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "CallResponseEvent",
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
        "indexed": false,
        "internalType": "address",
        "name": "nftAddress",
        "type": "address"
      }
    ],
    "name": "FrankyAgentsNftCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "walletAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "serverWalletAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "encryptedPrivateKey",
        "type": "bytes"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "privateKeyHash",
        "type": "bytes32"
      }
    ],
    "name": "ServerWalletConfigured",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "fallback"
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
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "smartAccountAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "subdomain",
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
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "privateKeyHash",
        "type": "bytes32"
      }
    ],
    "name": "canDecryptServerWallet",
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
        "name": "walletAddress",
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
    "inputs": [],
    "name": "claimHBAR",
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
      }
    ],
    "name": "claimmables",
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
        "name": "walletAddress",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "encryptedPrivateKey",
        "type": "bytes"
      },
      {
        "internalType": "bytes32",
        "name": "privateKeyHash",
        "type": "bytes32"
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
        "name": "subdomain",
        "type": "string"
      },
      {
        "internalType": "bytes[]",
        "name": "characterConfig",
        "type": "bytes[]"
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
    "stateMutability": "payable",
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
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
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
    "name": "frankyAgentsNftAddress",
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
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "smartAccountAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "deviceAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "subdomain",
            "type": "string"
          },
          {
            "internalType": "bytes[]",
            "name": "characterConfig",
            "type": "bytes[]"
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
    "inputs": [],
    "name": "getBalance",
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
            "internalType": "address",
            "name": "deviceAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "owner",
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
        "name": "_owner",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "deviceAddress",
        "type": "address"
      }
    ],
    "name": "isRegisteredDeviceOrOwner",
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
    "name": "owner",
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
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "encodedFunctionSelector",
        "type": "bytes"
      }
    ],
    "name": "redirectForToken",
    "outputs": [
      {
        "internalType": "int256",
        "name": "responseCode",
        "type": "int256"
      },
      {
        "internalType": "bytes",
        "name": "response",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
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
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "serverWalletsMapping",
    "outputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "walletAddress",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "encryptedPrivateKey",
        "type": "bytes"
      },
      {
        "internalType": "bytes32",
        "name": "privateKeyHash",
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
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "int64",
        "name": "responseCode",
        "type": "int64"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "serialNumber",
        "type": "uint256"
      }
    ],
    "name": "transferFromNFT",
    "outputs": [
      {
        "internalType": "int64",
        "name": "responseCode",
        "type": "int64"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
]

export const FRANY_INDEXER_API = 'https://8287-124-123-105-119.ngrok-free.app/subgraphs/name/graph-indexer'
