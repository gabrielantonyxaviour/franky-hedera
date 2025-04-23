require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar,
  TransactionReceiptQuery,
  TransactionId,
  AccountBalanceQuery,
  Key,
  CustomFixedFee,
} = require("@hashgraph/sdk");
const OpenAI = require("openai");

// Initialize OpenAI Client from the server's credentials
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize server client for the API to use
console.log("Initializing Hedera server client...");
const serverAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
const serverKey = process.env.HEDERA_KEY_TYPE === "ECDSA" 
  ? PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY)
  : PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
const serverClient = Client.forTestnet().setOperator(serverAccountId, serverKey);
console.log(`Server initialized with account: ${serverAccountId.toString()}`);

// In-memory storage for user topics
const userTopics = new Map();
// Track payment verification
const paymentRecords = new Map();

const app = express();
app.use(bodyParser.json());

// Helper function to create a Hedera client with user credentials
function createUserClient(accountId, privateKey, keyType) {
  try {
    console.log(`Creating client for account ${accountId} with key type ${keyType}`);
    const userAccountId = AccountId.fromString(accountId);
    
    // Handle different key types
    let userKey;
    if (keyType === "ECDSA") {
      // Use the same ECDSA approach that works in hip991-test.js
      console.log("Using ECDSA key format");
      userKey = PrivateKey.fromStringECDSA(privateKey);
    } else {
      console.log("Using ED25519 key format");
      userKey = PrivateKey.fromString(privateKey);
    }
    
    console.log("Successfully created private key");
    
    // Create and return the client
    const client = Client.forTestnet().setOperator(userAccountId, userKey);
    console.log("Successfully created Hedera client");
    return client;
  } catch (error) {
    console.error("Error creating client:", error);
    throw new Error(`Invalid Hedera credentials: ${error.message}`);
  }
}

// Verify payment by checking transaction receipt
async function verifyPayment(userClient, userAccountId, txId, expectedAmount) {
  try {
    // Get receipt to verify transaction was successful
    const receipt = await new TransactionReceiptQuery()
      .setTransactionId(txId)
      .execute(userClient);
    
    if (receipt.status.toString() !== "SUCCESS") {
      return {
        verified: false,
        status: receipt.status.toString(),
        reason: "Transaction failed",
      };
    }
    
    // Payment records can be used to track and provide payment proof
    const paymentRecord = {
      transactionId: txId.toString(),
      accountId: userAccountId,
      amount: expectedAmount.toString(),
      timestamp: new Date(),
      verified: true,
    };
    
    paymentRecords.set(txId.toString(), paymentRecord);
    
    return {
      verified: true,
      status: "SUCCESS",
      transactionId: txId.toString(),
      paymentRecord,
    };
  } catch (error) {
    console.error("Payment verification failed:", error);
    return {
      verified: false,
      status: "ERROR",
      reason: error.message,
    };
  }
}

// Function to create a topic for a user with HIP-991 custom fees
async function createUserTopic(userClient, userAccountId) {
  try {
    console.log(`Creating fee-gated topic for account ${userAccountId}`);
    
    // Server credentials already initialized at the top of the file
    console.log(`Server account: ${serverAccountId.toString()}`);
    console.log(`User account: ${userAccountId}`);
    
    // Create a fixed fee - 0.5 HBAR per message
    const customFee = new CustomFixedFee()
      .setHbarAmount(new Hbar(0.5))
      .setFeeCollectorAccountId(serverAccountId);
    
    console.log("Custom fee created with 0.5 HBAR per message");
      
    // Create a topic following the exact same approach as hip991-test.js
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(`HIP-991 Topic for user ${userAccountId}`)
      .setMaxTransactionFee(new Hbar(50))
      .setAdminKey(serverKey.publicKey)
      .setSubmitKey(userClient.operatorPublicKey) // Allow the user to submit messages
      .setCustomFees([customFee])
      .setFeeScheduleKey(serverKey.publicKey);
    
    console.log("Topic transaction prepared, executing...");
    // Server creates the topic (user doesn't pay for topic creation)
    const submitTx = await topicCreateTx.execute(serverClient);
    console.log("Topic transaction submitted");
    
    // Get the receipt
    const receipt = await submitTx.getReceipt(serverClient);
    const topicId = receipt.topicId;
    
    console.log(`Created HIP-991 fee-gated topic ${topicId} for user ${userAccountId} with 0.5 HBAR fee`);
    userTopics.set(userAccountId, topicId.toString());
    return topicId;
  } catch (error) {
    console.error("Error creating topic:", error);
    throw error;
  }
}

// Function to subscribe to a user's topic and process messages
function subscribeToUserTopic(topicId, userAccountId) {
  // Server subscribes to all topics to process messages
  // Using already initialized server client
  console.log(`Subscribing to topic ${topicId} for user ${userAccountId}`);
  
  // Track the last message sequence number to avoid processing duplicates
  let lastProcessedSequence = 0;
  // Keep track of messages sent by the server to avoid responding to our own messages
  const serverSentMessages = new Set();
  
  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(serverClient, async (message) => {
      // Skip if we've already processed this message
      if (message.sequenceNumber <= lastProcessedSequence) {
        return;
      }
      
      lastProcessedSequence = message.sequenceNumber;
      const userMessage = Buffer.from(message.contents, "utf8").toString();
      
      // Check if this is a message we sent previously
      if (serverSentMessages.has(userMessage)) {
        console.log(`Ignoring echo of our own message: "${userMessage.substring(0, 50)}..."`);
        return;
      }
      
      console.log(`Received from ${userAccountId}: ${userMessage}`);

      // Generate AI response using OpenAI
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }],
      });

      const reply = aiResponse.choices[0].message.content;
      console.log(`AI response to ${userAccountId}: ${reply}`);

      // Add this message to our sent messages to avoid processing it again
      serverSentMessages.add(reply);
      
      // Limit the size of our tracking set to prevent memory leaks
      if (serverSentMessages.size > 100) {
        const iterator = serverSentMessages.values();
        serverSentMessages.delete(iterator.next().value);
      }

      // Send AI response back to the user's topic
      // The server is exempted from fees on this topic
      await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(reply)
        .setMaxTransactionFee(new Hbar(1))
        .execute(serverClient);
    });
}

// API Endpoints
app.post("/api/message", async (req, res) => {
  try {
    const accountId = req.headers["x-accountid"];
    const privateKey = req.headers["x-privatekey"];
    const keyType = req.headers["x-keytype"] || "ED25519";
    const { message } = req.body;
    
    console.log(`Received message request from account ${accountId} using key type ${keyType}`);
    
    if (!accountId || !privateKey) {
      return res.status(400).json({ 
        error: "Missing required headers: x-accountid, x-privatekey" 
      });
    }
    
    if (!message) {
      return res.status(400).json({ 
        error: "Message is required in request body" 
      });
    }
    
    const userClient = createUserClient(
      accountId, 
      privateKey, 
      keyType
    );
    
    // Check if user has a topic, if not create one automatically
    let topicId = userTopics.get(accountId);
    let topicCreated = false;
    
    if (!topicId) {
      console.log(`No topic found for user ${accountId}, creating one automatically`);
      topicId = await createUserTopic(userClient, accountId);
      
      // Add delay to allow topic creation to propagate
      console.log("Waiting for topic to be available on the network...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      subscribeToUserTopic(topicId, accountId);
      topicCreated = true;
    }
    
    // Submit message to user's topic - the HIP-991 custom fee is automatically applied
    const messageTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .setMaxTransactionFee(new Hbar(50));
    
    console.log(`Executing message submission to topic ${topicId} with max fee of 50 HBAR...`);
    
    // Send message with user's client - the user pays both the network fee AND the HIP-991 custom fee
    const submitTx = await messageTx.execute(userClient);
    console.log("Waiting for receipt...");
    const receipt = await submitTx.getReceipt(userClient);
    
    console.log(`Message sent successfully with status: ${receipt.status.toString()}`);
    
    // Verify the message submission transaction (now includes the custom fee)
    const paymentVerification = await verifyPayment(
      userClient,
      accountId,
      messageTx.transactionId,
      new Hbar(0.5) // Track that the 0.5 HBAR custom fee was collected
    );
    
    res.status(200).json({ 
      success: true, 
      status: receipt.status.toString(),
      paymentVerification,
      message: "Message sent successfully",
      feesPaid: {
        customFee: "0.5 HBAR",
        recipient: process.env.HEDERA_ACCOUNT_ID
      },
      topicCreated: topicCreated,
      topicId: topicId.toString()
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ 
      error: error.message || "Failed to send message"
    });
  }
});

// Endpoint to get payment verification for a specific transaction
app.get("/api/payment/:transactionId", (req, res) => {
  const { transactionId } = req.params;
  const paymentRecord = paymentRecords.get(transactionId);
  
  if (!paymentRecord) {
    return res.status(404).json({
      error: "Payment record not found"
    });
  }
  
  res.status(200).json(paymentRecord);
});

// Endpoint to get all payment records for an account
app.get("/api/payments/:accountId", (req, res) => {
  const { accountId } = req.params;
  
  // Get all payment records for this user
  const userPayments = Array.from(paymentRecords.values())
    .filter(record => record.accountId === accountId);
  
  res.status(200).json({
    accountId,
    payments: userPayments
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HCS API server running on port ${PORT}`);
}); 