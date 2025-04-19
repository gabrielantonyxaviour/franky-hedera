import { NextResponse } from 'next/server';
import axios from 'axios';
import { ethers } from 'ethers';

// Type definitions
interface Transaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  functionSelector?: string;
  input: string;
}

interface AgentData {
  agentAddress: string;
  deviceAddress: string;
  subname: string;
  avatar: string;
  owner: string;
  perApiCallFee: string;
  secretsHash: string;
  characterConfig: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creatorcomment: string;
    tags: string;
    talkativeness: string;
  };
  isPublic: boolean;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

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

const contractAddress = "0x486989cd189ED5DB6f519712eA794Cee42d75b29";

// Updated function to get the agent address from event logs
async function getAgentAddressFromLogs(txHash: string, axiosInstance: any, eventSignature: string) {
  try {
    console.log(`Fetching transaction receipt for tx: ${txHash}`);
    
    const receiptResult = await axiosInstance.post(
      "/blockchain/getTransactionReceipt",
      {
        transactionHash: txHash
      }
    );
    
    // Debug the receipt
    if (!receiptResult.data) {
      console.log(`No data in receipt response for tx: ${txHash}`);
      return '';
    }
    
    if (!receiptResult.data.receipt) {
      console.log(`No receipt in data for tx: ${txHash}`);
      console.log(`Response data: ${JSON.stringify(receiptResult.data)}`);
      return '';
    }
    
    console.log(`Receipt fetched: ${receiptResult.data ? 'Success' : 'Failed'}`);
    
    if (receiptResult.data?.receipt?.logs) {
      const logs = receiptResult.data.receipt.logs;
      console.log(`Found ${logs.length} logs in transaction receipt`);
      
      // Find logs from our contract that have the AgentCreated event signature in topic[0]
      const agentCreatedLogs = logs.filter((log: any) => 
        log.address && 
        log.address.toLowerCase() === contractAddress.toLowerCase() && 
        log.topics && 
        log.topics.length > 1 && 
        log.topics[0].toLowerCase() === eventSignature.toLowerCase()
      );
      
      console.log(`Found ${agentCreatedLogs.length} AgentCreated event logs with signature: ${eventSignature}`);
      
      if (agentCreatedLogs.length > 0) {
        // Get the first matching log
        const agentCreatedLog = agentCreatedLogs[0];
        
        // The agent address is in topics[1] (first indexed parameter)
        const rawAddress = agentCreatedLog.topics[1];
        console.log(`Raw agent address topic: ${rawAddress}`);
        
        // Extract the address from the 32-byte topic (remove padding)
        const agentAddress = '0x' + rawAddress.slice(26).toLowerCase();
        console.log(`Extracted agent address: ${agentAddress}`);
        
        return agentAddress;
      }
      
      // Fallback: just look for any log from our contract with multiple topics
      console.log("Fallback: Looking for any contract log with multiple topics");
      const contractLogs = logs.filter((log: any) => 
        log.address && 
        log.address.toLowerCase() === contractAddress.toLowerCase() &&
        log.topics && 
        log.topics.length > 1
      );
      
      if (contractLogs.length > 0) {
        const firstLog = contractLogs[0];
        console.log(`Found contract log with topics: ${JSON.stringify(firstLog.topics)}`);
        
        // Print all topics for debugging
        firstLog.topics.forEach((topic: string, index: number) => {
          console.log(`Topic[${index}]: ${topic}`);
        });
        
        const rawAddress = firstLog.topics[1];
        const agentAddress = '0x' + rawAddress.slice(26).toLowerCase();
        console.log(`Fallback extracted agent address: ${agentAddress}`);
        
        return agentAddress;
      }
    } else {
      console.log(`No logs found in receipt for tx: ${txHash}`);
    }
    
    console.log(`⚠️ No agent address found in logs for tx: ${txHash}`);
    return '';
  } catch (error: any) {
    console.error(`Error getting receipt for tx ${txHash}:`, error);
    console.error(`Error details: ${error.message}`, error.response?.data || {});
    return '';
  }
}

export async function GET() {
  try {
    const noditAPIKey = process.env.NEXT_PUBLIC_NODIT_API_KEY;
    
    if (!noditAPIKey) {
      throw new Error('Nodit API key not configured');
    }
    
    const axiosInstance = axios.create({
      baseURL: "https://web3.nodit.io/v1/base/mainnet",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": noditAPIKey,
      },
    });

    // Create ethers interface to interact with the contract
    const contractInterface = new ethers.Interface(contractABI);
    
    // Calculate the correct function selector for the new createAgent function
    const functionFragment = contractInterface.getFunction("createAgent");
    const createAgentSelector = functionFragment ? functionFragment.selector : '';
    
    // Get event signature for AgentCreated
    const eventFragment = contractInterface.getEvent("AgentCreated");
    const eventSignature = eventFragment ? ethers.id(eventFragment.format()) : '';
    console.log(`AgentCreated event signature: ${eventSignature}`);

    console.log(`🔍 Searching for all agents in contract: ${contractAddress}`);
    
    // Get all transactions to the contract
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    const agents: AgentData[] = [];

    if (txResult.data?.items?.length > 0) {
      // Filter to only get createAgent transactions
      const agentCreationTxs = txResult.data.items.filter((tx: Transaction) => {
        return tx.functionSelector?.toLowerCase() === createAgentSelector.toLowerCase();
      });

      if (agentCreationTxs.length > 0) {
        console.log(`✅ Found ${agentCreationTxs.length} agent(s)`);
        
        for (const tx of agentCreationTxs) {
          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input });
            
            if (!decodedData || !decodedData.args) {
              console.log('⚠️ Decoded data or args missing for transaction:', tx.transactionHash);
              continue;
            }
            
            // Extract agent data to return in API
            const characterConfig = decodedData.args.characterConfig || {};
            const isPublic = Boolean(decodedData.args.isPublic);
            
            // Only include public agents
            if (isPublic) {
              // Get the agent address from transaction logs
              const agentAddress = await getAgentAddressFromLogs(tx.transactionHash, axiosInstance, eventSignature);
              
              // Generate a deterministic address if we couldn't get it from logs
              // This is a fallback method - in reality, we should get it from logs
              let finalAgentAddress = agentAddress;
              if (!finalAgentAddress) {
                console.log('Using fallback method to calculate agent address');
                // Fallback: For demo/test, we'll use the device address as the agent address
                // In a real implementation, we'd need to use proper contract logic to derive this
                finalAgentAddress = decodedData.args.deviceAddress || '';
                console.log(`Fallback agent address: ${finalAgentAddress}`);
              }
              
              const agentData: AgentData = {
                agentAddress: finalAgentAddress,
                deviceAddress: decodedData.args.deviceAddress || '',
                subname: decodedData.args.subname || '',
                avatar: decodedData.args.avatar || '',
                owner: tx.from,
                perApiCallFee: ethers.formatUnits(decodedData.args.perApiCallFee || 0, 'wei'),
                secretsHash: decodedData.args.secretsHash || '',
                characterConfig: {
                  name: characterConfig.name || '',
                  description: characterConfig.description || '',
                  personality: characterConfig.personality || '',
                  scenario: characterConfig.scenario || '',
                  first_mes: characterConfig.first_mes || '',
                  mes_example: characterConfig.mes_example || '',
                  creatorcomment: characterConfig.creatorcomment || '',
                  tags: characterConfig.tags || '',
                  talkativeness: characterConfig.talkativeness || '',
                },
                isPublic: isPublic,
                txHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                timestamp: tx.timestamp
              };
              
              // Add to our list of agents
              agents.push(agentData);
            }
          } catch (error) {
            const err = error as Error;
            console.log(`⚠️ Could not decode agent details: ${err.message}`);
          }
        }
      } else {
        console.log("No agents found in this contract");
      }
    } else {
      console.log("No transactions found for this contract");
    }

    // Process agent data for frontend
    const processedAgents = agents.map(agent => {
      const processed = {
        agentAddress: agent.agentAddress,
        deviceAddress: agent.deviceAddress,
        prefix: agent.subname, // Map subname to prefix for backward compatibility
        owner: agent.owner,
        perApiCallFee: agent.perApiCallFee,
        secretsHash: agent.secretsHash,
        character: agent.avatar, // Map avatar to character for backward compatibility
        name: agent.characterConfig.name,
        description: agent.characterConfig.description,
        isPublic: agent.isPublic,
        txHash: agent.txHash,
        blockNumber: agent.blockNumber,
        timestamp: agent.timestamp
      };
      
      // Log each processed agent for debugging
      console.log(`Processed agent: ${agent.subname}, agentAddress: ${agent.agentAddress}`);
      
      return processed;
    });
    
    // Log processed agents for debugging
    console.log('Total processed agents:', processedAgents.length);
    console.log('First processed agent:', JSON.stringify(processedAgents[0] || {}, null, 2));

    return NextResponse.json({ agents: processedAgents });
    
  } catch (error) {
    const err = error as Error;
    console.error("Error:", err.message);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error("API Error:", error.response.data);
      return NextResponse.json(
        { error: `API Error: ${error.response.data}` },
        { status: error.response.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: err.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}