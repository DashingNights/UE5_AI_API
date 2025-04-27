/**
 * Logger utility for consistent logging throughout the application
 */

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
    console.debug(formatLogMessage('DEBUG', message, requestId));
  }
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {string} [requestId] - Optional request ID
 */
function info(message, requestId) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.info(formatLogMessage('INFO', message, requestId));
  }
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 * @param {string} [requestId] - Optional request ID
 */
function warn(message, requestId) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(formatLogMessage('WARN', message, requestId));
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
    console.error(formatLogMessage('ERROR', message, requestId));
    if (error) {
      console.error(error);
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
    console.info(`\n======== ${title}${requestIdStr} ========`);
  }
}

/**
 * Log a section footer
 */
function sectionEnd() {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.info('========================================\n');
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

module.exports = {
  debug,
  info,
  warn,
  error,
  section,
  sectionEnd,
  logObject,
  LOG_LEVELS,
};
