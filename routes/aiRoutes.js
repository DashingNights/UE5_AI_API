/**
 * AI API routes
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const responseFormatter = require('../utils/responseFormatter');
const aiService = require('../services/aiService');

/**
 * Main AI endpoint
 * POST /ai
 */
router.post('/', async (req, res) => {
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
    const aiResponse = await aiService.sendToAI(message, options, requestId);
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

module.exports = router;
