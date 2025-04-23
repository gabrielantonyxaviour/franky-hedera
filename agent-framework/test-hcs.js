require("dotenv").config();
const {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar,
  CustomFixedFee,
} = require("@hashgraph/sdk");
const OpenAI = require("openai");

// Initialize Hedera Client
const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
// Properly handle ECDSA private key
const operatorKey = process.env.HEDERA_KEY_TYPE === "ECDSA" 
  ? PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY)
  : PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory storage for user topics
const userTopics = new Map();

// Function to create a fee-gated inbound topic for a user with HIP-991 custom fees
async function createUserTopic(userAccountId) {
  console.log(`Creating HIP-991 fee-gated topic for ${userAccountId}`);
  
  // Create a custom fee of 0.5 HBAR per message
  const customFee = new CustomFixedFee()
    .setHbarAmount(new Hbar(0.5))
    .setFeeCollectorAccountId(operatorId);
  
  const topicCreateTx = new TopicCreateTransaction()
    .setTopicMemo(`HIP-991 Fee-gated Topic for ${userAccountId}`)
    .setAdminKey(operatorKey.publicKey)
    .setSubmitKey(operatorKey.publicKey)
    .setCustomFees([customFee])
    .setFeeScheduleKey(operatorKey.publicKey)
    .setMaxTransactionFee(new Hbar(5));
    
  const submitTx = await topicCreateTx.execute(client);
  const receipt = await submitTx.getReceipt(client);
  const topicId = receipt.topicId;
  console.log(`Created HIP-991 fee-gated topic ${topicId} for user ${userAccountId} with 0.5 HBAR fee`);
  userTopics.set(userAccountId, topicId);
  return topicId;
}

// Function to subscribe to a user's topic and process messages
function subscribeToUserTopic(userAccountId, topicId) {
  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(client, async (message) => {
      const userMessage = Buffer.from(message.contents, "utf8").toString();
      console.log(`Received from ${userAccountId}: ${userMessage}`);

      // Generate AI response using OpenAI
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }],
      });

      const reply = aiResponse.choices[0].message.content;
      console.log(`AI response to ${userAccountId}: ${reply}`);

      // Send AI response back to the user's topic
      // The server account is the fee collector, so we don't pay our own fee
      await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(reply)
        .setMaxTransactionFee(new Hbar(1))
        .execute(client);
    });
}

// Simulate a user interaction with HIP-991 fee-gated topic
async function simulateUserInteraction(userAccountId, userPrompt) {
  let topicId = userTopics.get(userAccountId);
  if (!topicId) {
    topicId = await createUserTopic(userAccountId);
    
    // Add delay to allow topic creation to propagate through the network
    console.log("Waiting for topic to be available on the network...");
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    
    subscribeToUserTopic(userAccountId, topicId);
  }

  console.log(`Sending message to HIP-991 fee-gated topic: "${userPrompt}"`);
  console.log(`This will incur a 0.5 HBAR fee to ${process.env.HEDERA_ACCOUNT_ID}`);
  
  // User submits a message that will automatically trigger the 0.5 HBAR fee collection
  await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(userPrompt)
    .setMaxTransactionFee(new Hbar(3))
    .execute(client);
    
  console.log("Message sent and fee collected successfully");
}

// Example usage
(async () => {
  console.log("=== HIP-991 Fee Collection Test ===");
  console.log("This test demonstrates HIP-991 automatic fee collection");
  console.log("A fee of 0.5 HBAR will be collected for each message sent");
  console.log("------------------------------------------------");
  
  const userAccountId = process.env.OPERATOR_ID || "0.0.12345"; // For testing we use the operator account
  const userPrompt = "Hello, AI agent! This message has a HIP-991 fee of 0.5 HBAR";
  await simulateUserInteraction(userAccountId, userPrompt);
  
  console.log("Test completed successfully!");
})();
