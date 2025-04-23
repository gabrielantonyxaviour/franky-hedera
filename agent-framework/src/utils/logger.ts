import * as dotenv from 'dotenv';

dotenv.config();

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Default log level from environment or INFO
const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL 
  ? parseInt(process.env.LOG_LEVEL) 
  : LogLevel.INFO;

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  
  private constructor() {
    this.logLevel = DEFAULT_LOG_LEVEL;
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  private formatMessage(level: string, context: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level.padEnd(5)}] [${context.padEnd(15)}] ${message}`;
    
    if (data) {
      let dataStr: string;
      try {
        // Handle circular references
        dataStr = JSON.stringify(data, (key, value) => {
          if (key && typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        }, 2);
      } catch (e) {
        dataStr = String(data);
      }
      formattedMessage += `\nDATA: ${dataStr}`;
    }
    
    return formattedMessage;
  }
  
  debug(context: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', context, message, data);
      console.debug(formattedMessage);
    }
  }
  
  info(context: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', context, message, data);
      console.info(formattedMessage);
    }
  }
  
  warn(context: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', context, message, data);
      console.warn(formattedMessage);
    }
  }
  
  error(context: string, message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', context, message, {
        message: error?.message,
        stack: error?.stack,
        ...(typeof error === 'object' && error !== null ? error : {})
      });
      console.error(formattedMessage);
    }
  }
  
  // Specialized method for tracing tool calls
  toolCall(toolName: string, params: any, result?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('TOOL', toolName, 'Tool call', {
        params,
        result: result || 'pending'
      });
      console.debug(formattedMessage);
    }
  }
  
  // Method for logging model usage
  modelUsage(modelName: string, action: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('MODEL', modelName, action, data);
      console.info(formattedMessage);
    }
  }
  
  // Method for tracing agent decisions
  agentDecision(action: string, reasoning: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('AGENT', action, reasoning, data);
      console.debug(formattedMessage);
    }
  }
}

// Global logger instance
export const logger = Logger.getInstance();

// Helper for seen objects (dealing with circular references)
const seen = new WeakSet(); 