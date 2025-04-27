const express = require("express");
require("dotenv").config();
const { OpenAI } = require("openai");

// Import utility modules
const logger = require("./utils/logger");
const responseFormatter = require("./utils/responseFormatter");
const promptManager = require("./utils/promptManager");

// Initialize Express app
const app = express();
app.use(express.json());

// Constants
const port = process.env.PORT || 3000;
const defaultModel = process.env.DEFAULT_MODEL || "gpt-4o-mini";
const defaultPromptName = process.env.DEFAULT_PROMPT || "defaultBehaviour";
const defaultResponseFormat = process.env.RESPONSE_FORMAT || "text"; // "text" or "json"

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load the default system message
const systemMessage = promptManager.loadPrompt(defaultPromptName);

/**
 * Send request to OpenAI API
 * @param {string} message - User message
 * @param {Object} options - Configuration options
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} - API response
 */
async function sendToAI(message, options = {}, requestId) {
  // Extract options with defaults
  const model = options.model || defaultModel;
  const temperature = options.temperature || 0.7;
  const maxTokens = options.max_tokens || 1000;
  const isStreaming = options.stream === true; // Non-streaming by default
  const responseFormat = options.response_format || defaultResponseFormat;
  const promptName = options.prompt_name || defaultPromptName;

  // Load the appropriate system prompt
  const promptContent = options.prompt_name ?
    promptManager.loadPrompt(promptName) :
    systemMessage;

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
    } else {
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

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Main API endpoint
app.post("/ai", async (req, res) => {
  const requestId = Date.now().toString();
  const { message, options } = req.body;

  logger.section('NEW REQUEST', requestId);
  logger.info(`Time: ${new Date().toISOString()}`, requestId);
  logger.info(`IP: ${req.ip}`, requestId);
  logger.debug(`Headers: ${JSON.stringify(req.headers)}`, requestId);

  if (!message) {
    logger.error(`Error - Missing message`, requestId);
    return res.status(400).json(
      responseFormatter.formatErrorResponse(requestId, new Error("Message is required"))
    );
  }

  try {
    logger.info(`Processing request`, requestId);
    logger.debug(`Message: ${message}`, requestId);
    logger.debug(`Options: ${JSON.stringify(options || {})}`, requestId);

    const startTime = Date.now();
    const aiResponse = await sendToAI(message, options, requestId);
    const responseTime = Date.now() - startTime;

    logger.info(`Request completed in ${responseTime}ms`, requestId);

    // Format and return response
    const formattedResponse = responseFormatter.formatSuccessResponse(
      requestId,
      aiResponse,
      aiResponse.streaming === true,
      responseTime
    );

    // Log the formatted response that will be sent to the client
    logger.section('FORMATTED API RESPONSE', requestId);
    logger.info(`Response structure:`, requestId);
    logger.logObject('API Response', formattedResponse, requestId, false);
    logger.sectionEnd();

    logger.debug(`Returning formatted response`, requestId);
    return res.json(formattedResponse);
  } catch (error) {
    logger.error(`ERROR - ${error.message}`, requestId, error);
    return res.status(500).json(
      responseFormatter.formatErrorResponse(requestId, error)
    );
  } finally {
    logger.section('REQUEST ENDED', requestId);
    logger.sectionEnd();
  }
});

// Start server
app.listen(port, () => {
  logger.section('SERVER STARTED');
  logger.info(`Time: ${new Date().toISOString()}`);
  logger.info(`Session ID: ${logger.getSessionId()}`);
  logger.info(`Log file: ${logger.getLogFileName()}`);
  logger.info(`Running on http://localhost:${port}`);
  logger.info(`Default model: ${defaultModel}`);
  logger.info(`Default prompt: ${defaultPromptName}`);
  logger.info(`Default response format: ${defaultResponseFormat}`);
  logger.info(`API Key present: ${!!process.env.OPENAI_API_KEY}`);
  logger.info(`Available prompts: ${promptManager.getAvailablePrompts().join(', ')}`);
  logger.info(`Log level: ${process.env.LOG_LEVEL || 'INFO'}`);
  logger.sectionEnd();
});
