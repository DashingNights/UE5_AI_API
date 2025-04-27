# AI API Service

A lightweight API service for interacting with OpenAI's language models with optimized JSON responses and minimal token footprint.

## Features

- Standardized JSON response format
- Multiple system prompts for different use cases
- Configurable response formats (text or JSON)
- Structured logging with different log levels
- Token usage optimization
- Support for streaming responses
- Modular architecture for better maintainability

## Project Structure

The application is organized into the following modules:

```
├── config.js                # Application configuration
├── server.js                # Server startup
├── app.js                   # Express app setup
├── routes/                  # API routes
│   ├── aiRoutes.js          # AI endpoints
│   └── healthRoutes.js      # Health check endpoints
├── services/                # Business logic
│   └── aiService.js         # OpenAI API interaction
├── utils/                   # Utility modules
│   ├── logger.js            # Logging utility
│   ├── promptManager.js     # Prompt management
│   └── responseFormatter.js # Response formatting
└── prompts/                 # System prompts
    ├── defaultBehaviour.txt # Default system prompt
    └── ...                  # Other prompt templates
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   PORT=3000
   DEFAULT_MODEL=gpt-4o-mini
   DEFAULT_PROMPT=defaultBehaviour
   RESPONSE_FORMAT=text
   LOG_LEVEL=INFO
   ```

3. Start the server:
   ```
   node index.js
   ```

## API Endpoints

### Health Check

```
GET /health
```

Returns a simple status check to verify the API is running.

### AI Completion

```
POST /ai
```

Request body:
```json
{
  "message": "Your message to the AI",
  "options": {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "stream": false,
    "response_format": "json",
    "prompt_name": "defaultBehaviour"
  }
}
```

Response:
```json
{
  "request_id": "1621234567890",
  "status": "success",
  "response_time_ms": 1234,
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "total_tokens": 579
  },
  "finish_reason": "stop",
  "data": {
    "message": "AI response content",
    "details": {
      "additional": "structured data"
    }
  },
  "raw_content": "Original AI response string"
}
```

## Available Prompts

- `defaultBehaviour.txt`: Standard helpful assistant behavior
- `jsonResponse.txt`: Forces responses in JSON format
- `gameCharacter.txt`: For game character interactions with response choices

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `model` | OpenAI model to use | `gpt-4o-mini` |
| `temperature` | Response randomness (0-1) | `0.7` |
| `max_tokens` | Maximum tokens in response | `1000` |
| `stream` | Enable streaming response | `false` |
| `response_format` | Format type (`text` or `json`) | `text` |
| `prompt_name` | System prompt to use | `defaultBehaviour` |

## Logging

The API uses structured logging with the following levels:
- `DEBUG`: Detailed debugging information
- `INFO`: General information messages
- `WARN`: Warning messages
- `ERROR`: Error messages

Set the `LOG_LEVEL` environment variable to control logging verbosity.

### Log Files

Logs are automatically written to session-based log files in the following format:
- File naming: `YYYY-MM-DD_HHmm_SESSION-ID.log` (e.g., `2023-10-15_1423_a1b2c3d4.log` for a session started at 2:23 PM on October 15, 2023 with session ID a1b2c3d4)
- Location: `./logs/` directory by default (configurable via `LOG_DIR` environment variable)
- Format: `[timestamp] [level] [requestId] message`

Each log file contains all logs generated during a single server session. A new log file is created each time the server starts, with a unique session ID to prevent conflicts. This makes it easy to track all activity within a specific server session.

### AI Response Logging

The complete AI response content is logged in the log files for both streaming and non-streaming responses. The response is clearly marked with:
```
--- RESPONSE CONTENT START ---
(Full AI response content here)
--- RESPONSE CONTENT END ---
```

This makes it easy to review and analyze AI responses for debugging, quality control, and compliance purposes. The logs also include detailed information about token usage, response time, and other metadata.
