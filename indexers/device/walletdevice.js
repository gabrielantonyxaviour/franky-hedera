const axios = require("axios");
const ethers = require("ethers");

const noditAPIKey = "xxxxxxxxxxxxxxxxxxxxxxxxx";
const axiosInstance = axios.create({
  baseURL: "https://web3.nodit.io/v1/base/mainnet",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": noditAPIKey,
  },
});

// Updated ABI with the correct registerDevice function signature
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
// Contract address
const contractAddress = "0x486989cd189ED5DB6f519712eA794Cee42d75b29";
const registerDeviceSelector = contractInterface.getSighash("registerDevice");

/**
 * Get all devices registered by specific addresses
 * @param {string[]} specificAddresses - Array of addresses to filter by
 * @param {boolean} showDebug - Show debug information
 */
async function getDevicesByRegistrar(specificAddresses = [], showDebug = false) {
  try {
    // Convert all addresses to lowercase for case-insensitive comparison
    const normalizedAddresses = specificAddresses.map(addr => addr.toLowerCase());
    
    console.log(`🔍 Searching for devices registered in contract: ${contractAddress}`);
    if (specificAddresses.length > 0) {
      console.log(`🔍 Filtering for devices registered by: ${specificAddresses.join(', ')}`);
    } else {
      console.log(`ℹ️ No address filters provided. Will show all devices.`);
    }
    
    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data?.items?.length > 0) {
      // Filter transactions by function selector
      let deviceRegistrationTxs = txResult.data.items.filter(tx => {
        return tx.functionSelector?.toLowerCase() === registerDeviceSelector.toLowerCase();
      });
      
      // Apply registrar address filter if addresses were provided
      if (normalizedAddresses.length > 0) {
        deviceRegistrationTxs = deviceRegistrationTxs.filter(tx => 
          normalizedAddresses.includes(tx.from.toLowerCase())
        );
      }

      if (deviceRegistrationTxs.length > 0) {
        console.log(`✅ Found ${deviceRegistrationTxs.length} matching device(s):\n`);
        
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
            console.log(`  Verification Hash: ${decodedData.args.verificationHash}`);
            console.log(`  Signature: ${decodedData.args.signature}`);
            console.log("----------------------------------------");
          } catch (error) {
            console.log("⚠️ Could not decode device details");
            if (showDebug) {
              console.error("Decoding error:", error);
            }
          }
        });
      } else {
        if (normalizedAddresses.length > 0) {
          console.log("\n❌ No devices found registered by the specified addresses");
        } else {
          console.log("\n❌ No registered devices found in this contract");
        }
        
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
    
    // Create a minimal ABI for the devices mapping getter based on the provided full ABI
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
    const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
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
    } else {
      console.log(`\n❌ Device ${deviceAddress} is not registered`);
    }
  } catch (error) {
    console.error("\n⛔ Error:", error.message);
  }
}

// Example usage
// To list devices from specific addresses:
getDevicesByRegistrar([
  "0x7c215d7f399df6f04d4b154c09d39a80265e9b63"
  // Add more addresses here as needed
]);

// To show all devices (no filter):
// getDevicesByRegistrar();

// To get details for a specific device:
// getDeviceDetails("0x7a6712718b6fA91bdB77039799665939F21DF8E0");