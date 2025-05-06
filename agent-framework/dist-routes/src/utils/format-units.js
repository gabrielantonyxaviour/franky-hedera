"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromDisplayToBaseUnit = fromDisplayToBaseUnit;
exports.fromBaseToDisplayUnit = fromBaseToDisplayUnit;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
function fromDisplayToBaseUnit(displayBalance, decimals) {
    return displayBalance * 10 ** decimals;
}
function fromBaseToDisplayUnit(baseBalance, decimals) {
    const decimalsBigNumber = new bignumber_js_1.default(decimals);
    const divisor = new bignumber_js_1.default(10).pow(decimalsBigNumber);
    const bigValue = bignumber_js_1.default.isBigNumber(baseBalance)
        ? baseBalance
        : new bignumber_js_1.default(baseBalance);
    return bigValue.dividedBy(divisor);
}
