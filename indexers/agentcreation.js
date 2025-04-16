import io from "socket.io-client";
import { ethers } from "ethers";
import express from "express";

// Create Express app
const app = express();
const PORT = 3000;

// Store the last agent details
let lastAgentDetails = null;

// Nodit WebSocket configuration
const messageId = "address_activity_monitor";
const eventType = "LOG";
const url = "wss://web3.nodit.io/v1/websocket";

// The address we want to monitor
const targetAddress = "0x18c2e2f87183034700cc2A7cf6D86a71fd209678";

// The event signature topic to filter by
const eventTopic = "0xba52b192ecae0fd01871b85d90659ae0178edec3e43c979eedf0e2a402fa1e04";

// ABI for decoding the AgentCreated event
const contractABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "agentAddress", "type": "address"},
      {"indexed": true, "name": "deviceAddress", "type": "address"},
      {"indexed": false, "name": "prefix", "type": "string"},
      {"indexed": false, "name": "owner", "type": "address"},
      {"indexed": false, "name": "perApiCallFee", "type": "uint256"},
      {"indexed": false, "name": "secretsHash", "type": "bytes32"},
      {"indexed": false, "name": "character", "type": "string"},
      {"indexed": false, "name": "secrets", "type": "string"},
      {"indexed": false, "name": "isPublic", "type": "bool"}
    ],
    "name": "AgentCreated",
    "type": "event"
  }
];

const options = {
  rejectUnauthorized: false,
  transports: ["websocket", "polling"],
  path: "/v1/websocket/",
  auth: {
    apiKey: "p4CtuYObYH1xoB0eWsz09JbFSVa6gdkB",
  },
  query: {
    protocol: "base",
    network: "sepolia",
  },
};

// Function to parse the string message into JSON
function parseNoditMessage(message) {
  try {
    const cleaned = message.replace(/\n/g, '').replace(/\s+/g, ' ');
    const jsonStart = cleaned.indexOf('event: {');
    if (jsonStart === -1) return null;
    const jsonString = cleaned.slice(jsonStart + 7);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing Nodit message:", error);
    return null;
  }
}

// Function to decode the event data
function decodeAgentCreatedEvent(log) {
  try {
    const iface = new ethers.utils.Interface(contractABI);
    const decodedEvent = iface.parseLog({
      topics: log.topics,
      data: log.data
    });

    const decodedArgs = {};
    for (const [key, value] of Object.entries(decodedEvent.args)) {
      decodedArgs[key] = ethers.BigNumber.isBigNumber(value) ? value.toString() : value;
    }

    return {
      eventName: decodedEvent.name,
      args: decodedArgs,
      blockNumber: log.block_number,
      transactionHash: log.transaction_hash,
      timestamp: new Date(log.block_timestamp * 1000).toISOString()
    };
  } catch (error) {
    console.error("Error decoding event:", error);
    return {
      error: "Failed to decode event",
      rawData: log.data,
      topics: log.topics
    };
  }
}

// Simple endpoint to get last agent details
app.get('/last-agent', (req, res) => {
  if (lastAgentDetails) {
    res.json(lastAgentDetails);
  } else {
    res.status(404).json({ message: "No agent events received yet" });
  }
});

function connectToServer() {
  return new Promise((resolve, reject) => {
    const socket = io(url, options);

    socket.on("connect", () => {
      console.log("Connected to server, subscribing to filtered events...");

      socket.on("subscription_registered", (message) => {
        console.log("Subscription registered:", message);
      });

      socket.on("subscription_connected", (message) => {
        console.log("Subscription connected:", message);
        const params = {
          description: "Monitoring AgentCreated events",
          condition: {
            address: targetAddress,
            topics: [eventTopic]
          }
        };
        socket.emit("subscription", messageId, eventType, JSON.stringify(params));
      });

      socket.on("subscription_error", (message) => {
        console.error(`Subscription error: ${message}`);
      });

      socket.on("subscription_event", (message) => {
        console.log("\n--- NEW EVENT DETECTED ---");
        const parsedMessage = parseNoditMessage(message);
        if (!parsedMessage) {
          console.log("Could not parse message:", message);
          return;
        }

        console.log("Parsed message:", JSON.stringify(parsedMessage, null, 2));
        
        if (parsedMessage.messages && parsedMessage.messages.length > 0) {
          const log = parsedMessage.messages[0];
          console.log("Event for address:", log.address);
          console.log("Event matches topic:", log.topics[0]);
          
          if (log.topics && log.topics[0] === eventTopic) {
            const decodedEvent = decodeAgentCreatedEvent(log);
            console.log("Decoded Event Details:", JSON.stringify(decodedEvent, null, 2));
            
            if (!decodedEvent.error) {
              lastAgentDetails = decodedEvent;
              console.log("\nExtracted Parameters:");
              console.log("Agent Address:", decodedEvent.args.agentAddress);
              console.log("Device Address:", decodedEvent.args.deviceAddress);
              console.log("Prefix:", decodedEvent.args.prefix);
              console.log("Owner:", decodedEvent.args.owner);
              console.log("Per API Call Fee:", decodedEvent.args.perApiCallFee);
              console.log("Secrets Hash:", decodedEvent.args.secretsHash);
              console.log("Secrets:", decodedEvent.args.secrets);
              console.log("Is Public:", decodedEvent.args.isPublic);
            }
          }
        }
      });

      socket.on("disconnect", (reason) => {
        console.warn(`Disconnected from server. Reason:`, reason);
      });

      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error(`Socket connection error:`, error);
      reject(error);
    });
  });
}

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Access last agent details at: http://localhost:${PORT}/last-agent`);
});

// Start the WebSocket connection
connectToServer()
  .then((socket) => {
    console.log("Monitoring AgentCreated events for address:", targetAddress);
    console.log("Filtering by topic:", eventTopic);
  })
  .catch((error) => {
    console.error("Failed to connect:", error);
  });