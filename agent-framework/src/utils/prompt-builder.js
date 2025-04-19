// Helper function to build the roleplay prompt structure
export function buildRoleplayPrompt(character_data, user_name, prompt, chat_history = []) {
  // Build the prompt with explicit instructions for the character and tool usage
  const systemInstructions = `### SYSTEM ###
You are roleplaying as ${character_data.name}. You will maintain character consistency at all times.

CHARACTER DETAILS:
APPEARANCE: ${character_data.description || 'Not specified'}
PERSONALITY: ${character_data.personality || 'Not specified'}
SCENARIO: ${character_data.scenario || 'Not specified'}

IMPORTANT INSTRUCTIONS:
1. ALWAYS respond as ${character_data.name}, staying completely in character.
2. Maintain the character's personality traits throughout the conversation.
3. DO NOT break character or add meta-commentary about the roleplay.
4. NEVER prefix your responses with your name, as this is handled automatically.
5. When user requests information that can be provided by an available tool, USE THE TOOL.
6. You have access to tools. When a user asks about information that can be retrieved by a tool (like gas prices), you MUST use the appropriate tool rather than making up information.
7. For instance, if asked about gas prices on Ethereum or any blockchain, use the GetGasPrice tool rather than inventing data.
8. To use a tool, respond with a tool call in this format: {"name": "ToolName", "arguments": {"param1": "value1"}}

EXAMPLE SPEECH PATTERN: ${character_data.mes_example || 'Not specified'}

### CHAT ###`;

  // Build the conversation history
  let conversationHistory = '';
  
  // Add first message if it exists
  if (character_data.first_mes) {
    conversationHistory += `${character_data.name}: ${character_data.first_mes}\n\n`;
  }
  
  // Add chat history
  if (chat_history && chat_history.length > 0) {
    for (const message of chat_history) {
      const speaker = message.role === 'assistant' ? character_data.name : user_name;
      conversationHistory += `${speaker}: ${message.content}\n\n`;
    }
  }
  
  // Add the current message
  conversationHistory += `${user_name}: ${prompt}\n\n`;
  conversationHistory += `${character_data.name}:`;
  
  return `${systemInstructions}\n\n${conversationHistory}`;
}

// Helper function to build a roleplay prompt with additional data
export function buildRoleplayPromptWithData(character_data, user_name, prompt, chat_history = [], dataDescription = '') {
  // Build the prompt with explicit instructions for the character and the data
  const systemInstructions = `### SYSTEM ###
You are roleplaying as ${character_data.name}. You will maintain character consistency at all times.

CHARACTER DETAILS:
APPEARANCE: ${character_data.description || 'Not specified'}
PERSONALITY: ${character_data.personality || 'Not specified'}
SCENARIO: ${character_data.scenario || 'Not specified'}

IMPORTANT INSTRUCTIONS:
1. ALWAYS respond as ${character_data.name}, staying completely in character.
2. Maintain the character's personality traits throughout the conversation.
3. DO NOT break character or add meta-commentary about the roleplay.
4. NEVER prefix your responses with your name, as this is handled automatically.

DATA FOR YOUR RESPONSE:
${dataDescription}

EXAMPLE SPEECH PATTERN: ${character_data.mes_example || 'Not specified'}

### CHAT ###`;

  // Build the conversation history
  let conversationHistory = '';
  
  // Add first message if it exists
  if (character_data.first_mes) {
    conversationHistory += `${character_data.name}: ${character_data.first_mes}\n\n`;
  }
  
  // Add chat history
  if (chat_history && chat_history.length > 0) {
    for (const message of chat_history) {
      const speaker = message.role === 'assistant' ? character_data.name : user_name;
      conversationHistory += `${speaker}: ${message.content}\n\n`;
    }
  }
  
  // Add the current message
  conversationHistory += `${user_name}: ${prompt}\n\n`;
  conversationHistory += `${character_data.name}:`;
  
  return `${systemInstructions}\n\n${conversationHistory}`;
}

// Function to build a system prompt from character data
export function buildSystemPrompt(character, userName) {
  // Core character information
  let characterInfo = [];
  
  if (character.description) {
    characterInfo.push(`Physical appearance: ${character.description}`);
  }
  
  if (character.personality) {
    characterInfo.push(`Personality: ${character.personality}`);
  }
  
  if (character.scenario) {
    characterInfo.push(`Current scenario: ${character.scenario}`);
  }
  
  if (character.creatorcomment) {
    characterInfo.push(`Additional roleplay guidelines: ${character.creatorcomment}`);
  }
  
  // More explicit character instructions
  const systemInstructions = `## Role-playing Instructions
You are now roleplaying as ${character.name}.
- You must ALWAYS respond as ${character.name} would, maintaining their exact personality, knowledge, and speech patterns.
- NEVER break character or refer to yourself as an AI, language model, or assistant.
- NEVER use phrases like "As ${character.name}, I would..." or "In my role as ${character.name}...".
- Write in first person as if you ARE ${character.name}.
- If the character would use specific speech patterns, verbal tics, or expressions, you MUST use them.
- Match the character's exact emotional tone, vocabulary level, and communication style.
- Include appropriate actions, gestures, and expressions in *asterisks* if they suit the character.

## ${character.name}'s Core Traits and Information
${characterInfo.join('\n\n')}

## Conversation Context
You are having a conversation with ${userName}. Stay completely in character throughout the entire exchange.`;

  return systemInstructions;
}

// Function to build a complete prompt for the AI
export function buildFullPrompt(systemPrompt, character, userName, userPrompt, chatHistory) {
  // Start with system prompt and relevant examples
  let fullPrompt = systemPrompt + "\n\n";
  
  // Add example messages to show the character's speech style
  if (character.mes_example) {
    fullPrompt += `## Examples of ${character.name}'s Speech and Behavior\n${character.mes_example}\n\n`;
  }
  
  // Add chat history header for clear separation
  fullPrompt += `## Current Conversation\n\n`;
  
  // Add first message if available and no chat history
  if (character.first_mes && (!chatHistory || chatHistory.length === 0)) {
    fullPrompt += `${character.name}: ${character.first_mes}\n\n`;
  }
  
  // Add chat history with clear speaker attribution
  if (chatHistory && chatHistory.length > 0) {
    for (const message of chatHistory) {
      const speaker = message.role === 'user' ? userName : character.name;
      fullPrompt += `${speaker}: ${message.content}\n\n`;
    }
  }
  
  // Add current user message and prompt for character response
  fullPrompt += `${userName}: ${userPrompt}\n\n${character.name}:`;
  
  console.log("DEBUG - Full prompt structure:\n", 
              "System instructions length:", systemPrompt.length, 
              "Example message included:", !!character.mes_example,
              "Chat history entries:", chatHistory?.length || 0,
              "Total prompt length:", fullPrompt.length);
  
  return fullPrompt;
} 