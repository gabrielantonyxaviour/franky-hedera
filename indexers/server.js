const express = require('express');
const { ethers } = require('ethers');
const app = express();
app.use(express.json());

// ABI for the registerDevice function
const functionABI = [
  {
    "inputs": [
      { "type": "string", "name": "deviceModel" },
      { "type": "string", "name": "ram" },
      { "type": "string", "name": "storageCapacity" },
      { "type": "string", "name": "cpu" },
      { "type": "string", "name": "ngrokLink" },
      { "type": "address", "name": "deviceAddress" },
      { "type": "bytes32", "name": "deviceId" },
      { "type": "bytes", "name": "signature" }
    ],
    "name": "registerDevice",
    "type": "function",
    "stateMutability": "nonpayable",
    "outputs": []
  }
];

// Function to decode input data
function decodeInputData(inputData) {
  try {
    const iface = new ethers.utils.Interface(functionABI);
    const decodedData = iface.parseTransaction({ data: inputData });
    
    return {
      function: decodedData.name,
      params: decodedData.args
    };
  } catch (error) {
    console.error('Error decoding input data:', error);
    return { error: 'Failed to decode input data' };
  }
}

// Route to receive webhook notifications
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body, null, 2));
  
  // Check if this is a transaction with input data
  if (req.body.event && req.body.event.messages) {
    for (const message of req.body.event.messages) {
      if (message.input) {
        console.log('\n--- DECODED INPUT DATA ---');
        const decoded = decodeInputData(message.input);
        console.log(JSON.stringify(decoded, null, 2));
        console.log('-------------------------\n');
      }
    }
  }
  
  res.status(200).send('Webhook received');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});