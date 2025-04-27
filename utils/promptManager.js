/**
 * Prompt manager for loading and managing system prompts
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Cache for loaded prompts
const promptCache = new Map();

// Default prompts directory
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

/**
 * Load a prompt from file
 * @param {string} promptName - Name of the prompt file (without extension)
 * @returns {string} - Prompt content
 */
function loadPrompt(promptName) {
  // Check if prompt is already cached
  if (promptCache.has(promptName)) {
    return promptCache.get(promptName);
  }

  const promptPath = path.join(PROMPTS_DIR, `${promptName}.txt`);
  
  try {
    const promptContent = fs.readFileSync(promptPath, 'utf8');
    // Cache the prompt
    promptCache.set(promptName, promptContent);
    logger.debug(`Loaded prompt: ${promptName}`);
    return promptContent;
  } catch (error) {
    logger.error(`Failed to load prompt: ${promptName}`, null, error);
    // Return a fallback prompt
    return "You are a helpful assistant.";
  }
}

/**
 * Get all available prompts
 * @returns {string[]} - Array of prompt names (without extension)
 */
function getAvailablePrompts() {
  try {
    const files = fs.readdirSync(PROMPTS_DIR);
    return files
      .filter(file => file.endsWith('.txt'))
      .map(file => file.replace('.txt', ''));
  } catch (error) {
    logger.error('Failed to read prompts directory', null, error);
    return [];
  }
}

/**
 * Create a JSON format instruction prompt
 * @param {Object} schema - JSON schema definition
 * @returns {string} - Formatted prompt for JSON response
 */
function createJsonFormatPrompt(schema) {
  return `
You must respond in JSON format according to this schema:
${JSON.stringify(schema, null, 2)}

Your response must be valid JSON that can be parsed by JSON.parse().
Do not include any explanations, only provide a RFC8259 compliant JSON response.
`;
}

module.exports = {
  loadPrompt,
  getAvailablePrompts,
  createJsonFormatPrompt
};
