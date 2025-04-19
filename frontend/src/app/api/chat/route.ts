import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, agentId, tools } = await request.json()
    
    // In a real implementation, this would call an AI service
    // For now, we'll return a simulated response
    const response = getSimulatedResponse(message, tools)
    
    // Add a delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return NextResponse.json({ 
      response,
      agentId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

// Simple function to simulate AI responses
function getSimulatedResponse(userMessage: string, tools: string[]): string {
  const lowerCaseMessage = userMessage.toLowerCase()
  
  // Check if the message is related to any of the agent's tools
  if (tools.includes('swap') && (lowerCaseMessage.includes('swap') || lowerCaseMessage.includes('exchange'))) {
    return "I can help you swap tokens using the 1inch protocol. What tokens would you like to exchange? For example, I can help you swap ETH for USDC."
  }
  
  if (tools.includes('price') && (lowerCaseMessage.includes('price') || lowerCaseMessage.includes('worth'))) {
    return "Based on the latest data, ETH is currently trading at $3,245.67. Would you like me to check any other token prices?"
  }
  
  if (tools.includes('gas') && (lowerCaseMessage.includes('gas') || lowerCaseMessage.includes('fee'))) {
    return "Current gas prices on Ethereum:\n- Low: 25 gwei (~$2.50)\n- Average: 35 gwei (~$3.50)\n- High: 50 gwei (~$5.00)\n\nWould you like me to estimate gas costs for a specific transaction?"
  }
  
  if (lowerCaseMessage.includes('code') || lowerCaseMessage.includes('example')) {
    return "Here's an example of how to interact with the 1inch API using JavaScript:\n\n```javascript\nasync function getQuote(fromToken, toToken, amount) {\n  const response = await fetch(\n    `https://api.1inch.io/v5.0/1/quote?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}`\n  );\n  return await response.json();\n}\n```\n\nYou can use this to get price quotes before executing a swap."
  }
  
  return "I understand you're asking about " + userMessage.substring(0, 30) + "... How can I assist you with that using my DeFi tools?"
}