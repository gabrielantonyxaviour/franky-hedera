"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtsTokenDetails = exports.getHTSDecimals = exports.toBaseUnit = exports.toDisplayUnit = void 0;
const tools_1 = require("../tools");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const toDisplayUnit = async (tokenId, value, networkType) => {
    try {
        const decimalsString = await (0, exports.getHTSDecimals)(tokenId, networkType);
        const decimals = new bignumber_js_1.default(decimalsString);
        const divisor = new bignumber_js_1.default(10).pow(decimals);
        const bigValue = bignumber_js_1.default.isBigNumber(value) ? value : new bignumber_js_1.default(value);
        return bigValue.dividedBy(divisor);
    }
    catch (error) {
        console.error("Failed to convert base unit to display unit:", error);
        return new bignumber_js_1.default(0);
    }
};
exports.toDisplayUnit = toDisplayUnit;
const toBaseUnit = async (tokenId, displayValue, networkType) => {
    try {
        const decimalsString = await (0, exports.getHTSDecimals)(tokenId, networkType);
        const decimals = new bignumber_js_1.default(decimalsString);
        const multiplier = new bignumber_js_1.default(10).pow(decimals);
        const bigDisplayValue = bignumber_js_1.default.isBigNumber(displayValue)
            ? displayValue
            : new bignumber_js_1.default(displayValue);
        return bigDisplayValue.multipliedBy(multiplier);
    }
    catch (error) {
        console.error("Failed to convert display unit to base unit:", error);
        return new bignumber_js_1.default(0);
    }
};
exports.toBaseUnit = toBaseUnit;
const getHTSDecimals = async (tokenId, networkType) => {
    return (await (0, tools_1.get_hts_token_details)(tokenId, networkType)).decimals;
};
exports.getHTSDecimals = getHTSDecimals;
const getHtsTokenDetails = async (tokenId, networkType) => {
    return (0, tools_1.get_hts_token_details)(tokenId, networkType);
};
exports.getHtsTokenDetails = getHtsTokenDetails;
