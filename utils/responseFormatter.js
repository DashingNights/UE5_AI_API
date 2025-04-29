/**
 * Response formatter utility for standardizing API responses
 */

/**
 * Extract content from an AI response
 * @param {Object} aiResponse - The response from OpenAI API
 * @param {boolean} isStreaming - Whether the response is streaming
 * @returns {Object} - Extracted content and metadata
 */
function extractContent(aiResponse, isStreaming) {
  if (isStreaming) {
    return {
      content: aiResponse.data,
      model: null,
      usage: {
        total_tokens: null,
        prompt_tokens: null,
        completion_tokens: null
      },
      finish_reason: null
    };
  }

  const content = aiResponse.choices[0]?.message?.content || '';

  return {
    content,
    model: aiResponse.model,
    usage: aiResponse.usage || {
      total_tokens: null,
      prompt_tokens: null,
      completion_tokens: null
    },
    finish_reason: aiResponse.choices[0]?.finish_reason || null
  };
}

/**
 * Try to parse JSON from a string
 * @param {string} str - String to parse
 * @returns {Object|null} - Parsed JSON or null if parsing failed
 */
function tryParseJSON(str) {
  try {
    // Find JSON-like content in the string
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Format a successful API response
 * @param {string} requestId - Request ID
 * @param {Object} aiResponse - Response from OpenAI API
 * @param {boolean} isStreaming - Whether the response is streaming
 * @param {number} responseTime - Response time in milliseconds
 * @param {Object} [npcData] - Optional NPC data to include in the response
 * @returns {Object} - Formatted API response
 */
function formatSuccessResponse(requestId, aiResponse, isStreaming, responseTime, npcData = null) {
  const { content, model, usage, finish_reason } = extractContent(aiResponse, isStreaming);

  // Try to parse JSON from the content
  const parsedContent = tryParseJSON(content);

  const response = {
    request_id: requestId,
    status: "success",
    response_time_ms: responseTime,
    model,
    usage,
    finish_reason
  };

  // If content is valid JSON, include it as data
  if (parsedContent) {
    response.data = parsedContent;

    // If this is an NPC response, ensure player_relationship is included
    if (npcData) {
      // If data doesn't have metadata, add it
      if (!response.data.metadata) {
        response.data.metadata = {};
      }

      // Always include the current player relationship data if available
      if (npcData.player_relationship) {
        response.data.player_relationship = npcData.player_relationship;
        response.data.metadata.player_relationship = npcData.player_relationship;
      }
    }

    response.raw_content = content;
  } else {
    response.data = { message: content };

    // If this is an NPC response, ensure player_relationship is included
    if (npcData && npcData.player_relationship) {
      response.data.player_relationship = npcData.player_relationship;
    }

    response.raw_content = content;
  }

  // Add streaming-specific fields
  if (isStreaming) {
    response.chunks = aiResponse.chunks;
  }

  return response;
}

/**
 * Format an error API response
 * @param {string} requestId - Request ID
 * @param {Error} error - Error object
 * @returns {Object} - Formatted error response
 */
function formatErrorResponse(requestId, error) {
  return {
    request_id: requestId,
    status: "error",
    message: error.message,
    error_type: error.constructor.name,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  formatSuccessResponse,
  formatErrorResponse,
  extractContent,
  tryParseJSON
};
