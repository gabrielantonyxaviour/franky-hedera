import io from "socket.io-client";

const messageId = "address_activity_monitor";
const eventType = "LOG";
const url = "wss://web3.nodit.io/v1/websocket";

// The address we want to monitor
const targetAddress = "0x18c2e2f87183034700cc2A7cf6D86a71fd209678";

// The event signature topic to filter by
const eventTopic = "0xba52b192ecae0fd01871b85d90659ae0178edec3e43c979eedf0e2a402fa1e04";

// Updated params with both address and topic filter
const params = {
  description: "Monitoring specific events for address",
  condition: {
    address: targetAddress,
    topics: [eventTopic] // Adding the specific topic as the first element (topic0)
  }
};

const options = {
  rejectUnauthorized: false,
  transports: ["websocket", "polling"],
  path: "/v1/websocket/",
  auth: {
    apiKey: "xxxxxxxxxxxxxxxxxx",
  },
  query: {
    protocol: "base",
    network: "sepolia",
  },
};

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
        
        // Send subscription request with the updated parameters
        socket.emit("subscription", messageId, eventType, JSON.stringify(params));
      });

      socket.on("subscription_error", (message) => {
        console.error(`Subscription error: ${message}`);
      });

      socket.on("subscription_event", (message) => {
        console.log("Event detected for address:", targetAddress);
        console.log("Event matches topic:", eventTopic);
        console.log("Event details:", message);
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

// Start the connection
connectToServer()
  .then((socket) => {
    console.log("Monitoring events for address:", targetAddress);
    console.log("Filtering by topic:", eventTopic);
  })
  .catch((error) => {
    console.error("Failed to connect:", error);
  });
