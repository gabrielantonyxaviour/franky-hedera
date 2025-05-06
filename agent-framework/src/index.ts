export * from './agent'
export { createHederaTools } from './langchain'
export * as tools from './langchain'
export * as apiUtils from './utils/api-utils';
export * from './utils/hts-format-utils';
export * from './types';
export * from "./tools"

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Logger, logger } from './utils/logger';
import { initializeRoutes } from './routes';
import { setupCharacterRegistry } from './services/registryService';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info('SERVER', `${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize API routes
initializeRoutes(app);

// Start the server
const startServer = async () => {
  try {
    // Initialize the character registry
    await setupCharacterRegistry();

    // Start the server
    app.listen(port, () => {
      logger.info('SERVER', `Server running on port ${port}`);
    });
  } catch (error) {
    logger.error('SERVER', 'Failed to start server:', error);
    process.exit(1);
  }
};

startServer();