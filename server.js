/**
 * Server startup
 */
require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const promptManager = require('./utils/promptManager');

// Start server
app.listen(config.port, () => {
  logger.section('SERVER STARTED');
  logger.info(`Time: ${new Date().toISOString()}`);
  logger.info(`Session ID: ${logger.getSessionId()}`);
  logger.info(`Log file: ${logger.getLogFileName()}`);
  logger.info(`Running on http://localhost:${config.port}`);
  logger.info(`Default model: ${config.openai.defaultModel}`);
  logger.info(`Default prompt: ${config.openai.defaultPromptName}`);
  logger.info(`Default response format: ${config.openai.defaultResponseFormat}`);
  logger.info(`API Key present: ${!!config.openai.apiKey}`);
  logger.info(`Available prompts: ${promptManager.getAvailablePrompts().join(', ')}`);
  logger.info(`Log level: ${config.logging.level}`);
  logger.sectionEnd();
});
