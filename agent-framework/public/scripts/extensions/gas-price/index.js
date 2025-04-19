import { ToolManager } from '../../tool-calling.js';
import { saveSettingsDebounced } from '../../../script.js';

// Network to chain ID mapping
const NETWORK_MAPPING = {
    "ethereum": "1",
    "eth": "1",
    "mainnet": "1",
    "binance": "56",
    "bsc": "56",
    "polygon": "137",
    "matic": "137",
    "avalanche": "43114",
    "avax": "43114",
    "arbitrum": "42161",
    "optimism": "10",
    "base": "8453",
    "fantom": "250",
    "ftm": "250",
    "aurora": "1313161554"
};

// Reverse mapping for chain ID to network name
const CHAIN_ID_TO_NAME = {
    "1": "Ethereum",
    "56": "Binance Smart Chain",
    "137": "Polygon",
    "43114": "Avalanche",
    "42161": "Arbitrum",
    "10": "Optimism",
    "8453": "Base",
    "250": "Fantom",
    "1313161554": "Aurora"
};

// API Key for 1inch
const API_KEY = 'dW9QkztjMUhg3wZU0rFbPBRxZ7DF06PB';

// Extension settings with default values
const extension_settings = {
    gas_price: {
        enabled: true,
    }
};

/**
 * Send logs to the server for terminal display
 * @param {string} message - Log message
 * @param {string} level - Log level (info, warn, error)
 */
async function logToServer(message, level = 'info') {
    try {
        // Send log to server
        await fetch('/api/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source: 'Gas Price Tool',
                message: message,
                level: level
            })
        });
    } catch (error) {
        // Fallback to console if server logging fails
        console.error('Failed to send log to server:', error);
    }
}

/**
 * Log to both browser console and server
 * @param {string} message - Log message
 */
async function log(message) {
    console.log(`[Gas Price Tool] ${message}`);
    await logToServer(message);
}

/**
 * Log error to both browser console and server
 * @param {string} message - Error message
 */
async function logError(message) {
    console.error(`[Gas Price Tool] ${message}`);
    await logToServer(message, 'error');
}

/**
 * Register the Gas Price tool with the ToolManager
 */
function registerGasPriceTool() {
    log('Registering tool...');
    
    if (!extension_settings.gas_price.enabled) {
        log('Tool is disabled, unregistering...');
        return ToolManager.unregisterFunctionTool('GetGasPrice');
    }

    ToolManager.registerFunctionTool({
        name: 'GetGasPrice',
        displayName: 'Get Gas Price',
        description: 'Fetches the current gas price from a blockchain network. Use when the user asks about gas prices, transaction costs, or network fees for a specific blockchain. Also use this if the user mentions chain IDs like "chain id 1" (Ethereum) or "chain id 137" (Polygon).',
        parameters: Object.freeze({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "type": "object",
            "properties": {
                "network": {
                    "type": "string",
                    "description": "The blockchain network to check gas prices for. This can be specified by name (ethereum, polygon, avalanche, binance, arbitrum, optimism, base, fantom, aurora) or by chain ID (1=Ethereum, 56=Binance, 137=Polygon, etc.)."
                }
            },
            "required": [
                "network"
            ]
        }),
        action: async (args) => {
            await log('Tool called with args: ' + JSON.stringify(args));
            
            if (!args || !args.network) {
                await logError('Error: Network parameter is required');
                throw new Error('Network parameter is required');
            }
            
            const networkInput = args.network.toLowerCase();
            let chainId = NETWORK_MAPPING[networkInput];
            
            // Handle the case where the input might be a chain ID directly
            if (!chainId) {
                // Check if input is a chain ID (like "1" or "chain id 1")
                const chainIdRegex = /(?:chain\s*id\s*)?(\d+)/i;
                const match = networkInput.match(chainIdRegex);
                
                if (match && match[1] && CHAIN_ID_TO_NAME[match[1]]) {
                    chainId = match[1];
                    await log(`Detected chain ID ${chainId} from input "${networkInput}", mapping to ${CHAIN_ID_TO_NAME[chainId]}`);
                }
            }
            
            if (!chainId) {
                await logError('Error: Unsupported network: ' + networkInput);
                return `Unsupported network: ${args.network}. Supported networks are: ethereum (chain id 1), binance (chain id 56), polygon (chain id 137), avalanche (chain id 43114), arbitrum (chain id 42161), optimism (chain id 10), base (chain id 8453), fantom (chain id 250), aurora (chain id 1313161554)`;
            }
            
            const networkName = CHAIN_ID_TO_NAME[chainId] || args.network;
            await log(`Fetching gas prices for network: ${networkName} (chainId: ${chainId})`);
            
            try {
                const apiUrl = `https://api.1inch.dev/gas-price/v1.5/${chainId}`;
                await log('Making API request to: ' + apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });
                
                if (!response.ok) {
                    await logError(`API Error: ${response.status} ${response.statusText}`);
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                await log('Received API response: ' + JSON.stringify(data));
                
                // Format the response with proper units (convert wei to gwei for better readability)
                const formattedResponse = {
                    network: networkName,
                    chainId: chainId,
                    baseFee: data.baseFee ? `${(Number(data.baseFee) / 1e9).toFixed(2)} Gwei` : 'N/A',
                    gasPrice: data.gasPrice ? `${(Number(data.gasPrice) / 1e9).toFixed(2)} Gwei` : 'N/A'
                };
                
                if (data.low) formattedResponse.low = `${(Number(data.low) / 1e9).toFixed(2)} Gwei`;
                if (data.medium) formattedResponse.medium = `${(Number(data.medium) / 1e9).toFixed(2)} Gwei`;
                if (data.high) formattedResponse.high = `${(Number(data.high) / 1e9).toFixed(2)} Gwei`;
                if (data.instant) formattedResponse.instant = `${(Number(data.instant) / 1e9).toFixed(2)} Gwei`;
                
                await log('Formatted response: ' + JSON.stringify(formattedResponse));
                return JSON.stringify(formattedResponse, null, 2);
            } catch (error) {
                await logError('Error fetching gas price: ' + error.message);
                return `Error fetching gas price for ${networkName}: ${error.message}`;
            }
        },
        formatMessage: (args) => {
            log('Formatting message for: ' + JSON.stringify(args));
            return `Fetching current gas prices for ${args.network}...`;
        },
    });
    
    log('Tool registration complete');
}

// Initialize the extension
jQuery(() => {
    log('Initializing extension...');
    
    const settingsHtml = `
    <div class="gas-price-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Gas Price Tool</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container">
                    <label class="checkbox_label" for="gas_price_enabled">
                        <input type="checkbox" id="gas_price_enabled" ${extension_settings.gas_price.enabled ? 'checked' : ''}>
                        <span>Enable Gas Price Tool</span>
                    </label>
                </div>
                <small>
                    <p>This tool allows the AI to check current gas prices for various blockchain networks.</p>
                    <p>The tool will automatically be available when function calling is enabled (OpenAI/Compatible models only).</p>
                    <p>Supported networks: Ethereum, Binance Smart Chain, Polygon, Avalanche, Arbitrum, Optimism, Base, Fantom, and Aurora.</p>
                </small>
            </div>
        </div>
    </div>`;

    // Add settings UI to the extensions panel
    $('#extensions_settings').append(settingsHtml);
    log('Settings UI added');

    // Handle settings changes
    $('#gas_price_enabled').on('change', function() {
        log('Settings changed');
        extension_settings.gas_price.enabled = !!$(this).prop('checked');
        registerGasPriceTool();
        saveSettingsDebounced();
    });

    // Initialize the tool
    registerGasPriceTool();
    log('Extension initialization complete');
}); 
