/**
 * Debug routes for the NPC Debug Dashboard
 */
const express = require('express');
const router = express.Router();
const contextManager = require('../utils/contextManager');
const logger = require('../utils/logger');

/**
 * Get all NPCs with detailed information
 * GET /debug/npcs
 */
router.get('/npcs', (req, res) => {
  const requestId = Date.now().toString();
  
  logger.section('DEBUG DASHBOARD REQUEST', requestId);
  logger.info('Getting all NPCs with detailed information', requestId);
  
  try {
    // Get all NPC IDs
    const npcIds = contextManager.getAllNpcIds();
    
    // Get detailed information for each NPC
    const npcs = npcIds.map(id => {
      const metadata = contextManager.getNpcMetadata(id);
      return {
        id,
        name: metadata.name,
        description: metadata.description,
        personality: metadata.personality,
        location: metadata.location,
        faction: metadata.faction,
        player_relationship: metadata.player_relationship,
        relationship_count: metadata.relationships ? Object.keys(metadata.relationships).length : 0,
        has_relationships: metadata.relationships && Object.keys(metadata.relationships).length > 0,
        conversation_count: contextManager.getConversationHistory(id).length
      };
    });
    
    logger.info(`Returning ${npcs.length} NPCs`, requestId);
    logger.sectionEnd();
    
    return res.json({
      status: 'success',
      count: npcs.length,
      npcs
    });
  } catch (error) {
    logger.error(`Error getting NPCs: ${error.message}`, requestId, error);
    logger.sectionEnd();
    
    return res.status(500).json({
      status: 'error',
      message: `Failed to get NPCs: ${error.message}`
    });
  }
});

/**
 * Get server statistics
 * GET /debug/stats
 */
router.get('/stats', (req, res) => {
  const requestId = Date.now().toString();
  
  logger.section('DEBUG STATS REQUEST', requestId);
  logger.info('Getting server statistics', requestId);
  
  try {
    // Get all NPC IDs
    const npcIds = contextManager.getAllNpcIds();
    
    // Calculate statistics
    let totalRelationships = 0;
    let totalConversations = 0;
    let npcsWithRelationships = 0;
    let npcsWithConversations = 0;
    
    npcIds.forEach(id => {
      const metadata = contextManager.getNpcMetadata(id);
      const conversationCount = contextManager.getConversationHistory(id).length;
      const relationshipCount = metadata.relationships ? Object.keys(metadata.relationships).length : 0;
      
      totalRelationships += relationshipCount;
      totalConversations += conversationCount;
      
      if (relationshipCount > 0) npcsWithRelationships++;
      if (conversationCount > 0) npcsWithConversations++;
    });
    
    const stats = {
      npc_count: npcIds.length,
      total_relationships: totalRelationships,
      total_conversations: totalConversations,
      npcs_with_relationships: npcsWithRelationships,
      npcs_with_conversations: npcsWithConversations,
      avg_relationships_per_npc: npcIds.length > 0 ? (totalRelationships / npcIds.length).toFixed(2) : 0,
      avg_conversations_per_npc: npcIds.length > 0 ? (totalConversations / npcIds.length).toFixed(2) : 0,
      server_start_time: logger.getServerStartTime(),
      session_id: logger.getSessionId(),
      log_file: logger.getLogFileName()
    };
    
    logger.info('Returning server statistics', requestId);
    logger.sectionEnd();
    
    return res.json({
      status: 'success',
      stats
    });
  } catch (error) {
    logger.error(`Error getting server statistics: ${error.message}`, requestId, error);
    logger.sectionEnd();
    
    return res.status(500).json({
      status: 'error',
      message: `Failed to get server statistics: ${error.message}`
    });
  }
});

/**
 * Get global relationship network
 * GET /debug/relationship-network
 */
router.get('/relationship-network', (req, res) => {
  const requestId = Date.now().toString();
  
  logger.section('DEBUG RELATIONSHIP NETWORK REQUEST', requestId);
  logger.info('Getting global relationship network', requestId);
  
  try {
    // Get all NPC IDs
    const npcIds = contextManager.getAllNpcIds();
    
    // Create nodes and links for the network
    const nodes = [];
    const links = [];
    const nodeMap = new Map(); // Map to track which nodes have been added
    
    // Add all NPCs as nodes
    npcIds.forEach(id => {
      const metadata = contextManager.getNpcMetadata(id);
      nodes.push({
        id,
        name: metadata.name,
        group: metadata.faction || 'none'
      });
      nodeMap.set(metadata.name, id);
    });
    
    // Add relationships as links
    npcIds.forEach(id => {
      const metadata = contextManager.getNpcMetadata(id);
      const relationships = metadata.relationships || {};
      
      Object.entries(relationships).forEach(([targetName, relationship]) => {
        // Check if the target NPC exists
        const targetId = nodeMap.get(targetName);
        
        if (targetId) {
          links.push({
            source: id,
            target: targetId,
            relationship,
            value: 1
          });
        } else {
          // If the target NPC doesn't exist, add it as a placeholder node
          const placeholderId = `placeholder-${targetName}`;
          if (!nodeMap.has(targetName)) {
            nodes.push({
              id: placeholderId,
              name: targetName,
              group: 'placeholder',
              isPlaceholder: true
            });
            nodeMap.set(targetName, placeholderId);
          }
          
          links.push({
            source: id,
            target: placeholderId,
            relationship,
            value: 1
          });
        }
      });
    });
    
    logger.info(`Returning network with ${nodes.length} nodes and ${links.length} links`, requestId);
    logger.sectionEnd();
    
    return res.json({
      status: 'success',
      network: {
        nodes,
        links
      }
    });
  } catch (error) {
    logger.error(`Error getting relationship network: ${error.message}`, requestId, error);
    logger.sectionEnd();
    
    return res.status(500).json({
      status: 'error',
      message: `Failed to get relationship network: ${error.message}`
    });
  }
});

/**
 * Get recent conversations across all NPCs
 * GET /debug/recent-conversations
 */
router.get('/recent-conversations', (req, res) => {
  const requestId = Date.now().toString();
  const limit = parseInt(req.query.limit) || 10;
  
  logger.section('DEBUG RECENT CONVERSATIONS REQUEST', requestId);
  logger.info(`Getting ${limit} recent conversations across all NPCs`, requestId);
  
  try {
    // Get all NPC IDs
    const npcIds = contextManager.getAllNpcIds();
    
    // Get conversations from all NPCs
    const allConversations = [];
    
    npcIds.forEach(id => {
      const metadata = contextManager.getNpcMetadata(id);
      const conversations = contextManager.getConversationHistory(id);
      
      conversations.forEach(message => {
        allConversations.push({
          npc_id: id,
          npc_name: metadata.name,
          ...message
        });
      });
    });
    
    // Sort by timestamp (newest first)
    allConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit the number of conversations
    const recentConversations = allConversations.slice(0, limit);
    
    logger.info(`Returning ${recentConversations.length} recent conversations`, requestId);
    logger.sectionEnd();
    
    return res.json({
      status: 'success',
      count: recentConversations.length,
      conversations: recentConversations
    });
  } catch (error) {
    logger.error(`Error getting recent conversations: ${error.message}`, requestId, error);
    logger.sectionEnd();
    
    return res.status(500).json({
      status: 'error',
      message: `Failed to get recent conversations: ${error.message}`
    });
  }
});

module.exports = router;
