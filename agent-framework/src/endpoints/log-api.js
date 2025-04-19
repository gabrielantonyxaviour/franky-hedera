import express from 'express';
import chalk from 'chalk';

export const router = express.Router();

// Log API endpoint for client-side logs to be displayed in the server terminal
router.post('/log', (request, response) => {
    const { source, message, level = 'info' } = request.body;
    
    if (!source || !message) {
        return response.status(400).send({ error: 'Missing required parameters: source, message' });
    }
    
    const timestamp = new Date().toISOString();
    
    // Format the log message with colored output based on level
    let formattedMessage = '';
    switch (level) {
        case 'error':
            formattedMessage = chalk.red(`[${timestamp}] [${source}] ERROR: ${message}`);
            break;
        case 'warn':
            formattedMessage = chalk.yellow(`[${timestamp}] [${source}] WARN: ${message}`);
            break;
        case 'info':
        default:
            formattedMessage = chalk.blue(`[${timestamp}] [${source}] INFO: ${message}`);
            break;
    }
    
    // Log to server console
    console.log(formattedMessage);
    
    return response.status(200).send({ success: true });
}); 