/**
 * Example script demonstrating direct use of the Franky agent creation tool
 */
require('dotenv').config();
const HederaAgentKit = require('./hedera-agent-kit');
const { CreateFrankyAgentTool } = require('./tools');

async function createFrankyAgentExample() {
  try {
    console.log('Initializing HederaAgentKit...');
    
    // Initialize HederaAgentKit with account details from .env
    const hederaKit = new HederaAgentKit(
      process.env.HEDERA_ACCOUNT_ID,
      process.env.HEDERA_PRIVATE_KEY,
      process.env.HEDERA_NETWORK_TYPE || 'testnet'
    );
    
    console.log('Creating Franky agent tool...');
    const frankyTool = new CreateFrankyAgentTool(hederaKit);
    
    // Example agent data with only the required fields that user needs to provide
    // UUID and input/output topics will be generated automatically
    const agentData = {
      subdomain: `agent-demo-${Date.now()}`, // Dynamic subdomain to avoid conflicts
      name: "Agent X",
      description: "A mysterious figure in a sleek black suit with mirrored sunglasses",
      personality: "Cool, calm, and highly skilled in espionage",
      scenario: "On a top-secret mission in a bustling city",
      first_mes: "I've been expecting you.",
      mes_example: "The intel is secure. Proceed to extraction point.",
      creator_notes: "Has a knack for blending into any environment seamlessly",
      system_prompt: "You are Agent X, a master spy on a critical mission.",
      perApiCallFee: 100, // Optional, will default to 100 if not provided
      isPublic: false // Optional, will default to false if not provided
    };
    
    console.log('Agent data:', agentData);
    console.log('Executing Franky agent creation tool...');
    
    // Call the tool with agent data
    const result = await frankyTool.call(JSON.stringify(agentData));
    const parsedResult = JSON.parse(result);
    
    console.log('Franky agent creation result:', parsedResult);
    console.log('\nAgent created with the following details:');
    console.log(`Name: ${parsedResult.name}`);
    console.log(`Subdomain: ${parsedResult.subdomain}`);
    console.log(`UUID: ${parsedResult.uuid}`); // Auto-generated
    console.log(`Input Topic ID: ${parsedResult.inputTopicId}`); // Auto-generated
    console.log(`Output Topic ID: ${parsedResult.outputTopicId}`); // Auto-generated
    console.log(`Transaction ID: ${parsedResult.transactionId}`);
    
    return parsedResult;
  } catch (error) {
    console.error('Error creating Franky agent:', error);
    throw error;
  }
}

// Execute the example
createFrankyAgentExample()
  .then(result => {
    console.log('Agent created successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create agent:', error);
    process.exit(1);
  }); 