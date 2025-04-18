const axios = require("axios");
const ethers = require("ethers");

const noditAPIKey = "xxxxxxxxxxxxxxx";
const axiosInstance = axios.create({
  baseURL: "https://web3.nodit.io/v1/base/mainnet",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": noditAPIKey,
  },
});

// Updated ABI for the new contract
const contractABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "subname", "type": "string"},
      {"internalType": "string", "name": "avatar", "type": "string"},
      {
        "components": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "string", "name": "personality", "type": "string"},
          {"internalType": "string", "name": "scenario", "type": "string"},
          {"internalType": "string", "name": "first_mes", "type": "string"},
          {"internalType": "string", "name": "mes_example", "type": "string"},
          {"internalType": "string", "name": "creatorcomment", "type": "string"},
          {"internalType": "string", "name": "tags", "type": "string"},
          {"internalType": "string", "name": "talkativeness", "type": "string"}
        ],
        "internalType": "struct Character",
        "name": "characterConfig",
        "type": "tuple"
      },
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
      {"indexed": false, "internalType": "string", "name": "avatar", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "subname", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "perApiCallFee", "type": "uint256"},
      {"indexed": false, "internalType": "bytes32", "name": "secretsHash", "type": "bytes32"},
      {
        "components": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "string", "name": "personality", "type": "string"},
          {"internalType": "string", "name": "scenario", "type": "string"},
          {"internalType": "string", "name": "first_mes", "type": "string"},
          {"internalType": "string", "name": "mes_example", "type": "string"},
          {"internalType": "string", "name": "creatorcomment", "type": "string"},
          {"internalType": "string", "name": "tags", "type": "string"},
          {"internalType": "string", "name": "talkativeness", "type": "string"}
        ],
        "indexed": false,
        "internalType": "struct Character",
        "name": "characterConfig",
        "type": "tuple"
      },
      {"indexed": false, "internalType": "string", "name": "secrets", "type": "string"},
      {"indexed": false, "internalType": "bool", "name": "isPublic", "type": "bool"}
    ],
    "name": "AgentCreated",
    "type": "event"
  }
];

const contractInterface = new ethers.utils.Interface(contractABI);
const contractAddress = "0x486989cd189ED5DB6f519712eA794Cee42d75b29";

// Calculate the correct function selector for the new createAgent function
const createAgentSelector = contractInterface.getSighash("createAgent");

async function getAllAgents() {
  try {
    console.log(`🔍 Searching for all agents in contract: ${contractAddress}`);
    
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
            console.log(`  Subname: ${decodedData.args.subname}`);
            console.log(`  Avatar: ${decodedData.args.avatar}`);
            
            // Log character config details
            const characterConfig = decodedData.args.characterConfig;
            console.log(`  Character Config:`);
            console.log(`    Name: ${characterConfig.name}`);
            console.log(`    Description: ${characterConfig.description.substring(0, 50)}...`);
            console.log(`    Personality: ${characterConfig.personality.substring(0, 50)}...`);
            
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
