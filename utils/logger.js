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
 * Log an object as JSON with detailed formatting
 * @param {string} label - Label for the object
 * @param {Object} obj - Object to log
 * @param {string} [requestId] - Optional request ID
 * @param {boolean} [detailed=false] - Whether to log the full object
 * @param {boolean} [trace=false] - Whether to include stack trace
 */
function logObject(label, obj, requestId, detailed = false, trace = false) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG || detailed) {
    // Create a separator for better visibility
    const separator = '='.repeat(80);
    writeToLogFile(separator);

    // Add timestamp and label
    const timestamp = new Date().toISOString();
    writeToLogFile(`[${timestamp}] OBJECT DUMP: ${label}`);

    // Add stack trace if requested
    if (trace) {
      const stackTrace = new Error().stack
        .split('\n')
        .slice(2) // Remove the Error and this function from the trace
        .map(line => line.trim())
        .join('\n');

      writeToLogFile('STACK TRACE:');
      writeToLogFile(stackTrace);
      writeToLogFile(separator);
    }

    // Log the full object with pretty formatting
    try {
      const jsonOutput = JSON.stringify(obj, null, 2);
      writeToLogFile(jsonOutput);
    } catch (err) {
      writeToLogFile(`[ERROR] Failed to stringify object: ${err.message}`);
      // Try to log the object with circular references replaced
      try {
        const getCircularReplacer = () => {
          const seen = new WeakSet();
          return (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular Reference]';
              }
              seen.add(value);
            }
            return value;
          };
        };

        const safeJson = JSON.stringify(obj, getCircularReplacer(), 2);
        writeToLogFile(safeJson);
      } catch (e) {
        writeToLogFile(`[ERROR] Failed to stringify with circular replacer: ${e.message}`);
      }
    }

    writeToLogFile(separator);

    // Also log to console with a shorter format
    console.info(`${formatLogMessage('INFO', `${label} (see log file for full details)`, requestId)}`);
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

/**
 * Log a function entry with parameters
 * @param {string} functionName - Name of the function being entered
 * @param {Object} params - Parameters passed to the function
 * @param {string} [requestId] - Optional request ID
 */
function functionEntry(functionName, params, requestId) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const timestamp = new Date().toISOString();
    const message = `ENTER FUNCTION: ${functionName}`;

    // Create a separator for better visibility
    const separator = '-'.repeat(40);
    writeToLogFile(separator);
    writeToLogFile(`[${timestamp}] ${message}`);

    // Log parameters
    if (params) {
      try {
        const paramsJson = JSON.stringify(params, null, 2);
        writeToLogFile(`PARAMETERS:`);
        writeToLogFile(paramsJson);
      } catch (err) {
        writeToLogFile(`[ERROR] Failed to stringify parameters: ${err.message}`);
      }
    }

    // Log stack trace for deeper context
    const stackTrace = new Error().stack
      .split('\n')
      .slice(2, 5) // Just get a few levels of the stack
      .map(line => line.trim())
      .join('\n');

    writeToLogFile(`CALL STACK (partial):`);
    writeToLogFile(stackTrace);
    writeToLogFile(separator);

    // Also log to console with a shorter format
    console.debug(formatLogMessage('DEBUG', message, requestId));
  }
}

/**
 * Log a function exit with return value
 * @param {string} functionName - Name of the function being exited
 * @param {any} returnValue - Value being returned from the function
 * @param {string} [requestId] - Optional request ID
 */
function functionExit(functionName, returnValue, requestId) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const timestamp = new Date().toISOString();
    const message = `EXIT FUNCTION: ${functionName}`;

    // Create a separator for better visibility
    const separator = '-'.repeat(40);
    writeToLogFile(separator);
    writeToLogFile(`[${timestamp}] ${message}`);

    // Log return value
    if (returnValue !== undefined) {
      try {
        const returnJson = JSON.stringify(returnValue, null, 2);
        writeToLogFile(`RETURN VALUE:`);
        writeToLogFile(returnJson);
      } catch (err) {
        writeToLogFile(`[ERROR] Failed to stringify return value: ${err.message}`);
        // Try with circular replacer
        try {
          const getCircularReplacer = () => {
            const seen = new WeakSet();
            return (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                  return '[Circular Reference]';
                }
                seen.add(value);
              }
              return value;
            };
          };

          const safeJson = JSON.stringify(returnValue, getCircularReplacer(), 2);
          writeToLogFile(safeJson);
        } catch (e) {
          writeToLogFile(`[ERROR] Failed to stringify with circular replacer: ${e.message}`);
        }
      }
    } else {
      writeToLogFile(`RETURN VALUE: undefined`);
    }

    writeToLogFile(separator);

    // Also log to console with a shorter format
    console.debug(formatLogMessage('DEBUG', message, requestId));
  }
}

/**
 * Log a detailed step within a function
 * @param {string} functionName - Name of the function
 * @param {string} stepName - Name of the step
 * @param {any} data - Data associated with this step
 * @param {string} [requestId] - Optional request ID
 */
function functionStep(functionName, stepName, data, requestId) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const timestamp = new Date().toISOString();
    const message = `STEP [${functionName}]: ${stepName}`;

    writeToLogFile(`[${timestamp}] ${message}`);

    // Log step data
    if (data !== undefined) {
      try {
        const dataJson = JSON.stringify(data, null, 2);
        writeToLogFile(`STEP DATA:`);
        writeToLogFile(dataJson);
      } catch (err) {
        writeToLogFile(`[ERROR] Failed to stringify step data: ${err.message}`);
      }
    }

    // Also log to console with a shorter format
    console.debug(formatLogMessage('DEBUG', message, requestId));
  }
}

/**
 * Log performance metrics
 * @param {string} label - Label for the performance metric
 * @param {number} startTime - Start time in milliseconds
 * @param {string} [requestId] - Optional request ID
 * @returns {number} - Elapsed time in milliseconds
 */
function performance(label, startTime, requestId) {
  const endTime = Date.now();
  const elapsedMs = endTime - startTime;

  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const message = `PERFORMANCE [${label}]: ${elapsedMs}ms`;
    const formattedMessage = formatLogMessage('DEBUG', message, requestId);
    console.debug(formattedMessage);
    writeToLogFile(formattedMessage);
  }

  return elapsedMs;
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
  functionEntry,
  functionExit,
  functionStep,
  performance,
  LOG_LEVELS,
  getCurrentLogFilePath,
  getSessionId,
  getServerStartTime,
  getLogFileName
};
