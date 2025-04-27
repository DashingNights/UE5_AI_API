/**
 * Game Administrator Routes
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const responseFormatter = require('../utils/responseFormatter');
const aiService = require('../services/aiService');

// In-memory storage for game variables
const gameVariables = new Map();

/**
 * Process admin command
 * POST /admin/command
 */
router.post('/command', async (req, res) => {
  const requestId = Date.now().toString();
  const { command, options = {} } = req.body;
  
  logger.section('ADMIN COMMAND', requestId);
  logger.info(`Command: ${command}`, requestId);
  
  if (!command) {
    logger.error('Missing command', requestId);
    logger.sectionEnd();
    
    return res.status(400).json({
      status: 'error',
      message: 'Command is required'
    });
  }
  
  try {
    // Set default options for admin commands
    const adminOptions = {
      model: options.model || 'gpt-4o-mini',
      temperature: options.temperature || 0.3, // Lower temperature for more consistent responses
      max_tokens: options.max_tokens || 10000,
      stream: false, // Admin commands should not stream
      response_format: 'json',
      prompt_name: 'gameAdmin'
    };
    
    // Add current game variables to the command
    const gameVarsJson = JSON.stringify(Object.fromEntries(gameVariables));
    const commandWithContext = `Current game variables: ${gameVarsJson}\n\nCommand: ${command}`;
    
    // Send to AI
    const startTime = Date.now();
    const aiResponse = await aiService.sendToAI(commandWithContext, adminOptions, requestId);
    const responseTime = Date.now() - startTime;
    
    // Format the response
    const formattedResponse = responseFormatter.formatSuccessResponse(
      requestId,
      aiResponse,
      false,
      responseTime
    );
    
    // Process any variable changes from the response
    if (formattedResponse.data && formattedResponse.data.variables) {
      const variables = formattedResponse.data.variables;
      
      // Update game variables
      Object.entries(variables).forEach(([key, value]) => {
        gameVariables.set(key, value);
        logger.info(`Updated game variable: ${key} = ${value}`, requestId);
      });
    }
    
    logger.info(`Admin command processed in ${responseTime}ms`, requestId);
    logger.sectionEnd();
    
    return res.json(formattedResponse);
  } catch (error) {
    logger.error(`Error processing admin command: ${error.message}`, requestId, error);
    logger.sectionEnd();
    
    return res.status(500).json(
      responseFormatter.formatErrorResponse(requestId, error)
    );
  }
});

/**
 * Get all game variables
 * GET /admin/variables
 */
router.get('/variables', (req, res) => {
  return res.json({
    status: 'success',
    variables: Object.fromEntries(gameVariables)
  });
});

/**
 * Set a game variable
 * POST /admin/variables
 */
router.post('/variables', (req, res) => {
  const { variables } = req.body;
  
  if (!variables || typeof variables !== 'object') {
    return res.status(400).json({
      status: 'error',
      message: 'Variables object is required'
    });
  }
  
  // Update variables
  Object.entries(variables).forEach(([key, value]) => {
    gameVariables.set(key, value);
  });
  
  return res.json({
    status: 'success',
    message: `Updated ${Object.keys(variables).length} variables`,
    variables: Object.fromEntries(gameVariables)
  });
});

/**
 * Delete a game variable
 * DELETE /admin/variables/:key
 */
router.delete('/variables/:key', (req, res) => {
  const { key } = req.params;
  
  if (gameVariables.has(key)) {
    gameVariables.delete(key);
    return res.json({
      status: 'success',
      message: `Variable ${key} deleted`
    });
  } else {
    return res.status(404).json({
      status: 'error',
      message: `Variable ${key} not found`
    });
  }
});

module.exports = router;
