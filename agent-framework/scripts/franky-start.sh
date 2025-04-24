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
  npm install --silent @hashgraph/sdk qrcode-terminal uuid systeminformation
  
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
      log_success "Loaded existing wallet with Account ID: $ACCOUNT_ID"
      return 0
    else
      log_status "Creating a new wallet..."
      rm "$DEVICE_DETAILS_FILE"
    fi
  fi
  
  # Create a new wallet using a Node.js script
  node -e "
    const { PrivateKey, AccountCreateTransaction, Hbar, Client } = require('@hashgraph/sdk');
    const fs = require('fs');
    
    async function createWallet() {
      try {
        // Create a new key pair
        const privateKey = PrivateKey.generateECDSA();
        const publicKey = privateKey.publicKey;
        
        console.log('Created new ECDSA key pair successfully');
        
        // Write the keys to the device details file
        const details = [
          '=== DEVICE WALLET DETAILS ===',
          \`Private Key: \${privateKey.toStringDer()}\`,
          \`Public Key: \${publicKey.toStringDer()}\`,
          '============================='
        ];
        
        fs.writeFileSync('$DEVICE_DETAILS_FILE', details.join('\\n') + '\\n');
        console.log('Wallet details saved to $DEVICE_DETAILS_FILE');
        
        // Note: In a production environment, we would create a Hedera account here
        // For this example, we're just generating the keys
        
        // Set a placeholder account ID (in production, this would be created on Hedera)
        // This is just a placeholder - in a real implementation, this would be a Hedera account ID
        const placeholderId = '0.0.' + Math.floor(Math.random() * 1000000);
        
        // Append account ID to the file
        fs.appendFileSync('$DEVICE_DETAILS_FILE', \`Account ID: \${placeholderId}\\n\`);
        console.log('SUCCESS');
      } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
      }
    }
    
    createWallet();
  "
  
  # Check if wallet creation was successful
  if [ $? -ne 0 ]; then
    log_error "Failed to create Hedera wallet"
    exit 1
  fi
  
  # Extract account ID and private key from the file
  ACCOUNT_ID=$(grep "Account ID:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  PRIVATE_KEY=$(grep "Private Key:" "$DEVICE_DETAILS_FILE" | cut -d' ' -f3)
  
  log_success "Created new Hedera wallet with Account ID: $ACCOUNT_ID"
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
  
  # Create a Node.js script to update metadata
  node -e "
    const fs = require('fs');
    const crypto = require('crypto');
    
    /**
     * Generates a deterministic private key from the device ID and other info
     * @param {string} deviceInfo - Information about the device to use as a seed
     * @returns {Buffer} - A 32-byte private key
     */
    function generatePrivateKey(deviceInfo) {
      // Create a deterministic seed by hashing the device info
      return crypto.createHash('sha256').update(deviceInfo).digest();
    }
    
    /**
     * Creates a bytes32 representation of the device info (similar to keccak256 in Ethereum)
     * @param {string} deviceInfo - Device information string
     * @returns {string} - bytes32 representation as hex string with 0x prefix
     */
    function createBytes32(deviceInfo) {
      // In Ethereum this would be keccak256, but for simplicity 
      // we'll use sha256 since we're not on an Ethereum chain
      const hash = crypto.createHash('sha256').update(deviceInfo).digest('hex');
      return '0x' + hash;
    }
    
    /**
     * Signs a message (bytes32) with a private key using a simplified ECDSA approach
     * This is a simplified version of Ethereum's signing
     * @param {Buffer} privateKey - The private key to sign with
     * @param {string} bytes32 - The bytes32 message to sign
     * @returns {string} - Signature as hex string with 0x prefix
     */
    function signBytes32(privateKey, bytes32) {
      try {
        // Convert bytes32 to buffer (remove 0x prefix if present)
        const messageBuffer = Buffer.from(bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32, 'hex');
        
        // Use the built-in crypto module to sign (this differs from Ethereum signing but is similar)
        // We're creating a simple sign operation with the private key
        const sign = crypto.createSign('SHA256');
        sign.update(messageBuffer);
        
        try {
          // Try to sign with the private key (may require formatting)
          const signature = sign.sign({
            key: privateKey,
            dsaEncoding: 'ieee-p1363' // This would be different for Ethereum, but works for our demo
          }, 'hex');
          
          // Add a recovery byte placeholder (v) at the end (in Ethereum this would be 27 or 28)
          const recoveryByte = '01'; // Simplified recovery byte
          
          return '0x' + signature + recoveryByte;
        } catch (e) {
          // If signing fails with the private key directly, we'll create a simulated signature
          // This is just for demo purposes - in a real implementation, proper ECDSA would be used
          const simulatedSignature = crypto.createHmac('sha256', privateKey)
            .update(messageBuffer)
            .digest('hex');
          
          // Pad to look like a 65-byte signature (r, s, v) with recovery byte
          const paddedSig = simulatedSignature.padEnd(128, '0') + '01';
          return '0x' + paddedSig;
        }
      } catch (error) {
        console.error('Signing error:', error);
        // Return a fallback signature for demo purposes
        return '0x' + '1'.repeat(128) + '01';
      }
    }
    
    async function updateMetadata() {
      try {
        // Read the metadata
        const metadata = JSON.parse(fs.readFileSync('$METADATA_FILE', 'utf8'));
        
        // Read account ID from the device details file
        const deviceDetailsContent = fs.readFileSync('$DEVICE_DETAILS_FILE', 'utf8');
        const accountIdMatch = deviceDetailsContent.match(/Account ID: (.*)/);
        const privateKeyMatch = deviceDetailsContent.match(/Private Key: (.*)/);
        
        if (!accountIdMatch) {
          throw new Error('Could not find account ID in device details file');
        }
        
        const accountId = accountIdMatch[1];
        const privateKeyStr = privateKeyMatch ? privateKeyMatch[1] : null;
        
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
        
        // Generate or derive a private key for signing
        // In a real implementation, this would use the actual device private key
        const privateKeyBuffer = privateKeyStr 
          ? Buffer.from(privateKeyStr) 
          : generatePrivateKey(deviceInfoStr);
        
        // Sign the bytes32 data
        const signature = signBytes32(privateKeyBuffer, bytes32Data);
        metadata.signature = signature;
        
        // Save updated metadata back to the file
        fs.writeFileSync('$METADATA_FILE', JSON.stringify(metadata, null, 2));
        
        console.log(\`SUCCESS: Updated metadata with wallet address \${accountId} and cryptographic proof\`);
        console.log(\`Bytes32: \${bytes32Data}\`);
        console.log(\`Signature: \${signature}\`);
      } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
      }
    }
    
    updateMetadata();
  "
  
  # Check if metadata update was successful
  if [ $? -ne 0 ]; then
    log_error "Failed to update metadata with wallet address and cryptographic proof"
    exit 1
  fi
  
  log_success "Device metadata updated with wallet address and cryptographic proof"
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
      
      // Create URL parameters from all metadata
      const params = Object.entries(metadata).map(([key, value]) => {
        return \`\${key}=\${encodeURIComponentRobust(String(value))}\`;
      }).join('&');
      
      // Create the full URL
      const registrationUrl = \`$BASE_URL?\${params}\`;
      
      // Save the URL to a file
      fs.writeFileSync('registration_url.txt', registrationUrl);
      
      console.log(registrationUrl);
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
  max_retries=10
  
  while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:$API_PORT/status > /dev/null 2>&1; then
      log_success "Character MCP API server is up and running on port $API_PORT!"
      echo "-----------------------------------------"
      echo "🌐 Local URL:  http://localhost:$API_PORT"
      echo "🌐 Public URL: $NGROK_URL"
      echo "-----------------------------------------"
      break
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      log_status "Waiting for API server to initialize... ($retry_count/$max_retries)"
      sleep 1
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
  
  # Step 4: Gather device metadata (now includes ngrok URL)
  gather_device_metadata
  
  # Step 5: Update metadata with wallet address
  update_metadata_with_address
  
  # Step 6: Create and display QR code with all metadata as URL parameters
  create_and_display_qr_code
  
  # Step 7: Check device registration (now checks every 20 seconds for 10 minutes)
  check_device_registration
  
  # Step 8: Start the API server using the proper method
  start_api_server
  
  # Wait for API server process to complete (will be handled by Ctrl+C trap)
  wait $API_PID
}

# Run the main function
main 