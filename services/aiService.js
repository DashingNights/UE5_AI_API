/**
 * AI Service - Handles interactions with OpenAI API
 */
const { OpenAI } = require("openai");
const logger = require("../utils/logger");
const promptManager = require("../utils/promptManager");
const config = require("../config");

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Send request to OpenAI API
 * @param {string} message - User message
 * @param {Object} options - Configuration options
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} - API response
 */
async function sendToAI(message, options = {}, requestId) {
  // Extract options with defaults
  const model = options.model || config.openai.defaultModel;
  const temperature = options.temperature || 0.7;
  const maxTokens = options.max_tokens || 1000;
  const isStreaming = options.stream === true; // Non-streaming by default
  const responseFormat = options.response_format || config.openai.defaultResponseFormat;
  const promptName = options.prompt_name || config.openai.defaultPromptName;

  // Load the appropriate system prompt
  const promptContent = options.prompt_name ?
    promptManager.loadPrompt(promptName) :
    config.openai.systemMessage;

  // Log request details
  logger.section('REQUEST DETAILS', requestId);
  logger.info(`Model: ${model}`, requestId);
  logger.info(`Temperature: ${temperature}`, requestId);
  logger.info(`Max Tokens: ${maxTokens}`, requestId);
  logger.info(`Streaming: ${isStreaming}`, requestId);
  logger.info(`Response Format: ${responseFormat}`, requestId);
  logger.info(`Prompt: ${promptName}`, requestId);
  logger.info(`Prompt Content (first 50 chars): ${promptContent.substring(0, 50)}...`, requestId);
  logger.debug(`User Message: ${message}`, requestId);
  logger.sectionEnd();

  // Base request parameters
  const requestParams = {
    model,
    messages: [
      { role: "system", content: promptContent },
      { role: "user", content: message },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  // Add JSON response format if requested
  if (responseFormat === 'json') {
    requestParams.response_format = { type: "json_object" };
  }

  try {
    logger.info(`Sending request to OpenAI API`, requestId);

    if (isStreaming) {
      return await handleStreamingRequest(requestParams, requestId);
    } else {
      return await handleNonStreamingRequest(requestParams, requestId);
    }
  } catch (error) {
    logger.section('API ERROR', requestId);
    logger.error(`Model: ${model}`, requestId);
    logger.error(`Error Type: ${error.constructor.name}`, requestId);
    logger.error(`Error Message: ${error.message}`, requestId, error);

    if (error.response) {
      logger.error(`Status: ${error.response.status}`, requestId);
      logger.error(`Headers: ${JSON.stringify(error.response.headers)}`, requestId);
      logger.error(`Data: ${JSON.stringify(error.response.data)}`, requestId);
    }

    logger.sectionEnd();
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
}

/**
 * Handle streaming request to OpenAI API
 * @param {Object} requestParams - Request parameters
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} - Streaming response
 */
async function handleStreamingRequest(requestParams, requestId) {
  logger.info("Using streaming mode", requestId);
  const stream = await client.chat.completions.create({
    ...requestParams,
    stream: true,
  });

  let streamData = "";
  let chunkCount = 0;

  logger.info("Stream started, receiving chunks...", requestId);

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    streamData += content;
    chunkCount++;

    // Log progress periodically
    if (chunkCount % 10 === 0) {
      logger.debug(`Received ${chunkCount} chunks so far...`, requestId);
    }
  }

  logger.section('STREAMING RESPONSE', requestId);
  logger.info(`Total chunks: ${chunkCount}`, requestId);
  logger.info(`Response length: ${streamData.length} characters`, requestId);
  logger.debug(`Response content: ${streamData.substring(0, 100)}...`, requestId);
  logger.sectionEnd();

  // Create response object
  const streamResponse = { streaming: true, data: streamData, chunks: chunkCount };

  // Log the full AI response
  logger.logAIResponse(streamResponse, true, requestId);

  return streamResponse;
}

/**
 * Handle non-streaming request to OpenAI API
 * @param {Object} requestParams - Request parameters
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} - API response
 */
async function handleNonStreamingRequest(requestParams, requestId) {
  logger.info("Using non-streaming mode", requestId);
  const completion = await client.chat.completions.create(requestParams);
  const responseContent = completion.choices[0]?.message?.content || "";

  logger.section('COMPLETE RESPONSE', requestId);
  logger.info(`Model used: ${completion.model}`, requestId);
  logger.info(`Completion ID: ${completion.id}`, requestId);
  logger.info(`Prompt tokens: ${completion.usage?.prompt_tokens || "N/A"}`, requestId);
  logger.info(`Completion tokens: ${completion.usage?.completion_tokens || "N/A"}`, requestId);
  logger.info(`Total tokens: ${completion.usage?.total_tokens || "N/A"}`, requestId);
  logger.info(`Finish reason: ${completion.choices[0]?.finish_reason || "N/A"}`, requestId);
  logger.debug(`Response content: ${responseContent.substring(0, 100)}...`, requestId);
  logger.sectionEnd();

  // Log the full AI response
  logger.logAIResponse(completion, false, requestId);

  return completion;
}

module.exports = {
  sendToAI
};
