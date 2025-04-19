import io from "socket.io-client";

// Configuration
const API_URL = 'https://web3.nodit.io/v1/base/sepolia/token/getTokenTransfersByContract';
const WEBSOCKET_URL = "wss://web3.nodit.io/v1/websocket";
const CONTRACT_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29';
const TARGET_WALLET = '0x5732e1bccAEB161E3B93D126010042B0F1b9CFC9';
const API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Global state
let totalValue = BigInt(0);
let socket = null;

// Helper functions
function hexToDecimal(hex) {
  if (!hex) return "0";
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  return BigInt("0x" + cleanHex).toString();
}

function extractAddressFromTopic(topic) {
  if (!topic || topic.length < 66) return null;
  return "0x" + topic.slice(topic.length - 40);
}

function parseNoditMessage(message) {
  try {
    const cleaned = message.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
    const jsonStart = cleaned.indexOf('event: {');
    if (jsonStart === -1) return null;
    const jsonString = cleaned.slice(jsonStart + 7);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing message:", error);
    return null;
  }
}

function formatOutput(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Fetch historical data
async function fetchHistoricalTransfers() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({
        contractAddress: CONTRACT_ADDRESS,
        withCount: false,
        withZeroValue: false
      })
    });

    const data = await response.json();
    const filteredTxs = data.items.filter(tx => 
      tx.to.toLowerCase() === TARGET_WALLET.toLowerCase()
    );

    const historicalTotal = filteredTxs.reduce((sum, tx) => 
      sum + BigInt(tx.value), BigInt(0));

    console.log("\n" + "=".repeat(60));
    console.log("HISTORICAL TRANSFERS ANALYSIS".padStart(45));
    console.log("=".repeat(60));
    console.log(`Found ${filteredTxs.length} transactions to ${TARGET_WALLET}`);
    console.log(`Total historical value: ${formatOutput(historicalTotal)} tokens`);
    console.log("=".repeat(60) + "\n");

    return historicalTotal;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return BigInt(0);
  }
}

// WebSocket setup
function setupWebSocket() {
  const messageId = "address_activity_monitor";
  const eventType = "LOG";
  const eventTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  const params = {
    description: "Monitoring token transfers",
    condition: {
      address: CONTRACT_ADDRESS,
      topics: [eventTopic]
    }
  };

  const options = {
    rejectUnauthorized: false,
    transports: ["websocket", "polling"],
    path: "/v1/websocket/",
    auth: { apiKey: API_KEY },
    query: { protocol: "base", network: "sepolia" },
  };

  socket = io(WEBSOCKET_URL, options);

  socket.on("connect", () => {
    console.log("\nConnected to WebSocket, monitoring for new transfers...");
    socket.emit("subscription", messageId, eventType, JSON.stringify(params));
  });

  socket.on("subscription_event", (message) => {
    const parsed = parseNoditMessage(message);
    if (!parsed?.messages?.[0]) return;

    const logEntry = parsed.messages[0];
    const toAddress = logEntry.topics?.[2] ? extractAddressFromTopic(logEntry.topics[2]) : null;

    if (toAddress?.toLowerCase() === TARGET_WALLET.toLowerCase()) {
      const amount = BigInt(hexToDecimal(logEntry.data));
      totalValue += amount;

      console.log("\n" + "=".repeat(60));
      console.log("NEW TRANSFER DETECTED".padStart(40));
      console.log("=".repeat(60));
      console.log(`Amount: ${formatOutput(amount).padStart(20)} tokens`);
      console.log(`From:   ${extractAddressFromTopic(logEntry.topics[1])}`);
      console.log(`To:     ${toAddress}`);
      console.log(`Block:  ${logEntry.block_number}`);
      console.log(`Time:   ${new Date(logEntry.block_timestamp * 1000).toLocaleString()}`);
      console.log(`TxHash: ${logEntry.transaction_hash}`);
      console.log("=".repeat(60));
      console.log(`\nTOTAL VALUE RECEIVED: ${formatOutput(totalValue)} tokens\n`);
    }
  });

  socket.on("disconnect", () => {
    console.log("WebSocket disconnected - attempting to reconnect...");
    setTimeout(setupWebSocket, 5000);
  });

  socket.on("connect_error", (error) => {
    console.error("WebSocket connection error:", error);
  });
}

// Main execution
async function main() {
  try {
    // First load historical data
    const historicalTotal = await fetchHistoricalTransfers();
    totalValue = historicalTotal;

    // Then setup real-time monitoring
    setupWebSocket();

    // Keep process running
    setInterval(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Current total: ${formatOutput(totalValue)} tokens`);
    }, 60000); // Log current total every minute

  } catch (error) {
    console.error("Application error:", error);
    process.exit(1);
  }
}

// Start the application
main();