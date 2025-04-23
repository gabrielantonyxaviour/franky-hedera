# Hedera Consensus Service (HCS) API with HIP-991 Fee Collection

This API allows users to create topics and send messages on the Hedera Consensus Service (HCS) where the users pay for transactions using their own account credentials. The system implements HIP-991 for direct fee collection on topic message submission.

## How HIP-991 Fee Collection Works

### Integrated Fee Collection

1. Users must provide their own Hedera account credentials (account ID, private key, and key type) in the HTTP headers
2. All transactions are signed and paid for by the user's account
3. Using HIP-991, users pay a **0.5 HBAR fee per message directly to the operator account**
4. The fee is automatically collected as part of the message submission transaction
5. Payment records are stored for verification and auditing purposes

### Seamless User Experience

1. **Automatic Topic Creation** - Topics are created automatically when a user sends their first message
2. **Single API Call** - Users only need to call the `/api/message` endpoint to use the service
3. **No Manual Setup** - No separate topic creation step or payment transaction is required

### HIP-991 Implementation

The system implements the HIP-991 standard which allows for paid message submission on topics:

1. **Custom Fee on Topics** - Each topic is created with a custom fee of 0.5 HBAR per message
2. **Direct Collection** - Fees are collected directly during message submission
3. **Integrated Payment** - No separate transaction required for fee payment
4. **Server Admin Key** - The server holds the admin key to the topic, allowing it to update fees if needed
5. **Fee Verification** - The system verifies that payments were successful as part of message submission

This implementation is cleaner and more efficient than the previous two-step process, as it handles the fee collection directly within the HCS message submission.

### Payment Verification

The system verifies payments by:
1. Checking transaction receipts to confirm transactions were successful
2. Storing payment records with transaction IDs, timestamps, and account IDs
3. Providing endpoints to query payment history and verification

## Message Handling and Loop Prevention

The system implements safeguards to prevent infinite message loops:

1. **Message Tracking**: The server keeps track of messages it has sent to avoid responding to its own messages
2. **Sequence Numbers**: Each message has a unique sequence number, which the server uses to avoid processing the same message twice
3. **Memory Management**: The system limits the number of tracked messages to prevent memory leaks

This ensures that the server only responds to genuine user messages, not to its own replies or duplicated messages.

## API Endpoints

### Create a Topic

```
POST /api/topic
```

**Headers:**
- `x-accountid`: User's Hedera account ID
- `x-privatekey`: User's Hedera private key
- `x-keytype`: Key type (ED25519 or ECDSA)

**Response:**
```json
{
  "success": true,
  "topicId": "0.0.1234567",
  "message": "Topic created and ready for messages"
}
```

### Send a Message

```
POST /api/message
```

**Headers:**
- `x-accountid`: User's Hedera account ID
- `x-privatekey`: User's Hedera private key
- `x-keytype`: Key type (ED25519 or ECDSA)

**Body:**
```json
{
  "message": "Your message content"
}
```

**Response:**
```json
{
  "success": true,
  "status": "SUCCESS",
  "paymentVerification": {
    "verified": true,
    "status": "SUCCESS",
    "transactionId": "0.0.12345@1234567890.123456789",
    "paymentRecord": {
      "transactionId": "0.0.12345@1234567890.123456789",
      "accountId": "0.0.12345",
      "amount": "0.5 ℏ",
      "timestamp": "2023-04-20T17:10:02.314Z",
      "verified": true
    }
  },
  "message": "Message sent successfully",
  "feesPaid": {
    "customFee": "0.5 HBAR",
    "recipient": "0.0.5616430"
  },
  "topicCreated": false,
  "topicId": "0.0.1234567"
}
```

### Get Payment History for an Account

```
GET /api/payments/:accountId
```

**Response:**
```json
{
  "accountId": "0.0.12345",
  "payments": [
    {
      "transactionId": "0.0.12345@1234567890.123456789",
      "accountId": "0.0.12345",
      "amount": "0.5 ℏ",
      "timestamp": "2023-04-20T17:09:54.423Z",
      "verified": true
    }
  ]
}
```

### Get Payment Verification for a Transaction

```
GET /api/payment/:transactionId
```

**Response:**
```json
{
  "transactionId": "0.0.12345@1234567890.123456789",
  "accountId": "0.0.12345",
  "amount": "0.5 ℏ",
  "timestamp": "2023-04-20T17:09:54.423Z",
  "verified": true
}
```

## Running the Application

### Server

```bash
node hcs-api.js
```

### Client Example

```bash
node client-example.js
```

## Technical Details

### HIP-991 Topic Creation

When a topic is created:

1. It is assigned a custom fee of 0.5 HBAR per message
2. The server account is set as the admin key holder
3. The user's account is set with submit permissions
4. The fee is collected automatically with each message submission
5. No separate payment transaction is needed

### HIP-991 Message Submission

When a user submits a message:

1. They specify a maximum custom fee they're willing to pay (usually higher than the actual fee)
2. The fee is automatically collected and sent to the topic's fee collector account (the server)
3. The message is only submitted if the fee payment is successful
4. No separate fee transaction is needed

### Payment Records

Payment records include:
- Transaction ID
- Account ID
- Amount (the custom fee amount)
- Timestamp
- Verification status

## Implementation Notes

1. The server itself uses its own credentials to listen to topics and generate AI responses
2. Users pay for creating topics and sending messages, including both network fees and custom fees
3. The server pays for sending AI responses back to the user
4. All transaction fees are capped using `setMaxTransactionFee()` to prevent unexpected costs 