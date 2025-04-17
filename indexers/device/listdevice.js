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

const contractABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "deviceModel", "type": "string"},
      {"internalType": "string", "name": "ram", "type": "string"},
      {"internalType": "string", "name": "storageCapacity", "type": "string"},
      {"internalType": "string", "name": "cpu", "type": "string"},
      {"internalType": "string", "name": "ngrokLink", "type": "string"},
      {"internalType": "address", "name": "deviceAddress", "type": "address"},
      {"internalType": "bytes32", "name": "verificationHash", "type": "bytes32"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "registerDevice",
    "outputs": [
      {"internalType": "uint256", "name": "deviceId", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const contractInterface = new ethers.utils.Interface(contractABI);
const contractAddress = "0xA7389288252B2DBE40D8c63ad48a737a9D583021";
const registerDeviceSelector = contractInterface.getSighash("registerDevice");

async function getDevicesByOwner(ownerAddress, showDebug = false) {
  try {
    console.log(`🔍 Searching for devices registered by: ${ownerAddress}`);
    
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data?.items?.length > 0) {
      const deviceRegistrationTxs = txResult.data.items.filter(tx => {
        return tx.functionSelector?.toLowerCase() === registerDeviceSelector.toLowerCase() && 
               tx.from?.toLowerCase() === ownerAddress.toLowerCase();
      });

      if (deviceRegistrationTxs.length > 0) {
        console.log(`✅ Found ${deviceRegistrationTxs.length} device(s) registered by this address:\n`);
        
        deviceRegistrationTxs.forEach((tx, index) => {
          console.log(`📱 Device #${index + 1}`);
          console.log(`- TX Hash: ${tx.transactionHash}`);
          console.log(`- Block: ${tx.blockNumber}`);
          console.log(`- Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`);
          
          try {
            const decodedData = contractInterface.parseTransaction({ data: tx.input });
            console.log("\nDevice Specifications:");
            console.log(`  Device ID: ${tx.logs?.[0]?.topics?.[1] ? ethers.BigNumber.from(tx.logs[0].topics[1]).toString() : 'Not available'}`);
            console.log(`  Model: ${decodedData.args.deviceModel}`);
            console.log(`  RAM: ${decodedData.args.ram}`);
            console.log(`  Storage: ${decodedData.args.storageCapacity}`);
            console.log(`  CPU: ${decodedData.args.cpu}`);
            console.log(`  Ngrok: ${decodedData.args.ngrokLink}`);
            console.log(`  Address: ${decodedData.args.deviceAddress}`);
            console.log("----------------------------------------");
          } catch (error) {
            console.log("⚠️ Could not decode device details");
          }
        });
      } else {
        console.log("\n❌ No devices found for this wallet address");
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

// Example usage:
const ownerAddress = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"; // Replace with your address
getDevicesByOwner(ownerAddress); // Set second parameter to true for debug info