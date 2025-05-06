"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
/**
 * Logger utility for consistent logging throughout the application
 */
class Logger {
    constructor(config = {}) {
        this.module = config.module || 'app';
        const level = config.level || 'info';
        const prettyPrint = config.prettyPrint !== undefined ? config.prettyPrint : true;
        const format = prettyPrint
            ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf((info) => `${info.timestamp} [${info.level}] [${this.module}] ${info.message}`))
            : winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
        this.logger = winston_1.default.createLogger({
            level,
            format,
            transports: [new winston_1.default.transports.Console()],
        });
    }
    /**
     * Get or create the logger instance
     */
    static getInstance(config = {}) {
        if (!Logger.instance) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }
    /**
     * Log a debug message
     */
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    /**
     * Log an info message
     */
    info(message, meta) {
        this.logger.info(message, meta);
    }
    /**
     * Log a warning message
     */
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    /**
     * Log an error message
     */
    error(message, meta) {
        this.logger.error(message, meta);
    }
}
exports.Logger = Logger;
