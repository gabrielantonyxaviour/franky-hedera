const axios = require("axios");
const ethers = require("ethers");

const noditAPIKey = "hc7lkqT6G~1HLw~rQUcPPuagh39b1E~K";
const axiosInstance = axios.create({
  baseURL: "https://web3.nodit.io/v1/base/sepolia",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": noditAPIKey,
  },
});

// ABI for the createAgent function
const contractABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "prefix", "type": "string"},
      {"internalType": "string", "name": "config", "type": "string"},
      {"internalType": "string", "name": "secrets", "type": "string"},
      {"internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {"internalType": "uint256", "name": "deviceId", "type": "uint256"}
    ],
    "name": "createAgent",
    "outputs": [
      {"internalType": "uint256", "name": "agentId", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "agentId", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "deviceId", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "prefix", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "bytes32", "name": "keyHash", "type": "bytes32"},
      {"indexed": false, "internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {"indexed": false, "internalType": "string", "name": "character", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "secrets", "type": "string"}
    ],
    "name": "AgentCreated",
    "type": "event"
  }
];

const contractInterface = new ethers.utils.Interface(contractABI);
const contractAddress = "0xf3bF424Ec1148F7222153cE68211F5BdFc116215";

// Calculate the correct function selector
const createAgentSelector = contractInterface.getSighash("createAgent");

async function getAgentsByCreator(creatorAddress, showDebug = false) {
  try {
    console.log(`🔍 Searching for agents created by: ${creatorAddress}`);
    
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data?.items?.length > 0) {
      const agentCreationTxs = txResult.data.items.filter(tx => {
        return tx.functionSelector?.toLowerCase() === createAgentSelector.toLowerCase() && 
               tx.from?.toLowerCase() === creatorAddress.toLowerCase();
      });

      if (agentCreationTxs.length > 0) {
        console.log(`✅ Found ${agentCreationTxs.length} agent(s) created by this address:\n`);
        
        agentCreationTxs.forEach((tx, index) => {
          console.log(`🤖 Agent #${index + 1}`);
          console.log(`- TX Hash: ${tx.transactionHash}`);
          console.log(`- Block: ${tx.blockNumber}`);
          console.log(`- Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`);
          
          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input });
            console.log("\nCreation Parameters:");
            console.log(`  Prefix: ${decodedData.args.prefix}`);
            console.log(`  Config: ${decodedData.args.config}`);
            console.log(`  Secrets: ${decodedData.args.secrets}`);
            console.log(`  Secrets Hash: ${decodedData.args.secretsHash}`);
            console.log(`  Device ID: ${decodedData.args.deviceId.toString()}`);
            console.log("----------------------------------------");
          } catch (error) {
            console.log("⚠️ Could not decode agent details");
          }
        });
      } else {
        console.log("\n❌ No agents found for this wallet address");
        if (showDebug) {
          console.log("\nDebug Info:");
          console.log(`Looking for function selector: ${createAgentSelector}`);
          console.log(`All function selectors found:`);
          txResult.data.items.forEach(tx => {
            console.log(`- ${tx.functionSelector} (from: ${tx.from})`);
          });
        }
      }
    } else {
      console.log("\nℹ️ No transactions found for this contract");
    }
  } catch (error) {
    console.error("\n⛔ Error:", error.message);
    if (error.response) {
      console.error("API Error:", error.response.data);
    }
  }
}

// Example usage:
const creatorAddress = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"; // Replace with your address
getAgentsByCreator(creatorAddress, true); // Set second parameter to false to hide debug info