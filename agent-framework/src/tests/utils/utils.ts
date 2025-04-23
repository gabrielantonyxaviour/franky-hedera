import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import * as dotenv from "dotenv";
import HederaAgentKit from "../../agent";
import { createHederaTools } from "../../langchain";

dotenv.config();

export function fromTinybarToHbar(valueInTinyBar: number): number {
    return valueInTinyBar / 10 ** 8;
}

export function fromBaseToDisplayUnit(
    rawBalance: number,
    decimals: number
): number {
    return rawBalance / 10 ** decimals;
}

export function fromDisplayToBaseUnit(
    displayBalance: number,
    decimals: number
): number {
    return displayBalance * 10 ** decimals;
}


export async function initializeAgent() {
  try {
    const llm = new ChatOpenAI({
      modelName: "o3-mini",
    });

    // Initialize HederaAgentKit
    const hederaKit = new HederaAgentKit(
        process.env.HEDERA_ACCOUNT_ID!,
        process.env.HEDERA_PRIVATE_KEY!,
        process.env.HEDERA_PUBLIC_KEY || undefined,
        // Pass your network of choice. Default is "mainnet".
        // You can specify 'testnet', 'previewnet', or 'mainnet'.
        process.env.HEDERA_NETWORK_TYPE as "mainnet" | "testnet" | "previewnet" || "testnet"
    );

    // Create the LangChain-compatible tools
    const tools = createHederaTools(hederaKit);

    // Prepare an in-memory checkpoint saver
    const memory = new MemorySaver();

    // Additional configuration for the agent
    const config = { configurable: { thread_id: "1" } };

    // Create the React agent
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      // You can adjust this message for your scenario:
      messageModifier: `
        You are a helpful agent that can interact on-chain using the Hedera Agent Kit. 
        You are empowered to interact on-chain using your tools. If you ever need funds,
        you can request them from a faucet or from the user. 
        If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
        If someone asks you to do something you can't do with your available tools, you 
        must say so, and encourage them to implement it themselves with the Hedera Agent Kit. 
        Keep your responses concise and helpful.
      `,
    });

    return { agent, config };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

