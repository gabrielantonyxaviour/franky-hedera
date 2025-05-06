import { Router } from 'express';
import * as agentController from '../controllers/agentController';

const router = Router();

// Agent initialization and management
router.post('/initialize', agentController.initializeAgent);
router.post('/connect', agentController.connectToAgent);
router.post('/message', agentController.sendMessage);
router.post('/monitor', agentController.startAgentMonitor);
router.post('/fee-config', agentController.createFeeConfig);

export default router; 