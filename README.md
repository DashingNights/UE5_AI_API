# AI API Service

A lightweight API service for interacting with OpenAI's language models with optimized JSON responses and minimal token footprint.

## Features

- Standardized JSON response format
- Multiple system prompts for different use cases
- Configurable response formats (text or JSON)
- Structured logging with different log levels
- Token usage optimization
- Support for streaming responses

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
