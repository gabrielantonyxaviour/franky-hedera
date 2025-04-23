// Example client to demonstrate HCS API usage with HIP-991 fee collection

// Load .env file for testing
require("dotenv").config();
const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api";

// Using the specific credentials provided which are confirmed to have sufficient balance
// The account pays a 0.5 HBAR fee per message to the server account through HIP-991
const userCredentials = {
  "x-accountid": '0.0.5868472',
  "x-privatekey": 'ae309e13bba36d57a035c848518245cdc5bae0f2542dab96e268898ec7ed8104',
  "x-keytype": "ECDSA" // Explicitly setting to ECDSA
};

console.log("Using user credentials:");
console.log(`  Account ID: ${userCredentials["x-accountid"]}`);
console.log(`  Key Type: ${userCredentials["x-keytype"]}`);

// Send a message to the HCS API using HIP-991 fee collection
async function sendMessage(message) {
  console.log(`\nSending message as user account ${userCredentials["x-accountid"]}...`);
  console.log(`Message: "${message}"`);
  
  try {
    console.log("Making API request to send message...");
    const response = await axios.post(
      `${API_BASE_URL}/message`,
      { message },
      {
        headers: userCredentials
      }
    );
    
    console.log("Message sent successfully!");
    console.log("Server response:", JSON.stringify(response.data, null, 2));
    
    // If this was the first message, a topic was created
    if (response.data.topicCreated) {
      console.log(`\n✅ A new topic was automatically created with ID: ${response.data.topicId}`);
      console.log(`✅ This topic has a HIP-991 fee of 0.5 HBAR per message`);
    }
    
    // Log the fee paid
    console.log(`\n💰 Fee paid: ${response.data.feesPaid.customFee}`);
    console.log(`💰 Fee recipient: ${response.data.feesPaid.recipient}`);
    
    return response.data;
  } catch (error) {
    console.error("Error sending message:", 
      error.response?.data || error.message);
    throw error;
  }
}

// Check payment verification
async function getPaymentVerification(transactionId) {
  console.log(`\nChecking payment for transaction: ${transactionId}...`);
  try {
    const response = await axios.get(
      `${API_BASE_URL}/payment/${transactionId}`
    );
    
    console.log("Payment verification:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("Error checking payment:", 
      error.response?.data || error.message);
    throw error;
  }
}

// Get all payments for an account
async function getAllPayments() {
  console.log(`\nGetting all payments for account: ${userCredentials["x-accountid"]}...`);
  try {
    const response = await axios.get(
      `${API_BASE_URL}/payments/${userCredentials["x-accountid"]}`
    );
    
    console.log("Payment history:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("Error getting payments:", 
      error.response?.data || error.message);
    throw error;
  }
}

// Run the example
async function runExample() {
  try {
    console.log("======= HIP-991 Fee Collection Example =======");
    console.log("This example demonstrates HIP-991 automatic fee collection");
    console.log("How it works:");
    console.log(" 1. User sends a message to a HCS topic");
    console.log(" 2. User automatically pays 0.5 HBAR fee per message");
    console.log(" 3. Fee is collected by the topic creator (the server)");
    console.log(" 4. Server verifies payment and processes the message");
    console.log("================================================\n");
    
    // Send a message - this will create a topic if needed with HIP-991 custom fees
    const result = await sendMessage("Hello, AI agent! Please analyze the latest crypto trends.");
    console.log("------------------------------");
    
    // Verify the payment
    if (result.paymentVerification && result.paymentVerification.transactionId) {
      await getPaymentVerification(result.paymentVerification.transactionId);
      console.log("------------------------------");
    }
    
    // Get all payments
    await getAllPayments();
    
    console.log("\n✅ Example completed successfully!");
    console.log("\nNote: The server is listening for messages on the topic.");
    console.log("Check the server console to see AI responses to your message.");
    
  } catch (error) {
    console.error("Example failed:", error);
  }
}

// Run the example if executed directly
if (require.main === module) {
  runExample();
}

module.exports = {
  sendMessage,
  getPaymentVerification,
  getAllPayments
}; 