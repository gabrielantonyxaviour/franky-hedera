import io from "socket.io-client";

const messageId = "token_transfer_monitor";
const eventType = "TOKEN_TRANSFER";
const url = "wss://web3.nodit.io/v1/websocket";

// The contract address we want to monitor for token transfers
const contractAddress = "0x8340B5250E499dF722dB353B1680E853511Dc1AD";

// Corrected params structure for token transfer monitoring
const params = {
  condition: {
    tokens: [{
      contractAddress: contractAddress
      // No tokenId specified since we want all transfers
    }]
  }
};

const options = {
  rejectUnauthorized: false,
  transports: ["websocket", "polling"],
  path: "/v1/websocket/",
  auth: {
    apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxx",
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
      console.log("Connected to server, subscribing to token transfers...");
      
      socket.on("subscription_registered", (message) => {
        console.log("Subscription registered:", message);
      });

      socket.on("subscription_connected", (message) => {
        console.log("Subscription connected:", message);
        
        // Send subscription request with token transfer parameters
        socket.emit("subscription", messageId, eventType, JSON.stringify(params));
      });

      socket.on("subscription_error", (message) => {
        console.error(`Subscription error: ${message}`);
      });

      socket.on("subscription_event", (message) => {
        console.log("Token transfer detected for contract:", contractAddress);
        console.log("Transfer details:", message);
        
        // Handle different token types
        if (message.event && message.event.messages && message.event.messages.length > 0) {
          const transfer = message.event.messages[0];
          console.log(`Detected ${transfer.type} transfer:`);
          console.log(`From: ${transfer.from_address}`);
          console.log(`To: ${transfer.to_address}`);
          
          if (transfer.type === "erc20") {
            console.log(`Value: ${transfer.value}`);
          } else if (transfer.type === "erc721" || transfer.type === "erc1155") {
            console.log(`Token ID: ${transfer.token_id}`);
            if (transfer.type === "erc1155") {
              console.log(`Value: ${transfer.value}`);
            }
          }
          
          console.log(`TX Hash: ${transfer.transaction_hash}`);
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

// Start the connection
connectToServer()
  .then((socket) => {
    console.log("Monitoring token transfers for contract:", contractAddress);
  })
  .catch((error) => {
    console.error("Failed to connect:", error);
  });