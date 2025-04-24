// Import dependencies
const { 
  Client,
  PrivateKey,
  AccountId,
  TopicId,
  TopicMessageQuery,
  TopicMessageSubmitTransaction
} = require("@hashgraph/sdk");

// Use hardcoded credentials
const accountId = AccountId.fromString("0.0.5616430");
const privateKey = PrivateKey.fromStringECDSA("f22ee3d62bfc11b720a635d8d09c9a1c974e08a5f9bd875a6058ddfbe62415bf");

// Create a client for the Hedera testnet
const client = Client.forTestnet();
client.setOperator(accountId, privateKey);

// Topic ID to get messages from
const topicId = TopicId.fromString("0.0.5882994");

async function submitMessage() {
  try {
    console.log("Sending a test message to topic:", topicId.toString());
    
    // Create the transaction
    const sendResponse = await new TopicMessageSubmitTransaction({
      topicId: topicId,
      message: `Test message from Franky app at ${new Date().toISOString()}`,
    })
    .execute(client);
    
    // Get the receipt
    const receipt = await sendResponse.getReceipt(client);
    
    console.log("Message sent successfully!", receipt);
    console.log("Status:", receipt.status.toString());
    console.log("Topic sequence number:", receipt.topicSequenceNumber.toString());
    
    // Briefly query for messages
    console.log("\nGetting recent messages from topic...");
    
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - 1); // Get messages from the last minute
    
    let count = 0;
    
    const query = new TopicMessageQuery()
      .setTopicId(topicId)
      .setStartTime(startTime)
      .setLimit(5)
      .subscribe(
        client,
        (message) => {
          count++;
          const messageContent = Buffer.from(message.contents).toString();
          const consensusTimestamp = message.consensusTimestamp.toDate();
          
          console.log(`\nMessage #${count}:`);
          console.log(`- Content: ${messageContent}`);
          console.log(`- Sequence Number: ${message.sequenceNumber}`);
          console.log(`- Timestamp: ${consensusTimestamp.toISOString()}`);
          
          if (count >= 5) {
            console.log("\nDone fetching messages. Check the backend logs for more messages.");
            process.exit(0);
          }
        }
      );
    
    // Set a timeout to exit if no messages are found
    setTimeout(() => {
      console.log("No recent messages found in the topic. Try again later.");
      process.exit(0);
    }, 5000);
    
    return {
      status: "success",
      message: "Message sent and subscription started"
    };
    
  } catch (error) {
    console.error("Error:", error.message);
    return {
      status: "error",
      message: error.message
    };
  }
}

// Execute the function and print the result
submitMessage()
  .then(result => console.log("Operation completed:", result))
  .catch(error => console.error("Error in operation:", error.message));
