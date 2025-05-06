import { Express } from 'express';
import { Logger, logger } from '../utils/logger';
import { 
  initializeAgent, 
  sendMessage, 
  getResponse, 
  cleanupAgent 
} from '../controllers/agentController';
import { 
  listCharacters, 
  getCharacterDetails,
  addCharacter,
  deleteCharacter,
  importCharacter
} from '../controllers/characterController';

const CONTEXT_ROUTES = 'ROUTES';

/**
 * Initialize all API routes
 */
export const initializeRoutes = (app: Express) => {
  logger.info(CONTEXT_ROUTES, 'Initializing routes');

  // Character endpoints
  app.get('/characters', listCharacters);
  app.get('/characters/:characterId', getCharacterDetails);
  app.post('/admin/characters', addCharacter);
  app.post('/admin/characters/import', importCharacter);
  app.delete('/admin/characters/:characterId', deleteCharacter);

  // Agent interaction endpoints
  app.post('/initialize', initializeAgent);
  app.post('/chat', sendMessage);
  app.get('/viewresponse/:messageId', getResponse);
  app.post('/destruct', cleanupAgent);

  logger.info(CONTEXT_ROUTES, 'Routes initialized');
}; 