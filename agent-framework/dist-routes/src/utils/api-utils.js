"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBaseMirrorNodeApiUrl = void 0;
const createBaseMirrorNodeApiUrl = (networkType) => {
    const networkBase = networkType === 'mainnet' ? `${networkType}-public` : networkType;
    return `https://${networkBase}.mirrornode.hedera.com`;
};
exports.createBaseMirrorNodeApiUrl = createBaseMirrorNodeApiUrl;
