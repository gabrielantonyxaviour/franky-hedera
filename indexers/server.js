const express = require('express');
const { ethers } = require('ethers');
const app = express();
app.use(express.json());

// Updated ABIs for all supported functions
const contractABI = [
  {
    "inputs": [
      { "type": "string", "name": "deviceModel" },
      { "type": "string", "name": "ram" },
      { "type": "string", "name": "storageCapacity" },
      { "type": "string", "name": "cpu" },
      { "type": "string", "name": "ngrokLink" },
      { "type": "address", "name": "deviceAddress" },
      { "type": "bytes32", "name": "verificationHash" },
      { "type": "bytes", "name": "signature" }
    ],
    "name": "registerDevice",
    "type": "function",
    "stateMutability": "nonpayable",
    "outputs": [],
    "sighash": "0xbf287b41"
  },
  {
    "inputs": [
      { "type": "string", "name": "prefix" },
      { "type": "string", "name": "config" },
      { "type": "string", "name": "secrets" },
      { "type": "bytes32", "name": "secretsHash" },
      { "type": "uint256", "name": "deviceId" }
    ],
    "name": "createAgent",
    "type": "function",
    "stateMutability": "nonpayable",
    "outputs": [],
    "sighash": "0xd3ea87dc"
  }
];

// Event ABIs for decoding logs
const eventABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "deviceId", "type": "uint256" },
      { "indexed": true, "name": "owner", "type": "address" },
      { "name": "deviceModel", "type": "string" },
      { "name": "ram", "type": "string" },
      { "name": "storageCapacity", "type": "string" },
      { "name": "cpu", "type": "string" },
      { "name": "ngrokLink", "type": "string" },
      { "name": "deviceAddress", "type": "address" }
    ],
    "name": "DeviceRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "agentId", "type": "uint256" },
      { "indexed": true, "name": "deviceId", "type": "uint256" },
      { "name": "prefix", "type": "string" },
      { "name": "owner", "type": "address" },
      { "name": "keyHash", "type": "bytes32" },
      { "name": "secretsHash", "type": "bytes32" },
      { "name": "character", "type": "string" },
      { "name": "secrets", "type": "string" }
    ],
    "name": "AgentCreated",
    "type": "event"
  }
];

// Store the most recent transactions by type
let mostRecentTransactions = {
  registerDevice: null,
  createAgent: null
};

// Function to decode input data
function decodeInputData(inputData) {
  try {
    const iface = new ethers.utils.Interface(contractABI);
    const decodedData = iface.parseTransaction({ data: inputData });
    
    return {
      function: decodedData.name,
      params: decodedData.args,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const functionSig = inputData.slice(0, 10);
    const matchingFunction = contractABI.find(func => func.sighash === functionSig);
    if (matchingFunction) {
      try {
        const specificIface = new ethers.utils.Interface([matchingFunction]);
        const decodedData = specificIface.parseTransaction({ data: inputData });
        
        return {
          function: decodedData.name,
          params: decodedData.args,
          timestamp: new Date().toISOString()
        };
      } catch (innerError) {
        console.error('Error decoding with specific interface:', innerError);
      }
    }
    
    console.error('Error decoding input data:', error);
    return { 
      error: 'Failed to decode input data',
      functionSig: functionSig,
      rawInput: inputData
    };
  }
}

// Function to decode event logs and extract return data
function decodeEventLog(log) {
  try {
    // Create interface for parsing event logs
    const iface = new ethers.utils.Interface(eventABI);
    
    // Extract topics and data from the log
    const topics = log.topics || [];
    const data = log.data;
    
    // Parse the log
    const event = iface.parseLog({ topics, data });
    
    let returnData = {};
    if (event.name === 'DeviceRegistered') {
      returnData = {
        deviceId: event.args.deviceId.toString() // Primary "return" value
      };
    } else if (event.name === 'AgentCreated') {
      returnData = {
        agentId: event.args.agentId.toString() // Primary "return" value
      };
    }
    
    return {
      event: event.name,
      params: Object.keys(event.args).reduce((acc, key) => {
        if (isNaN(parseInt(key))) { // Skip numeric indices
          // Format BigNumber values as strings for better readability
          const value = event.args[key];
          acc[key] = ethers.BigNumber.isBigNumber(value) ? value.toString() : value;
        }
        return acc;
      }, {}),
      returnData: returnData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error decoding event log:', error);
    console.error('Topics:', log.topics);
    console.error('Data:', log.data);
    return {
      error: 'Failed to decode event log',
      topics: log.topics,
      data: log.data
    };
  }
}

// Route to receive webhook notifications
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body, null, 2));
  
  if (req.body.event && req.body.event.messages) {
    for (const message of req.body.event.messages) {
      // Process message directly if it contains topics and data (direct log entry)
      if (message.topics && message.data) {
        console.log('\n--- DECODED EVENT LOG ---');
        const decodedLog = decodeEventLog(message);
        console.log(JSON.stringify(decodedLog, null, 2));
        
        // Store in appropriate transaction history
        if (decodedLog.event === 'DeviceRegistered') {
          mostRecentTransactions.registerDevice = {
            eventData: decodedLog.params,
            returnData: decodedLog.returnData,
            blockNumber: message.block_number,
            txHash: message.transaction_hash,
            receivedAt: new Date().toISOString()
          };
        } else if (decodedLog.event === 'AgentCreated') {
          mostRecentTransactions.createAgent = {
            eventData: decodedLog.params,
            returnData: decodedLog.returnData,
            blockNumber: message.block_number,
            txHash: message.transaction_hash,
            receivedAt: new Date().toISOString()
          };
        }
      }
      
      // Process transaction input data if available
      if (message.input) {
        console.log('\n--- DECODED INPUT DATA ---');
        const decoded = decodeInputData(message.input);
        console.log(JSON.stringify(decoded, null, 2));
        
        if (decoded.function === 'registerDevice') {
          mostRecentTransactions.registerDevice = {
            ...decoded,
            rawInput: message.input,
            blockNumber: message.block_number,
            txHash: message.hash,
            receivedAt: new Date().toISOString()
          };
        } else if (decoded.function === 'createAgent') {
          mostRecentTransactions.createAgent = {
            ...decoded,
            rawInput: message.input,
            blockNumber: message.block_number,
            txHash: message.hash,
            receivedAt: new Date().toISOString()
          };
        }
      }
      
      // Process event logs if they're in an array
      if (message.logs && message.logs.length > 0) {
        console.log('\n--- DECODED EVENT LOGS ---');
        for (const log of message.logs) {
          const decodedLog = decodeEventLog(log);
          console.log(JSON.stringify(decodedLog, null, 2));
          
          if (decodedLog.event === 'DeviceRegistered') {
            if (mostRecentTransactions.registerDevice && 
                mostRecentTransactions.registerDevice.txHash === message.hash) {
              mostRecentTransactions.registerDevice.eventData = decodedLog.params;
              mostRecentTransactions.registerDevice.returnData = decodedLog.returnData;
            }
          } else if (decodedLog.event === 'AgentCreated') {
            if (mostRecentTransactions.createAgent && 
                mostRecentTransactions.createAgent.txHash === message.hash) {
              mostRecentTransactions.createAgent.eventData = decodedLog.params;
              mostRecentTransactions.createAgent.returnData = decodedLog.returnData;
            }
          }
        }
      }
    }
  }
  
  res.status(200).send('Webhook received');
});

// Endpoint to get the most recent device registration
app.get('/latest-device', (req, res) => {
  if (mostRecentTransactions.registerDevice) {
    res.json(mostRecentTransactions.registerDevice);
  } else {
    res.status(404).json({ message: 'No device registrations received yet' });
  }
});

// Endpoint to get the most recent agent creation
app.get('/latest-agent', (req, res) => {
  if (mostRecentTransactions.createAgent) {
    res.json(mostRecentTransactions.createAgent);
  } else {
    res.status(404).json({ message: 'No agent creations received yet' });
  }
});

// Endpoint to get all latest transactions
app.get('/latest-transactions', (req, res) => {
  res.json({
    registerDevice: mostRecentTransactions.registerDevice || null,
    createAgent: mostRecentTransactions.createAgent || null
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Latest device endpoint: http://localhost:${PORT}/latest-device`);
  console.log(`Latest agent endpoint: http://localhost:${PORT}/latest-agent`);
  console.log(`All latest transactions endpoint: http://localhost:${PORT}/latest-transactions`);
});
