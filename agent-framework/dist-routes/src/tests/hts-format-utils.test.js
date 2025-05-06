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
const vitest_1 = require("vitest");
const testnetClient_1 = require("./utils/testnetClient");
const dotenv = __importStar(require("dotenv"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const hts_format_utils_1 = require("../utils/hts-format-utils");
const utils_1 = require("./utils/utils");
(0, vitest_1.describe)("Token Unit Conversion Functions", () => {
    let networkClientWrapper;
    let tokenDecimals0; // Token with 0 decimals
    let tokenDecimals2; // Token with 2 decimals
    let tokenDecimals8; // Token with 8 decimals
    const networkType = "testnet";
    // Configure BigNumber to show all digits
    bignumber_js_1.default.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: bignumber_js_1.default.ROUND_DOWN });
    (0, vitest_1.beforeAll)(async () => {
        dotenv.config();
        try {
            // Create network client for interacting with Hedera
            networkClientWrapper = new testnetClient_1.NetworkClientWrapper(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY, process.env.HEDERA_PUBLIC_KEY, process.env.HEDERA_KEY_TYPE, "testnet");
            // Create three tokens with different decimal places
            tokenDecimals0 = await networkClientWrapper.createFT({
                name: "ZeroDecimalToken",
                symbol: "ZDT",
                initialSupply: 1000,
                decimals: 0,
            });
            tokenDecimals2 = await networkClientWrapper.createFT({
                name: "TwoDecimalToken",
                symbol: "TDT",
                initialSupply: 1000,
                decimals: 2,
            });
            tokenDecimals8 = await networkClientWrapper.createFT({
                name: "EightDecimalToken",
                symbol: "EDT",
                initialSupply: 1000,
                decimals: 8,
            });
            // Wait for token creation to be processed
            await (0, utils_1.wait)(5000);
            console.log("Created test tokens:", {
                tokenDecimals0,
                tokenDecimals2,
                tokenDecimals8
            });
        }
        catch (error) {
            console.error("Error in setup:", error);
            throw error;
        }
    });
    (0, vitest_1.describe)("getHTSDecimals", () => {
        (0, vitest_1.it)("should correctly fetch token decimals", async () => {
            // Test token with 0 decimals
            const decimals0 = await (0, hts_format_utils_1.getHTSDecimals)(tokenDecimals0, networkType);
            (0, vitest_1.expect)(decimals0).toEqual("0");
            // Test token with 2 decimals
            const decimals2 = await (0, hts_format_utils_1.getHTSDecimals)(tokenDecimals2, networkType);
            (0, vitest_1.expect)(decimals2).toEqual("2");
            // Test token with 8 decimals
            const decimals8 = await (0, hts_format_utils_1.getHTSDecimals)(tokenDecimals8, networkType);
            (0, vitest_1.expect)(decimals8).toEqual("8");
        });
        (0, vitest_1.it)("should handle non-existent tokens gracefully", async () => {
            try {
                await (0, hts_format_utils_1.getHTSDecimals)("0.0.999999999", networkType);
                (0, vitest_1.expect)(true).toBe(false);
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeDefined();
            }
        });
    });
    (0, vitest_1.describe)("toDisplayUnit", () => {
        (0, vitest_1.it)("should convert base units to display units for 0 decimal token", async () => {
            // For 0 decimals, the base and display values should be the same
            const baseValue = new bignumber_js_1.default(100);
            const displayValue = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals0, baseValue, networkType);
            (0, vitest_1.expect)(displayValue.toString()).toEqual("100");
        });
        (0, vitest_1.it)("should convert base units to display units for 2 decimal token", async () => {
            // For 2 decimals, 100 base units = 1.00 display units
            const baseValue = new bignumber_js_1.default(100);
            const displayValue = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals2, baseValue, networkType);
            (0, vitest_1.expect)(displayValue.toString()).toEqual("1");
            // Test another value
            const baseValue2 = new bignumber_js_1.default(12345);
            const displayValue2 = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals2, baseValue2, networkType);
            (0, vitest_1.expect)(displayValue2.toString()).toEqual("123.45");
        });
        (0, vitest_1.it)("should convert base units to display units for 8 decimal token", async () => {
            // For 8 decimals, 100000000 base units = 1.00000000 display units
            const baseValue = new bignumber_js_1.default(100000000);
            const displayValue = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals8, baseValue, networkType);
            (0, vitest_1.expect)(displayValue.toString()).toEqual("1");
            // Test fractional amounts
            const baseValue2 = new bignumber_js_1.default(123456789);
            const displayValue2 = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals8, baseValue2, networkType);
            (0, vitest_1.expect)(displayValue2.toString()).toEqual("1.23456789");
        });
        (0, vitest_1.it)("should handle number inputs correctly", async () => {
            // Test with regular number instead of BigNumber
            const baseValue = 12345;
            const displayValue = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals2, baseValue, networkType);
            (0, vitest_1.expect)(displayValue.toString()).toEqual("123.45");
        });
        (0, vitest_1.it)("should return 0 for invalid tokens", async () => {
            const displayValue = await (0, hts_format_utils_1.toDisplayUnit)("0.0.999999999", 100, networkType);
            (0, vitest_1.expect)(displayValue.toString()).toEqual("0");
        });
    });
    (0, vitest_1.describe)("toBaseUnit", () => {
        (0, vitest_1.it)("should convert display units to base units for 0 decimal token", async () => {
            // For 0 decimals, display and base should be the same
            const displayValue = new bignumber_js_1.default(100);
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals0, displayValue, networkType);
            (0, vitest_1.expect)(baseValue.toString()).toEqual("100");
        });
        (0, vitest_1.it)("should convert display units to base units for 2 decimal token", async () => {
            // For 2 decimals, 1.00 display units = 100 base units
            const displayValue = new bignumber_js_1.default(1);
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals2, displayValue, networkType);
            (0, vitest_1.expect)(baseValue.toString()).toEqual("100");
            // Test fractional amounts
            const displayValue2 = new bignumber_js_1.default(123.45);
            const baseValue2 = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals2, displayValue2, networkType);
            (0, vitest_1.expect)(baseValue2.toString()).toEqual("12345");
        });
        (0, vitest_1.it)("should convert display units to base units for 8 decimal token", async () => {
            // For 8 decimals, 1.00000000 display units = 100000000 base units
            const displayValue = new bignumber_js_1.default(1);
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals8, displayValue, networkType);
            (0, vitest_1.expect)(baseValue.toString()).toEqual("100000000");
            // Test with many decimal places
            const displayValue2 = new bignumber_js_1.default(1.23456789);
            const baseValue2 = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals8, displayValue2, networkType);
            (0, vitest_1.expect)(baseValue2.toString()).toEqual("123456789");
        });
        (0, vitest_1.it)("should handle number inputs correctly", async () => {
            // Test with regular number instead of BigNumber
            const displayValue = 123.45;
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals2, displayValue, networkType);
            (0, vitest_1.expect)(baseValue.toString()).toEqual("12345");
        });
        (0, vitest_1.it)("should handle very small fractional values", async () => {
            // Very small fraction that tests precision
            const displayValue = new bignumber_js_1.default("0.00000001");
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals8, displayValue, networkType);
            (0, vitest_1.expect)(baseValue.toString()).toEqual("1");
        });
        (0, vitest_1.it)("should return 0 for invalid tokens", async () => {
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)("0.0.999999999", 100, networkType);
            (0, vitest_1.expect)(baseValue.toString()).toEqual("0");
        });
    });
    (0, vitest_1.describe)("Conversion roundtrip", () => {
        (0, vitest_1.it)("should return the original value after roundtrip conversion", async () => {
            const originalDisplay = new bignumber_js_1.default(123.456789);
            const baseValue = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals8, originalDisplay, networkType);
            const roundtripDisplay = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals8, baseValue, networkType);
            (0, vitest_1.expect)(roundtripDisplay.toString()).toEqual("123.456789");
        });
        (0, vitest_1.it)("should handle multiple roundtrips consistently", async () => {
            // Start with base value
            const originalBase = new bignumber_js_1.default(12345678);
            // Base → Display → Base
            const displayValue = await (0, hts_format_utils_1.toDisplayUnit)(tokenDecimals2, originalBase, networkType);
            const roundtripBase = await (0, hts_format_utils_1.toBaseUnit)(tokenDecimals2, displayValue, networkType);
            (0, vitest_1.expect)(roundtripBase.toString()).toEqual(originalBase.toString());
        });
    });
});
