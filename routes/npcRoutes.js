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

  // Log complete request information
  logger.info(`Complete request headers: ${JSON.stringify(req.headers)}`, requestId);
  logger.info(`Request method: ${req.method}`, requestId);
  logger.info(`Request URL: ${req.url}`, requestId);
  logger.info(`Request query parameters: ${JSON.stringify(req.query)}`, requestId);
  logger.info(`Request content type: ${req.get('Content-Type')}`, requestId);

  // Log raw body data exactly as received
  logger.info(`Raw request body: ${JSON.stringify(req.body, null, 2)}`, requestId);

  // Log all properties and their types
  const propertyTypes = {};
  for (const key in npcData) {
    propertyTypes[key] = {
      type: typeof npcData[key],
      isArray: Array.isArray(npcData[key]),
      value: npcData[key]
    };
  }
  logger.info(`NPC data property types: ${JSON.stringify(propertyTypes, null, 2)}`, requestId);

  if (!npcData || !npcData.name) {
    logger.error('Invalid NPC data: Missing name', requestId);
    logger.sectionEnd();
    return res.status(400).json({
      status: 'error',
      message: 'Please provide valid NPC data with at least a name'
    });
  }

  // Log the raw data for debugging
  logger.info(`Raw NPC data: ${JSON.stringify(npcData)}`, requestId);

  // Log relationships data specifically with extra detail
  if (npcData.relationships) {
    logger.info(`Raw relationships data: ${JSON.stringify(npcData.relationships)}`, requestId);
    logger.info(`Relationships data type: ${typeof npcData.relationships}`, requestId);
    logger.info(`Relationships instanceof Map: ${npcData.relationships instanceof Map}`, requestId);
    logger.info(`Relationships constructor name: ${npcData.relationships.constructor ? npcData.relationships.constructor.name : 'unknown'}`, requestId);

    if (typeof npcData.relationships === 'object') {
      logger.info(`Relationships keys: ${JSON.stringify(Object.keys(npcData.relationships))}`, requestId);

      // Check if it's the new format with type and value properties
      if (npcData.relationships.type === 'object' &&
          npcData.relationships.value &&
          typeof npcData.relationships.value === 'object') {

        logger.info(`Detected new relationship format with value object: ${JSON.stringify(npcData.relationships.value)}`, requestId);

        // Log the value object in detail
        Object.entries(npcData.relationships.value).forEach(([name, status], index) => {
          logger.info(`Relationship value entry ${index} - Name: ${name}, Status: ${status}`, requestId);
        });
      }

      // Log each relationship entry in detail
      Object.entries(npcData.relationships).forEach(([key, value], index) => {
        logger.info(`Relationship entry ${index} - Key: ${key}, Type: ${typeof value}, Value: ${JSON.stringify(value)}`, requestId);

        if (typeof value === 'object' && value !== null) {
          logger.info(`Relationship entry ${index} object keys: ${JSON.stringify(Object.keys(value))}`, requestId);
        }
      });
    }
  }

  // Also check for relationship field (singular)
  if (npcData.relationship) {
    logger.info(`Raw relationship (singular) data: ${JSON.stringify(npcData.relationship)}`, requestId);
    logger.info(`Relationship (singular) data type: ${typeof npcData.relationship}`, requestId);

    // Check if it's the new format with type and value properties
    if (typeof npcData.relationship === 'object' && npcData.relationship !== null) {
      logger.info(`Relationship (singular) is an object: ${JSON.stringify(npcData.relationship)}`, requestId);

      if (npcData.relationship.type === 'object' &&
          npcData.relationship.value &&
          typeof npcData.relationship.value === 'object') {

        logger.info(`Detected new relationship (singular) format with value object: ${JSON.stringify(npcData.relationship.value)}`, requestId);

        // Log the value object in detail
        Object.entries(npcData.relationship.value).forEach(([name, status], index) => {
          logger.info(`Relationship (singular) value entry ${index} - Name: ${name}, Status: ${status}`, requestId);
        });
      }
    }
  }

  try {
    // Initialize the NPC and get its ID (pass the request ID)
    const npcId = contextManager.initializeNpc(npcData, requestId);

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
    // Initialize all NPCs and get their IDs (pass the request ID)
    const npcIds = contextManager.initializeNpcs(npcs, requestId);

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
 * Debug endpoint to get raw NPC data including relationships
 * GET /npc/:npcIdOrName/debug
 */
router.get('/:npcIdOrName/debug', (req, res) => {
  const npcIdOrName = req.params.npcIdOrName;
  const requestId = Date.now().toString();

  logger.section('DEBUG NPC REQUEST', requestId);
  logger.info(`Getting debug data for NPC: ${npcIdOrName}`, requestId);

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

  // Get relationship network
  const relationshipNetwork = contextManager.getNpcRelationshipNetwork(actualNpcId);

  // Check for the original relationship field (singular)
  const originalRelationshipField = npcMetadata.relationship || null;

  // Log detailed information about the NPC's relationships
  logger.info(`NPC ${npcMetadata.name} relationships object: ${JSON.stringify(npcMetadata.relationships || {})}`, requestId);
  if (originalRelationshipField) {
    logger.info(`NPC ${npcMetadata.name} has original 'relationship' field: ${originalRelationshipField}`, requestId);
  }

  // Log all metadata keys for debugging
  logger.info(`NPC ${npcMetadata.name} metadata keys: ${JSON.stringify(Object.keys(npcMetadata))}`, requestId);

  // Return detailed debug information with enhanced debug info
  const response = {
    status: 'success',
    npc_id: actualNpcId,
    npc_name: npcMetadata.name,
    raw_metadata: npcMetadata,
    relationships_object: npcMetadata.relationships || {},
    relationship_network: relationshipNetwork,
    has_relationships: npcMetadata.relationships && Object.keys(npcMetadata.relationships).length > 0,
    relationship_count: npcMetadata.relationships ? Object.keys(npcMetadata.relationships).length : 0,
    debug_info: {
      original_relationship_field: originalRelationshipField,
      metadata_keys: Object.keys(npcMetadata),
      relationships_type: typeof npcMetadata.relationships,
      is_relationships_array: Array.isArray(npcMetadata.relationships)
    }
  };

  logger.info(`Returning debug data for NPC: ${npcMetadata.name}`, requestId);
  logger.sectionEnd();

  return res.json(response);
});

/**
 * Discover relationships for all NPCs
 * GET /npc/discover-relationships
 */
router.get('/discover-relationships', (req, res) => {
  const requestId = Date.now().toString();

  logger.section('MANUAL RELATIONSHIP DISCOVERY', requestId);
  logger.info('Manually triggered relationship discovery', requestId);

  // Discover relationships for all NPCs
  const result = contextManager.discoverAllNpcRelationships(requestId);

  logger.info(`Relationship discovery complete: ${result.total_direct_relationships} direct and ${result.total_indirect_relationships} indirect relationships found`, requestId);
  logger.sectionEnd();

  return res.json({
    status: 'success',
    message: 'Relationship discovery completed',
    timestamp: new Date().toISOString(),
    request_id: requestId,
    stats: result
  });
});

/**
 * Get relationship network for a specific NPC
 * GET /npc/:npcIdOrName/relationships
 */
router.get('/:npcIdOrName/relationships', (req, res) => {
  const npcIdOrName = req.params.npcIdOrName;

  // First, try to get NPC by ID
  let npcMetadata = contextManager.getNpcMetadata(npcIdOrName);
  let actualNpcId = npcIdOrName;

  // If not found by ID, try to find by name
  if (!npcMetadata) {
    const npcByName = contextManager.findNpcByName(npcIdOrName);

    if (npcByName) {
      actualNpcId = npcByName.id;
      npcMetadata = contextManager.getNpcMetadata(actualNpcId);
    }
  }

  // If still not found, return error
  if (!npcMetadata) {
    return res.status(404).json({
      status: 'error',
      message: `NPC with identifier ${npcIdOrName} not found`
    });
  }

  // Discover relationships for this NPC
  const relationships = contextManager.discoverNpcRelationships(actualNpcId);

  if (relationships.status === "error") {
    return res.status(500).json({
      status: 'error',
      message: relationships.message
    });
  }

  return res.json({
    status: 'success',
    npc_id: actualNpcId,
    npc_name: npcMetadata.name,
    relationships: relationships
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
      prompt_name: options.prompt_name || 'gameCharacter',
      discover_relationships: options.discover_relationships !== false // Default to true unless explicitly set to false
    };

    // Detect NPC names in the message and get relationships
    logger.info(`Checking for NPC names in message: "${message}"`, requestId);
    const detectedNpcData = contextManager.detectNpcNamesInMessage(actualNpcId, message, requestId);

    // Store detected relationships for context
    let mentionedNpcRelationships = [];

    if (detectedNpcData.detectedNpcs.length > 0) {
      logger.info(`Detected ${detectedNpcData.detectedNpcs.length} NPC names in message`, requestId);
      logger.info(`Found ${detectedNpcData.relationships.length} relationships with mentioned NPCs`, requestId);

      // Log the detected NPCs and relationships
      logger.debug(`Detected NPCs: ${JSON.stringify(detectedNpcData.detectedNpcs)}`, requestId);
      logger.debug(`Relationships: ${JSON.stringify(detectedNpcData.relationships)}`, requestId);

      // Store the relationships for context
      mentionedNpcRelationships = detectedNpcData.relationships;
    }

    // Get relationship network for additional context
    // If discover_relationships is true, trigger a fresh discovery first
    let relationshipNetwork;

    if (chatOptions.discover_relationships) {
      logger.info(`Triggering relationship discovery for ${npcMetadata.name} before chat`, requestId);
      // Discover relationships for this specific NPC
      const discoveryResult = contextManager.discoverNpcRelationships(actualNpcId);
      logger.info(`Relationship discovery complete: Found ${discoveryResult.stats.direct_relationships} direct and ${discoveryResult.stats.indirect_relationships} indirect relationships`, requestId);

      // Get the formatted network
      relationshipNetwork = contextManager.getNpcRelationshipNetwork(actualNpcId);
    } else {
      // Use cached relationship data
      relationshipNetwork = contextManager.getNpcRelationshipNetwork(actualNpcId);
    }

    // Log relationship information for debugging
    logger.info(`NPC ${npcMetadata.name} relationships:`, requestId);

    // Log detailed information about the NPC's metadata
    logger.info(`Complete NPC metadata: ${JSON.stringify(npcMetadata, null, 2)}`, requestId);
    logger.info(`NPC metadata keys: ${JSON.stringify(Object.keys(npcMetadata))}`, requestId);

    // Log detailed information about relationships
    if (npcMetadata.relationships) {
      logger.info(`Relationships object type: ${typeof npcMetadata.relationships}`, requestId);
      logger.info(`Relationships is array: ${Array.isArray(npcMetadata.relationships)}`, requestId);
      logger.info(`Relationships object keys: ${JSON.stringify(Object.keys(npcMetadata.relationships))}`, requestId);
      logger.info(`Direct relationships defined in metadata: ${JSON.stringify(npcMetadata.relationships, null, 2)}`, requestId);

      // Log each relationship entry in detail
      Object.entries(npcMetadata.relationships).forEach(([key, value], index) => {
        logger.info(`Relationship entry ${index} - Key: ${key}, Type: ${typeof value}, Value: ${JSON.stringify(value)}`, requestId);
      });
    } else {
      logger.info(`No relationships object found in metadata`, requestId);
    }

    // Log original relationship field if it exists
    if (npcMetadata.relationship) {
      logger.info(`Original relationship field (singular): ${npcMetadata.relationship}`, requestId);
      logger.info(`Original relationship field type: ${typeof npcMetadata.relationship}`, requestId);
    }

    if (relationshipNetwork) {
      logger.info(`Discovered direct relationships: ${relationshipNetwork.direct_relationships.length}`, requestId);
      logger.info(`Discovered indirect relationships: ${relationshipNetwork.indirect_relationships.length}`, requestId);
      logger.info(`Complete relationship network: ${JSON.stringify(relationshipNetwork, null, 2)}`, requestId);
    } else {
      logger.info(`No relationship network discovered`, requestId);
    }

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
` : 'You have no defined relationships with other NPCs yet.'}

${mentionedNpcRelationships.length > 0 ? `
NPCs mentioned in the current message:
${mentionedNpcRelationships.map(rel => {
  let mentionInfo = `- ${rel.npc2_name}: ${rel.npc1_to_npc2 !== 'none' ? 'You consider them ' + rel.npc1_to_npc2 : 'You have a neutral relationship with them'}`;

  // Add how they feel about you
  if (rel.npc2_to_npc1 !== 'none') {
    mentionInfo += `\n  They consider you ${rel.npc2_to_npc1}`;
  }

  return mentionInfo;
}).join('\n\n')}
` : ''}

${relationshipNetwork ? `
Detailed information about people you know:
${relationshipNetwork.direct_relationships.length > 0 ?
`${relationshipNetwork.direct_relationships.map(rel => {
  let relationshipInfo = `- ${rel.name}: ${rel.target_to_other !== 'none' ? 'You consider them ' + rel.target_to_other : 'You have a neutral relationship with them'}`;

  // Add metadata about the related NPC
  if (rel.description) relationshipInfo += `\n  Description: ${rel.description}`;
  if (rel.personality) relationshipInfo += `\n  Personality: ${rel.personality}`;
  if (rel.faction) relationshipInfo += `\n  Faction: ${rel.faction}`;
  if (rel.location) relationshipInfo += `\n  Location: ${rel.location}`;
  if (rel.currentState) relationshipInfo += `\n  Current activity: ${rel.currentState}`;

  // Add how they feel about you
  if (rel.other_to_target !== 'none') {
    relationshipInfo += `\n  They consider you ${rel.other_to_target}`;
  }

  return relationshipInfo;
}).join('\n\n')}
` : ''}

${relationshipNetwork.indirect_relationships.length > 0 ?
`People you might know through mutual connections:
${relationshipNetwork.indirect_relationships.map(rel => {
  let indirectInfo = `- ${rel.name}:`;

  // Add metadata about the indirect NPC
  if (rel.description) indirectInfo += `\n  Description: ${rel.description}`;
  if (rel.personality) indirectInfo += `\n  Personality: ${rel.personality}`;
  if (rel.faction) indirectInfo += `\n  Faction: ${rel.faction}`;
  if (rel.location) indirectInfo += `\n  Location: ${rel.location}`;

  // Add connection information
  indirectInfo += `\n  Connection: You both know ${rel.through}`;
  indirectInfo += `\n  Your relationship with ${rel.through}: ${rel.target_to_common}`;
  indirectInfo += `\n  ${rel.name}'s relationship with ${rel.through}: ${rel.other_to_common}`;

  return indirectInfo;
}).join('\n\n')}
` : ''}
` : ''}

Your responses must be in valid JSON format with the following structure:
{
  "reply": "Your in-character response here as ${npcMetadata.name}",
  "playerResponseChoices": {
    "1": "Player response option 1 (positive/good)",
    "2": "Player response option 2 (negative/bad)",
    "3": "Player response option 3 (chaotic/unpredictable)"
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
    },
    "npc_relationships": {
      "NPC_Name": "New relationship status"
    }
  }
}

When creating player response choices, follow these guidelines:
1. Option 1 should be a "good" or positive response that would generally improve relationships or lead to a positive outcome
2. Option 2 should be a "bad" or negative response that might damage relationships or lead to conflict
3. Option 3 should be a "chaotic" or unpredictable response that adds an interesting twist or unexpected direction to the conversation

This is especially important when the player is asking about other NPCs or sensitive topics. For example:
- Good option: Express support or share positive information about the mentioned NPC
- Bad option: Express criticism or share negative information about the mentioned NPC
- Chaotic option: Change the subject abruptly, ask a provocative question, or suggest an unusual action

IMPORTANT FORMATTING RULES:
1. Do NOT use any markdown formatting in your responses (no asterisks, underscores, etc.)
2. Do NOT use asterisks (*) for emphasis or to indicate actions
3. Do NOT use any special characters for formatting
4. Write all text in plain, natural language without any formatting symbols
5. Describe emotions and actions using plain text (e.g., "The blacksmith frowns" instead of "*frowns*")

The "reply" and "playerResponseChoices" fields are required.
The "metadata" field is optional but recommended for tracking game state.
The "player_relationship" field should reflect how this conversation affects your relationship with the player.
The "npc_relationships" field allows you to update your relationships with other NPCs based on the conversation.

IMPORTANT: If the player says something negative or positive about another NPC, you should consider updating your relationship with that NPC accordingly. For example:
- If the player says "Alfred is a thief who stole from the village", you might update your relationship with Alfred to "Distrustful" or "Suspicious"
- If the player says "Alfred helped save a child from drowning", you might update your relationship with Alfred to "Respectful" or "Admiring"

Use relationship statuses that reflect your character's personality and values. Common relationship statuses include:
- Friendly, Friends, Close Friends
- Respectful, Admiring
- Neutral
- Distrustful, Suspicious
- Dislikes, Hates, Enemies

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

    // Format the response with NPC data
    const formattedResponse = responseFormatter.formatSuccessResponse(
      requestId,
      aiResponse,
      aiResponse.streaming === true,
      responseTime,
      npcMetadata // Pass the NPC metadata to include player_relationship
    );

    // Extract the NPC reply from the response
    let npcReply = '';
    if (formattedResponse.data && formattedResponse.data.reply) {
      npcReply = formattedResponse.data.reply;

      // Update NPC metadata if provided
      if (formattedResponse.data.metadata) {
        contextManager.updateNpcMetadata(actualNpcId, formattedResponse.data.metadata);

        // Check for relationship updates
        if (formattedResponse.data.metadata.npc_relationships) {
          logger.info(`NPC relationship updates detected in response`, requestId);

          // Process each relationship update
          Object.entries(formattedResponse.data.metadata.npc_relationships).forEach(([npcName, relationshipStatus]) => {
            logger.info(`Updating relationship with ${npcName} to "${relationshipStatus}"`, requestId);

            // Update the relationship
            const updateSuccess = contextManager.updateNpcRelationship(
              actualNpcId,
              npcName,
              relationshipStatus,
              requestId
            );

            if (updateSuccess) {
              logger.info(`Successfully updated ${npcMetadata.name}'s relationship with ${npcName}`, requestId);
            } else {
              logger.warn(`Failed to update ${npcMetadata.name}'s relationship with ${npcName}`, requestId);
            }
          });
        }
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
