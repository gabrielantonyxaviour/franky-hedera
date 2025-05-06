"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangchainAgent = void 0;
const messages_1 = require("@langchain/core/messages");
const utils_1 = require("./utils");
class LangchainAgent {
    constructor(agent, config) {
        this.agent = agent;
        this.config = config;
    }
    static async create() {
        const { agent, config } = await (0, utils_1.initializeAgent)();
        return new LangchainAgent(agent, config);
    }
    async sendPrompt(prompt, isCustodial) {
        const updatedConfig = isCustodial
            ? { ...this.config, configurable: { ...this.config.configurable, isCustodial } }
            : this.config;
        const response = await this.agent.invoke({
            messages: [new messages_1.HumanMessage(prompt.text)],
        }, updatedConfig);
        return response;
    }
}
exports.LangchainAgent = LangchainAgent;
