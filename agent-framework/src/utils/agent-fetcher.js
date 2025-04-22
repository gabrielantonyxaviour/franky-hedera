import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK, LIT_ABILITY, LIT_RPC } from "@lit-protocol/constants";
import { decryptToString } from "@lit-protocol/encryption";
import {
    createSiweMessage,
    generateAuthSig,
    LitAccessControlConditionResource,
} from "@lit-protocol/auth-helpers";
import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// FRANKY contract address on Filecoin Calibration Testnet
const FRANKY_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29';

// Function to read device credentials from file
async function readDeviceCredentials() {
    try {
        const credentialsPath = path.resolve(process.cwd(), 'device_credentials.txt');
        console.log(`📋 Looking for device credentials at: ${credentialsPath}`);
        
        if (!fs.existsSync(credentialsPath)) {
            throw new Error('Device credentials file not found');
        }
        
        const fileContent = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = {};
        
        // Parse credentials file
        const lines = fileContent.split('\n');
        for (const line of lines) {
            if (line.includes(':')) {
                const [key, value] = line.split(':', 2).map(part => part.trim());
                credentials[key] = value;
            }
        }
        
        if (!credentials['Private Key']) {
            throw new Error('Private key not found in credentials file');
        }
        
        console.log('✅ Successfully read device credentials');
        return credentials;
    } catch (error) {
        console.error(`❌ Error reading device credentials: ${error.message}`);
        throw error;
    }
}

// Function to decrypt the encrypted secrets
async function decryptSecrets(encryptedSecrets, secretsHash, isMainnet = false) {
    console.log('🔐 Starting secrets decryption process');
    
    try {
        // Read device credentials to get private key
        const credentials = await readDeviceCredentials();
        const privateKey = credentials['Private Key'];
        
        if (!privateKey) {
            throw new Error('Private key is required for decryption');
        }
        
        // Initialize Lit Node Client
        const litNodeClient = new LitNodeClient({
            litNetwork: LIT_NETWORK.DatilDev,
            debug: false,
        });
        
        // Connect to Lit Network
        await litNodeClient.connect();
        console.log("✅ Connected to Lit Network");
        
        // Create Ethers wallet
        const ethersWallet = new ethers.Wallet(
            privateKey,
            new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
        );
        
        // Define the chain for Filecoin network
        const chain = isMainnet ? "filecoin" : "filecoinCalibrationTestnet";
        console.log(`🔗 Using chain: ${chain}`);
        
        // Define contract conditions for Filecoin network - updated to match frontend format exactly
        const evmContractConditions = [
            {
                contractAddress: FRANKY_ADDRESS,
                chain,
                functionName: "isRegisteredDevice",
                functionParams: [],
                functionAbi: {
                    stateMutability: "view",
                    type: "function",
                    outputs: [
                        {
                            type: "bool",
                            name: "",
                        },
                    ],
                    name: "isRegisteredDevice",
                    inputs: [],
                },
                returnValueTest: {
                    key: "",
                    comparator: "=",
                    value: "true",
                },
            }
        ];
        
        console.log("🔄 Generating session signatures");
        
        // Get session signatures
        const sessionSigs = await litNodeClient.getSessionSigs({
            chain,
            expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
            resourceAbilityRequests: [
                {
                    resource: new LitAccessControlConditionResource(
                        await LitAccessControlConditionResource.generateResourceString(
                            evmContractConditions,
                            secretsHash
                        )
                    ),
                    ability: LIT_ABILITY.AccessControlConditionDecryption,
                },
            ],
            authNeededCallback: async ({
                uri,
                expiration,
                resourceAbilityRequests,
            }) => {
                const toSign = await createSiweMessage({
                    uri,
                    expiration,
                    resources: resourceAbilityRequests,
                    walletAddress: ethersWallet.address,
                    nonce: await litNodeClient.getLatestBlockhash(),
                    litNodeClient,
                });

                return await generateAuthSig({
                    signer: ethersWallet,
                    toSign,
                });
            },
        });
        
        // Decrypt the secrets
        console.log("🔄 Decrypting secrets");
        const decryptionResult = await decryptToString(
            {
                chain,
                ciphertext: encryptedSecrets,
                dataToEncryptHash: secretsHash,
                evmContractConditions,
                sessionSigs,
            },
            litNodeClient
        );
        
        console.log("✅ Successfully decrypted secrets");
        
        // Save to .env file
        await saveDecryptedSecretsToEnv(decryptionResult);
        
        return decryptionResult;
    } catch (error) {
        console.error(`❌ Decryption error: ${error.message}`);
        throw error;
    }
}

// Function to save decrypted secrets to .env file
async function saveDecryptedSecretsToEnv(decryptedSecretsStr) {
    try {
        console.log("💾 Saving decrypted secrets to .env file");
        
        // Parse the JSON string to get key-value pairs
        const secretsObject = JSON.parse(decryptedSecretsStr);
        
        // Create or read existing .env file
        const envPath = path.resolve(process.cwd(), '.env');
        let existingEnv = {};
        
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            existingEnv = dotenv.parse(envContent);
        }
        
        // Merge new secrets with existing .env content
        const mergedEnv = { ...existingEnv };
        
        // Add each secret to the merged env
        for (const [key, value] of Object.entries(secretsObject)) {
            mergedEnv[key] = value;
        }
        
        // Write the merged content back to .env
        let envContent = '';
        for (const [key, value] of Object.entries(mergedEnv)) {
            envContent += `${key}=${value}\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Successfully saved secrets to .env file");
        
        // Reload environment variables
        dotenv.config();
        
        return true;
    } catch (error) {
        console.error(`❌ Error saving secrets to .env: ${error.message}`);
        throw error;
    }
}

// Function to fetch character data from URL and handle decryption of secrets
async function fetchCharacterConfigData(characterConfig) {
    console.log(`🔍 Processing character config URL: ${characterConfig}`);
    
    try {
        // Make a direct GET request to the URL
        const response = await fetch(characterConfig);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Parse the JSON response
        const characterData = await response.json();
        console.log(`✅ Successfully fetched character data from URL`);
        
        // Check if we have encrypted secrets that need decryption
        if (characterData.encryptedSecrets && characterData.secretsHash) {
            console.log('🔐 Found encrypted secrets, starting parallel decryption');
            
            // Start decryption process in parallel - using Filecoin Calibration (false means testnet)
            decryptSecrets(characterData.encryptedSecrets, characterData.secretsHash, false)
                .then(() => {
                    console.log('✅ Secrets decryption completed in the background');
                })
                .catch(error => {
                    console.error('❌ Secrets decryption failed:', error.message);
                });
        }
        
        // Remove sensitive fields from the character data
        const { encryptedSecrets, secretsHash, ...cleanCharacterData } = characterData;
        
        console.log('🔒 Removed sensitive fields from character data');
        return cleanCharacterData;
    } catch (error) {
        console.error(`❌ Failed to fetch character data: ${error.message}`);
        throw error;
    }
}

export async function getAgentCharacter(agentId) {
  const startTime = new Date();
  console.log(`\n🔍 [${startTime.toISOString()}] AGENT FETCH: Starting agent data fetch for ID: ${agentId}`);
  
  try {
    // First fetch the character config URL from the new endpoint
    console.log(`🌐 [${new Date().toISOString()}] AGENT FETCH: Fetching character config URL...`);
    const configResponse = await fetch(`https://www.frankyagent.xyz/api/graph/character?address=${agentId}`);
    
    if (!configResponse.ok) {
      throw new Error(`Failed to fetch character config URL: ${configResponse.status}`);
    }
    
    const { characterConfig } = await configResponse.json();
    console.log(`✅ [${new Date().toISOString()}] AGENT FETCH: Got character config URL`);
    
    // Fetch character data from the config URL
    console.log(`🔄 [${new Date().toISOString()}] AGENT FETCH: Fetching character data...`);
    const characterResponse = await fetch(characterConfig);
    
    if (!characterResponse.ok) {
      throw new Error(`Failed to fetch character data: ${characterResponse.status}`);
    }
    
    const characterData = await characterResponse.json();
    console.log(`✅ [${new Date().toISOString()}] AGENT FETCH: Successfully fetched character data`);
    
    // Create return object with agent data
    const agentData = {
      // Basic agent info
      id: agentId,
      subname: characterData.name || '',
      owner: agentId,
      agentAddress: agentId,
      deviceAddress: agentId,
      ngrokLink: characterData.ngrokLink || '',
      
      // Avatar and visibility
      avatar: characterData.avatar || '',
      isPublic: true,
      
      // Fee information
      perApiCallAmount: 0,
      
      // Character configuration - the complete object
      character: characterData,
      
      // Additional metadata
      keyHash: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Log completion and return data
    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();
    console.log(`✅ [${endTime.toISOString()}] AGENT FETCH: Completed agent fetch in ${totalDuration}ms`);
    
    return agentData;
  } catch (error) {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();
    console.error(`❌ [${endTime.toISOString()}] AGENT FETCH ERROR (${totalDuration}ms):`, error);
    console.error(`❌ AGENT FETCH STACK: ${error.stack}`);
    throw error;
  }
} 