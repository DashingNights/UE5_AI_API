/**
 * Context Manager for maintaining conversation history
 * Manages separate context windows for different NPCs and game entities
 */
const crypto = require('crypto');
const logger = require('./logger');

// In-memory storage for NPC contexts
// Format: { npcId: { metadata: {...}, conversations: [...] } }
const npcContexts = new Map();

// Debug configuration
const DEBUG_CONFIG = {
  // Enable periodic logging of all NPC data
  enablePeriodicLogging: true,
  // Log interval in milliseconds (default: 5 minutes)
  logIntervalMs: 5 * 60 * 1000
};

/**
 * Initialize an NPC with metadata
 * @param {Object} npcData - NPC information (name, backstory, etc.)
 * @returns {string} - Generated NPC ID
 */
function initializeNpc(npcData) {
  // Generate a unique ID for this NPC
  const npcId = crypto.randomUUID();

  // Ensure we have a dedicated player relationship property
  const enhancedData = { ...npcData };

  // Add player_relationship if not present
  if (!enhancedData.player_relationship) {
    enhancedData.player_relationship = {
      status: "neutral",
      affinity: 50,  // 0-100 scale: 0=hostile, 50=neutral, 100=friendly
      trust: 50,     // 0-100 scale
      respect: 50,   // 0-100 scale
      history: []    // Array of significant interactions
    };
  }

  // Ensure relationships object exists
  if (!enhancedData.relationships) {
    enhancedData.relationships = {};
  }

  // Store NPC data with empty conversation history
  npcContexts.set(npcId, {
    metadata: enhancedData,
    conversations: []
  });

  logger.info(`Initialized NPC: ${enhancedData.name} (${npcId})`);
  return npcId;
}

/**
 * Initialize multiple NPCs at once
 * @param {Array} npcsData - Array of NPC information objects
 * @returns {Object} - Map of NPC names to their IDs
 */
function initializeNpcs(npcsData) {
  const npcIds = {};

  npcsData.forEach(npcData => {
    const id = initializeNpc(npcData);
    npcIds[npcData.name] = id;
  });

  logger.info(`Initialized ${npcsData.length} NPCs`);
  return npcIds;
}

/**
 * Add a message to an NPC's conversation history
 * @param {string} npcId - NPC identifier
 * @param {string} role - Message role ('player' or 'npc')
 * @param {string} content - Message content
 * @returns {boolean} - Success status
 */
function addMessage(npcId, role, content) {
  if (!npcContexts.has(npcId)) {
    logger.error(`Cannot add message: NPC ${npcId} not found`);
    return false;
  }

  const npcContext = npcContexts.get(npcId);

  // Add message with timestamp
  npcContext.conversations.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });

  // Update the context
  npcContexts.set(npcId, npcContext);
  return true;
}

/**
 * Get conversation history for an NPC
 * @param {string} npcId - NPC identifier
 * @param {number} limit - Maximum number of messages to retrieve (0 for all)
 * @returns {Array|null} - Conversation history or null if NPC not found
 */
function getConversationHistory(npcId, limit = 0) {
  if (!npcContexts.has(npcId)) {
    logger.error(`Cannot get history: NPC ${npcId} not found`);
    return null;
  }

  const npcContext = npcContexts.get(npcId);
  const conversations = npcContext.conversations;

  // Return all or limited history
  return limit > 0 ? conversations.slice(-limit) : conversations;
}

/**
 * Format conversation history for OpenAI API
 * @param {string} npcId - NPC identifier
 * @param {number} limit - Maximum number of messages to include
 * @returns {Array} - Formatted messages for OpenAI API
 */
function formatHistoryForOpenAI(npcId, limit = 10) {
  const history = getConversationHistory(npcId, limit);

  if (!history) {
    return [];
  }

  // Convert to OpenAI message format
  return history.map(msg => ({
    role: msg.role === 'npc' ? 'assistant' : 'user',
    content: msg.content
  }));
}

/**
 * Get NPC metadata
 * @param {string} npcId - NPC identifier
 * @returns {Object|null} - NPC metadata or null if not found
 */
function getNpcMetadata(npcId) {
  if (!npcContexts.has(npcId)) {
    return null;
  }

  return npcContexts.get(npcId).metadata;
}

/**
 * Find an NPC by name
 * @param {string} name - NPC name to search for
 * @returns {Object|null} - NPC data including ID or null if not found
 */
function findNpcByName(name) {
  // Case-insensitive search
  const searchName = name.toLowerCase();

  for (const [id, data] of npcContexts.entries()) {
    if (data.metadata.name.toLowerCase() === searchName) {
      return {
        id,
        ...data.metadata
      };
    }
  }

  return null;
}

/**
 * Get relationship between two NPCs (supports both IDs and names)
 * @param {string} npcId1OrName - First NPC ID or name
 * @param {string} npcId2OrName - Second NPC ID or name
 * @returns {Object} - Relationship information
 */
function getNpcRelationship(npcId1OrName, npcId2OrName) {
  // Try to get NPCs by ID first
  let npc1 = getNpcMetadata(npcId1OrName);
  let npc2 = getNpcMetadata(npcId2OrName);

  // If not found by ID, try by name
  if (!npc1) {
    const npcByName = findNpcByName(npcId1OrName);
    if (npcByName) {
      npc1 = getNpcMetadata(npcByName.id);
    }
  }

  if (!npc2) {
    const npcByName = findNpcByName(npcId2OrName);
    if (npcByName) {
      npc2 = getNpcMetadata(npcByName.id);
    }
  }

  // If either NPC is still not found, return error
  if (!npc1 || !npc2) {
    return {
      status: "unknown",
      error: "One or both NPCs not found",
      npc1_found: !!npc1,
      npc2_found: !!npc2,
      npc1_identifier: npcId1OrName,
      npc2_identifier: npcId2OrName
    };
  }

  // Check if NPC1 has a relationship with NPC2
  const relationFromNpc1 = npc1.relationships && npc1.relationships[npc2.name];

  // Check if NPC2 has a relationship with NPC1
  const relationFromNpc2 = npc2.relationships && npc2.relationships[npc1.name];

  return {
    npc1_id: npc1.id || npcId1OrName,
    npc2_id: npc2.id || npcId2OrName,
    npc1_name: npc1.name,
    npc2_name: npc2.name,
    npc1_to_npc2: relationFromNpc1 || "none",
    npc2_to_npc1: relationFromNpc2 || "none",
    is_mutual: relationFromNpc1 === relationFromNpc2 && relationFromNpc1 !== undefined,
    is_conflicting: relationFromNpc1 !== relationFromNpc2 && relationFromNpc1 !== undefined && relationFromNpc2 !== undefined
  };
}

/**
 * Update NPC metadata
 * @param {string} npcId - NPC identifier
 * @param {Object} updates - Metadata fields to update
 * @returns {boolean} - Success status
 */
function updateNpcMetadata(npcId, updates) {
  if (!npcContexts.has(npcId)) {
    logger.error(`Cannot update metadata: NPC ${npcId} not found`);
    return false;
  }

  const npcContext = npcContexts.get(npcId);
  npcContext.metadata = { ...npcContext.metadata, ...updates };
  npcContexts.set(npcId, npcContext);

  return true;
}

/**
 * Clear conversation history for an NPC
 * @param {string} npcId - NPC identifier
 * @returns {boolean} - Success status
 */
function clearConversationHistory(npcId) {
  if (!npcContexts.has(npcId)) {
    logger.error(`Cannot clear history: NPC ${npcId} not found`);
    return false;
  }

  const npcContext = npcContexts.get(npcId);
  npcContext.conversations = [];
  npcContexts.set(npcId, npcContext);

  logger.info(`Cleared conversation history for NPC ${npcId}`);
  return true;
}

/**
 * Remove an NPC and all its data
 * @param {string} npcId - NPC identifier
 * @returns {boolean} - Success status
 */
function removeNpc(npcId) {
  if (!npcContexts.has(npcId)) {
    logger.error(`Cannot remove: NPC ${npcId} not found`);
    return false;
  }

  npcContexts.delete(npcId);
  logger.info(`Removed NPC ${npcId}`);
  return true;
}

/**
 * Get all active NPC IDs
 * @returns {Array} - Array of NPC IDs
 */
function getAllNpcIds() {
  return Array.from(npcContexts.keys());
}

/**
 * Get summary of all NPCs
 * @returns {Array} - Array of NPC summaries
 */
function getNpcSummaries() {
  return Array.from(npcContexts.entries()).map(([id, data]) => ({
    id,
    name: data.metadata.name,
    messageCount: data.conversations.length
  }));
}

/**
 * Log all NPC data for debugging purposes
 * @param {string} requestId - Request ID for logging
 */
function logAllNpcData(requestId = Date.now().toString()) {
  logger.section('DEBUG: ALL NPC DATA', requestId);
  logger.info(`Total NPCs in memory: ${npcContexts.size}`, requestId);

  Array.from(npcContexts.entries()).forEach(([id, data]) => {
    const { metadata, conversations } = data;

    logger.info(`\n----- NPC ID: ${id} -----`, requestId);
    logger.info(`Name: ${metadata.name}`, requestId);
    logger.info(`Description: ${metadata.description || 'N/A'}`, requestId);

    // Log basic metadata
    const basicMetadata = {
      personality: metadata.personality || 'N/A',
      location: metadata.location || 'N/A',
      currentState: metadata.currentState || 'N/A',
      faction: metadata.faction || 'N/A'
    };

    logger.info(`Basic Metadata: ${JSON.stringify(basicMetadata, null, 2)}`, requestId);

    // Log player relationship if it exists
    if (metadata.player_relationship) {
      logger.info(`Player Relationship: ${JSON.stringify(metadata.player_relationship, null, 2)}`, requestId);
    }

    // Log relationships with other NPCs if they exist
    if (metadata.relationships && Object.keys(metadata.relationships).length > 0) {
      logger.info(`NPC Relationships: ${JSON.stringify(metadata.relationships, null, 2)}`, requestId);
    }

    // Log conversation summary
    logger.info(`Conversation Count: ${conversations.length}`, requestId);
    if (conversations.length > 0) {
      logger.info(`Last Conversation: ${JSON.stringify(conversations[conversations.length - 1], null, 2)}`, requestId);
    }

    // Log full data in debug level
    logger.debug(`Full NPC Data: ${JSON.stringify(data, null, 2)}`, requestId);
  });

  logger.sectionEnd();
}

/**
 * Start periodic logging of NPC data
 */
function startPeriodicLogging() {
  if (DEBUG_CONFIG.enablePeriodicLogging) {
    logger.info(`Starting periodic NPC data logging every ${DEBUG_CONFIG.logIntervalMs / 1000} seconds`);

    // Set up interval for periodic logging
    setInterval(() => {
      const requestId = `periodic-${Date.now()}`;
      logger.section('PERIODIC NPC DATA LOG', requestId);
      logger.info(`Automatic periodic logging at ${new Date().toISOString()}`, requestId);
      logAllNpcData(requestId);
      logger.sectionEnd();
    }, DEBUG_CONFIG.logIntervalMs);
  }
}

// Start periodic logging if enabled
if (DEBUG_CONFIG.enablePeriodicLogging) {
  startPeriodicLogging();
}

module.exports = {
  initializeNpc,
  initializeNpcs,
  addMessage,
  getConversationHistory,
  formatHistoryForOpenAI,
  getNpcMetadata,
  findNpcByName,
  getNpcRelationship,
  updateNpcMetadata,
  clearConversationHistory,
  removeNpc,
  getAllNpcIds,
  getNpcSummaries,
  logAllNpcData,
  startPeriodicLogging
};
