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
│   ├── healthRoutes.js      # Health check endpoints
│   ├── npcRoutes.js         # NPC conversation endpoints
│   └── adminRoutes.js       # Game administrator endpoints
├── services/                # Business logic
│   └── aiService.js         # OpenAI API interaction
├── utils/                   # Utility modules
│   ├── logger.js            # Logging utility
│   ├── promptManager.js     # Prompt management
│   ├── responseFormatter.js # Response formatting
│   └── contextManager.js    # Conversation context management
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

This section provides a comprehensive reference for all available API endpoints.

## Quick Reference

### Health Endpoints
- `GET /health` - Check if the API is running

### AI Endpoints
- `POST /ai` - Send a message to the AI

### NPC Endpoints
- `POST /npc` - Initialize a single NPC
- `POST /npc/initialize` - Initialize multiple NPCs (batch)
- `POST /npc/:npcId/chat` - Chat with an NPC
- `GET /npc/:npcId/history` - Get NPC conversation history
- `DELETE /npc/:npcId/history` - Clear NPC conversation history
- `GET /npc/summary` - Get summary of all NPCs
- `GET /npc/find` - Find NPC by name
- `GET /npc/relationship` - Get relationship between two NPCs
- `GET /npc/debug/log` - Log all NPC data (debug)

### Admin Endpoints
- `POST /admin/command` - Process game admin command
- `GET /admin/variables` - Get all game variables
- `POST /admin/variables` - Set game variables
- `DELETE /admin/variables/:key` - Delete a game variable

## Detailed API Reference

### Health Check

Simple endpoint to verify the API is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok"
}
```

### AI Completion

General-purpose AI completion endpoint for standard AI interactions.

**Endpoint:** `POST /ai`

**Request Body:**
```json
{
  "message": "Your message to the AI",
  "options": {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "stream": false,
    "response_format": "json",
    "prompt_name": "jsonResponse"
  }
}
```

**Response:**
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

#### Example: Simple Question

**Request Body:**
```json
{
  "message": "When is Christmas?",
  "options": {
    "model": "gpt-4o-mini"
  }
}
```

**Response:**
```json
{
  "request_id": "1621234567890",
  "status": "success",
  "response_time_ms": 234,
  "model": "gpt-4o-mini",
  "data": {
    "message": "Christmas is celebrated on December 25th each year.",
    "details": {
      "date": "December 25",
      "type": "religious and cultural holiday"
    }
  }
}
```

### NPC Management

This section covers all endpoints related to NPC management, including initialization, conversation, and relationship tracking.

#### Initialize a Single NPC

Initializes a single NPC and returns its unique ID. This is the recommended approach for initializing NPCs directly from individual actor instances in your game.

**Endpoint:** `POST /npc`

**Request Body:**
```json
{
  "name": "Blacksmith",
  "description": "A burly blacksmith who crafts the finest weapons",
  "backstory": "Born in the northern mountains, learned smithing from his father",
  "personality": "Gruff but kind-hearted",
  "location": "Village Forge",
  "currentState": "Working on a sword",
  "faction": "Villagers",
  "player_relationship": {
    "status": "friendly",
    "affinity": 65,
    "trust": 70,
    "respect": 80,
    "history": ["Player helped fix the forge", "Player delivered rare metals"]
  },
  "relationships": {
    "Mayor": "Respectful",
    "Innkeeper": "Friends"
  },
  "inventory": ["Hammer", "Tongs", "Unfinished Sword"],
  "skills": ["Smithing", "Metallurgy", "Haggling"],
  "actorId": "UniqueActorID_123",  // Optional: Your game's internal actor ID
  "position": {"x": 1250, "y": 750, "z": 100}  // Optional: Location in game world
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Initialized NPC: Blacksmith",
  "npc_id": "550e8400-e29b-41d4-a716-446655440000",
  "npc_name": "Blacksmith"
}
```

#### Initialize Multiple NPCs (Batch Method)

Initializes multiple NPCs at once and returns their unique IDs. This method is available for backward compatibility or for initializing groups of NPCs.

**Endpoint:** `POST /npc/initialize`

**Request Body:**
```json
{
  "npcs": [
    {
      "name": "Blacksmith",
      "description": "A burly blacksmith who crafts the finest weapons",
      "backstory": "Born in the northern mountains, learned smithing from his father",
      "personality": "Gruff but kind-hearted",
      "location": "Village Forge",
      "currentState": "Working on a sword",
      "faction": "Villagers",
      "relationships": {
        "Mayor": "Respectful",
        "Innkeeper": "Friends"
      },
      "inventory": ["Hammer", "Tongs", "Unfinished Sword"],
      "skills": ["Smithing", "Metallurgy", "Haggling"]
    },
    {
      "name": "Innkeeper",
      "description": "A cheerful innkeeper who knows all the local gossip",
      "backstory": "Inherited the inn from her parents",
      "personality": "Friendly and talkative",
      "location": "The Golden Goose Inn",
      "currentState": "Serving drinks",
      "faction": "Villagers",
      "relationships": {
        "Mayor": "Distrustful",
        "Blacksmith": "Friends"
      },
      "inventory": ["Mug", "Apron", "Keys"],
      "skills": ["Brewing", "Cooking", "Gossip"]
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Initialized 2 NPCs",
  "npc_ids": {
    "Blacksmith": "550e8400-e29b-41d4-a716-446655440000",
    "Innkeeper": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
}
```

#### Chat with NPC

Sends a message to an NPC and gets their response. The conversation history is automatically maintained between requests.

**Endpoint:** `POST /npc/:npcId/chat`

**URL Parameters:**
- `npcId` - The unique ID of the NPC to chat with

**Request Body:**
```json
{
  "message": "Hello, do you have any interesting gossip?",
  "options": {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "history_limit": 10,
    "prompt_name": "gameCharacter",
    "stream": false
  }
}
```

**Response:**
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
    "reply": "Well met, traveler! Indeed I do! They say the old wizard on the hill has been acting strange lately. Some folks have seen blue lights coming from his tower at night. And between you and me, the mayor's daughter has been sneaking out to meet someone in the woods.",
    "playerResponseChoices": {
      "1": "Tell me more about the wizard.",
      "2": "What's this about the mayor's daughter?",
      "3": "Any other news around town?"
    },
    "metadata": {
      "mood": "cheerful",
      "location": "The Golden Goose Inn",
      "memory": "Player asked about gossip",
      "currentState": "Serving drinks",
      "player_relationship": {
        "status": "friendly",
        "affinity": 55,
        "trust": 60,
        "respect": 50,
        "history": ["Player showed interest in local gossip"]
      }
    }
  },
  "raw_content": "Original AI response string"
}
```

#### Get NPC Conversation History

Retrieves the conversation history for a specific NPC. You can limit the number of messages returned.

**Endpoint:** `GET /npc/:npcId/history`

**URL Parameters:**
- `npcId` - The unique ID of the NPC

**Query Parameters:**
- `limit` (optional) - Maximum number of messages to return (most recent first)

**Response:**
```json
{
  "status": "success",
  "npc_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "history": [
    {
      "role": "player",
      "content": "Hello, do you have any interesting gossip?",
      "timestamp": "2023-10-15T14:23:45.123Z"
    },
    {
      "role": "npc",
      "content": "Well met, traveler! Indeed I do! They say the old wizard on the hill has been acting strange lately...",
      "timestamp": "2023-10-15T14:23:47.456Z"
    },
    {
      "role": "player",
      "content": "Tell me more about the wizard.",
      "timestamp": "2023-10-15T14:24:10.789Z"
    },
    {
      "role": "npc",
      "content": "Ah, old Magister Thorne! He's lived in that tower for decades...",
      "timestamp": "2023-10-15T14:24:12.345Z"
    }
  ]
}
```

#### Clear NPC Conversation History

Clears the conversation history for a specific NPC. Useful for resetting conversations.

**Endpoint:** `DELETE /npc/:npcId/history`

**URL Parameters:**
- `npcId` - The unique ID of the NPC

**Response:**
```json
{
  "status": "success",
  "message": "Cleared conversation history for NPC 6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

#### Get All NPCs Summary

Retrieves a summary of all initialized NPCs.

**Endpoint:** `GET /npc/summary`

**Response:**
```json
{
  "status": "success",
  "count": 2,
  "npcs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Blacksmith",
      "messageCount": 12
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Innkeeper",
      "messageCount": 8
    }
  ]
}
```

#### Find NPC by Name

Finds an NPC by their name.

**Endpoint:** `GET /npc/find`

**Query Parameters:**
- `name` - The name of the NPC to find (case-insensitive)

**Response:**
```json
{
  "status": "success",
  "npc": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Blacksmith",
    "description": "A burly blacksmith who crafts the finest weapons",
    "personality": "Gruff but kind-hearted",
    "location": "Village Forge",
    "player_relationship": {
      "status": "friendly",
      "affinity": 65,
      "trust": 70,
      "respect": 80,
      "history": ["Player helped fix the forge", "Player delivered rare metals"]
    }
  }
}
```

#### Get NPC Relationship

Retrieves the relationship between two NPCs.

**Endpoint:** `GET /npc/relationship`

**Query Parameters:**
- `npc1` - The ID of the first NPC
- `npc2` - The ID of the second NPC

**Response:**
```json
{
  "status": "success",
  "relationship": {
    "npc1_name": "Blacksmith",
    "npc2_name": "Innkeeper",
    "npc1_to_npc2": "Friends",
    "npc2_to_npc1": "Friends",
    "is_mutual": true,
    "is_conflicting": false
  }
}
```

#### Debug: Log All NPC Data

Triggers logging of all NPC data to the log file for debugging purposes.

**Endpoint:** `GET /npc/debug/log`

**Response:**
```json
{
  "status": "success",
  "message": "All NPC data has been written to the log file",
  "timestamp": "2023-10-15T14:30:45.123Z",
  "request_id": "1621234567890"
}
```

This endpoint will write detailed information about all NPCs to the log file, including:
- Basic metadata (name, description, personality, etc.)
- Player relationship data
- NPC-to-NPC relationships
- Conversation counts
- Last conversation
- Full NPC data (at DEBUG log level)

### Game Administrator

The Game Administrator is an emotionless system that manages game variables and state. It uses the `gameAdmin` prompt which produces structured, factual responses without character roleplay.

#### Process Admin Command

Sends a command to the game administrator to manage game variables and state.

**Endpoint:** `POST /admin/command`

**Request Body:**
```json
{
  "command": "Set player health to 80 and apply poison effect for 30 seconds",
  "options": {
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "max_tokens": 1000
  }
}
```

**Response:**
```json
{
  "request_id": "1621234567890",
  "status": "success",
  "response_time_ms": 234,
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 89,
    "completion_tokens": 156,
    "total_tokens": 245
  },
  "finish_reason": "stop",
  "data": {
    "message": "Player health set to 80. Poison effect applied for 30 seconds.",
    "status": "success",
    "variables": {
      "player_health": 80,
      "poison_effect_duration": 30
    },
    "actions": [
      {
        "type": "set_health",
        "target": "player",
        "value": 80
      },
      {
        "type": "apply_effect",
        "target": "player",
        "value": "poison:30"
      }
    ]
  },
  "raw_content": "Original AI response string"
}
```

#### Get Game Variables

Retrieves all current game variables.

**Endpoint:** `GET /admin/variables`

**Response:**
```json
{
  "status": "success",
  "variables": {
    "player_health": 80,
    "poison_effect_duration": 30,
    "world_time": "night",
    "weather": "rainy",
    "player_location": "forest",
    "quest_progress": {
      "main_quest": 3,
      "side_quest_1": "completed",
      "side_quest_2": "not_started"
    },
    "inventory_slots": 20,
    "player_gold": 150
  }
}
```

#### Set Game Variables

Sets one or more game variables.

**Endpoint:** `POST /admin/variables`

**Request Body:**
```json
{
  "variables": {
    "player_health": 100,
    "weather": "sunny",
    "world_time": "day",
    "player_gold": 200,
    "quest_progress": {
      "main_quest": 4
    }
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Updated 5 variables",
  "variables": {
    "player_health": 100,
    "poison_effect_duration": 30,
    "world_time": "day",
    "weather": "sunny",
    "player_location": "forest",
    "quest_progress": {
      "main_quest": 4,
      "side_quest_1": "completed",
      "side_quest_2": "not_started"
    },
    "inventory_slots": 20,
    "player_gold": 200
  }
}
```

#### Delete Game Variable

Deletes a specific game variable.

**Endpoint:** `DELETE /admin/variables/:key`

**URL Parameters:**
- `key` - The name of the variable to delete

**Response:**
```json
{
  "status": "success",
  "message": "Variable poison_effect_duration deleted"
}
```

## Available Prompts

- `defaultBehaviour.txt`: Standard helpful assistant behavior
- `jsonResponse.txt`: Forces responses in JSON format
- `gameCharacter.txt`: For game character interactions with response choices
- `gameAdmin.txt`: Emotionless game administrator for managing game variables
- `jsonSchema.txt`: Structured JSON responses with schema validation
- `context.txt`: World administrator character with response choices

## Configuration Options

### Common Options

| Option | Description | Default |
|--------|-------------|---------|
| `model` | OpenAI model to use | `gpt-4o-mini` |
| `temperature` | Response randomness (0-1) | `0.7` |
| `max_tokens` | Maximum tokens in response | `1000` |
| `stream` | Enable streaming response | `false` |
| `response_format` | Format type (`text` or `json`) | `json` |
| `prompt_name` | System prompt to use | `jsonResponse` |

### NPC Chat Options

| Option | Description | Default |
|--------|-------------|---------|
| `history_limit` | Number of previous messages to include | `10` |
| `system_message` | Custom system message (overrides prompt) | `null` |

### Admin Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `temperature` | Lower temperature for more consistent responses | `0.3` |

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
