/**
 * Application configuration
 */
const path = require('path');
const promptManager = require('./utils/promptManager');

// Environment variables with defaults
const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.DEFAULT_MODEL || "gpt-4o-mini",
    defaultPromptName: process.env.DEFAULT_PROMPT || "defaultBehaviour",
    defaultResponseFormat: process.env.RESPONSE_FORMAT || "text", // "text" or "json"
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "INFO",
    directory: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  }
};

// Load the default system message
config.openai.systemMessage = promptManager.loadPrompt(config.openai.defaultPromptName);

module.exports = config;
