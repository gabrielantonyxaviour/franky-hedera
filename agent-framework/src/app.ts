import express from 'express';
import cors from 'cors';
import agentRoutes from './routes/agentRoutes';
import { logger } from './utils/logger';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  logger.info('APP', `${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/agents', agentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('APP', `Error: ${err.message}`, err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('APP', `Server running on port ${PORT}`);
});

export default app; 