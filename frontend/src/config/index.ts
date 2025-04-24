import { networkConfig } from "./networks";
import { AppConfig } from "./types";
import * as constants from "./constants";

export * from "./types";

export const appConfig: AppConfig & {
  constants: typeof constants
} = {
  networks: networkConfig,
  constants
}