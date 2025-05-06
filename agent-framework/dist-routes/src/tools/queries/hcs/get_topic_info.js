"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_topic_info = void 0;
const api_utils_1 = require("../../../utils/api-utils");
const get_topic_info = async (topicId, networkType) => {
    const baseUrl = (0, api_utils_1.createBaseMirrorNodeApiUrl)(networkType);
    const url = `${baseUrl}/api/v1/topics/${topicId.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data) {
        throw new Error("Could not find or fetch topic info");
    }
    return data;
};
exports.get_topic_info = get_topic_info;
