"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRoutes = void 0;
const logger_1 = require("../utils/logger");
const agentController_1 = require("../controllers/agentController");
const characterController_1 = require("../controllers/characterController");
const logger = logger_1.Logger.getInstance({
    level: process.env.LOG_LEVEL || 'info',
    module: 'routes',
});
/**
 * Initialize all API routes
 */
const initializeRoutes = (app) => {
    logger.info('Initializing routes');
    // Character endpoints
    app.get('/characters', characterController_1.listCharacters);
    app.get('/characters/:characterId', characterController_1.getCharacterDetails);
    app.post('/admin/characters', characterController_1.addCharacter);
    app.delete('/admin/characters/:characterId', characterController_1.deleteCharacter);
    // Agent interaction endpoints
    app.post('/initialize', agentController_1.initializeAgent);
    app.post('/chat', agentController_1.sendMessage);
    app.get('/viewresponse/:messageId', agentController_1.getResponse);
    app.post('/destruct', agentController_1.cleanupAgent);
    logger.info('Routes initialized');
};
exports.initializeRoutes = initializeRoutes;
