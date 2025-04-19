const { ethers } = require('ethers');
const crypto = require('crypto');
const readline = require('readline');

// Hardcoded contract address
const CONTRACT_ADDRESS = '0x42F46AeF8d7288B525Ac7160616F7Bc23F583bAA';

// Provider URL - can be changed if needed
const PROVIDER_URL = 'https://base-sepolia.g.alchemy.com/v2/NMsHzNgJ7XUYtzNyFpEJ8yT4muQ_lkRF';

// Contract ABI for the events we want to listen to
const contractABI = [
  "event DeviceRegistered(uint indexed deviceId, address indexed owner, string deviceModel, string ram, string storageCapacity, string cpu, string ngrokLink, address deviceAddress)"
];

/**
 * Creates an Ethereum wallet using a salt for additional security
 * @param {string} salt - A string to use as salt for wallet generation
 * @param {Object} options - Additional options
 * @param {boolean} options.use24Words - Use 24 words mnemonic instead of 12
 * @returns {Object} Wallet information including address, private key, and mnemonic
 */
function createWalletWithSalt(salt, options = {}) {
  // Validate input
  if (!salt || typeof salt !== 'string') {
    throw new Error('Salt must be a non-empty string');
  }

  const { use24Words = false } = options;

  try {
    // Create a deterministic seed by hashing the salt
    const saltBuffer = Buffer.from(salt);
    const hash = crypto.createHash('sha256').update(saltBuffer).digest();
    
    // Determine entropy size based on desired mnemonic length
    // 16 bytes (128 bits) = 12 words
    // 32 bytes (256 bits) = 24 words
    const entropySize = use24Words ? 32 : 16;
    const entropy = hash.slice(0, entropySize);
    
    // Generate mnemonic from entropy
    const mnemonic = ethers.utils.entropyToMnemonic(entropy);
    
    // Create wallet from mnemonic
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);

    // Return wallet information
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      wordCount: use24Words ? 24 : 12,
      salt: salt
    };
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
}

/**
 * Signs a message with the wallet created from a salt
 * @param {string} salt - The salt used to create the wallet
 * @param {string} message - The message to sign
 * @param {Object} options - Additional options
 * @returns {Object} The signature info including the message, signature, and recovery information
 */
async function signMessage(salt, message, options = {}) {
  if (!salt || !message) {
    throw new Error('Both salt and message are required');
  }

  try {
    // Recreate the wallet from the salt
    const walletInfo = createWalletWithSalt(salt, options);
    const wallet = new ethers.Wallet(walletInfo.privateKey);
    
    // Sign the message
    const signature = await wallet.signMessage(message);
    
    // Get the signing address from the signature to verify
    const verifiedAddress = ethers.utils.verifyMessage(message, signature);
    
    return {
      message: message,
      signature: signature,
      address: wallet.address,
      verified: verifiedAddress === wallet.address
    };
  } catch (error) {
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Verifies a message signature
 * @param {string} message - The original message
 * @param {string} signature - The signature to verify
 * @returns {string} The address that signed the message
 */
function verifySignature(message, signature) {
  try {
    const signerAddress = ethers.utils.verifyMessage(message, signature);
    return signerAddress;
  } catch (error) {
    throw new Error(`Failed to verify signature: ${error.message}`);
  }
}

/**
 * Listens for wallet registration events from the contract
 * @param {string} walletAddress - The wallet address to listen for in events
 * @returns {Promise<void>}
 */
async function listenForWalletRegistration(walletAddress) {
  try {
    // Connect to an Ethereum provider
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    
    // Create a contract instance using the ABI and address
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
    
    console.log(`\n=== Waiting for Wallet Registration ===`);
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`Wallet Address: ${walletAddress}`);
    console.log(`Waiting for DeviceRegistered event...`);
    console.log(`Use this wallet address when registering your device in the contract.`);
    
    // Listen for the DeviceRegistered event
    contract.on("DeviceRegistered", (deviceId, owner, deviceModel, ram, storageCapacity, cpu, ngrokLink, deviceAddress, event) => {
      // Check if this event contains our wallet address
      if (deviceAddress.toLowerCase() === walletAddress.toLowerCase()) {
        console.log(`\n🎉 Wallet registered successfully! 🎉`);
        console.log(`Wallet Address: ${deviceAddress}`);
        console.log(`Device ID: ${deviceId.toString()}`);
        console.log(`Owner: ${owner}`);
        console.log(`Device Model: ${deviceModel}`);
        console.log(`RAM: ${ram}`);
        console.log(`Storage: ${storageCapacity}`);
        console.log(`CPU: ${cpu}`);
        console.log(`Ngrok Link: ${ngrokLink}`);
        console.log(`Block Number: ${event.blockNumber}`);
        console.log(`Transaction Hash: ${event.transactionHash}`);
      }
    });
    
    // Also listen for any errors
    provider.on("error", (error) => {
      console.error(`Provider Error: ${error.message}`);
    });
    
    // Keep the process running
    console.log(`Press Ctrl+C to stop listening...`);
  } catch (error) {
    console.error(`Failed to setup event listener: ${error.message}`);
  }
}

/**
 * Runs the interactive CLI for wallet creation
 */
async function runInteractiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('=== Ethereum Wallet Generator with Salt ===\n');
    
    // Get salt from user
    const userSalt = await question('Enter a salt value (this should be kept secret): ');
    if (!userSalt) {
      console.error('Salt cannot be empty');
      rl.close();
      return;
    }

    // Ask about mnemonic length
    const mnemonicChoice = await question('Do you want a 24-word mnemonic? (y/N): ');
    const use24Words = mnemonicChoice.toLowerCase() === 'y';

    // Generate wallet
    const wallet = createWalletWithSalt(userSalt, { use24Words });
    
    console.log('\n=== Your Wallet Details ===');
    console.log('Ethereum Address:', wallet.address);
    console.log('Private Key:', wallet.privateKey);
    console.log(`Mnemonic (${wallet.wordCount} words):`, wallet.mnemonic);
    console.log('\nIMPORTANT: Keep your private key, mnemonic, and salt secure!');
    console.log('Anyone with access to your private key or mnemonic can access your funds.');
    
    // Ask if the user wants to sign a message
    const signChoice = await question('\nDo you want to sign a message with this wallet? (y/N): ');
    
    if (signChoice.toLowerCase() === 'y') {
      const message = await question('Enter the message to sign: ');
      if (message) {
        const signResult = await signMessage(userSalt, message, { use24Words });
        
        console.log('\n=== Message Signature ===');
        console.log('Message:', signResult.message);
        console.log('Signature:', signResult.signature);
        console.log('Signing Address:', signResult.address);
        console.log('Signature Valid:', signResult.verified);
        
        console.log('\nTo verify this signature elsewhere, use:');
        console.log('Original message:', message);
        console.log('Signature:', signResult.signature);
        
        // Close readline interface as we're moving to event listening
        rl.close();
        
        // Start listening for events automatically after signing
        await listenForWalletRegistration(wallet.address);
        return;
      }
    }
    
    // Verify reproducibility
    console.log('\n=== Verification ===');
    console.log('Creating the same wallet again with your salt...');
    const verificationWallet = createWalletWithSalt(userSalt, { use24Words });
    console.log('Verification successful:', wallet.address === verificationWallet.address);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

// Check if script is run directly (not imported)
if (require.main === module) {
  // If arguments provided, use those
  if (process.argv.length > 2) {
    const salt = process.argv[2];
    const use24Words = process.argv.includes('--24words');
    
    // Check if we're signing a message
    const signIndex = process.argv.indexOf('--sign');
    if (signIndex !== -1 && process.argv.length > signIndex + 1) {
      const message = process.argv[signIndex + 1];
      
      try {
        const wallet = createWalletWithSalt(salt, { use24Words });
        console.log('Wallet created with salt:');
        console.log('Address:', wallet.address);
        console.log('Private Key:', wallet.privateKey);
        
        // Sign the message
        signMessage(salt, message, { use24Words }).then(signResult => {
          console.log('\nMessage successfully signed:');
          console.log('Message:', signResult.message);
          console.log('Signature:', signResult.signature);
          console.log('Signing Address:', signResult.address);
          console.log('Signature Valid:', signResult.verified);
          
          // Automatically start listening for wallet registration events
          listenForWalletRegistration(wallet.address);
        });
      } catch (error) {
        console.error('Error:', error.message);
      }
    } else {
      try {
        const wallet = createWalletWithSalt(salt, { use24Words });
        
        console.log('Wallet created with salt:');
        console.log('Address:', wallet.address);
        console.log('Private Key:', wallet.privateKey);
        console.log(`Mnemonic (${wallet.wordCount} words):`, wallet.mnemonic);
        
        // Verify reproducibility
        const sameWallet = createWalletWithSalt(salt, { use24Words });
        console.log('\nSame wallet generated:', wallet.address === sameWallet.address);
      } catch (error) {
        console.error('Error creating wallet:', error.message);
      }
    }
  } else {
    // No arguments, run interactive CLI
    runInteractiveCLI();
  }
}

// Export the functions for use in other scripts
module.exports = { 
  createWalletWithSalt, 
  signMessage, 
  verifySignature,
  listenForWalletRegistration 
};