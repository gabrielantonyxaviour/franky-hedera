// Test script to demonstrate HIP-991 fee collection
require("dotenv").config();
const {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Hbar,
  CustomFixedFee,
  TransactionReceiptQuery
} = require("@hashgraph/sdk");

// Initialize clients
console.log("Initializing Hedera clients...");

// Server account - this will be the fee collector
const serverAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
const serverKey = process.env.HEDERA_KEY_TYPE === "ECDSA" 
  ? PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY)
  : PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
const serverClient = Client.forTestnet().setOperator(serverAccountId, serverKey);

// User account - this will pay the fees
// Using the specific account credentials provided by the user
const userAccountId = AccountId.fromString('0.0.5868472');
// Ensuring proper handling of ECDSA private key
const userKey = PrivateKey.fromStringECDSA('ae309e13bba36d57a035c848518245cdc5bae0f2542dab96e268898ec7ed8104');
const userClient = Client.forTestnet().setOperator(userAccountId, userKey);

// In a real application, the user's account would be different from the server's account
console.log(`Server Account: ${serverAccountId}`);
console.log(`User Account: ${userAccountId}`);
console.log(`User key type: ECDSA`);

// Function to create a topic with HIP-991 custom fees - done by the SERVER
async function createFeeGatedTopic() {
  console.log("\nCreating a topic with HIP-991 custom fee of 0.5 HBAR per message...");
  
  // Create a fixed fee - 0.5 HBAR per message
  const customFee = new CustomFixedFee()
    .setHbarAmount(new Hbar(0.5))
    .setFeeCollectorAccountId(serverAccountId);
  
  // Create a topic with HIP-991 custom fee
  const topicCreateTx = new TopicCreateTransaction()
    .setTopicMemo("HIP-991 Fee-gated Topic Demo")
    .setAdminKey(serverKey.publicKey)
    // Allow the user's public key to submit messages
    .setSubmitKey(userKey.publicKey)
    .setCustomFees([customFee])
    .setFeeScheduleKey(serverKey.publicKey)
    .setMaxTransactionFee(new Hbar(50));
  
  // Execute the transaction using the server's client
  // In this case, the server pays to create the topic
  const submitTx = await topicCreateTx.execute(serverClient);
  const receipt = await submitTx.getReceipt(serverClient);
  const topicId = receipt.topicId;
  
  console.log(`✅ Topic created with ID: ${topicId}`);
  console.log(`   Topic has a custom fee of 0.5 HBAR per message`);
  console.log(`   Fee collector: ${serverAccountId}`);
  console.log(`   Authorized sender: ${userAccountId}`);
  
  return topicId;
}

// Function to send a message to the topic and pay the fee
async function sendMessage(topicId, message) {
  console.log(`\nSending message to topic ${topicId} as user ${userAccountId}...`);
  console.log(`Message: "${message}"`);
  
  // Create transaction to submit message to the topic
  const messageTx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .setMaxTransactionFee(new Hbar(50));
  
  // Execute with the user's client - the user pays both the network fee AND the custom fee
  console.log("Executing message transaction with user client...");
  const submitTx = await messageTx.execute(userClient);
  console.log("Waiting for receipt...");
  const receipt = await submitTx.getReceipt(userClient);
  
  console.log(`✅ Message sent successfully!`);
  console.log(`   Transaction ID: ${messageTx.transactionId.toString()}`);
  console.log(`   Status: ${receipt.status.toString()}`);
  console.log(`\n💰 User ${userAccountId} paid 0.5 HBAR to ${serverAccountId}`);
  
  return messageTx.transactionId;
}

// Run the example
async function runDemo() {
  try {
    console.log("======= HIP-991 Fee Collection Demo =======");
    console.log("This demo shows how HIP-991 custom fees work with HCS");
    console.log("===========================================\n");
    
    // Step 1: Create a topic with custom fee
    const topicId = await createFeeGatedTopic();
    
    // Wait a moment for the topic to be fully available on the network
    console.log("\nWaiting for topic to be available...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Send a message and pay the fee
    const txId = await sendMessage(
      topicId, 
      "This message has a 0.5 HBAR fee that goes to the topic creator"
    );
    
    console.log("\n✅ Demo completed successfully!");
    console.log("\nSummary:");
    console.log(` - Topic ID: ${topicId}`);
    console.log(` - Custom Fee: 0.5 HBAR per message`);
    console.log(` - Fee Collector: ${serverAccountId}`);
    console.log(` - Fee Payer: ${userAccountId}`);
    console.log(` - Transaction: ${txId.toString()}`);
    
  } catch (error) {
    console.error("Demo failed:", error);
  }
}

// Run the demo
runDemo(); 