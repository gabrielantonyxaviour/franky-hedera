"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_topic_messages = void 0;
const api_utils_1 = require("../../../utils/api-utils");
/**
 * Method for fetching messages for a given topic between timestamps. Messages are paginated, with 100 messages per page.
 * @param topicId id of requested topic
 * @param networkType network on which requested topic is hosted
 * @param lowerTimestamp optional unix timestamp in format seconds.milliseconds.
 * @param upperTimestamp optional unix timestamp in format seconds.milliseconds.
 */
const get_topic_messages = async (topicId, networkType, lowerTimestamp, upperTimestamp) => {
    const baseUrl = (0, api_utils_1.createBaseMirrorNodeApiUrl)(networkType);
    const lowerThreshold = lowerTimestamp ? `&timestamp=gte:${lowerTimestamp}` : '';
    const upperThreshold = upperTimestamp ? `&timestamp=lte:${upperTimestamp}` : '';
    let url = `${baseUrl}/api/v1/topics/${topicId.toString()}/messages?encoding=UTF-8&limit=100&order=desc${lowerThreshold}${upperThreshold}`;
    const array = new Array();
    let test = 0;
    try {
        while (url) { // Results are paginated
            test += 1;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. Message: ${response.statusText}`);
            }
            const data = await response.json();
            array.push(...data.messages);
            // Update URL for pagination.
            // This endpoint does not return a full path to the next page, it has to be built first
            url = data.links.next ? baseUrl + data.links.next : null;
        }
    }
    catch (error) {
        console.error("Failed to fetch topic messages. Error:", error);
        throw error;
    }
    return array;
};
exports.get_topic_messages = get_topic_messages;
