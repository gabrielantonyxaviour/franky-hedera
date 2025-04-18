const axios = require("axios");
const ethers = require("ethers");

const noditAPIKey = "p4CtuYObYH1xoB0eWsz09JbFSVa6gdkB";
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

/**
 * Get all agents created by specific creators
 * @param {string[]} creatorAddresses - Array of creator addresses to filter by
 * @param {boolean} showDebug - Whether to show debug information
 */
async function getAgentsByCreator(creatorAddresses = [], showDebug = false) {
  try {
    // Convert all addresses to lowercase for case-insensitive comparison
    const normalizedAddresses = creatorAddresses.map(addr => addr.toLowerCase());
    
    console.log(`🔍 Searching for agents in contract: ${contractAddress}`);
    if (creatorAddresses.length > 0) {
      console.log(`🔍 Filtering for agents created by: ${creatorAddresses.join(', ')}`);
    } else {
      console.log(`ℹ️ No creator filters provided. Will show all agents.`);
    }
    
    // Get all transactions to the contract
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data?.items?.length > 0) {
      // Filter to only get createAgent transactions
      let agentCreationTxs = txResult.data.items.filter(tx => {
        return tx.functionSelector?.toLowerCase() === createAgentSelector.toLowerCase();
      });
      
      // Apply creator address filter if addresses were provided
      if (normalizedAddresses.length > 0) {
        agentCreationTxs = agentCreationTxs.filter(tx => 
          normalizedAddresses.includes(tx.from.toLowerCase())
        );
      }

      if (agentCreationTxs.length > 0) {
        console.log(`✅ Found ${agentCreationTxs.length} matching agent(s):\n`);
        
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
            if (showDebug) {
              console.error("Full error:", error);
            }
          }
        });
      } else {
        if (normalizedAddresses.length > 0) {
          console.log("\n❌ No agents found created by the specified addresses");
        } else {
          console.log("\n❌ No agents found in this contract");
        }
        
        if (showDebug) {
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

// Example usage with a specific creator address
getAgentsByCreator([
  "0x6EFF675818968272D5A3406C6282c89C4FFAE94e"
  // Add more addresses here if needed
]);

// To show all agents (no filter):
// getAgentsByCreator();

// To show with debug info:
// getAgentsByCreator(["0x7C215d7f399df6F04d4B154C09D39a80265e9B63"], true);