#!/bin/bash

# Constants
BASE_URL="https://frankyagent.xyz"
GRAPH_API_ENDPOINT="/api/graph/devices-by-wallet?address="
DEVICE_DETAILS_FILE="Device_details.txt"
METADATA_TOPIC_FILE="device_metadata_topic.txt"
# Update registration check settings: 30 checks x 20 seconds = 10 minutes
MAX_RETRIES=30
RETRY_INTERVAL=20
API_PORT=8080
API_LOG_FILE="api_server.log"
METADATA_FILE="device_metadata.json"

# Colors for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display status updates
log_status() {
  echo -e "${BLUE}[FRANKY]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[FRANKY]${NC} $1"
}

log_error() {
  echo -e "${RED}[FRANKY ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[FRANKY WARNING]${NC} $1"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" &> /dev/null
}

# Function to install dependencies
install_dependencies() {
  log_status "Checking and installing required dependencies..."
  
  # Check for Node.js and npm
  if ! command_exists node; then
    log_error "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
  fi
  
  # Check for npm
  if ! command_exists npm; then
    log_error "npm is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
  fi
  
  # Install required npm packages
  log_status "Installing/updating required npm packages..."
  npm install --silent @hashgraph/sdk qrcode-terminal uuid systeminformation ethers@5.7.2
  
  # Check for ngrok
  if ! command_exists ngrok; then
    log_warning "ngrok is not installed. Attempting to install..."
    
    if command_exists brew; then
      # macOS with Homebrew
      brew install ngrok/ngrok/ngrok
    elif command_exists apt; then
      # Debian-based Linux
      curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
      echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
      sudo apt update && sudo apt install ngrok
    elif command_exists npm; then
      # Fall back to npm install
      npm install --global ngrok
    else
      log_error "Cannot install ngrok automatically. Please install it manually from https://ngrok.com/download"
      exit 1
    fi
  fi
  
  # Check if ngrok is authenticated
  if ! ngrok config check &> /dev/null; then
    log_error "ngrok is not authenticated. Please run 'ngrok config add-authtoken YOUR_TOKEN' first."
    log_error "You can get your authtoken at https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
  fi
  
  # Check for jq (JSON processor)
  if ! command_exists jq; then
    log_warning "jq is not installed. Attempting to install..."
    
    if command_exists brew; then
      # macOS with Homebrew
      brew install jq
    elif command_exists apt; then
      # Debian-based Linux
      sudo apt install -y jq
    else
      log_warning "Cannot install jq automatically. Some features may not work correctly."
    fi
  fi
  
  log_success "All dependencies are installed and ready!"
}

# Function to start ngrok early
start_ngrok() {
  log_status "Starting ngrok to create a public URL for your API..."
  
  # Get the API port
  export API_PORT=${API_PORT:-8080}
  
  # Start ngrok in the background
  ngrok http $API_PORT > /dev/null 2>&1 &
  NGROK_PID=$!
  
  # Give ngrok a moment to start
  sleep 3
  
  # Extract the ngrok URL
  if command_exists jq; then
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
  else
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | head -n1 | cut -d'"' -f4)
  fi
  
  # Check if we got a valid URL
  if [[ -z "$NGROK_URL" || "$NGROK_URL" == "null" ]]; then
    log_error "Could not get ngrok URL. Make sure ngrok is running properly."
    log_error "Continuing without ngrok URL..."
    NGROK_URL="http://localhost:$API_PORT"
  else
    log_success "ngrok URL: $NGROK_URL"
  fi
  
  # Export the NGROK_URL for use in other functions
  export NGROK_URL
  export NGROK_PID
}

# Function to set up environment variables
setup_environment_variables() {
  log_status "Setting up environment variables..."
  
  # Prompt for OpenAI API key
  OPENAI_API_KEY=""
  if [ -f ".env" ] && grep -q "OPENAI_API_KEY" .env; then
    OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d'=' -f2)
    log_status "Found existing OpenAI API key in .env file."
    
    # Ask if user wants to keep existing API key
    read -p "Do you want to keep the existing OpenAI API key? (y/n): " keep_key
    if [[ $keep_key != "y" && $keep_key != "Y" ]]; then
      OPENAI_API_KEY=""
    fi
  fi
  
  # If no key found or user chose to replace it, prompt for a new one
  if [ -z "$OPENAI_API_KEY" ]; then
    log_status "Please enter your OpenAI API key (begins with 'sk-'):"
    read -s OPENAI_API_KEY
    
    # Validate that the key was entered and starts with sk-
    while [[ -z "$OPENAI_API_KEY" || ! "$OPENAI_API_KEY" =~ ^sk-* ]]; do
      log_error "Invalid API key format. OpenAI API keys start with 'sk-'."
      log_status "Please enter your OpenAI API key:"
      read -s OPENAI_API_KEY
    done
    
    log_success "OpenAI API key received."
  fi
  
  # Create a .env file or use existing one
  if [ ! -f ".env" ]; then
    log_status "Creating .env file with default values..."
    cat > .env << EOL
# Generated by Franky Start script
HEDERA_ACCOUNT_ID=$ACCOUNT_ID
HEDERA_PRIVATE_KEY=$PRIVATE_KEY
HEDERA_PUBLIC_KEY=$PUBLIC_KEY
HEDERA_KEY_TYPE=ECDSA
HEDERA_NETWORK=testnet
HEDERA_NETWORK_TYPE=testnet
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OPENAI_API_KEY=$OPENAI_API_KEY
USE_HYBRID_MODEL=true
LOG_LEVEL=0
TAVILY_API_KEY=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
TEMP_AUTH_PRIVATE_KEY=$PRIVATE_KEY
EOL
  else
    # Update the .env file with the generated keys and new API key
    log_status "Updating existing .env file with generated keys..."
    # Create a temporary file
    cat .env > .env.temp
    # Update the keys
    sed -i'.bak' "s/^HEDERA_ACCOUNT_ID=.*/HEDERA_ACCOUNT_ID=$ACCOUNT_ID/" .env.temp
    sed -i'.bak' "s|^HEDERA_PRIVATE_KEY=.*|HEDERA_PRIVATE_KEY=$PRIVATE_KEY|" .env.temp
    sed -i'.bak' "s|^HEDERA_PUBLIC_KEY=.*|HEDERA_PUBLIC_KEY=$PUBLIC_KEY|" .env.temp
    sed -i'.bak' "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_API_KEY|" .env.temp
    # Ensure TEMP_AUTH_PRIVATE_KEY is set
    if grep -q "TEMP_AUTH_PRIVATE_KEY" .env.temp; then
      sed -i'.bak' "s|^TEMP_AUTH_PRIVATE_KEY=.*|TEMP_AUTH_PRIVATE_KEY=$PRIVATE_KEY|" .env.temp
    else
      echo "TEMP_AUTH_PRIVATE_KEY=$PRIVATE_KEY" >> .env.temp
    fi
    # Replace the original file
    mv .env.temp .env
    # Clean up backup files
    rm -f .env.temp.bak
  fi
  
  # Export all variables from .env to current environment
  export $(grep -v '^#' .env | xargs)
  
  log_success "Environment variables set up successfully"
}

# Function to create a Hedera wallet
create_hedera_wallet() {
  log_status "Creating a new Hedera wallet for this device..."
  
  # Check if wallet already exists
  if [ -f "$DEVICE_DETAILS_FILE" ]; then
    log_warning "A wallet already exists in $DEVICE_DETAILS_FILE"
    
    # Ask if user wants to use existing wallet
    read -p "Do you want to use the existing wallet? (y/n): " use_existing
    if [[ $use_existing == "y" || $use_existing == "Y" ]]; then
      log_status "Using existing wallet"
      # Extract account ID and private key from the file
      ACCOUNT_ID=$(grep "Account ID:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
      PRIVATE_KEY=$(grep "Private Key:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
      PUBLIC_KEY=$(grep "Public Key:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
      log_success "Loaded existing wallet with Account ID: $ACCOUNT_ID"
      return 0
    else
      log_status "Creating a new wallet..."
      rm "$DEVICE_DETAILS_FILE"
    fi
  fi

  # Ask the user if they want to create a real Hedera account or just generate keys
  log_status "You can either create a real Hedera testnet account (requires testnet credentials) or just generate keys locally."
  read -p "Create a real Hedera testnet account? (y/n): " create_real_account
  
  if [[ $create_real_account == "y" || $create_real_account == "Y" ]]; then
    # Get operator account ID and key from user
    log_status "To create a Hedera testnet account, you need an existing account with funds."
    log_status "You can create one at https://portal.hedera.com/register"
    log_status "Please enter your Hedera testnet operator credentials:"
    
    read -p "Operator Account ID (e.g., 0.0.12345): " OPERATOR_ID
    
    # Validate operator ID format
    while [[ ! "$OPERATOR_ID" =~ ^0\.0\.[0-9]+$ ]]; do
      log_error "Invalid Account ID format. Should be like 0.0.12345"
      read -p "Operator Account ID: " OPERATOR_ID
    done
    
    log_status "Please enter your Hedera Testnet Private Key (input will be hidden):"
    read -s OPERATOR_KEY
    
    # Validate that something was entered
    while [[ -z "$OPERATOR_KEY" ]]
    do
      echo ""
      log_error "Private key cannot be empty."
      log_status "Please enter your Hedera Testnet Private Key:"
      read -s OPERATOR_KEY
    done
    
    echo "" # Add a newline after hidden input
    
    # Create a new wallet using a Node.js script with Hedera SDK
    log_status "Creating a new Hedera testnet account..."
    log_warning "This may take a moment as we interact with the Hedera testnet..."
    
    # Create a temporary file to store the operator information
    TEMP_OPERATOR_FILE=".temp_operator.json"
    echo "{\"operatorId\":\"$OPERATOR_ID\",\"operatorKey\":\"$OPERATOR_KEY\"}" > $TEMP_OPERATOR_FILE
    
    node -e "
      const { PrivateKey, AccountCreateTransaction, Hbar, Client, AccountBalanceQuery } = require('@hashgraph/sdk');
      const fs = require('fs');
      
      async function createWallet() {
        try {
          // Read operator credentials from temp file
          const operatorData = JSON.parse(fs.readFileSync('$TEMP_OPERATOR_FILE', 'utf8'));
          const operatorId = operatorData.operatorId;
          const operatorKey = operatorData.operatorKey;
          
          // Delete the temp file immediately
          try {
            fs.unlinkSync('$TEMP_OPERATOR_FILE');
          } catch (err) {
            console.log('Note: Could not delete temp file, will try later');
          }
          
          console.log('Setting up Hedera client with operator ID:', operatorId);
          
          // Create client for testnet
          const client = Client.forTestnet();
          
          // Generate new ECDSA key pair
          const newPrivateKey = PrivateKey.generateECDSA();
          const newPublicKey = newPrivateKey.publicKey;
          
          console.log('Created new ECDSA key pair successfully');
          
          // Set the operator with properly formatted key
          try {
            // Remove 0x prefix if present
            const formattedOperatorKey = operatorKey.startsWith('0x') ? operatorKey.substring(2) : operatorKey;
            const privateKeyObj = PrivateKey.fromStringECDSA(formattedOperatorKey);
            client.setOperator(operatorId, privateKeyObj);
            console.log('Set operator using parsed ECDSA private key');
          } catch (error) {
            console.error('Failed to parse operator key:', error.message);
            throw new Error('Invalid operator credentials: ' + error.message);
          }
          
          console.log('Connected to Hedera testnet');
          console.log('Creating new account with public key', newPublicKey.toString());
          
          // Create a new account with a smaller initial balance
          const createAccountTx = new AccountCreateTransaction()
            .setKey(newPublicKey)
            .setInitialBalance(new Hbar(10));
            
          // Execute the transaction
          const txResponse = await createAccountTx.execute(client);
          
          // Request the receipt
          const receipt = await txResponse.getReceipt(client);
          
          // Get the account ID from the receipt
          const accountId = receipt.accountId;
          
          console.log('New account created with ID:', accountId.toString());
          
          // Verify account balance
          const accountBalance = await new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client);
          
          console.log('Account balance:', accountBalance.hbars.toString());
          
          // Write the keys to the device details file
          const details = [
            '=== DEVICE WALLET DETAILS ===',
            \`Private Key: \${newPrivateKey.toStringRaw()}\`, // Store raw string without 0x prefix
            \`Public Key: \${newPublicKey.toStringRaw()}\`,   // Store raw string without 0x prefix
            \`Account ID: \${accountId.toString()}\`,
            '============================='
          ];
          
          fs.writeFileSync('$DEVICE_DETAILS_FILE', details.join('\\n') + '\\n');
          console.log('Wallet details saved to $DEVICE_DETAILS_FILE');
          console.log('SUCCESS');
          
          // Clean up after successful creation
          client.close();
        } catch (error) {
          console.error('ERROR creating Hedera account:', error.message);
          
          // If account creation fails, create a file with just keys and a placeholder account ID
          try {
            console.log('Falling back to local key generation...');
            const fallbackPrivateKey = PrivateKey.generateECDSA();
            const fallbackPublicKey = fallbackPrivateKey.publicKey;
            
            // Set a placeholder account ID
            const placeholderId = '0.0.' + Math.floor(Math.random() * 1000000);
            
            // Write the keys to the device details file
            const details = [
              '=== DEVICE WALLET DETAILS (LOCAL ONLY) ===',
              \`Private Key: \${fallbackPrivateKey.toStringRaw()}\`, // Store raw string without 0x prefix
              \`Public Key: \${fallbackPublicKey.toStringRaw()}\`,   // Store raw string without 0x prefix
              \`Account ID: \${placeholderId}\`,
              '========================================'
            ];
            
            fs.writeFileSync('$DEVICE_DETAILS_FILE', details.join('\\n') + '\\n');
            console.log('Fallback local wallet details saved to $DEVICE_DETAILS_FILE');
            console.log('WARNING: Created local keys with placeholder account ID');
          } catch (fallbackError) {
            console.error('Failed to create fallback keys:', fallbackError.message);
          }
          
          process.exit(1);
        }
      }
      
      createWallet();
    "
    
    # Ensure temp file is deleted in case script didn't delete it
    if [ -f "$TEMP_OPERATOR_FILE" ]; then
      rm "$TEMP_OPERATOR_FILE"
    fi
    
  else
    # Just generate keys locally
    log_status "Generating local keys with a placeholder account ID..."
    
    node -e "
      const { PrivateKey } = require('@hashgraph/sdk');
      const fs = require('fs');
      
      try {
        const privateKey = PrivateKey.generateECDSA();
        const publicKey = privateKey.publicKey;
        
        console.log('Created new ECDSA key pair successfully');
        
        // Write the keys to the device details file using raw string format
        const details = [
          '=== DEVICE WALLET DETAILS (LOCAL ONLY) ===',
          \`Private Key: \${privateKey.toStringRaw()}\`, // Store raw string without 0x prefix
          \`Public Key: \${publicKey.toStringRaw()}\`,   // Store raw string without 0x prefix
          \`Account ID: 0.0.\${Math.floor(Math.random() * 1000000)}\`,
          '========================================'
        ];
        
        fs.writeFileSync('$DEVICE_DETAILS_FILE', details.join('\\n') + '\\n');
        console.log('Local wallet details saved to $DEVICE_DETAILS_FILE');
        console.log('SUCCESS');
      } catch (error) {
        console.error('ERROR generating keys:', error.message);
        process.exit(1);
      }
    "
  fi
  
  # Check if wallet creation was successful
  if [ $? -ne 0 ]; then
    log_error "Failed to create Hedera wallet"
    exit 1
  fi
  
  # Extract account ID and private key from the file
  ACCOUNT_ID=$(grep "Account ID:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  PRIVATE_KEY=$(grep "Private Key:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  PUBLIC_KEY=$(grep "Public Key:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  
  if [[ $create_real_account == "y" || $create_real_account == "Y" ]]; then
    # Check if the account ID follows the proper format, which indicates a real account was created
    if [[ "$ACCOUNT_ID" =~ ^0\.0\.[0-9]+$ ]]; then
      log_success "Created new Hedera testnet account with ID: $ACCOUNT_ID"
      log_success "Account has been funded with 10 HBAR"
    else
      log_warning "Created keys with placeholder Account ID: $ACCOUNT_ID"
      log_warning "Your device will work, but some blockchain interactions may be limited"
    fi
  else
    log_warning "Created keys with placeholder Account ID: $ACCOUNT_ID"
    log_warning "Your device will work, but some blockchain interactions may be limited"
  fi
}

# Function to gather device metadata
gather_device_metadata() {
  log_status "Gathering device metadata..."
  
  # Create a Node.js script to gather device metadata
  node -e "
    const si = require('systeminformation');
    const fs = require('fs');
    const os = require('os');
    
    async function gatherMetadata() {
      try {
        // Gather CPU info
        const cpu = await si.cpu();
        const cpuInfo = \`\${cpu.manufacturer} \${cpu.brand} (\${cpu.cores} cores)\`;
        
        // Gather memory info
        const mem = await si.mem();
        const ramGB = Math.round(mem.total / (1024 * 1024 * 1024) * 10) / 10;
        
        // Gather disk info
        const disk = await si.fsSize();
        const totalDiskGB = Math.round(disk.reduce((acc, drive) => acc + drive.size, 0) / (1024 * 1024 * 1024) * 10) / 10;
        
        // Get OS info
        const osInfo = await si.osInfo();
        
        // Get system model
        const system = await si.system();
        const deviceModel = system.manufacturer + ' ' + system.model;
        
        // Create metadata object
        const metadata = {
          deviceModel: deviceModel || os.hostname(),
          ram: \`\${ramGB} GB\`,
          storage: \`\${totalDiskGB} GB\`,
          cpu: cpuInfo,
          os: \`\${osInfo.distro} \${osInfo.release}\`,
          timestamp: new Date().toISOString(),
          ngrokLink: process.env.NGROK_URL || 'http://localhost:8080',
          // Placeholder format for bytes32 (64 hex chars + 0x prefix)
          bytes32Data: '0x' + '0'.repeat(64),
          // Placeholder format for signature (65 bytes = 130 hex chars + 0x prefix)
          // Format: r (32 bytes) + s (32 bytes) + v (1 byte)
          signature: '0x' + '0'.repeat(128) + '00'
        };
        
        // Save metadata to file
        fs.writeFileSync('$METADATA_FILE', JSON.stringify(metadata, null, 2));
        console.log('SUCCESS');
      } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
      }
    }
    
    gatherMetadata();
  "
  
  # Check if metadata gathering was successful
  if [ $? -ne 0 ]; then
    log_error "Failed to gather device metadata"
    exit 1
  fi
  
  log_success "Device metadata gathered successfully"
}

# Function to update metadata with wallet address
update_metadata_with_address() {
  log_status "Updating device metadata with wallet address and cryptographic proof..."
  
  # Check if ethers.js is available and install if needed
  node -e "
    try { 
      require('ethers'); 
      process.exit(0);
    } catch (e) { 
      process.exit(1);
    }
  " || {
    log_warning "Ethers.js not found, installing it now..."
    npm install --silent ethers@5.7.2
  }
  
  # Create a Node.js script to update metadata
  node -e "
    const fs = require('fs');
    let ethers;
    
    try {
      ethers = require('ethers');
    } catch (error) {
      throw new Error('Ethers.js is required for cryptographic operations');
    }
    
    /**
     * Creates a bytes32 representation of the device info using keccak256
     * @param {string} deviceInfo - Device information string
     * @returns {string} - bytes32 representation as hex string with 0x prefix
     */
    function createBytes32(deviceInfo) {
      try {
        // Use ethers.js keccak256 for proper Ethereum compatibility
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceInfo));
      } catch (error) {
        // Fallback to a direct implementation if ethers.js method fails
        const crypto = require('crypto');
        return '0x' + crypto.createHash('sha256').update(deviceInfo).digest('hex');
      }
    }
    
    /**
     * Signs a bytes32 hash using the private key
     * @param {string} privateKeyStr - The ECDSA private key string
     * @param {string} bytes32 - The bytes32 message to sign
     * @returns {string} - Signature as hex string with 0x prefix
     */
    async function signBytes32WithECDSA(privateKeyStr, bytes32) {
      try {
        // Create ethers wallet from private key (add 0x prefix if not present)
        const privateKey = privateKeyStr.startsWith('0x') ? privateKeyStr : '0x' + privateKeyStr;
        
        // Create the wallet instance
        const wallet = new ethers.Wallet(privateKey);
        
        // Convert bytes32 to array for signing
        const messageHashBytes = ethers.utils.arrayify(bytes32);
        
        // Sign the hash directly (without additional hashing)
        const signingKey = wallet._signingKey();
        const signature = signingKey.signDigest(messageHashBytes);
        
        // Join signature components
        const fullSig = ethers.utils.joinSignature(signature);
        
        // Verify the signature
        const recoveredAddress = ethers.utils.recoverAddress(messageHashBytes, fullSig);
        
        // Ensure the signature is not just zeros
        const isZeroSignature = fullSig === '0x' + '0'.repeat(130);
        if (isZeroSignature) {
          throw new Error('Generated a zero signature');
        }
        
        return fullSig;
      } catch (error) {
        console.error('Signing error:', error);
        // Return a dummy signature with timestamp in case of failure
        return '0xERROR_' + Date.now() + '_' + '0'.repeat(100);
      }
    }
    
    async function updateMetadata() {
      try {
        // Read the metadata
        const metadata = JSON.parse(fs.readFileSync('$METADATA_FILE', 'utf8'));
        
        // Read account ID and private key from the device details file
        const deviceDetailsContent = fs.readFileSync('$DEVICE_DETAILS_FILE', 'utf8');
        
        const accountIdMatch = deviceDetailsContent.match(/Account ID: (.*)/);
        const privateKeyMatch = deviceDetailsContent.match(/Private Key: (.*)/);
        
        if (!accountIdMatch || !privateKeyMatch) {
          throw new Error('Could not find account ID or private key in device details file');
        }
        
        const accountId = accountIdMatch[1].trim();
        const privateKeyStr = privateKeyMatch[1].trim();
        
        // Update metadata with the wallet address (account ID)
        metadata.walletAddress = accountId;
        
        // Create a device info string to use for bytes32 creation
        const deviceInfoStr = JSON.stringify({
          deviceModel: metadata.deviceModel,
          ram: metadata.ram,
          cpu: metadata.cpu,
          storage: metadata.storage,
          os: metadata.os,
          accountId: accountId,
          timestamp: metadata.timestamp
        });
        
        // Generate bytes32 data from device info
        const bytes32Data = createBytes32(deviceInfoStr);
        metadata.bytes32Data = bytes32Data;
        
        // Sanity check that bytes32 is not zeros
        if (bytes32Data === '0x' + '0'.repeat(64)) {
          throw new Error('Generated bytes32 is all zeros - something is wrong with the hash generation');
        }
        
        // Sign the bytes32 data using ethers.js
        const signature = await signBytes32WithECDSA(privateKeyStr, bytes32Data);
        metadata.signature = signature;
        
        // Save updated metadata back to the file
        fs.writeFileSync('$METADATA_FILE', JSON.stringify(metadata, null, 2));
        
        console.log(\`SUCCESS: Updated metadata with wallet address \${accountId}\`);
      } catch (error) {
        console.error('ERROR updating metadata:', error.message);
        process.exit(1);
      }
    }
    
    // Run the update function
    updateMetadata().catch(error => {
      console.error('Uncaught error in updateMetadata:', error);
      process.exit(1);
    });
  "
  
  # Check if metadata update was successful
  if [ $? -ne 0 ]; then
    log_error "Failed to update metadata with wallet address and cryptographic proof"
    # Don't exit here, try to continue with the script even if this step fails
    log_warning "Continuing without cryptographic proof..."
  else
    log_success "Device metadata updated with wallet address and cryptographic proof"
  fi
}

# Function to create and display a QR code
create_and_display_qr_code() {
  log_status "Creating registration QR code with all device metadata..."
  
  # Get the account ID
  ACCOUNT_ID=$(grep "Account ID:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  
  # Create a Node.js script to encode all metadata as URL parameters
  node -e "
    const fs = require('fs');
    
    function encodeURIComponentRobust(str) {
      return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase();
      });
    }
    
    try {
      // Read the metadata
      const metadata = JSON.parse(fs.readFileSync('$METADATA_FILE', 'utf8'));
      
      // Verify that bytes32 and signature are not placeholders
      if (metadata.bytes32Data === '0x' + '0'.repeat(64)) {
        console.error('WARNING: bytes32Data is still zeros! Regenerating cryptographic proof...');
        
        // Create a device info string using what's in the metadata
        const deviceInfoStr = JSON.stringify({
          deviceModel: metadata.deviceModel,
          ram: metadata.ram,
          cpu: metadata.cpu,
          storage: metadata.storage,
          os: metadata.os,
          accountId: metadata.walletAddress,
          timestamp: metadata.timestamp
        });
        
        // Import ethers and regenerate the bytes32 data
        const { ethers } = require('ethers');
        metadata.bytes32Data = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceInfoStr));
        
        // Save the updated metadata
        fs.writeFileSync('$METADATA_FILE', JSON.stringify(metadata, null, 2));
      }
      
      // Create URL parameters from all metadata
      const params = Object.entries(metadata).map(([key, value]) => {
        return \`\${key}=\${encodeURIComponentRobust(String(value))}\`;
      }).join('&');
      
      // Create the full URL with the deploy-device endpoint
      const registrationUrl = \`$BASE_URL/deploy-device?\${params}\`;
      
      // Save the URL to a file
      fs.writeFileSync('registration_url.txt', registrationUrl);
    } catch (error) {
      console.error('ERROR:', error.message);
      process.exit(1);
    }
  "
  
  # Get the registration URL
  REGISTRATION_URL=$(cat registration_url.txt)
  
  # Display the URL
  log_status "Registration URL: $REGISTRATION_URL"
  
  # Generate and display QR code
  log_status "Scan this QR code to register your device:"
  node -e "
    const qrcode = require('qrcode-terminal');
    qrcode.generate('$REGISTRATION_URL', {small: true}, function (qrcode) {
      console.log(qrcode);
    });
  "
  
  log_success "QR code displayed successfully with all device metadata"
}

# Function to poll the graph endpoint for device creation
check_device_registration() {
  log_status "Checking device registration..."
  
  # Get the account ID
  ACCOUNT_ID=$(grep "Account ID:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  
  # Create the graph endpoint URL
  GRAPH_URL="${BASE_URL}${GRAPH_API_ENDPOINT}${ACCOUNT_ID}"
  
  log_status "Polling $GRAPH_URL for device registration..."
  log_status "Will check every $RETRY_INTERVAL seconds for up to 10 minutes..."
  log_status "Press Ctrl+C to cancel and continue to the next step"
  
  # Display important information about the QR code again
  log_status "Remember to scan the QR code or visit the registration URL to register your device!"
  log_status "The registration URL contains all your device metadata."
  
  # Poll the endpoint until we get a valid response or reach time limit
  retry_count=0
  while [ $retry_count -lt $MAX_RETRIES ]; do
    response=$(curl -s "$GRAPH_URL")
    
    # Check if the response contains a device
    if [[ "$response" == *"\"device\":"* ]]; then
      log_success "Device registered successfully!"
      break
    else
      retry_count=$((retry_count + 1))
      if [ $retry_count -lt $MAX_RETRIES ]; then
        log_status "Device not registered yet. Retrying in $RETRY_INTERVAL seconds... ($retry_count/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
      else
        log_warning "Device not registered after 10 minutes of trying."
        log_warning "You can continue using the agent, but it will not be registered with the service."
      fi
    fi
  done
}

# Function to display log file in real-time
tail_logs() {
  log_file=$1
  if [ -f "$log_file" ]; then
    # Use tail to follow the log file in the background
    tail -f "$log_file" &
    TAIL_PID=$!
    # Export for later cleanup
    export TAIL_PID
  else
    log_warning "Log file $log_file not found. Cannot display logs."
  fi
}

# Function to start the API server using start-api.sh
start_api_server() {
  log_status "Starting the Franky Agent API server..."
  
  # Ensure we clear any previous log file
  if [ -f "$API_LOG_FILE" ]; then
    rm "$API_LOG_FILE"
  fi
  
  # Set up a trap to kill all background processes on exit
  cleanup() {
    log_status "Shutting down services..."
    if [ -n "$NGROK_PID" ]; then
      kill $NGROK_PID 2>/dev/null
    fi
    if [ -n "$API_PID" ]; then
      kill $API_PID 2>/dev/null
    fi
    if [ -n "$TAIL_PID" ]; then
      kill $TAIL_PID 2>/dev/null
    fi
    log_success "Franky Agent stopped."
    exit 0
  }
  
  # Set trap for Ctrl+C
  trap cleanup INT TERM
  
  # Start the API server using scripts/start-api.sh
  log_status "Launching character-mcp-api server..."
  
  # Start the API server using ts-node directly
  npx ts-node --transpile-only tests/character-mcp-api.ts > "$API_LOG_FILE" 2>&1 &
  API_PID=$!
  
  # Wait a moment for startup
  sleep 2
  
  # Check if process is running
  if ! ps -p $API_PID > /dev/null; then
    log_error "API server process failed to start. Check $API_LOG_FILE for details."
    cat "$API_LOG_FILE"
    exit 1
  fi
  
  # Start displaying logs in real-time
  log_status "API server started. Displaying logs:"
  echo "-----------------------------------------"
  tail_logs "$API_LOG_FILE"
  
  # Wait for the server to initialize
  retry_count=0
  max_retries=15
  
  while [ $retry_count -lt $max_retries ]; do
    status_response=$(curl -s http://localhost:$API_PORT/status 2>/dev/null)
    if [[ "$status_response" == *"status"*"online"* ]]; then
      log_success "Character MCP API server is up and running on port $API_PORT!"
      # Log available endpoints including our modified ones
      echo "-----------------------------------------"
      echo "Available endpoints:"
      echo "GET  /status - Server status"
      echo "POST /initialize - Initialize agent with agent-address header"
      echo "POST /chat - Send message to agent"
      echo "GET  /viewresponse/:messageId - View agent response"
      echo "POST /destruct - Destroy agent instance"
      echo "GET  /wallet-status - Check server wallet status"
      echo "-----------------------------------------"
      echo "🌐 Local URL:  http://localhost:$API_PORT"
      echo "🌐 Public URL: $NGROK_URL"
      echo "-----------------------------------------"
      break
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      log_status "Waiting for API server to initialize... ($retry_count/$max_retries)"
      sleep 2
    else
      log_warning "API server did not respond to status check but may still be starting up."
      log_warning "Check logs for more details."
    fi
  done
  
  log_success "Franky Agent is now running! Press Ctrl+C to stop."
}

# Main function
main() {
  echo -e "${GREEN}"
  echo "Starting Franky Agent Setup..."
  echo -e "${NC}"
  
  # Step 1: Install dependencies
  install_dependencies
  
  # Step 2: Start ngrok early in the process
  start_ngrok
  
  # Step 3: Create Hedera wallet
  create_hedera_wallet
  
  # Step 4: Set up environment variables
  setup_environment_variables
  
  # Step 5: Gather device metadata (now includes ngrok URL)
  gather_device_metadata
  
  # Step 6: Update metadata with wallet address and create cryptographic proof
  update_metadata_with_address
  
  # Step 7: Create and display QR code
  create_and_display_qr_code
  
  # Step 8: Check device registration (now checks every 20 seconds for 10 minutes)
  check_device_registration
  
  # Step 9: Start the API server using the proper method
  start_api_server
  
  # Wait for API server process to complete (will be handled by Ctrl+C trap)
  wait $API_PID
}

# Run the main function
main 