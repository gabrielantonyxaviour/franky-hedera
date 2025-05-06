"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertStringToTimestamp = convertStringToTimestamp;
function convertStringToTimestamp(input) {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
    }
    const timestamp = date.getTime();
    return parseFloat((timestamp / 1000).toFixed(6));
}
