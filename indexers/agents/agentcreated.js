const axios = require("axios");
const ethers = require("ethers");

const noditAPIKey = "xxxxxxxxxxxxxxxx";
const axiosInstance = axios.create({
  baseURL: "https://web3.nodit.io/v1/base/sepolia",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": noditAPIKey,
  },
});

// ABI fragment for the createAgent function
const abiFragment = [
  {
    "inputs": [
      { "internalType": "string", "name": "prefix", "type": "string" },
      { "internalType": "string", "name": "config", "type": "string" },
      { "internalType": "string", "name": "secrets", "type": "string" },
      { "internalType": "uint256", "name": "deviceId", "type": "uint256" }
    ],
    "name": "createAgent",
    "outputs": [
      { "internalType": "uint256", "name": "agentId", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const interface = new ethers.utils.Interface(abiFragment);

(async () => {
  try {
    const contractAddress = "0xdCc8fd3c55215e32EcD6660B0599860b7A58aBa9";
    console.log("Fetching transactions for:", contractAddress);

    const txResult = await axiosInstance.post(
      "/blockchain/getTransactionsByAccount",
      {
        accountAddress: contractAddress,
        withDecode: true,
      }
    );

    if (txResult.data && txResult.data.items && txResult.data.items.length > 0) {
      const filteredTransactions = txResult.data.items.filter(
        (tx) => tx.functionSelector === "0x35e450dd"
      );

      if (filteredTransactions.length > 0) {
        console.log(`Total matching transactions: ${filteredTransactions.length}`);
        filteredTransactions.forEach((tx, index) => {
          console.log(`\nTransaction ${index + 1} (${tx.transactionHash}):`);
          
          try {
            // Decode the input data
            const decodedData = interface.parseTransaction({ data: tx.input });
            
            console.log("Decoded Data:");
            console.log("Function:", decodedData.name);
            console.log("Parameters:");
            console.log("  prefix:", decodedData.args.prefix);
            console.log("  config:", decodedData.args.config);
            console.log("  secrets:", decodedData.args.secrets);
            console.log("  deviceId:", decodedData.args.deviceId.toString());
            
          } catch (decodeError) {
            console.error("Failed to decode transaction input:", decodeError.message);
          }
        });
      } else {
        console.log("No transactions found with functionSelector: 0x35e450dd");
      }
    } else {
      console.log("No transactions found for this contract.");
    }
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    if (error.response) {
      console.error("API Response Error:", error.response.data);
    }
  }
})();
