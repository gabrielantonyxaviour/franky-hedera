"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const langchainAgent_1 = require("./utils/langchainAgent");
(0, vitest_1.describe)("Test connection with Langchain", () => {
    (0, vitest_1.it)("Test connection with Langchain", async () => {
        try {
            const agent = await langchainAgent_1.LangchainAgent.create();
            const conversation = await agent.sendPrompt({
                text: "Hello world!",
            });
            const response = conversation.messages[conversation.messages.length - 1].content;
            (0, vitest_1.expect)(response).toBeTruthy();
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    });
});
