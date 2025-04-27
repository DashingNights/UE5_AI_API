/**
 * Context Manager for maintaining conversation history
 * Manages separate context windows for different NPCs and game entities
 */
const crypto = require('crypto');
const logger = require('./logger');

// In-memory storage for NPC contexts
// Format: { npcId: { metadata: {...}, conversations: [...] } }
const npcContexts = new Map();

/**
 * Initialize an NPC with metadata
 * @param {Object} npcData - NPC information (name, backstory, etc.)
 * @returns {string} - Generated NPC ID
 */
function initializeNpc(npcData) {
  // Generate a unique ID for this NPC
  const npcId = crypto.randomUUID();
  
  // Store NPC data with empty conversation history
  npcContexts.set(npcId, {
    metadata: npcData,
    conversations: []
  });
  
  logger.info(`Initialized NPC: ${npcData.name} (${npcId})`);
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

module.exports = {
  initializeNpc,
  initializeNpcs,
  addMessage,
  getConversationHistory,
  formatHistoryForOpenAI,
  getNpcMetadata,
  updateNpcMetadata,
  clearConversationHistory,
  removeNpc,
  getAllNpcIds,
  getNpcSummaries
};
