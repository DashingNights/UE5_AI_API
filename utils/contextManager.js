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
  logIntervalMs: 5 * 60 * 1000,
  // Enable automatic relationship discovery
  enableAutoRelationshipDiscovery: true,
  // Relationship discovery interval in milliseconds (default: 10 minutes)
  relationshipDiscoveryIntervalMs: 10 * 60 * 1000
};

/**
 * Initialize an NPC with metadata
 * @param {Object} npcData - NPC information (name, backstory, etc.)
 * @param {string} [requestId] - Optional request ID for logging
 * @returns {string} - Generated NPC ID
 */
function initializeNpc(npcData, requestId = Date.now().toString()) {
  // Log function entry
  logger.functionEntry('initializeNpc', { npcName: npcData.name }, requestId);

  // Check if an NPC with this name already exists
  const existingNpc = findNpcByName(npcData.name);

  if (existingNpc) {
    logger.warn(`NPC with name "${npcData.name}" already exists with ID ${existingNpc.id}. Replacing with new data.`, requestId);

    // Log the existing NPC data for reference
    logger.functionStep('initializeNpc', 'Existing NPC data', {
      id: existingNpc.id,
      name: existingNpc.name,
      metadata_keys: Object.keys(existingNpc)
    }, requestId);

    // Remove the existing NPC
    removeNpc(existingNpc.id);
    logger.info(`Removed existing NPC "${npcData.name}" with ID ${existingNpc.id}`, requestId);
  }

  // Generate a unique ID for this NPC
  const npcId = crypto.randomUUID();
  logger.functionStep('initializeNpc', 'Generated new NPC ID', { npcId }, requestId);

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

  // Initialize relationships if not present
  if (!enhancedData.relationships) {
    enhancedData.relationships = {};
  }

  // Log all fields for debugging
  logger.info(`NPC ${enhancedData.name} initialization - all fields: ${JSON.stringify(Object.keys(enhancedData))}`);

  // Check for relationship field (singular)
  if (enhancedData.relationship) {
    // Handle different types of relationship data
    if (typeof enhancedData.relationship === 'object' && enhancedData.relationship !== null) {
      logger.info(`NPC ${enhancedData.name} has 'relationship' field as an object: ${JSON.stringify(enhancedData.relationship)}`);

      // Check if it's the new format with type and value properties
      if (enhancedData.relationship.type === 'object' &&
          enhancedData.relationship.value &&
          typeof enhancedData.relationship.value === 'object') {

        logger.info(`Detected new relationship format with value object: ${JSON.stringify(enhancedData.relationship.value)}`);

        // Extract relationships from the value object
        Object.entries(enhancedData.relationship.value).forEach(([name, status]) => {
          if (name && status) {
            enhancedData.relationships[name] = status;
            logger.info(`Extracted relationship from value object: ${name} -> ${status}`);
          }
        });
      } else {
        // Handle direct object format (without type/value wrapper)
        logger.info(`Relationship appears to be a direct object, trying to extract relationships`);

        Object.entries(enhancedData.relationship).forEach(([key, value]) => {
          // Skip metadata properties
          if (key !== 'type' && key !== 'isArray') {
            if (typeof value === 'string') {
              enhancedData.relationships[key] = value;
              logger.info(`Extracted direct object relationship: ${key} -> ${value}`);
            } else if (typeof value === 'object' && value !== null) {
              // Handle nested objects
              Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                if (typeof nestedValue === 'string') {
                  enhancedData.relationships[nestedKey] = nestedValue;
                  logger.info(`Extracted nested relationship: ${nestedKey} -> ${nestedValue}`);
                }
              });
            }
          }
        });
      }
    } else if (typeof enhancedData.relationship === 'string') {
      logger.warn(`NPC ${enhancedData.name} has 'relationship' field (singular) as string: ${enhancedData.relationship}`);

      try {
      // Enhanced handling for complex relationship strings:
      // Handles formats like:
      // "Girlfriend\": \"Respectful\",\"Alfred\": \"Hates"
      // "A:a","B,b" (where commas can appear within values)
      if (enhancedData.relationship.includes('\\\"')) {
        logger.info(`Detected relationship string with escaped quotes: ${enhancedData.relationship}`);

        // First, clean up the string by removing escaped quotes
        const cleanStr = enhancedData.relationship.replace(/\\"/g, '"').replace(/\\/g, '');
        logger.info(`Cleaned relationship string: ${cleanStr}`);

        // Use a more sophisticated approach to extract key-value pairs
        // This regex looks for patterns like "key":"value" or "key": "value"
        // and handles cases where values might contain commas
        try {
          // Method 1: Use regex to find all "key":"value" patterns
          const relationshipRegex = /"([^"]+)":\s*"([^"]*)"/g;
          let match;
          let foundAny = false;

          while ((match = relationshipRegex.exec(cleanStr)) !== null) {
            foundAny = true;
            const name = match[1].trim();
            const status = match[2].trim();

            if (name && status) {
              logger.info(`Successfully extracted relationship using regex: ${name} -> ${status}`);
              enhancedData.relationships[name] = status;
            }
          }

          // If regex didn't find anything, try alternative methods
          if (!foundAny) {
            logger.info(`Regex didn't find any relationships, trying alternative methods`);

            // Method 2: Try to reconstruct the string as valid JSON and parse it
            try {
              // Add curly braces to make it a valid JSON object
              const jsonStr = `{${cleanStr}}`;
              logger.info(`Attempting to parse as JSON: ${jsonStr}`);

              const jsonObj = JSON.parse(jsonStr);

              // Extract relationships from the parsed JSON
              Object.entries(jsonObj).forEach(([name, status]) => {
                if (name && status) {
                  logger.info(`Extracted relationship from JSON: ${name} -> ${status}`);
                  enhancedData.relationships[name] = status;
                }
              });
            } catch (jsonError) {
              logger.warn(`Failed to parse as JSON: ${jsonError.message}`);

              // Method 3: Split by comma but be smarter about it
              // This is a fallback method that tries to handle simple cases
              if (cleanStr.includes(',')) {
                logger.info(`Trying comma-based splitting as fallback`);

                // Look for patterns that might indicate relationship boundaries
                // This is a heuristic approach that works for simple cases
                const parts = [];
                let currentPart = '';
                let inQuotes = false;

                // Manually parse the string character by character
                for (let i = 0; i < cleanStr.length; i++) {
                  const char = cleanStr[i];

                  if (char === '"') {
                    inQuotes = !inQuotes;
                    currentPart += char;
                  } else if (char === ',' && !inQuotes) {
                    // Only split on commas that are not inside quotes
                    parts.push(currentPart);
                    currentPart = '';
                  } else {
                    currentPart += char;
                  }
                }

                // Add the last part
                if (currentPart) {
                  parts.push(currentPart);
                }

                logger.info(`Smart split by comma into ${parts.length} parts: ${JSON.stringify(parts)}`);

                // Process each part
                parts.forEach(part => {
                  // Try to extract the name and status from each part
                  const partMatch = part.match(/"([^"]+)":\s*"([^"]+)"/);

                  if (partMatch && partMatch.length >= 3) {
                    const name = partMatch[1].trim();
                    const status = partMatch[2].trim();

                    if (name && status) {
                      logger.info(`Extracted relationship from smart-split part: ${name} -> ${status}`);
                      enhancedData.relationships[name] = status;
                    }
                  } else {
                    // If the regex didn't work, try a simpler approach
                    const subParts = part.split(/[":\\]+/).filter(p => p.trim().length > 0);
                    logger.info(`Split part into sub-parts: ${JSON.stringify(subParts)}`);

                    if (subParts.length >= 2) {
                      const name = subParts[0].trim();
                      const status = subParts[1].trim();

                      if (name && status) {
                        logger.info(`Extracted relationship using simple split: ${name} -> ${status}`);
                        enhancedData.relationships[name] = status;
                      }
                    }
                  }
                });
              }
            }
          }
        } catch (error) {
          logger.error(`Error parsing relationship string: ${error.message}`);
        }
      }

      // Strategy 1: Check if it's a JSON-like string with escaped quotes
      if (Object.keys(enhancedData.relationships).length === 0 &&
          (enhancedData.relationship.includes('\\\"') || enhancedData.relationship.includes('\\"'))) {
        logger.info(`Trying to parse JSON-like relationship string with escaped quotes`);

        // Replace escaped quotes and try to extract name-value pairs
        const cleanStr = enhancedData.relationship.replace(/\\"/g, '"').replace(/\\/g, '');
        logger.info(`Cleaned relationship string: ${cleanStr}`);

        // Look for patterns like "Name": "Status"
        const matches = cleanStr.match(/"([^"]+)":\s*"([^"]+)"/g);
        if (matches) {
          matches.forEach(match => {
            const parts = match.split(':');
            if (parts.length === 2) {
              const name = parts[0].replace(/"/g, '').trim();
              const status = parts[1].replace(/"/g, '').trim();
              if (name && status) {
                enhancedData.relationships[name] = status;
                logger.info(`Extracted relationship from JSON-like string: ${name} -> ${status}`);
              }
            }
          });
        }
      }

      // Strategy 2: Simple string splitting
      if (Object.keys(enhancedData.relationships).length === 0) {
        logger.info(`Trying simple string splitting for relationship`);

        // Split by common separators
        const parts = enhancedData.relationship.split(/[:"\\]+/).map(p => p.trim()).filter(p => p.length > 0);
        logger.info(`Split relationship parts: ${JSON.stringify(parts)}`);

        // Try to find name-value pairs
        for (let i = 0; i < parts.length - 1; i++) {
          // Use more lenient validation - just check if they're not empty
          const name = parts[i];
          const status = parts[i + 1];

          if (name && status) {
            enhancedData.relationships[name] = status;
            logger.info(`Extracted relationship from split: ${name} -> ${status}`);
            i++; // Skip the next part as we've used it as status
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to parse relationship string: ${error.message}`);
    }
  }}

  // Process relationships object if it exists
  if (typeof enhancedData.relationships === 'object') {
    logger.info(`Processing relationships object: ${JSON.stringify(enhancedData.relationships)}`);
    logger.info(`Relationships object type: ${typeof enhancedData.relationships}`);
    logger.info(`Relationships object keys: ${JSON.stringify(Object.keys(enhancedData.relationships))}`);
    logger.info(`Relationships object constructor: ${enhancedData.relationships.constructor ? enhancedData.relationships.constructor.name : 'unknown'}`);

    // If it's an array, try to convert to object
    if (Array.isArray(enhancedData.relationships)) {
      logger.warn(`NPC ${enhancedData.name} has relationships as an array, converting to object`);
      const relationshipObj = {};

      enhancedData.relationships.forEach(rel => {
        if (typeof rel === 'object' && rel !== null) {
          Object.entries(rel).forEach(([key, value]) => {
            relationshipObj[key] = value;
          });
        } else if (typeof rel === 'string') {
          // Try to parse string entries
          const parts = rel.split(':').map(p => p.trim());
          if (parts.length >= 2) {
            relationshipObj[parts[0]] = parts[1];
          } else {
            // If no colon, try to use adjacent entries as key-value pairs
            // This will be handled in a separate pass
          }
        }
      });

      enhancedData.relationships = relationshipObj;
    }
    // Check if it's a Map-like object with numeric keys (from UI)
    else if (Object.keys(enhancedData.relationships).some(key => !isNaN(parseInt(key)))) {
      logger.info(`NPC ${enhancedData.name} has relationships as a Map with numeric keys, converting to proper format`);
      const relationshipObj = {};

      // Log the structure for debugging
      logger.info(`Relationships structure: ${JSON.stringify(enhancedData.relationships)}`);

      // Process each entry in the Map
      Object.entries(enhancedData.relationships).forEach(([key, value]) => {
        logger.info(`Processing Map entry - Key: ${key}, Type: ${typeof value}, Value: ${JSON.stringify(value)}`);

        // Each entry might be a key-value pair where value contains the NPC name and relationship status
        if (typeof value === 'object' && value !== null) {
          // Extract the NPC name and relationship status
          const entries = Object.entries(value);
          logger.info(`Object entry keys: ${JSON.stringify(entries.map(e => e[0]))}`);

          if (entries.length > 0) {
            const [npcName, relationshipStatus] = entries[0];
            if (npcName && relationshipStatus) {
              relationshipObj[npcName] = relationshipStatus;
              logger.info(`Extracted relationship from Map: ${npcName} -> ${relationshipStatus}`);
            }
          }
        }
      });

      // Special handling for UI format where relationships are stored as key-value pairs in a Map
      // This is the format used in the screenshot where Blacksmith has relationships with Girlfriend and Alfred
      if (Object.keys(relationshipObj).length === 0) {
        logger.info(`Trying alternative Map format parsing for relationships`);

        // The format might be { "0": { "Girlfriend": "Respectful" }, "1": { "Alfred": "Hates" } }
        // Or it might be { "Girlfriend": "Respectful", "Alfred": "Hates" }
        Object.entries(enhancedData.relationships).forEach(([key, value]) => {
          if (typeof value === 'string') {
            // Format: { "Girlfriend": "Respectful", "Alfred": "Hates" }
            relationshipObj[key] = value;
            logger.info(`Extracted direct key-value relationship: ${key} -> ${value}`);
          } else if (typeof value === 'object' && value !== null) {
            // Format: { "0": { "Girlfriend": "Respectful" }, "1": { "Alfred": "Hates" } }
            Object.entries(value).forEach(([npcName, relationshipStatus]) => {
              relationshipObj[npcName] = relationshipStatus;
              logger.info(`Extracted nested relationship: ${npcName} -> ${relationshipStatus}`);
            });
          }
        });
      }

      // Special handling for the specific format seen in the screenshot
      // Format: { "0": { "Girlfriend": "Respectful" }, "1": { "Alfred": "Hates" } }
      if (Object.keys(relationshipObj).length === 0) {
        logger.info(`Trying UI-specific Map format parsing for relationships`);

        // Check if we have numeric keys that contain objects
        const numericKeys = Object.keys(enhancedData.relationships).filter(key => !isNaN(parseInt(key)));

        if (numericKeys.length > 0) {
          numericKeys.forEach(key => {
            const entry = enhancedData.relationships[key];

            if (typeof entry === 'object' && entry !== null) {
              // Log the entry structure
              logger.info(`Map entry ${key} structure: ${JSON.stringify(entry)}`);

              // Try to extract the relationship
              if (Object.keys(entry).length === 1) {
                // Format: { "0": { "Girlfriend": "Respectful" } }
                const npcName = Object.keys(entry)[0];
                const relationshipStatus = entry[npcName];

                if (npcName && relationshipStatus) {
                  relationshipObj[npcName] = relationshipStatus;
                  logger.info(`Extracted UI-specific relationship: ${npcName} -> ${relationshipStatus}`);
                }
              }
            }
          });
        }
      }

      // If we found any relationships, update the enhancedData
      if (Object.keys(relationshipObj).length > 0) {
        enhancedData.relationships = relationshipObj;
        logger.info(`Converted relationships from Map: ${JSON.stringify(relationshipObj)}`);
      }
    }
    // Handle direct key-value pairs in the relationships object
    else {
      // The relationships object might already be in the correct format
      // Just log it for debugging
      logger.info(`NPC ${enhancedData.name} has relationships in standard format: ${JSON.stringify(enhancedData.relationships)}`);
    }
  }

  // No fallback relationships - relationships must be explicitly defined

  // Merge any remaining relationship field (singular) into relationships object (plural)
  // This ensures we capture all relationships, whether they come from the singular or plural field
  if (enhancedData.relationship && typeof enhancedData.relationship === 'string' &&
      !enhancedData.relationship.includes('\\\"')) {
    // Only process if we haven't already processed this as an Unreal Engine format
    logger.info(`Checking for additional relationships in 'relationship' field: ${enhancedData.relationship}`);

    try {
      // Try to parse as JSON
      if (enhancedData.relationship.startsWith('{') && enhancedData.relationship.endsWith('}')) {
        try {
          const relationshipObj = JSON.parse(enhancedData.relationship);
          if (typeof relationshipObj === 'object' && relationshipObj !== null) {
            Object.entries(relationshipObj).forEach(([name, status]) => {
              if (!enhancedData.relationships[name]) {
                enhancedData.relationships[name] = status;
                logger.info(`Added relationship from JSON string: ${name} -> ${status}`);
              }
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse relationship as JSON: ${e.message}`);
        }
      }
    } catch (error) {
      logger.warn(`Error processing additional relationships: ${error.message}`);
    }
  }

  // Log the final relationships
  logger.info(`NPC ${enhancedData.name} final relationships: ${JSON.stringify(enhancedData.relationships)}`);

  // Special handling for Unreal Engine format
  // Check if we have a relationship field that looks like "Alfred\": \"Standoffish"
  if (enhancedData.relationship && typeof enhancedData.relationship === 'string' &&
      enhancedData.relationship.includes('\\\"')) {

    logger.info(`Detected Unreal Engine relationship format: ${enhancedData.relationship}`);

    try {
      // First, clean up the string by removing escaped quotes
      const cleanStr = enhancedData.relationship.replace(/\\"/g, '"').replace(/\\/g, '');
      logger.info(`Cleaned relationship string: ${cleanStr}`);

      // Use a more sophisticated approach to extract key-value pairs
      // This regex looks for patterns like "key":"value" or "key": "value"
      // and handles cases where values might contain commas
      try {
        // Method 1: Use regex to find all "key":"value" patterns
        const relationshipRegex = /"([^"]+)":\s*"([^"]*)"/g;
        let match;
        let foundAny = false;

        while ((match = relationshipRegex.exec(cleanStr)) !== null) {
          foundAny = true;
          const name = match[1].trim();
          const status = match[2].trim();

          if (name && status) {
            logger.info(`Successfully extracted relationship using regex: ${name} -> ${status}`);
            enhancedData.relationships[name] = status;
          }
        }

        // If regex didn't find anything, try alternative methods
        if (!foundAny) {
          logger.info(`Regex didn't find any relationships, trying alternative methods`);

          // Method 2: Try to reconstruct the string as valid JSON and parse it
          try {
            // Add curly braces to make it a valid JSON object
            const jsonStr = `{${cleanStr}}`;
            logger.info(`Attempting to parse as JSON: ${jsonStr}`);

            const jsonObj = JSON.parse(jsonStr);

            // Extract relationships from the parsed JSON
            Object.entries(jsonObj).forEach(([name, status]) => {
              if (name && status) {
                logger.info(`Extracted relationship from JSON: ${name} -> ${status}`);
                enhancedData.relationships[name] = status;
              }
            });
          } catch (jsonError) {
            logger.warn(`Failed to parse as JSON: ${jsonError.message}`);

            // Method 3: Split by comma but be smarter about it
            // This is a fallback method that tries to handle simple cases
            if (cleanStr.includes(',')) {
              logger.info(`Trying comma-based splitting as fallback`);

              // Look for patterns that might indicate relationship boundaries
              // This is a heuristic approach that works for simple cases
              const parts = [];
              let currentPart = '';
              let inQuotes = false;

              // Manually parse the string character by character
              for (let i = 0; i < cleanStr.length; i++) {
                const char = cleanStr[i];

                if (char === '"') {
                  inQuotes = !inQuotes;
                  currentPart += char;
                } else if (char === ',' && !inQuotes) {
                  // Only split on commas that are not inside quotes
                  parts.push(currentPart);
                  currentPart = '';
                } else {
                  currentPart += char;
                }
              }

              // Add the last part
              if (currentPart) {
                parts.push(currentPart);
              }

              logger.info(`Smart split by comma into ${parts.length} parts: ${JSON.stringify(parts)}`);

              // Process each part
              parts.forEach(part => {
                // Try to extract the name and status from each part
                const partMatch = part.match(/"([^"]+)":\s*"([^"]+)"/);

                if (partMatch && partMatch.length >= 3) {
                  const name = partMatch[1].trim();
                  const status = partMatch[2].trim();

                  if (name && status) {
                    logger.info(`Extracted relationship from smart-split part: ${name} -> ${status}`);
                    enhancedData.relationships[name] = status;
                  }
                } else {
                  // If the regex didn't work, try a simpler approach
                  const subParts = part.split(/[":\\]+/).filter(p => p.trim().length > 0);
                  logger.info(`Split part into sub-parts: ${JSON.stringify(subParts)}`);

                  if (subParts.length >= 2) {
                    const name = subParts[0].trim();
                    const status = subParts[1].trim();

                    if (name && status) {
                      logger.info(`Extracted relationship using simple split: ${name} -> ${status}`);
                      enhancedData.relationships[name] = status;
                    }
                  }
                }
              });
            } else {
              // Method 4: Simple string splitting for single relationships
              // This is a fallback for the simplest case
              const parts = cleanStr.split(/[":\\]+/).filter(p => p.trim().length > 0);
              logger.info(`Split relationship parts: ${JSON.stringify(parts)}`);

              if (parts.length >= 2) {
                const name = parts[0].trim();
                const status = parts[1].trim();

                if (name && status) {
                  logger.info(`Extracted relationship using simple split: ${name} -> ${status}`);
                  enhancedData.relationships[name] = status;
                }
              }
            }
          }
        }

        // Remove the original field to avoid confusion
        if (Object.keys(enhancedData.relationships).length > 0) {
          delete enhancedData.relationship;
        }
      } catch (error) {
        logger.error(`Error parsing relationship string: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Failed to parse Unreal Engine relationship format: ${error.message}`);
    }
  }

  // Process inventory and skills if they're strings instead of arrays
  ['inventory', 'skills'].forEach(field => {
    if (typeof enhancedData[field] === 'string') {
      logger.warn(`NPC ${enhancedData.name} has ${field} as a string, converting to array`);

      // First, try to detect if the string has a pattern of concatenated words with capital letters
      const inputStr = enhancedData[field];
      logger.info(`Original ${field} string: "${inputStr}"`);

      // Method 1: Try to split by common item separators first
      let items = [];

      // Check if there are any common separators in the string
      if (inputStr.includes(',') || inputStr.includes(';') || inputStr.includes('|')) {
        // Split by explicit separators
        items = inputStr
          .split(/[,;|]+/)
          .map(item => item.trim())
          .filter(item => item.length > 0);

        logger.info(`Split ${field} by separators: ${JSON.stringify(items)}`);
      }
      // Method 2: For strings like "UnfinishedSwordTongsHammer" - detect CamelCase pattern
      else if (/[a-z][A-Z]/.test(inputStr)) {
        // This is likely a CamelCase string with no separators
        // Split on capital letters that follow lowercase letters
        items = inputStr
          .split(/(?<=[a-z])(?=[A-Z])/)
          .map(item => item.trim())
          .filter(item => item.length > 0);

        logger.info(`Split ${field} by CamelCase: ${JSON.stringify(items)}`);
      }
      // Method 3: For strings with spaces
      else if (inputStr.includes(' ')) {
        // Split by spaces
        items = inputStr
          .split(/\s+/)
          .map(item => item.trim())
          .filter(item => item.length > 0);

        logger.info(`Split ${field} by spaces: ${JSON.stringify(items)}`);
      }
      // Method 4: Fallback - try to identify common item patterns
      else {
        // Special case for "Unfinished Sword" type items that got concatenated
        // Look for known item prefixes/adjectives
        const prefixes = ['Unfinished', 'Broken', 'Rusty', 'Ancient', 'Magic', 'Enchanted', 'Small', 'Large'];
        const itemTypes = ['Sword', 'Axe', 'Hammer', 'Shield', 'Bow', 'Arrow', 'Potion', 'Scroll', 'Gem', 'Ring'];

        let processedItems = [];
        let currentStr = inputStr;

        // Try to identify compound items
        prefixes.forEach(prefix => {
          if (currentStr.includes(prefix)) {
            const prefixIndex = currentStr.indexOf(prefix);
            const afterPrefix = currentStr.substring(prefixIndex + prefix.length);

            // Check if any item type follows the prefix
            itemTypes.forEach(itemType => {
              if (afterPrefix.startsWith(itemType)) {
                // Found a compound item like "UnfinishedSword"
                const compoundItem = prefix + ' ' + itemType;
                processedItems.push(compoundItem);

                // Remove the compound item from the string
                currentStr = currentStr.replace(prefix + itemType, '');
                logger.info(`Identified compound item: "${compoundItem}"`);
              }
            });
          }
        });

        // Process any remaining text
        if (currentStr.length > 0) {
          // Split remaining text by capital letters
          const remainingItems = currentStr
            .split(/(?<=[a-z])(?=[A-Z])/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

          processedItems = [...processedItems, ...remainingItems];
        }

        if (processedItems.length > 0) {
          items = processedItems;
          logger.info(`Split ${field} using compound item detection: ${JSON.stringify(items)}`);
        } else {
          // Last resort: just split by capital letters
          items = inputStr
            .split(/(?<=[a-z])(?=[A-Z])/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

          logger.info(`Split ${field} by capital letters (last resort): ${JSON.stringify(items)}`);
        }
      }

      enhancedData[field] = items;
      logger.info(`Final converted ${field} array: ${JSON.stringify(items)}`);
    } else if (!enhancedData[field]) {
      // Initialize as empty array if not present
      enhancedData[field] = [];
    }
  });

  // Store NPC data with empty conversation history
  npcContexts.set(npcId, {
    metadata: enhancedData,
    conversations: []
  });

  logger.functionStep('initializeNpc', 'Stored NPC data in context', {
    npc_id: npcId,
    npc_name: enhancedData.name,
    has_relationships: Object.keys(enhancedData.relationships).length > 0,
    relationship_count: Object.keys(enhancedData.relationships).length
  }, requestId);

  logger.info(`Initialized NPC: ${enhancedData.name} (${npcId})`, requestId);

  // Log function exit
  logger.functionExit('initializeNpc', {
    npc_id: npcId,
    npc_name: enhancedData.name,
    success: true
  }, requestId);

  return npcId;
}

/**
 * Initialize multiple NPCs at once
 * @param {Array} npcsData - Array of NPC information objects
 * @param {string} [requestId] - Optional request ID for logging
 * @returns {Object} - Map of NPC names to their IDs
 */
function initializeNpcs(npcsData, requestId = Date.now().toString()) {
  // Log function entry
  logger.functionEntry('initializeNpcs', { npcCount: npcsData.length }, requestId);

  const npcIds = {};
  let successCount = 0;
  let replacedCount = 0;

  // Track performance
  const startTime = Date.now();

  npcsData.forEach((npcData, index) => {
    logger.functionStep('initializeNpcs', `Initializing NPC ${index + 1}/${npcsData.length}`, {
      npc_name: npcData.name
    }, requestId);

    // Check if this NPC already exists (for counting replacements)
    const existingNpc = findNpcByName(npcData.name);
    if (existingNpc) {
      replacedCount++;
    }

    // Create a unique request ID for each NPC
    const npcRequestId = `${requestId}-npc-${index + 1}`;

    // Initialize the NPC with the request ID
    const id = initializeNpc(npcData, npcRequestId);
    npcIds[npcData.name] = id;
    successCount++;
  });

  // Log performance
  logger.performance('initializeNpcs', startTime, requestId);

  logger.info(`Initialized ${npcsData.length} NPCs (${replacedCount} replaced)`, requestId);

  // Log function exit
  logger.functionExit('initializeNpcs', {
    total_count: npcsData.length,
    success_count: successCount,
    replaced_count: replacedCount,
    npc_ids: npcIds
  }, requestId);

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
 * @param {boolean} [includeFutureRelationships=true] - Whether to include relationships with NPCs that don't exist yet
 * @returns {Object} - Relationship information
 */
function getNpcRelationship(npcId1OrName, npcId2OrName, includeFutureRelationships = true) {
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

  // Handle case where one or both NPCs don't exist yet
  if (!npc1 || !npc2) {
    // If we're not including future relationships, return error
    if (!includeFutureRelationships) {
      return {
        status: "unknown",
        error: "One or both NPCs not found",
        npc1_found: !!npc1,
        npc2_found: !!npc2,
        npc1_identifier: npcId1OrName,
        npc2_identifier: npcId2OrName
      };
    }

    // Create placeholder data for missing NPCs
    if (!npc1) {
      // Use the name as identifier if it's a string, otherwise use the ID
      const npc1Name = typeof npcId1OrName === 'string' && !npcId1OrName.includes('-') ?
                       npcId1OrName : `Unknown NPC (${npcId1OrName})`;

      npc1 = {
        id: null,
        name: npc1Name,
        relationships: {},
        is_placeholder: true
      };

      logger.info(`Created placeholder for non-existent NPC: ${npc1Name}`);
    }

    if (!npc2) {
      // Use the name as identifier if it's a string, otherwise use the ID
      const npc2Name = typeof npcId2OrName === 'string' && !npcId2OrName.includes('-') ?
                       npcId2OrName : `Unknown NPC (${npcId2OrName})`;

      npc2 = {
        id: null,
        name: npc2Name,
        relationships: {},
        is_placeholder: true
      };

      logger.info(`Created placeholder for non-existent NPC: ${npc2Name}`);
    }
  }

  // Check for relationships with exact name match
  let relationFromNpc1 = npc1.relationships && npc1.relationships[npc2.name];
  let relationFromNpc2 = npc2.relationships && npc2.relationships[npc1.name];

  // If not found, try case-insensitive search
  if (!relationFromNpc1 && npc1.relationships) {
    const npc2NameLower = npc2.name.toLowerCase();
    for (const [name, relation] of Object.entries(npc1.relationships)) {
      if (name.toLowerCase() === npc2NameLower) {
        relationFromNpc1 = relation;
        break;
      }
    }
  }

  if (!relationFromNpc2 && npc2.relationships) {
    const npc1NameLower = npc1.name.toLowerCase();
    for (const [name, relation] of Object.entries(npc2.relationships)) {
      if (name.toLowerCase() === npc1NameLower) {
        relationFromNpc2 = relation;
        break;
      }
    }
  }

  return {
    npc1_id: npc1.id || npcId1OrName,
    npc2_id: npc2.id || npcId2OrName,
    npc1_name: npc1.name,
    npc2_name: npc2.name,
    npc1_to_npc2: relationFromNpc1 || "none",
    npc2_to_npc1: relationFromNpc2 || "none",
    is_mutual: relationFromNpc1 === relationFromNpc2 && relationFromNpc1 !== undefined,
    is_conflicting: relationFromNpc1 !== relationFromNpc2 && relationFromNpc1 !== undefined && relationFromNpc2 !== undefined,
    npc1_exists: !npc1.is_placeholder,
    npc2_exists: !npc2.is_placeholder,
    is_future_relationship: npc1.is_placeholder || npc2.is_placeholder
  };
}

/**
 * Discover relationships for an NPC by searching through all other NPCs
 * @param {string} npcIdOrName - NPC ID or name to discover relationships for
 * @param {string} [requestId] - Optional request ID for logging
 * @returns {Object} - Object containing discovered relationships and stats
 */
function discoverNpcRelationships(npcIdOrName, requestId = Date.now().toString()) {
  // Log function entry with parameters
  logger.functionEntry('discoverNpcRelationships', { npcIdOrName }, requestId);

  // Track performance
  const startTime = Date.now();

  // Get the target NPC
  logger.functionStep('discoverNpcRelationships', 'Getting target NPC metadata', { npcIdOrName }, requestId);
  let targetNpc = getNpcMetadata(npcIdOrName);

  // If not found by ID, try by name
  if (!targetNpc) {
    logger.functionStep('discoverNpcRelationships', 'NPC not found by ID, trying by name', { npcIdOrName }, requestId);
    const npcByName = findNpcByName(npcIdOrName);
    if (npcByName) {
      logger.functionStep('discoverNpcRelationships', 'Found NPC by name', {
        name: npcByName.name,
        id: npcByName.id
      }, requestId);

      targetNpc = getNpcMetadata(npcByName.id);
      npcIdOrName = npcByName.id;
    } else {
      logger.functionStep('discoverNpcRelationships', 'NPC not found by name either', { npcIdOrName }, requestId);
    }
  } else {
    logger.functionStep('discoverNpcRelationships', 'Found NPC by ID', {
      id: npcIdOrName,
      name: targetNpc.name
    }, requestId);
  }

  // If still not found, return error
  if (!targetNpc) {
    logger.error(`NPC with identifier ${npcIdOrName} not found`, requestId);
    const errorResult = {
      status: "error",
      message: `NPC with identifier ${npcIdOrName} not found`,
      discovered_relationships: 0
    };
    logger.functionExit('discoverNpcRelationships', errorResult, requestId);
    return errorResult;
  }

  const targetNpcName = targetNpc.name;

  // Get all NPC IDs
  logger.functionStep('discoverNpcRelationships', 'Getting all NPC IDs', null, requestId);
  const allNpcIds = getAllNpcIds();
  logger.functionStep('discoverNpcRelationships', 'Found NPCs', { count: allNpcIds.length }, requestId);

  const discoveredRelationships = [];
  const stats = {
    total_npcs: allNpcIds.length - 1, // Exclude self
    direct_relationships: 0,
    indirect_relationships: 0,
    mutual_relationships: 0,
    conflicting_relationships: 0
  };

  // Log target NPC details
  logger.functionStep('discoverNpcRelationships', 'Target NPC details', {
    id: npcIdOrName,
    name: targetNpcName,
    has_relationships: !!targetNpc.relationships,
    relationship_count: targetNpc.relationships ? Object.keys(targetNpc.relationships).length : 0,
    defined_relationships: targetNpc.relationships ? Object.keys(targetNpc.relationships) : []
  }, requestId);

  // Iterate through all NPCs to find relationships
  logger.functionStep('discoverNpcRelationships', 'Starting relationship discovery loop', {
    npcs_to_check: allNpcIds.length - 1 // Exclude self
  }, requestId);

  // Track loop performance
  const loopStartTime = Date.now();
  let processedCount = 0;

  for (const otherNpcId of allNpcIds) {
    // Skip self
    if (otherNpcId === npcIdOrName) {
      logger.functionStep('discoverNpcRelationships', 'Skipping self', {
        npc_id: otherNpcId
      }, requestId);
      continue;
    }

    processedCount++;
    logger.functionStep('discoverNpcRelationships', `Processing NPC ${processedCount}/${stats.total_npcs}`, {
      npc_id: otherNpcId
    }, requestId);

    const otherNpc = getNpcMetadata(otherNpcId);
    if (!otherNpc) {
      logger.functionStep('discoverNpcRelationships', 'NPC metadata not found, skipping', {
        npc_id: otherNpcId
      }, requestId);
      continue;
    }

    logger.functionStep('discoverNpcRelationships', 'Getting relationship', {
      target_npc: targetNpcName,
      other_npc: otherNpc.name
    }, requestId);

    const relationshipStartTime = Date.now();
    const relationship = getNpcRelationship(npcIdOrName, otherNpcId);
    logger.performance('getNpcRelationship', relationshipStartTime, requestId);

    // Skip if there's an error (but not for future relationships)
    if (relationship.error) {
      logger.functionStep('discoverNpcRelationships', 'Relationship error, skipping', {
        error: relationship.error
      }, requestId);
      continue;
    }

    // Log if this is a future relationship (with a non-existent NPC)
    if (relationship.is_future_relationship) {
      logger.functionStep('discoverNpcRelationships', 'Future relationship detected', {
        npc1_name: relationship.npc1_name,
        npc2_name: relationship.npc2_name,
        npc1_exists: relationship.npc1_exists,
        npc2_exists: relationship.npc2_exists
      }, requestId);
    }

    logger.functionStep('discoverNpcRelationships', 'Relationship found', {
      npc1_to_npc2: relationship.npc1_to_npc2,
      npc2_to_npc1: relationship.npc2_to_npc1,
      is_mutual: relationship.is_mutual,
      is_conflicting: relationship.is_conflicting
    }, requestId);

    // Check if there's a direct relationship (either direction)
    const hasDirectRelationship = relationship.npc1_to_npc2 !== "none" || relationship.npc2_to_npc1 !== "none";

    if (hasDirectRelationship) {
      logger.functionStep('discoverNpcRelationships', 'Direct relationship found', {
        target_to_other: relationship.npc1_to_npc2,
        other_to_target: relationship.npc2_to_npc1
      }, requestId);
    }

    // Check for indirect relationships (through common connections)
    let indirectRelationships = [];
    if (!hasDirectRelationship) {
      logger.functionStep('discoverNpcRelationships', 'No direct relationship, checking for indirect', null, requestId);

      // Look for common connections
      if (targetNpc.relationships && otherNpc.relationships) {
        const targetConnections = Object.keys(targetNpc.relationships);
        const otherConnections = Object.keys(otherNpc.relationships);

        logger.functionStep('discoverNpcRelationships', 'Checking for common connections', {
          target_connections: targetConnections,
          other_connections: otherConnections
        }, requestId);

        // Find common connections
        const commonConnections = targetConnections.filter(name => otherConnections.includes(name));

        logger.functionStep('discoverNpcRelationships', 'Common connections found', {
          count: commonConnections.length,
          connections: commonConnections
        }, requestId);

        if (commonConnections.length > 0) {
          logger.functionStep('discoverNpcRelationships', 'Processing common connections', {
            connections: commonConnections
          }, requestId);

          indirectRelationships = commonConnections.map(name => {
            const indirectRel = {
              through: name,
              target_to_common: targetNpc.relationships[name],
              other_to_common: otherNpc.relationships[name]
            };

            logger.functionStep('discoverNpcRelationships', `Indirect relationship through ${name}`,
              indirectRel, requestId);

            return indirectRel;
          });

          stats.indirect_relationships++;
          logger.functionStep('discoverNpcRelationships', 'Indirect relationship count updated', {
            count: stats.indirect_relationships
          }, requestId);
        }
      } else {
        logger.functionStep('discoverNpcRelationships', 'Missing relationship data for indirect check', {
          target_has_relationships: !!targetNpc.relationships,
          other_has_relationships: !!otherNpc.relationships
        }, requestId);
      }
    } else {
      // Count direct relationship types
      stats.direct_relationships++;
      if (relationship.is_mutual) stats.mutual_relationships++;
      if (relationship.is_conflicting) stats.conflicting_relationships++;

      logger.functionStep('discoverNpcRelationships', 'Updated relationship stats', {
        direct_count: stats.direct_relationships,
        mutual_count: stats.mutual_relationships,
        conflicting_count: stats.conflicting_relationships
      }, requestId);
    }

    // Create relationship entry
    const relationshipEntry = {
      npc_id: otherNpcId,
      npc_name: otherNpc.name,
      direct_relationship: hasDirectRelationship ? {
        target_to_other: relationship.npc1_to_npc2,
        other_to_target: relationship.npc2_to_npc1,
        is_mutual: relationship.is_mutual,
        is_conflicting: relationship.is_conflicting
      } : null,
      indirect_relationships: indirectRelationships.length > 0 ? indirectRelationships : null
    };

    // Add to discovered relationships
    discoveredRelationships.push(relationshipEntry);

    logger.functionStep('discoverNpcRelationships', 'Added relationship to results', {
      npc_name: otherNpc.name,
      has_direct: !!relationshipEntry.direct_relationship,
      has_indirect: !!relationshipEntry.indirect_relationships,
      indirect_count: relationshipEntry.indirect_relationships ? relationshipEntry.indirect_relationships.length : 0
    }, requestId);
  }

  // Log loop performance
  logger.performance('relationshipDiscoveryLoop', loopStartTime, requestId);

  // Create result object
  const result = {
    status: "success",
    npc_id: npcIdOrName,
    npc_name: targetNpcName,
    stats,
    discovered_relationships: discoveredRelationships
  };

  // Log detailed statistics
  logger.functionStep('discoverNpcRelationships', 'Relationship discovery complete', {
    direct_count: stats.direct_relationships,
    indirect_count: stats.indirect_relationships,
    mutual_count: stats.mutual_relationships,
    conflicting_count: stats.conflicting_relationships,
    total_relationships: discoveredRelationships.length
  }, requestId);

  // Log the full result if in debug mode
  logger.logObject('Complete relationship discovery result', result, requestId, true);

  // Log function exit with performance metrics
  logger.performance('discoverNpcRelationships', startTime, requestId);
  logger.functionExit('discoverNpcRelationships', {
    status: "success",
    npc_name: targetNpcName,
    direct_count: stats.direct_relationships,
    indirect_count: stats.indirect_relationships,
    total_count: discoveredRelationships.length
  }, requestId);

  return result;
}

/**
 * Get relationship network for an NPC (direct and indirect)
 * @param {string} npcIdOrName - NPC ID or name
 * @param {string} [requestId] - Optional request ID for logging
 * @returns {Object} - Formatted relationship network for context
 */
function getNpcRelationshipNetwork(npcIdOrName, requestId = Date.now().toString()) {
  // Log function entry
  logger.functionEntry('getNpcRelationshipNetwork', { npcIdOrName }, requestId);

  // Track performance
  const startTime = Date.now();

  // Discover relationships
  logger.functionStep('getNpcRelationshipNetwork', 'Discovering relationships', { npcIdOrName }, requestId);
  const discoveredRelationships = discoverNpcRelationships(npcIdOrName, requestId);
  logger.performance('discoverNpcRelationships', startTime, requestId);

  if (discoveredRelationships.status === "error") {
    logger.error(`Failed to discover relationships: ${discoveredRelationships.message}`, requestId);
    logger.functionExit('getNpcRelationshipNetwork', null, requestId);
    return null;
  }

  // Log discovered relationships
  logger.functionStep('getNpcRelationshipNetwork', 'Processing discovered relationships',
    {
      count: discoveredRelationships.discovered_relationships.length,
      stats: discoveredRelationships.stats
    },
    requestId
  );

  // Format the relationships for context
  const directRelationships = [];
  const indirectRelationships = [];
  const futureRelationships = [];

  // Track processing time for each relationship
  const relationshipProcessingStart = Date.now();

  discoveredRelationships.discovered_relationships.forEach((rel, index) => {
    // Log each relationship being processed
    logger.functionStep('getNpcRelationshipNetwork', `Processing relationship ${index + 1}/${discoveredRelationships.discovered_relationships.length}`,
      { npc_name: rel.npc_name, npc_id: rel.npc_id },
      requestId
    );

    // Get detailed metadata for the related NPC
    const relatedNpcMetadata = getNpcMetadata(rel.npc_id);

    // Log the metadata retrieval
    logger.functionStep('getNpcRelationshipNetwork', `Retrieved metadata for ${rel.npc_name}`,
      {
        metadata_keys: relatedNpcMetadata ? Object.keys(relatedNpcMetadata) : 'null',
        has_description: !!relatedNpcMetadata?.description,
        has_personality: !!relatedNpcMetadata?.personality
      },
      requestId
    );

    // Extract relevant metadata for context
    const npcContext = {
      name: rel.npc_name,
      // Include relevant metadata about the related NPC
      description: relatedNpcMetadata?.description || '',
      personality: relatedNpcMetadata?.personality || '',
      faction: relatedNpcMetadata?.faction || '',
      location: relatedNpcMetadata?.location || '',
      currentState: relatedNpcMetadata?.currentState || ''
    };

    // Check if this is a future relationship (with a non-existent NPC)
    const isFutureRelationship = !relatedNpcMetadata;

    // Process direct relationships
    if (rel.direct_relationship) {
      logger.functionStep('getNpcRelationshipNetwork', `Adding direct relationship with ${rel.npc_name}`,
        {
          ...rel.direct_relationship,
          is_future: isFutureRelationship
        },
        requestId
      );

      const relationshipData = {
        ...npcContext,
        target_to_other: rel.direct_relationship.target_to_other,
        other_to_target: rel.direct_relationship.other_to_target,
        is_mutual: rel.direct_relationship.is_mutual,
        is_conflicting: rel.direct_relationship.is_conflicting,
        is_future: isFutureRelationship
      };

      if (isFutureRelationship) {
        // For future relationships, add to futureRelationships array
        futureRelationships.push(relationshipData);
        logger.functionStep('getNpcRelationshipNetwork', `Added future relationship with ${rel.npc_name}`,
          { relationship_type: 'direct' }, requestId);
      } else {
        // For existing NPCs, add to directRelationships array
        directRelationships.push(relationshipData);
      }
    }
    // Process indirect relationships
    else if (rel.indirect_relationships) {
      logger.functionStep('getNpcRelationshipNetwork', `Processing ${rel.indirect_relationships.length} indirect relationships through ${rel.npc_name}`,
        { count: rel.indirect_relationships.length },
        requestId
      );

      rel.indirect_relationships.forEach((indirect, indirectIndex) => {
        // Log each indirect relationship
        logger.functionStep('getNpcRelationshipNetwork', `Processing indirect relationship ${indirectIndex + 1}/${rel.indirect_relationships.length}`,
          indirect,
          requestId
        );

        // Get metadata for the common connection
        const commonNpc = findNpcByName(indirect.through);
        let commonNpcContext = {};

        if (commonNpc) {
          logger.functionStep('getNpcRelationshipNetwork', `Found common connection: ${indirect.through}`,
            { id: commonNpc.id, name: commonNpc.name },
            requestId
          );

          const commonNpcMetadata = getNpcMetadata(commonNpc.id);
          commonNpcContext = {
            description: commonNpcMetadata?.description || '',
            personality: commonNpcMetadata?.personality || '',
            faction: commonNpcMetadata?.faction || '',
            location: commonNpcMetadata?.location || ''
          };

          logger.functionStep('getNpcRelationshipNetwork', `Retrieved metadata for common connection: ${indirect.through}`,
            { metadata_keys: Object.keys(commonNpcMetadata || {}) },
            requestId
          );
        } else {
          logger.warn(`Common connection NPC not found: ${indirect.through}`, requestId);
        }

        // Create the indirect relationship entry
        const indirectRelationship = {
          ...npcContext,
          through: indirect.through,
          through_context: commonNpcContext,
          target_to_common: indirect.target_to_common,
          other_to_common: indirect.other_to_common
        };

        indirectRelationships.push(indirectRelationship);

        logger.functionStep('getNpcRelationshipNetwork', `Added indirect relationship through ${indirect.through}`,
          { relationship_added: true },
          requestId
        );
      });
    }
  });

  // Log relationship processing time
  logger.performance('processRelationships', relationshipProcessingStart, requestId);

  // Create the final network object
  const relationshipNetwork = {
    direct_relationships: directRelationships,
    indirect_relationships: indirectRelationships,
    future_relationships: futureRelationships
  };

  // Log detailed statistics
  logger.functionStep('getNpcRelationshipNetwork', 'Relationship network complete',
    {
      direct_count: directRelationships.length,
      indirect_count: indirectRelationships.length,
      future_count: futureRelationships.length,
      total_count: directRelationships.length + indirectRelationships.length + futureRelationships.length
    },
    requestId
  );

  // Log the full network if in debug mode
  logger.logObject('Complete relationship network', relationshipNetwork, requestId, true);

  // Log function exit with performance metrics
  logger.performance('getNpcRelationshipNetwork', startTime, requestId);
  logger.functionExit('getNpcRelationshipNetwork', {
    direct_count: directRelationships.length,
    indirect_count: indirectRelationships.length,
    future_count: futureRelationships.length,
    total_count: directRelationships.length + indirectRelationships.length + futureRelationships.length
  }, requestId);

  return relationshipNetwork;
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
 * Discover relationships for all NPCs
 * @param {string} requestId - Request ID for logging
 * @returns {Object} - Statistics about discovered relationships
 */
function discoverAllNpcRelationships(requestId = Date.now().toString()) {
  // Log function entry
  logger.functionEntry('discoverAllNpcRelationships', {}, requestId);

  // Track performance
  const startTime = Date.now();

  // Get all NPCs
  logger.functionStep('discoverAllNpcRelationships', 'Getting all NPC IDs', null, requestId);
  const allNpcIds = getAllNpcIds();
  logger.functionStep('discoverAllNpcRelationships', 'Found NPCs', { count: allNpcIds.length }, requestId);

  logger.section('RELATIONSHIP DISCOVERY', requestId);
  logger.info(`Discovering relationships for ${allNpcIds.length} NPCs`, requestId);

  // Initialize statistics
  let totalDirectRelationships = 0;
  let totalIndirectRelationships = 0;
  let totalFutureRelationships = 0;
  let totalMutualRelationships = 0;
  let totalConflictingRelationships = 0;
  let successfulDiscoveries = 0;
  let failedDiscoveries = 0;

  // Track detailed statistics for each NPC
  const npcStats = {};

  // Process each NPC
  logger.functionStep('discoverAllNpcRelationships', 'Starting NPC processing loop', {
    npc_count: allNpcIds.length
  }, requestId);

  // Track loop performance
  const loopStartTime = Date.now();

  for (let i = 0; i < allNpcIds.length; i++) {
    const npcId = allNpcIds[i];
    const npcMetadata = getNpcMetadata(npcId);

    if (!npcMetadata) {
      logger.functionStep('discoverAllNpcRelationships', `NPC ${i+1}/${allNpcIds.length}: Metadata not found, skipping`, {
        npc_id: npcId
      }, requestId);
      continue;
    }

    logger.functionStep('discoverAllNpcRelationships', `NPC ${i+1}/${allNpcIds.length}: Processing ${npcMetadata.name}`, {
      npc_id: npcId,
      npc_name: npcMetadata.name
    }, requestId);

    logger.info(`Discovering relationships for ${npcMetadata.name} (${npcId})`, requestId);

    // Track NPC processing time
    const npcStartTime = Date.now();

    // Use the enhanced discoverNpcRelationships with detailed logging
    const npcRequestId = `${requestId}-npc-${i+1}`;
    const relationships = discoverNpcRelationships(npcId, npcRequestId);

    // Log NPC processing time
    const npcProcessingTime = Date.now() - npcStartTime;
    logger.functionStep('discoverAllNpcRelationships', `NPC ${i+1}/${allNpcIds.length}: Processing completed`, {
      npc_name: npcMetadata.name,
      processing_time_ms: npcProcessingTime
    }, requestId);

    if (relationships.status === "error") {
      logger.error(`Error discovering relationships for ${npcMetadata.name}: ${relationships.message}`, requestId);
      failedDiscoveries++;
      continue;
    }

    successfulDiscoveries++;

    // Get relationship network to count future relationships
    const relationshipNetwork = getNpcRelationshipNetwork(npcId, npcRequestId);
    const futureRelationshipsCount = relationshipNetwork.future_relationships.length;

    // Update statistics
    totalDirectRelationships += relationships.stats.direct_relationships;
    totalIndirectRelationships += relationships.stats.indirect_relationships;
    totalFutureRelationships += futureRelationshipsCount;
    totalMutualRelationships += relationships.stats.mutual_relationships;
    totalConflictingRelationships += relationships.stats.conflicting_relationships;

    // Store detailed stats for this NPC
    npcStats[npcId] = {
      name: npcMetadata.name,
      direct: relationships.stats.direct_relationships,
      indirect: relationships.stats.indirect_relationships,
      future: futureRelationshipsCount,
      mutual: relationships.stats.mutual_relationships,
      conflicting: relationships.stats.conflicting_relationships,
      processing_time_ms: npcProcessingTime
    };

    logger.info(`Found ${relationships.stats.direct_relationships} direct, ${relationships.stats.indirect_relationships} indirect, and ${futureRelationshipsCount} future relationships for ${npcMetadata.name}`, requestId);

    // Log progress
    if (i % 5 === 0 || i === allNpcIds.length - 1) {
      logger.functionStep('discoverAllNpcRelationships', 'Progress update', {
        processed: i + 1,
        total: allNpcIds.length,
        percent_complete: Math.round(((i + 1) / allNpcIds.length) * 100)
      }, requestId);
    }
  }

  // Log loop performance
  logger.performance('npcProcessingLoop', loopStartTime, requestId);

  // Calculate average processing time
  const totalProcessingTime = Date.now() - loopStartTime;
  const averageNpcTime = successfulDiscoveries > 0 ? totalProcessingTime / successfulDiscoveries : 0;

  // Create detailed statistics
  const detailedStats = {
    total_npcs: allNpcIds.length,
    successful_discoveries: successfulDiscoveries,
    failed_discoveries: failedDiscoveries,
    total_direct_relationships: totalDirectRelationships,
    total_indirect_relationships: totalIndirectRelationships,
    total_future_relationships: totalFutureRelationships,
    total_mutual_relationships: totalMutualRelationships,
    total_conflicting_relationships: totalConflictingRelationships,
    total_processing_time_ms: totalProcessingTime,
    average_npc_processing_time_ms: averageNpcTime,
    npc_stats: npcStats
  };

  // Log detailed statistics
  logger.logObject('Detailed relationship discovery statistics', detailedStats, requestId, true);

  logger.info(`Relationship discovery complete. Found ${totalDirectRelationships} direct, ${totalIndirectRelationships} indirect, and ${totalFutureRelationships} future relationships across all NPCs.`, requestId);
  logger.sectionEnd();

  // Create summary result
  const result = {
    total_npcs: allNpcIds.length,
    successful_discoveries: successfulDiscoveries,
    failed_discoveries: failedDiscoveries,
    total_direct_relationships: totalDirectRelationships,
    total_indirect_relationships: totalIndirectRelationships,
    total_future_relationships: totalFutureRelationships,
    total_mutual_relationships: totalMutualRelationships,
    total_conflicting_relationships: totalConflictingRelationships,
    processing_time_ms: totalProcessingTime
  };

  // Log function exit with performance metrics
  logger.performance('discoverAllNpcRelationships', startTime, requestId);
  logger.functionExit('discoverAllNpcRelationships', result, requestId);

  return result;
}

/**
 * Start automatic relationship discovery
 */
function startAutoRelationshipDiscovery() {
  if (!DEBUG_CONFIG.enableAutoRelationshipDiscovery) {
    return;
  }

  // Initial discovery
  const timestamp = `initial-${Date.now()}`;
  logger.info(`Initial relationship discovery at ${new Date().toISOString()}`);
  discoverAllNpcRelationships(timestamp);

  // Set up interval for periodic discovery
  setInterval(() => {
    const timestamp = `auto-discovery-${Date.now()}`;
    logger.info(`Automatic relationship discovery at ${new Date().toISOString()}`);
    discoverAllNpcRelationships(timestamp);
  }, DEBUG_CONFIG.relationshipDiscoveryIntervalMs);

  logger.info(`Automatic relationship discovery enabled (every ${DEBUG_CONFIG.relationshipDiscoveryIntervalMs / 1000 / 60} minutes)`);
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

// Start automatic relationship discovery if enabled
if (DEBUG_CONFIG.enableAutoRelationshipDiscovery) {
  startAutoRelationshipDiscovery();
}

/**
 * Update relationship between two NPCs
 * @param {string} npcId1 - ID of the first NPC
 * @param {string} npcId2OrName - ID or name of the second NPC
 * @param {string} relationshipStatus - New relationship status
 * @param {string} [requestId] - Optional request ID for logging
 * @returns {boolean} - Success status
 */
function updateNpcRelationship(npcId1, npcId2OrName, relationshipStatus, requestId = Date.now().toString()) {
  // Log function entry
  logger.functionEntry('updateNpcRelationship', {
    npcId1,
    npcId2OrName,
    relationshipStatus
  }, requestId);

  // Get the first NPC's metadata
  const npc1 = getNpcMetadata(npcId1);
  if (!npc1) {
    logger.error(`NPC with ID ${npcId1} not found`, requestId);
    return false;
  }

  // Find the second NPC by ID or name
  let npc2Id = npcId2OrName;
  let npc2Name = npcId2OrName;

  // If not a UUID, try to find by name
  if (!npcId2OrName.includes('-')) {
    const npc2 = findNpcByName(npcId2OrName);
    if (npc2) {
      npc2Id = npc2.id;
      npc2Name = npc2.name;
    } else {
      // If NPC doesn't exist, we'll still update the relationship
      // This allows for relationships with NPCs that don't exist yet
      npc2Name = npcId2OrName;
      logger.info(`NPC ${npcId2OrName} not found, but will update relationship anyway`, requestId);
    }
  } else {
    // If it's an ID, get the name
    const npc2 = getNpcMetadata(npc2Id);
    if (npc2) {
      npc2Name = npc2.name;
    }
  }

  // Initialize relationships object if it doesn't exist
  if (!npc1.relationships) {
    npc1.relationships = {};
  }

  // Log the current relationship if it exists
  if (npc1.relationships[npc2Name]) {
    logger.info(`Current relationship from ${npc1.name} to ${npc2Name}: ${npc1.relationships[npc2Name]}`, requestId);
  } else {
    logger.info(`No existing relationship from ${npc1.name} to ${npc2Name}`, requestId);
  }

  // Update the relationship
  npc1.relationships[npc2Name] = relationshipStatus;
  logger.info(`Updated relationship from ${npc1.name} to ${npc2Name}: ${relationshipStatus}`, requestId);

  // Update the NPC metadata
  const success = updateNpcMetadata(npcId1, { relationships: npc1.relationships });

  logger.functionExit('updateNpcRelationship', {
    npc1_name: npc1.name,
    npc2_name: npc2Name,
    new_relationship: relationshipStatus,
    success
  }, requestId);

  return success;
}

/**
 * Detect NPC names in a message and retrieve relationship data
 * @param {string} npcId - ID of the NPC receiving the message
 * @param {string} message - Message to analyze for NPC names
 * @param {string} [requestId] - Optional request ID for logging
 * @returns {Object} - Object containing detected NPCs and their relationships
 */
function detectNpcNamesInMessage(npcId, message, requestId = Date.now().toString()) {
  // Log function entry
  logger.functionEntry('detectNpcNamesInMessage', { npcId, messageLength: message.length }, requestId);

  // Get all NPC names
  const allNpcIds = getAllNpcIds();
  const allNpcs = allNpcIds.map(id => {
    const metadata = getNpcMetadata(id);
    return {
      id,
      name: metadata.name
    };
  });

  // Get the current NPC's metadata
  const currentNpc = getNpcMetadata(npcId);
  if (!currentNpc) {
    logger.error(`NPC with ID ${npcId} not found`, requestId);
    return { detectedNpcs: [], relationships: [] };
  }

  logger.functionStep('detectNpcNamesInMessage', 'Searching for NPC names in message', {
    npcCount: allNpcs.length,
    currentNpc: currentNpc.name
  }, requestId);

  // Create a list of detected NPCs
  const detectedNpcs = [];
  const relationships = [];

  // Check for each NPC name in the message
  allNpcs.forEach(npc => {
    // Skip the current NPC (don't look for self-references)
    if (npc.id === npcId) return;

    // Check if the NPC name appears in the message (case insensitive)
    const nameRegex = new RegExp(`\\b${npc.name}\\b`, 'i');
    if (nameRegex.test(message)) {
      logger.functionStep('detectNpcNamesInMessage', `Detected NPC name in message: ${npc.name}`, {
        npcId: npc.id
      }, requestId);

      detectedNpcs.push({
        id: npc.id,
        name: npc.name
      });

      // Get relationship data between the current NPC and the detected NPC
      const relationship = getNpcRelationship(npcId, npc.id);

      // Only add if there's an actual relationship (not "none")
      if (relationship.npc1_to_npc2 !== "none" || relationship.npc2_to_npc1 !== "none") {
        logger.functionStep('detectNpcNamesInMessage', `Found relationship with ${npc.name}`, {
          relationship: relationship
        }, requestId);

        relationships.push(relationship);
      }
    }
  });

  const result = {
    detectedNpcs,
    relationships
  };

  logger.functionExit('detectNpcNamesInMessage', {
    detectedCount: detectedNpcs.length,
    relationshipCount: relationships.length
  }, requestId);

  return result;
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
  discoverNpcRelationships,
  getNpcRelationshipNetwork,
  discoverAllNpcRelationships,
  updateNpcMetadata,
  clearConversationHistory,
  removeNpc,
  getAllNpcIds,
  getNpcSummaries,
  logAllNpcData,
  startPeriodicLogging,
  startAutoRelationshipDiscovery,
  detectNpcNamesInMessage,
  updateNpcRelationship
};
