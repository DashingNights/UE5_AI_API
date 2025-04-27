/**
 * Logger utility for consistent logging throughout the application
 * with support for session-based log files
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level (can be set via environment variable)
const currentLogLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
  : LOG_LEVELS.INFO;

// Log directory
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Generate a unique session ID for this server instance
const SESSION_ID = crypto.randomBytes(4).toString('hex');
const SERVER_START_TIME = new Date();

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`Created log directory: ${LOG_DIR}`);
  } catch (err) {
    console.error(`Failed to create log directory: ${err.message}`);
  }
}

/**
 * Get the current log file path based on session
 * @returns {string} - Path to the current session log file
 */
function getCurrentLogFilePath() {
  const startTime = SERVER_START_TIME;
  const year = startTime.getFullYear();
  const month = String(startTime.getMonth() + 1).padStart(2, '0');
  const day = String(startTime.getDate()).padStart(2, '0');
  const hour = String(startTime.getHours()).padStart(2, '0');
  const minute = String(startTime.getMinutes()).padStart(2, '0');

  // Format: YYYY-MM-DD_HHmm_SESSION-ID.log
  const fileName = `${year}-${month}-${day}_${hour}${minute}_${SESSION_ID}.log`;
  return path.join(LOG_DIR, fileName);
}

// Store the log file path to avoid recalculating it for each log entry
const CURRENT_LOG_FILE = getCurrentLogFilePath();

/**
 * Write a message to the session log file
 * @param {string} message - Formatted log message
 */
function writeToLogFile(message) {
  try {
    // Append to the log file, creating it if it doesn't exist
    fs.appendFileSync(CURRENT_LOG_FILE, message + '\n');
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
}

/**
 * Format a log message with timestamp and request ID if provided
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {string} [requestId] - Optional request ID
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, message, requestId) {
  const timestamp = new Date().toISOString();
  const requestIdStr = requestId ? `[${requestId}] ` : '';
  return `[${timestamp}] [${level}] ${requestIdStr}${message}`;
}

/**
 * Log a debug message
 * @param {string} message - Message to log
 * @param {string} [requestId] - Optional request ID
 */
function debug(message, requestId) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const formattedMessage = formatLogMessage('DEBUG', message, requestId);
    console.debug(formattedMessage);
    writeToLogFile(formattedMessage);
  }
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {string} [requestId] - Optional request ID
 */
function info(message, requestId) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const formattedMessage = formatLogMessage('INFO', message, requestId);
    console.info(formattedMessage);
    writeToLogFile(formattedMessage);
  }
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 * @param {string} [requestId] - Optional request ID
 */
function warn(message, requestId) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    const formattedMessage = formatLogMessage('WARN', message, requestId);
    console.warn(formattedMessage);
    writeToLogFile(formattedMessage);
  }
}

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {string} [requestId] - Optional request ID
 * @param {Error} [error] - Optional error object
 */
function error(message, requestId, error) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    const formattedMessage = formatLogMessage('ERROR', message, requestId);
    console.error(formattedMessage);
    writeToLogFile(formattedMessage);

    if (error) {
      const errorDetails = `${error.stack || error.toString()}`;
      console.error(errorDetails);
      writeToLogFile(formatLogMessage('ERROR_DETAILS', errorDetails, requestId));
    }
  }
}

/**
 * Log a section header
 * @param {string} title - Section title
 * @param {string} [requestId] - Optional request ID
 */
function section(title, requestId) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const requestIdStr = requestId ? ` ${requestId}` : '';
    const sectionHeader = `\n======== ${title}${requestIdStr} ========`;
    console.info(sectionHeader);
    writeToLogFile(sectionHeader);
  }
}

/**
 * Log a section footer
 */
function sectionEnd() {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const sectionFooter = '========================================\n';
    console.info(sectionFooter);
    writeToLogFile(sectionFooter);
  }
}

/**
 * Log an object as JSON
 * @param {string} label - Label for the object
 * @param {Object} obj - Object to log
 * @param {string} [requestId] - Optional request ID
 * @param {boolean} [detailed=false] - Whether to log the full object
 */
function logObject(label, obj, requestId, detailed = false) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG || !detailed) {
    info(`${label}: ${JSON.stringify(obj, null, 2)}`, requestId);
  } else if (currentLogLevel <= LOG_LEVELS.INFO) {
    // Log a simplified version of the object
    const simplifiedObj = { ...obj };
    // Remove large properties
    if (simplifiedObj.full_response) {
      delete simplifiedObj.full_response;
    }
    info(`${label}: ${JSON.stringify(simplifiedObj, null, 2)}`, requestId);
  }
}

/**
 * Log an AI response with full content
 * @param {Object} response - The AI response object
 * @param {boolean} isStreaming - Whether the response is streaming
 * @param {string} [requestId] - Optional request ID
 */
function logAIResponse(response, isStreaming, requestId) {
  if (currentLogLevel > LOG_LEVELS.INFO) return;

  section('AI RESPONSE CONTENT', requestId);

  if (isStreaming) {
    // For streaming responses
    const content = response.data || '';
    info(`Full response content:`, requestId);
    writeToLogFile(`--- RESPONSE CONTENT START ---`);
    writeToLogFile(content);
    writeToLogFile(`--- RESPONSE CONTENT END ---`);
  } else {
    // For non-streaming responses
    const content = response.choices?.[0]?.message?.content || '';
    info(`Full response content:`, requestId);
    writeToLogFile(`--- RESPONSE CONTENT START ---`);
    writeToLogFile(content);
    writeToLogFile(`--- RESPONSE CONTENT END ---`);

    // Log usage statistics
    if (response.usage) {
      info(`Tokens - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`, requestId);
    }
  }

  sectionEnd();
}

/**
 * Get the current session ID
 * @returns {string} - Current session ID
 */
function getSessionId() {
  return SESSION_ID;
}

/**
 * Get the server start time
 * @returns {Date} - Server start time
 */
function getServerStartTime() {
  return SERVER_START_TIME;
}

/**
 * Get the current log file name
 * @returns {string} - Current log file name
 */
function getLogFileName() {
  return path.basename(CURRENT_LOG_FILE);
}

module.exports = {
  debug,
  info,
  warn,
  error,
  section,
  sectionEnd,
  logObject,
  logAIResponse,
  LOG_LEVELS,
  getCurrentLogFilePath,
  getSessionId,
  getServerStartTime,
  getLogFileName
};
