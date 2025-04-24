# Server Wallet Integration for Franky Agent Framework

This document explains the server wallet integration in the Franky Agent Framework. The implementation allows API calls to the character-mcp-api to be authenticated with a server wallet.

## Overview

The server wallet integration enables:

1. Secure storage of private keys by encrypting them with Lit Protocol
2. Accessing server wallets by providing an account ID in the request headers
3. Decrypting the private key based on smart contract access controls
4. Using the decrypted private key for blockchain operations

## How It Works

The system uses the following flow:

1. A client sends a request with the `account-id` header
2. The server retrieves the encrypted wallet data from the blockchain
3. The server uses Lit Protocol to decrypt the private key
4. The server uses the decrypted private key for blockchain operations
5. The response is sent back to the client

## API Endpoints

All API endpoints that require blockchain operations now expect the `account-id` header.

### Chat Endpoint

```
POST /chat
Header: account-id: <Hedera account ID>
Body: { "message": "Your message here" }
```

This endpoint:
1. Retrieves the server wallet using the account ID
2. Decrypts the server wallet's private key
3. Processes the message using the decrypted wallet
4. Returns the response

### Character Selection Endpoint

```
POST /character
Header: account-id: <Hedera account ID>
Body: { "characterId": "uuid-of-character" } or { "characterName": "name-of-character" }
```

This endpoint:
1. Verifies the server wallet exists and is accessible
2. Loads the requested character
3. Returns character information

### Wallet Status Endpoint

```
GET /wallet-status
Header: account-id: <Hedera account ID>
```

This endpoint:
1. Retrieves the server wallet information
2. Returns the wallet status (configured, address, etc.)
3. Doesn't attempt to decrypt the private key

## Setup

To use the server wallet integration:

1. Copy `.env.example` to `.env` and set the required environment variables
2. Ensure `TEMP_AUTH_PRIVATE_KEY` is set (temporary auth wallet for Lit Protocol)
3. Start the server with `npm start`

## Security Considerations

- The `TEMP_AUTH_PRIVATE_KEY` is used for authentication with Lit Protocol and should be kept secure
- In a production environment, this key should be managed through a secure key management system
- Decrypted private keys are only held in memory and never stored on disk
- All API endpoints must be served over HTTPS in production
- Access control is enforced by the smart contract through Lit Protocol conditions

## Testing

To test the integration:

1. Ensure you have a server wallet configured in the Franky contract
2. Use cURL or Postman to make requests with the `account-id` header
3. Check the logs for decryption status and errors

Example:

```bash
curl -X GET http://localhost:8080/wallet-status \
  -H "account-id: 0.0.your_account_id"
```

## Troubleshooting

Common issues:

- **401 Error**: The server wallet could not be decrypted, check the auth key
- **404 Error**: No server wallet configured for the provided account ID
- **500 Error**: Unexpected error in the decryption process, check the logs 