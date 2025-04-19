const { ethers } = require('ethers');
const crypto = require('crypto');
const readline = require('readline');

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
 * @param {string} message - The message to sign (can be a regular string or a bytes32 hex string)
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
    
    let signature;
    let isBytes32 = false;
    
    // Check if the message is a bytes32 hash (starts with 0x and is 66 chars long)
    if (message.startsWith('0x') && message.length === 66) {
      isBytes32 = true;
      // For bytes32 hashes, use the lower-level signing function to avoid double hashing
      const messageHashBytes = ethers.utils.arrayify(message);
      const signingKey = wallet._signingKey();
      const sigParts = signingKey.signDigest(messageHashBytes);
      signature = ethers.utils.joinSignature(sigParts);
    } else {
      // For regular messages, use the standard signMessage method
      signature = await wallet.signMessage(message);
    }
    
    // Verification depends on the message type
    let verifiedAddress;
    if (isBytes32) {
      // For bytes32, we need to recover the address from the signature and digest
      const messageHashBytes = ethers.utils.arrayify(message);
      verifiedAddress = ethers.utils.recoverAddress(messageHashBytes, signature);
    } else {
      // For regular messages, use the standard verification
      verifiedAddress = ethers.utils.verifyMessage(message, signature);
    }
    
    return {
      message: message,
      signature: signature,
      address: wallet.address,
      verified: verifiedAddress === wallet.address,
      isBytes32: isBytes32
    };
  } catch (error) {
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Verifies a message signature
 * @param {string} message - The original message or bytes32 hash
 * @param {string} signature - The signature to verify
 * @returns {string} The address that signed the message
 */
function verifySignature(message, signature) {
  try {
    // Check if the message is a bytes32 hash
    if (message.startsWith('0x') && message.length === 66) {
      // For bytes32 hashes, recover the address directly
      const messageHashBytes = ethers.utils.arrayify(message);
      return ethers.utils.recoverAddress(messageHashBytes, signature);
    } else {
      // For regular messages, use the standard verification
      return ethers.utils.verifyMessage(message, signature);
    }
  } catch (error) {
    throw new Error(`Failed to verify signature: ${error.message}`);
  }
}

/**
 * Converts a string to bytes32 format
 * @param {string} str - The string to convert
 * @returns {string} The bytes32 representation (hex string)
 */
function stringToBytes32(str) {
  // Use keccak256 hash to ensure we always get exactly 32 bytes
  // This is more reliable than truncation/padding for Ethereum compatibility
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(str));
  return hash;
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
      const messageType = await question('Sign a regular message or bytes32 hash? (regular/bytes32): ');
      
      if (messageType.toLowerCase() === 'bytes32') {
        const deviceInfo = await question('Enter device info to convert to bytes32 (or enter a raw bytes32 hash): ');
        let bytes32Hash;
        
        if (deviceInfo.startsWith('0x') && deviceInfo.length === 66) {
          bytes32Hash = deviceInfo;
        } else {
          bytes32Hash = stringToBytes32(deviceInfo);
          console.log('Converted to bytes32:', bytes32Hash);
        }
        
        const signResult = await signMessage(userSalt, bytes32Hash, { use24Words });
        
        console.log('\n=== Message Signature (bytes32) ===');
        console.log('Bytes32 Hash:', signResult.message);
        console.log('Signature:', signResult.signature);
        console.log('Signing Address:', signResult.address);
        console.log('Signature Valid:', signResult.verified);
      } else {
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
        }
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
    const msgIndex = process.argv.indexOf('--sign');
    if (msgIndex !== -1 && process.argv.length > msgIndex + 1) {
      const message = process.argv[msgIndex + 1];
      
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
  stringToBytes32 
}; 