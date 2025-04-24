# HIP-991 Agent Implementation for Franky

This document explains the HIP-991 agent implementation in the Franky Agent Framework, which allows for monetized interactions with character agents using Hedera's HIP-991 specification.

## Overview

The HIP-991 agent implementation combines:

1. **Server wallet decryption** - Secure retrieval of private keys
2. **Monetized topics** - Collection of fees when users interact with agents
3. **Character-based agents** - Unique AI personas for conversation
4. **Asynchronous messaging** - Topic-based communication

## Architecture

### Topic Structure

For each user-character pair, the system creates:

1. **Inbound Topic** (Monetized HIP-991)
   - User posts messages here
   - User pays a 0.5 HBAR fee per message
   - Server collects fees
   - Only the user can post messages

2. **Outbound Topic** (Standard)
   - Server posts responses here
   - No fees for reading messages
   - Only the server can post messages

### Message Format

Messages have standardized formats:

#### Inbound Message (User → Agent)
```json
{
  "id": "uuid-of-message",
  "prompt": "Hello, how are you?",
  "response_id": "pre-defined-uuid-for-response",
  "timestamp": 1621234567890
}
```

#### Outbound Message (Agent → User)
```json
{
  "id": "pre-defined-uuid-for-response",
  "response": "I'm doing well! How can I help you today?",
  "prompt_id": "uuid-of-original-message",
  "timestamp": 1621234567890
}
```

## API Endpoints

### Initialize Agent with Character
```
POST /initialize
Header: account-id: <Hedera account ID>
Body: { "characterId": "uuid-of-character" }
```
- Decrypts the user's server wallet
- Creates inbound (HIP-991) and outbound topics
- Sets up message subscriptions
- Returns topic IDs for future communication

### Send Message
```
POST /chat
Header: account-id: <Hedera account ID>
Body: { "message": "Your message here" }
```
- Verifies agent is initialized
- Sends message to inbound topic (paying fee)
- Returns message ID and response ID
- Response is processed asynchronously

### View Response
```
GET /viewresponse/:messageId
Header: account-id: <Hedera account ID>
```
- Retrieves a specific message from cache
- Used to get the agent's response once processed

### Cleanup Agent
```
POST /destruct
Header: account-id: <Hedera account ID>
```
- Destroys the agent instance
- Cleans up resources

### Wallet Status
```
GET /wallet-status
Header: account-id: <Hedera account ID>
```
- Checks if server wallet is configured
- Shows agent status if active

## Implementation Details

### Key Components

1. **HIP-991 Topic Creation**
   - Uses `CustomFixedFee` to set a 0.5 HBAR fee per message
   - Sets appropriate submit and admin keys
   - Server creates both topics

2. **Message Handling**
   - Server subscribes to all inbound topics
   - Messages are cached in memory
   - Response IDs are pre-generated for easy matching

3. **User Authentication**
   - User's private key is retrieved via server wallet decryption
   - Each user gets their own dedicated topics
   - Only the user can send messages to their inbound topic

## Security Considerations

- Private keys are decrypted only when needed
- Topics have proper key controls for access
- Server wallet decryption adds additional security layer
- Only registered devices can access server wallets

## Message Flow

1. **Initialization**
   - User requests agent with specific character
   - System creates 2 topics (inbound/outbound)
   - Server starts listening on inbound topic

2. **Sending Message**
   - User sends message with pre-generated response ID
   - Message includes user's input and metadata
   - User pays 0.5 HBAR fee per message

3. **Processing Response**
   - Server processes messages from inbound topic
   - Character-based response is generated
   - Response is sent to outbound topic
   - Response is cached for future retrieval

4. **Retrieving Response**
   - User fetches specific message by ID
   - System returns cached response

## Testing

For testing, you can:

1. Initialize an agent with a character: `/initialize`
2. Send a message: `/chat`
3. Get the response: `/viewresponse/:messageId`
4. Clean up when done: `/destruct`

All endpoints require the `account-id` header for authentication.

## Troubleshooting

Common issues:

- Missing `account-id` header
- No initialized agent
- Decryption failures
- Response timeout

Check logs for detailed error messages and ensure your server wallet is properly configured in the Franky contract. 