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

// Use the correct ABI for the createAgent function based on your first document
const contractABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "prefix", "type": "string"},
      {"internalType": "string", "name": "config", "type": "string"},
      {"internalType": "string", "name": "secrets", "type": "string"},
      {"internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {"internalType": "address", "name": "deviceAddress", "type": "address"},
      {"internalType": "uint256", "name": "perApiCallFee", "type": "uint256"},
      {"internalType": "bool", "name": "isPublic", "type": "bool"}
    ],
    "name": "createAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "agentAddress", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "deviceAddress", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "prefix", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "perApiCallFee", "type": "uint256"},
      {"indexed": false, "internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {"indexed": false, "internalType": "string", "name": "character", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "secrets", "type": "string"},
      {"indexed": false, "internalType": "bool", "name": "isPublic", "type": "bool"}
    ],
    "name": "AgentCreated",
    "type": "event"
  }
];

const contractInterface = new ethers.utils.Interface(contractABI);
const contractAddress = "0x18c2e2f87183034700cc2A7cf6D86a71fd209678";

// Calculate the correct function selector
const createAgentSelector = contractInterface.getSighash("createAgent");

async function getAllAgents() {
  try {
    console.log(`🔍 Searching for all agents in contract: ${contractAddress}`);
    
    // Get all transactions to the contract, similar to original sample code
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data?.items?.length > 0) {
      // Filter to only get createAgent transactions but don't filter by creator address
      const agentCreationTxs = txResult.data.items.filter(tx => {
        return tx.functionSelector?.toLowerCase() === createAgentSelector.toLowerCase();
      });

      if (agentCreationTxs.length > 0) {
        console.log(`✅ Found ${agentCreationTxs.length} agent(s):\n`);
        
        agentCreationTxs.forEach((tx, index) => {
          console.log(`🤖 Agent #${index + 1}`);
          console.log(`- TX Hash: ${tx.transactionHash}`);
          console.log(`- Block: ${tx.blockNumber}`);
          console.log(`- Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`);
          console.log(`- Creator: ${tx.from}`);
          
          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input });
            console.log("\nCreation Parameters:");
            console.log(`  Prefix: ${decodedData.args.prefix}`);
            console.log(`  Config: ${decodedData.args.config.substring(0, 50)}...`); // Truncate long configs
            console.log(`  Secrets Hash: ${decodedData.args.secretsHash}`);
            console.log(`  Device Address: ${decodedData.args.deviceAddress}`);
            console.log(`  Per API Call Fee: ${ethers.utils.formatUnits(decodedData.args.perApiCallFee, 'wei')} wei`);
            console.log(`  Is Public: ${decodedData.args.isPublic}`);
            console.log("----------------------------------------");
          } catch (error) {
            console.log(`⚠️ Could not decode agent details: ${error.message}`);
          }
        });
      } else {
        console.log("\n❌ No agents found in this contract");
        console.log("\nDebug Info:");
        console.log(`Looking for function selector: ${createAgentSelector}`);
        console.log(`All function selectors found:`);
        const selectors = {};
        txResult.data.items.forEach(tx => {
          if (tx.functionSelector) {
            selectors[tx.functionSelector] = (selectors[tx.functionSelector] || 0) + 1;
          }
        });
        Object.keys(selectors).forEach(selector => {
          console.log(`- ${selector}: ${selectors[selector]} occurrences`);
        });
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

// Run the function
getAllAgents();
