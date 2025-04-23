import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
        },
        testTimeout: 240000,
        hookTimeout: 240000,
        maxConcurrency: 1,
        fileParallelism: false,
    },
});
