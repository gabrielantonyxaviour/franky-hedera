initExtensionSlashCommands();
ToolManager.initToolSlashCommands();

// Register Gas Price Tool
ToolManager.registerFunctionTool({
    name: 'GetGasPrice',
    displayName: 'Get Gas Price',
    description: 'Fetches the current gas price from a blockchain network. Use when the user asks about gas prices, transaction costs, or network fees for a specific blockchain.',
    parameters: Object.freeze({
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "properties": {
            "network": {
                "type": "string",
                "description": "The blockchain network to check gas prices for (e.g., ethereum, polygon, avalanche, binance, arbitrum, optimism, base, fantom, aurora)"
            }
        },
        "required": [
            "network"
        ]
    }),
    action: async (args) => {
        if (!args || !args.network) {
            throw new Error('Network parameter is required');
        }
        
        const networkMapping = {
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
        
        const network = args.network.toLowerCase();
        const chainId = networkMapping[network];
        
        if (!chainId) {
            return `Unsupported network: ${args.network}. Supported networks are: ethereum, binance, polygon, avalanche, arbitrum, optimism, base, fantom, aurora`;
        }
        
        try {
            const response = await fetch(`https://api.1inch.dev/gas-price/v1.5/${chainId}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer dW9QkztjMUhg3wZU0rFbPBRxZ7DF06PB'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Format the response with proper units (convert wei to gwei for better readability)
            const formattedResponse = {
                network: args.network,
                baseFee: data.baseFee ? `${(Number(data.baseFee) / 1e9).toFixed(2)} Gwei` : 'N/A',
                gasPrice: data.gasPrice ? `${(Number(data.gasPrice) / 1e9).toFixed(2)} Gwei` : 'N/A'
            };
            
            if (data.low) formattedResponse.low = `${(Number(data.low) / 1e9).toFixed(2)} Gwei`;
            if (data.medium) formattedResponse.medium = `${(Number(data.medium) / 1e9).toFixed(2)} Gwei`;
            if (data.high) formattedResponse.high = `${(Number(data.high) / 1e9).toFixed(2)} Gwei`;
            if (data.instant) formattedResponse.instant = `${(Number(data.instant) / 1e9).toFixed(2)} Gwei`;
            
            return JSON.stringify(formattedResponse, null, 2);
        } catch (error) {
            console.error('Gas price fetch error:', error);
            return `Error fetching gas price for ${args.network}: ${error.message}`;
        }
    },
    formatMessage: (args) => `Fetching current gas prices for ${args.network}...`,
});

await initPresetManager(); 