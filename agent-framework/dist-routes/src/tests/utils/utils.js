"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = void 0;
exports.fromTinybarToHbar = fromTinybarToHbar;
exports.fromBaseToDisplayUnit = fromBaseToDisplayUnit;
exports.fromDisplayToBaseUnit = fromDisplayToBaseUnit;
exports.initializeAgent = initializeAgent;
const openai_1 = require("@langchain/openai");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const dotenv = __importStar(require("dotenv"));
const agent_1 = __importDefault(require("../../agent"));
const langchain_1 = require("../../langchain");
dotenv.config();
function fromTinybarToHbar(valueInTinyBar) {
    return valueInTinyBar / 10 ** 8;
}
function fromBaseToDisplayUnit(rawBalance, decimals) {
    return rawBalance / 10 ** decimals;
}
function fromDisplayToBaseUnit(displayBalance, decimals) {
    return displayBalance * 10 ** decimals;
}
async function initializeAgent() {
    try {
        const llm = new openai_1.ChatOpenAI({
            modelName: "o3-mini",
        });
        // Initialize HederaAgentKit
        const hederaKit = new agent_1.default(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY || undefined, 
        // Pass your network of choice. Default is "mainnet".
        // You can specify 'testnet', 'previewnet', or 'mainnet'.
        process.env.HEDERA_NETWORK_TYPE || "testnet");
        // Create the LangChain-compatible tools
        const tools = (0, langchain_1.createHederaTools)(hederaKit);
        // Prepare an in-memory checkpoint saver
        const memory = new langgraph_1.MemorySaver();
        // Additional configuration for the agent
        const config = { configurable: { thread_id: "1" } };
        // Create the React agent
        const agent = (0, prebuilt_1.createReactAgent)({
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
    }
    catch (error) {
        console.error("Failed to initialize agent:", error);
        throw error;
    }
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.wait = wait;
