/**
 * NPC Management Routes
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const contextManager = require('../utils/contextManager');
const responseFormatter = require('../utils/responseFormatter');
const aiService = require('../services/aiService');

/**
 * Initialize a single NPC
 * POST /npc
 */
router.post('/', (req, res) => {
  const requestId = Date.now().toString();
  const npcData = req.body;

  logger.section('SINGLE NPC INITIALIZATION', requestId);
  logger.info(`Initializing NPC: ${npcData.name || 'Unknown'}`, requestId);

  if (!npcData || !npcData.name) {
    logger.error('Invalid NPC data: Missing name', requestId);
    logger.sectionEnd();
    return res.status(400).json({
      status: 'error',
      message: 'Please provide valid NPC data with at least a name'
    });
  }

  try {
    // Initialize the NPC and get its ID
    const npcId = contextManager.initializeNpc(npcData);

    logger.info(`Successfully initialized NPC: ${npcData.name} with ID: ${npcId}`, requestId);
    logger.sectionEnd();

    return res.json({
      status: 'success',
      message: `Initialized NPC: ${npcData.name}`,
      npc_id: npcId,
      npc_name: npcData.name
    });
  } catch (error) {
    logger.error(`Error initializing NPC: ${error.message}`, requestId, error);
    logger.sectionEnd();

    return res.status(500).json({
      status: 'error',
      message: `Failed to initialize NPC: ${error.message}`
    });
  }
});

/**
 * Initialize multiple NPCs (batch method)
 * POST /npc/initialize
 */
router.post('/initialize', (req, res) => {
  const requestId = Date.now().toString();
  const { npcs } = req.body;

  logger.section('NPC INITIALIZATION', requestId);
  logger.info(`Initializing ${npcs?.length || 0} NPCs`, requestId);

  if (!npcs || !Array.isArray(npcs) || npcs.length === 0) {
    logger.error('Invalid or empty NPCs array', requestId);
    return res.status(400).json({
      status: 'error',
      message: 'Please provide an array of NPC data'
    });
  }

  try {
    // Initialize all NPCs and get their IDs
    const npcIds = contextManager.initializeNpcs(npcs);

    logger.info(`Successfully initialized ${Object.keys(npcIds).length} NPCs`, requestId);
    logger.sectionEnd();

    return res.json({
      status: 'success',
      message: `Initialized ${Object.keys(npcIds).length} NPCs`,
      npc_ids: npcIds
    });
  } catch (error) {
    logger.error(`Error initializing NPCs: ${error.message}`, requestId, error);
    logger.sectionEnd();

    return res.status(500).json({
      status: 'error',
      message: `Failed to initialize NPCs: ${error.message}`
    });
  }
});

/**
 * Get NPC conversation history
 * GET /npc/:npcId/history
 */
router.get('/:npcId/history', (req, res) => {
  const { npcId } = req.params;
  const limit = parseInt(req.query.limit) || 0;

  const history = contextManager.getConversationHistory(npcId, limit);

  if (history === null) {
    return res.status(404).json({
      status: 'error',
      message: `NPC with ID ${npcId} not found`
    });
  }

  return res.json({
    status: 'success',
    npc_id: npcId,
    history
  });
});

/**
 * Clear NPC conversation history
 * DELETE /npc/:npcId/history
 */
router.delete('/:npcId/history', (req, res) => {
  const { npcId } = req.params;

  const success = contextManager.clearConversationHistory(npcId);

  if (!success) {
    return res.status(404).json({
      status: 'error',
      message: `NPC with ID ${npcId} not found`
    });
  }

  return res.json({
    status: 'success',
    message: `Cleared conversation history for NPC ${npcId}`
  });
});

/**
 * Get all NPCs summary
 * GET /npc/summary
 */
router.get('/summary', (req, res) => {
  const summaries = contextManager.getNpcSummaries();

  return res.json({
    status: 'success',
    count: summaries.length,
    npcs: summaries
  });
});

/**
 * Send message to NPC
 * POST /npc/:npcId/chat
 */
router.post('/:npcId/chat', async (req, res) => {
  const requestId = Date.now().toString();
  const { npcId } = req.params;
  const { message, options = {} } = req.body;

  logger.section('NPC CHAT REQUEST', requestId);
  logger.info(`NPC ID: ${npcId}`, requestId);
  logger.info(`Message: ${message}`, requestId);

  // Check if NPC exists
  const npcMetadata = contextManager.getNpcMetadata(npcId);
  if (!npcMetadata) {
    logger.error(`NPC with ID ${npcId} not found`, requestId);
    logger.sectionEnd();

    return res.status(404).json({
      status: 'error',
      message: `NPC with ID ${npcId} not found`
    });
  }

  if (!message) {
    logger.error('Missing message', requestId);
    logger.sectionEnd();

    return res.status(400).json({
      status: 'error',
      message: 'Message is required'
    });
  }

  try {
    // Add player message to history
    contextManager.addMessage(npcId, 'player', message);

    // Get conversation history
    const historyLimit = options.history_limit || 10;
    const formattedHistory = contextManager.formatHistoryForOpenAI(npcId, historyLimit);

    // Set default options for NPC chat
    const chatOptions = {
      model: options.model || 'gpt-4o-mini',
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: options.stream === true,
      response_format: 'json',
      prompt_name: options.prompt_name || 'gameCharacter'
    };

    // Create a custom system message with NPC context
    const customSystemMessage = `
You are roleplaying as ${npcMetadata.name}, a character in a game world.
${npcMetadata.description || ''}
${npcMetadata.backstory ? `Backstory: ${npcMetadata.backstory}` : ''}
${npcMetadata.personality ? `Personality: ${npcMetadata.personality}` : ''}
${npcMetadata.location ? `Current location: ${npcMetadata.location}` : ''}
${npcMetadata.currentState ? `Current state: ${npcMetadata.currentState}` : ''}

Your responses must be in valid JSON format with the following structure:
{
  "reply": "Your in-character response here as ${npcMetadata.name}",
  "playerResponseChoices": {
    "1": "Player response option 1",
    "2": "Player response option 2",
    "3": "Player response option 3"
  },
  "metadata": {
    "mood": "character's current mood",
    "location": "character's current location",
    "memory": "Important things to remember about this conversation"
  }
}

The "reply" and "playerResponseChoices" fields are required.
The "metadata" field is optional but recommended for tracking game state.
Ensure your response is valid JSON that can be parsed by JSON.parse().
`;

    // Add custom system message to options
    chatOptions.system_message = customSystemMessage;

    // Send to AI with history
    const startTime = Date.now();
    const aiResponse = await aiService.sendToAIWithHistory(
      message,
      formattedHistory,
      chatOptions,
      requestId
    );
    const responseTime = Date.now() - startTime;

    // Format the response
    const formattedResponse = responseFormatter.formatSuccessResponse(
      requestId,
      aiResponse,
      aiResponse.streaming === true,
      responseTime
    );

    // Extract the NPC reply from the response
    let npcReply = '';
    if (formattedResponse.data && formattedResponse.data.reply) {
      npcReply = formattedResponse.data.reply;

      // Update NPC metadata if provided
      if (formattedResponse.data.metadata) {
        contextManager.updateNpcMetadata(npcId, formattedResponse.data.metadata);
      }

      // Add NPC response to history
      contextManager.addMessage(npcId, 'npc', npcReply);
    }

    logger.info(`NPC response generated in ${responseTime}ms`, requestId);
    logger.sectionEnd();

    return res.json(formattedResponse);
  } catch (error) {
    logger.error(`Error in NPC chat: ${error.message}`, requestId, error);
    logger.sectionEnd();

    return res.status(500).json(
      responseFormatter.formatErrorResponse(requestId, error)
    );
  }
});

module.exports = router;
