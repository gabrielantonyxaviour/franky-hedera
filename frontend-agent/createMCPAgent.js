const createMCPAgent = async () => {
  const tools = createHederaTools({
    isCustodial: IS_CUSTODIAL,
    operatorId: process.env.OPERATOR_ID,
    operatorKey: process.env.OPERATOR_KEY,
    custodialClientId: process.env.CUSTODIAL_CLIENT_ID,
    custodialClientSecret: process.env.CUSTODIAL_CLIENT_SECRET,
    hederaNetwork: process.env.HEDERA_NETWORK
  });

  const mcpClient = new MCPOpenAIClient(
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_MODEL || 'gpt-4o',
    tools,
    process.env.MCP_URL
  );

  return mcpClient;
}; 