import { AgentKitActionName } from "../../types";

export interface BaseResult<T> {
    actionName: string;
    getStringifiedResponse(): string;
    getRawResponse(): T;
    getName(): AgentKitActionName;
}
