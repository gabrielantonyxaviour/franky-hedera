const axios = require("axios");
const ethers = require("ethers");

const noditAPIKey = "p4CtuYObYH1xoB0eWsz09JbFSVa6gdkB";
const axiosInstance = axios.create({
  baseURL: "https://web3.nodit.io/v1/base/mainnet",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": noditAPIKey,
  },
});

// Updated ABI with the new registerDevice function signature
const contractABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "deviceModel", "type": "string"},
      {"internalType": "string", "name": "ram", "type": "string"},
      {"internalType": "string", "name": "storageCapacity", "type": "string"},
      {"internalType": "string", "name": "cpu", "type": "string"},
      {"internalType": "string", "name": "ngrokLink", "type": "string"},
      {"internalType": "uint256", "name": "hostingFee", "type": "uint256"},
      {"internalType": "address", "name": "deviceAddress", "type": "address"},
      {"internalType": "bytes32", "name": "verificationHash", "type": "bytes32"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "registerDevice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const contractInterface = new ethers.utils.Interface(contractABI);
const contractAddress = "0x486989cd189ED5DB6f519712eA794Cee42d75b29";
const registerDeviceSelector = contractInterface.getSighash("registerDevice");

async function getAllDevices(showDebug = false) {
  try {
    console.log(`🔍 Searching for all devices registered in contract: ${contractAddress}`);
    
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data?.items?.length > 0) {
      const deviceRegistrationTxs = txResult.data.items.filter(tx => {
        return tx.functionSelector?.toLowerCase() === registerDeviceSelector.toLowerCase();
      });

      if (deviceRegistrationTxs.length > 0) {
        console.log(`✅ Found ${deviceRegistrationTxs.length} device(s) registered in the contract:\n`);
        
        deviceRegistrationTxs.forEach((tx, index) => {
          console.log(`📱 Device #${index + 1}`);
          console.log(`- TX Hash: ${tx.transactionHash}`);
          console.log(`- Block: ${tx.blockNumber}`);
          console.log(`- Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`);
          console.log(`- Registered by: ${tx.from}`);
          
          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input });
            console.log("\nDevice Specifications:");
            console.log(`  Model: ${decodedData.args.deviceModel}`);
            console.log(`  RAM: ${decodedData.args.ram}`);
            console.log(`  Storage: ${decodedData.args.storageCapacity}`);
            console.log(`  CPU: ${decodedData.args.cpu}`);
            console.log(`  Ngrok: ${decodedData.args.ngrokLink}`);
            console.log(`  Hosting Fee: ${ethers.utils.formatUnits(decodedData.args.hostingFee, 0)}`);
            console.log(`  Device Address: ${decodedData.args.deviceAddress}`);
            
            // New fields added
            console.log(`  Verification Hash: ${decodedData.args.verificationHash}`);
            console.log(`  Signature: 0x${Buffer.from(decodedData.args.signature).toString('hex')}`);
            
            console.log("----------------------------------------");
          } catch (error) {
            console.log("⚠️ Could not decode device details");
            if (showDebug) {
              console.error("Decoding error:", error);
            }
          }
        });
      } else {
        console.log("\n❌ No registered devices found in this contract");
        if (showDebug) {
          console.log("\nDebug Info (only shown with showDebug=true):");
          console.log(`Looking for function selector: ${registerDeviceSelector}`);
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

// Function to get details for a specific device
async function getDeviceDetails(deviceAddress) {
  try {
    console.log(`🔍 Getting details for device: ${deviceAddress}`);
    
    // Create a minimal ABI for the devices mapping getter
    const deviceGetterABI = [
      {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "devices",
        "outputs": [
          {"internalType": "string", "name": "deviceModel", "type": "string"},
          {"internalType": "string", "name": "ram", "type": "string"},
          {"internalType": "string", "name": "storageCapacity", "type": "string"},
          {"internalType": "string", "name": "cpu", "type": "string"},
          {"internalType": "string", "name": "ngrokLink", "type": "string"},
          {"internalType": "address", "name": "deviceAddress", "type": "address"},
          {"internalType": "uint256", "name": "hostingFee", "type": "uint256"},
          {"internalType": "uint256", "name": "agentCount", "type": "uint256"},
          {"internalType": "bool", "name": "isRegistered", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "deviceAddress", "type": "address"}],
        "name": "isDeviceRegistered",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    // Create a provider to interact with the contract
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
    const contract = new ethers.Contract(contractAddress, deviceGetterABI, provider);
    
    // Check if device is registered
    const isRegistered = await contract.isDeviceRegistered(deviceAddress);
    
    if (isRegistered) {
      // Get device details
      const deviceDetails = await contract.devices(deviceAddress);
      
      console.log(`\n✅ Device Details for ${deviceAddress}:`);
      console.log(`  Model: ${deviceDetails.deviceModel}`);
      console.log(`  RAM: ${deviceDetails.ram}`);
      console.log(`  Storage: ${deviceDetails.storageCapacity}`);
      console.log(`  CPU: ${deviceDetails.cpu}`);
      console.log(`  Ngrok: ${deviceDetails.ngrokLink}`);
      console.log(`  Hosting Fee: ${deviceDetails.hostingFee.toString()}`);
      console.log(`  Agent Count: ${deviceDetails.agentCount.toString()}`);
      console.log(`  Is Registered: ${deviceDetails.isRegistered}`);
      
      // Note: Verification hash and signature are not stored in the contract state,
      // so they can only be retrieved from the transaction input data
      console.log(`\nℹ️ Verification hash and signature are only available in the transaction input data`);
      console.log(`Use getAllDevices() to see these values for each registration transaction`);
    } else {
      console.log(`\n❌ Device ${deviceAddress} is not registered`);
    }
  } catch (error) {
    console.error("\n⛔ Error:", error.message);
  }
}

// Example usage:
// To list all devices with verification hash and signature:
getAllDevices(); 

// To get details for a specific device (note: won't show verification hash/signature):
// getDeviceDetails("0x7a6712718b6fA91bdB77039799665939F21DF8E0");