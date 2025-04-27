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

    // Log all NPC data after initialization for debugging
    contextManager.logAllNpcData(requestId);

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
 * Get NPC conversation history (supports both UUID and name)
 * GET /npc/:npcIdOrName/history
 */
router.get('/:npcIdOrName/history', (req, res) => {
  const npcIdOrName = req.params.npcIdOrName;
  const limit = parseInt(req.query.limit) || 0;

  // First, try to get history by ID
  let history = contextManager.getConversationHistory(npcIdOrName, limit);
  let actualNpcId = npcIdOrName;

  // If not found by ID, try to find by name
  if (history === null) {
    const npcByName = contextManager.findNpcByName(npcIdOrName);

    if (npcByName) {
      actualNpcId = npcByName.id;
      history = contextManager.getConversationHistory(actualNpcId, limit);
    }
  }

  // If still not found, return error
  if (history === null) {
    return res.status(404).json({
      status: 'error',
      message: `NPC with identifier ${npcIdOrName} not found`
    });
  }

  return res.json({
    status: 'success',
    npc_id: actualNpcId,
    npc_name: contextManager.getNpcMetadata(actualNpcId).name,
    history
  });
});

/**
 * Clear NPC conversation history (supports both UUID and name)
 * DELETE /npc/:npcIdOrName/history
 */
router.delete('/:npcIdOrName/history', (req, res) => {
  const npcIdOrName = req.params.npcIdOrName;

  // First, try to clear history by ID
  let success = contextManager.clearConversationHistory(npcIdOrName);
  let actualNpcId = npcIdOrName;
  let npcName = npcIdOrName;

  // If not found by ID, try to find by name
  if (!success) {
    const npcByName = contextManager.findNpcByName(npcIdOrName);

    if (npcByName) {
      actualNpcId = npcByName.id;
      npcName = npcByName.name;
      success = contextManager.clearConversationHistory(actualNpcId);
    }
  } else {
    // If found by ID, get the name
    const npcMetadata = contextManager.getNpcMetadata(npcIdOrName);
    if (npcMetadata) {
      npcName = npcMetadata.name;
    }
  }

  // If still not found, return error
  if (!success) {
    return res.status(404).json({
      status: 'error',
      message: `NPC with identifier ${npcIdOrName} not found`
    });
  }

  return res.json({
    status: 'success',
    message: `Cleared conversation history for NPC ${npcName} (ID: ${actualNpcId})`
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
 * Debug endpoint to log all NPC data
 * GET /npc/debug/log
 */
router.get('/debug/log', (req, res) => {
  const requestId = Date.now().toString();

  logger.section('DEBUG REQUEST', requestId);
  logger.info('Logging all NPC data to log file', requestId);

  // Log all NPC data
  contextManager.logAllNpcData(requestId);

  // Also trigger a periodic log
  const currentTime = new Date().toISOString();
  logger.info(`Debug log triggered at ${currentTime}`, requestId);
  logger.sectionEnd();

  return res.json({
    status: 'success',
    message: 'All NPC data has been written to the log file',
    timestamp: currentTime,
    request_id: requestId
  });
});

/**
 * Get relationship between two NPCs
 * GET /npc/relationship?npc1=:npcId1&npc2=:npcId2
 */
router.get('/relationship', (req, res) => {
  const { npc1, npc2 } = req.query;

  if (!npc1 || !npc2) {
    return res.status(400).json({
      status: 'error',
      message: 'Both npc1 and npc2 parameters are required'
    });
  }

  // Get relationship information
  const relationship = contextManager.getNpcRelationship(npc1, npc2);

  if (relationship.error) {
    return res.status(404).json({
      status: 'error',
      message: relationship.error
    });
  }

  return res.json({
    status: 'success',
    relationship
  });
});

/**
 * Find NPC by name
 * GET /npc/find?name=:name
 */
router.get('/find', (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({
      status: 'error',
      message: 'Name parameter is required'
    });
  }

  // Find NPC by name
  const npc = contextManager.findNpcByName(name);

  if (!npc) {
    return res.status(404).json({
      status: 'error',
      message: `No NPC found with name: ${name}`
    });
  }

  return res.json({
    status: 'success',
    npc
  });
});

/**
 * Send message to NPC (supports both UUID and name)
 * POST /npc/:npcIdOrName/chat
 */
router.post('/:npcIdOrName/chat', async (req, res) => {
  const requestId = Date.now().toString();
  const npcIdOrName = req.params.npcIdOrName;
  const { message, options = {} } = req.body;

  logger.section('NPC CHAT REQUEST', requestId);
  logger.info(`NPC Identifier: ${npcIdOrName}`, requestId);
  logger.info(`Message: ${message}`, requestId);

  // First, try to get NPC by ID
  let npcMetadata = contextManager.getNpcMetadata(npcIdOrName);
  let actualNpcId = npcIdOrName;

  // If not found by ID, try to find by name
  if (!npcMetadata) {
    logger.info(`NPC not found by ID, trying to find by name: ${npcIdOrName}`, requestId);
    const npcByName = contextManager.findNpcByName(npcIdOrName);

    if (npcByName) {
      actualNpcId = npcByName.id;
      npcMetadata = contextManager.getNpcMetadata(actualNpcId);
      logger.info(`Found NPC by name. Using ID: ${actualNpcId}`, requestId);
    }
  }

  // If still not found, return error
  if (!npcMetadata) {
    logger.error(`NPC with identifier ${npcIdOrName} not found`, requestId);
    logger.sectionEnd();

    return res.status(404).json({
      status: 'error',
      message: `NPC with identifier ${npcIdOrName} not found`
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
    contextManager.addMessage(actualNpcId, 'player', message);

    // Get conversation history
    const historyLimit = options.history_limit || 10;
    const formattedHistory = contextManager.formatHistoryForOpenAI(actualNpcId, historyLimit);

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

${npcMetadata.player_relationship ? `Your relationship with the player:
- Status: ${npcMetadata.player_relationship.status}
- Affinity: ${npcMetadata.player_relationship.affinity}/100
- Trust: ${npcMetadata.player_relationship.trust}/100
- Respect: ${npcMetadata.player_relationship.respect}/100
` : ''}

${npcMetadata.relationships && Object.keys(npcMetadata.relationships).length > 0 ?
`Your relationships with other NPCs:
${Object.entries(npcMetadata.relationships).map(([name, status]) => `- ${name}: ${status}`).join('\n')}
` : ''}

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
    "memory": "Important things to remember about this conversation",
    "player_relationship": {
      "status": "updated relationship status (friendly, neutral, hostile, etc.)",
      "affinity": 50,
      "trust": 50,
      "respect": 50,
      "history": ["Optional new significant interaction to remember"]
    }
  }
}

The "reply" and "playerResponseChoices" fields are required.
The "metadata" field is optional but recommended for tracking game state.
The "player_relationship" field should reflect how this conversation affects your relationship with the player.
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
        contextManager.updateNpcMetadata(actualNpcId, formattedResponse.data.metadata);
      }

      // Add NPC response to history
      contextManager.addMessage(actualNpcId, 'npc', npcReply);
    }

    logger.info(`NPC response generated in ${responseTime}ms`, requestId);

    // Log NPC data after chat for debugging
    logger.info(`Logging NPC data after chat with ${npcIdOrName} (ID: ${actualNpcId})`, requestId);
    contextManager.logAllNpcData(requestId);

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
