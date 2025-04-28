# UE5 OpenAI API Service

A powerful AI middleware for Unreal Engine 5 that brings NPCs to life with advanced relationship networks, persistent memory, and contextual awareness. Create believable characters that remember conversations, form relationships with players and other NPCs, and respond intelligently based on their social connections and history.

> **⚠️ LICENSE NOTICE**: This software is available for private, non-commercial use only. See the [LICENSE](LICENSE) file for details.

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Setup](#-setup)
- [📚 API Reference](#-api-reference)
  - [Endpoint Overview](#endpoint-overview)
  - [Health Check](#health-check)
  - [AI Completion](#ai-completion)
  - [NPC Management](#npc-management)
  - [Game Administrator](#game-administrator)
- [🧠 NPC System](#-npc-system)
- [💬 Conversation Management](#-conversation-management)
- [👥 Relationship System](#-relationship-system)
- [📊 Response Formats](#-response-formats)
- [⚙️ Configuration](#️-configuration)
- [📝 Logging](#-logging)
- [🎮 Unreal Engine Integration](#-unreal-engine-integration)
- [🏆 Best Practices](#-best-practices)
- [🔧 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)
- [🙏 Acknowledgements](#-acknowledgements)

## ✨ Features

### 🧠 Advanced NPC Intelligence

- **Social Relationship Networks**: NPCs maintain detailed relationships with players and other NPCs, including relationship types, history, and mutual connections
- **Relationship Discovery**: Automatically discovers and maps connections between NPCs, including indirect relationships through mutual acquaintances
- **Contextual Memory**: NPCs remember past conversations, player actions, and significant events
- **Emotional Intelligence**: NPCs respond differently based on their relationship with the player and other characters
- **Personality Persistence**: Characters maintain consistent personalities and knowledge across multiple interactions

### 🔄 Seamless Integration

- **Standardized JSON Response Format**: Consistent, structured responses for easy integration with Unreal Engine
- **Multiple System Prompts**: Different prompt templates for various use cases (NPCs, JSON responses, etc.)
- **Unreal-Fetch Compatible**: Optimized for use with the Unreal-Fetch plugin
- **Streaming Support**: Optional streaming responses for real-time text generation
- **Configurable Response Formats**: Choose between text or structured JSON responses

### ⚙️ Robust Architecture

- **NPC Conversation Management**: Track and maintain conversation history for each NPC
- **Detailed Relationship Metadata**: Store rich context about each relationship including descriptions, personalities, and locations
- **Comprehensive Logging**: Detailed logs with timestamps and message content
- **Token Usage Optimization**: Minimize token usage for cost-effective operation
- **Modular Architecture**: Well-organized codebase for easy maintenance and extension

## 🏗️ Architecture

The application follows a modular architecture:

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
    ├── gameCharacter.txt    # NPC character prompt
    ├── jsonResponse.txt     # JSON-formatted responses
    └── ...                  # Other prompt templates
```

### Key Components

| Component | Description | File Path |
|-----------|-------------|-----------|
| **[contextManager.js](utils/contextManager.js)** | Manages NPC data, conversation history, and relationships | [utils/contextManager.js](utils/contextManager.js) |
| **[aiService.js](services/aiService.js)** | Handles interactions with OpenAI API, including streaming and history management | [services/aiService.js](services/aiService.js) |
| **[promptManager.js](utils/promptManager.js)** | Loads and caches system prompts for different use cases | [utils/promptManager.js](utils/promptManager.js) |
| **[logger.js](utils/logger.js)** | Provides structured logging with session-based log files | [utils/logger.js](utils/logger.js) |
| **[npcRoutes.js](routes/npcRoutes.js)** | Implements NPC-related API endpoints | [routes/npcRoutes.js](routes/npcRoutes.js) |
| **[responseFormatter.js](utils/responseFormatter.js)** | Standardizes API response format | [utils/responseFormatter.js](utils/responseFormatter.js) |
| **[aiRoutes.js](routes/aiRoutes.js)** | Implements AI-related API endpoints | [routes/aiRoutes.js](routes/aiRoutes.js) |
| **[adminRoutes.js](routes/adminRoutes.js)** | Implements admin-related API endpoints | [routes/adminRoutes.js](routes/adminRoutes.js) |

## 🚀 Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create a `.env` file** with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   PORT=3000
   DEFAULT_MODEL=gpt-4o-mini
   DEFAULT_PROMPT=defaultBehaviour
   RESPONSE_FORMAT=json
   LOG_LEVEL=INFO
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

4. **Test the API**:
   ```bash
   curl -X GET http://localhost:3000/health
   ```

5. **Initialize an NPC**:
   ```bash
   curl -X POST http://localhost:3000/npc \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Blacksmith",
       "description": "A burly blacksmith who crafts the finest weapons",
       "personality": "Gruff but kind-hearted",
       "location": "Village Forge"
     }'
   ```

> **Note**: For Unreal Engine integration, we strongly recommend using the [Unreal-Fetch](https://github.com/GDi4k/unreal-fetch) plugin for the best experience. See the [Unreal Engine Integration](#-unreal-engine-integration) section for details and example code.

## 📚 API Reference

This section provides a comprehensive reference for all available API endpoints.

### Endpoint Overview

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Health** | [`/health`](#health-check) | GET | Check if the API is running |
| **AI** | [`/ai`](#ai-completion) | POST | Send a message to the AI |
| **NPC** | [`/npc`](#initialize-a-single-npc) | POST | Initialize a single NPC |
| **NPC** | [`/npc/initialize`](#initialize-multiple-npcs-batch-method) | POST | Initialize multiple NPCs (batch) |
| **NPC** | [`/npc/:npcIdOrName/chat`](#chat-with-npc) | POST | Chat with an NPC |
| **NPC** | [`/npc/:npcIdOrName/history`](#get-npc-conversation-history) | GET | Get NPC conversation history |
| **NPC** | [`/npc/:npcIdOrName/history`](#clear-npc-conversation-history) | DELETE | Clear NPC conversation history |
| **NPC** | [`/npc/summary`](#get-all-npcs-summary) | GET | Get summary of all NPCs |
| **NPC** | [`/npc/find`](#find-npc-by-name) | GET | Find NPC by name |
| **NPC** | [`/npc/relationship`](#get-npc-relationship) | GET | Get relationship between two NPCs |
| **NPC** | [`/npc/debug/log`](#debug-log-all-npc-data) | GET | Log all NPC data (debug) |
| **Admin** | [`/admin/command`](#process-admin-command) | POST | Process game admin command |
| **Admin** | [`/admin/variables`](#get-game-variables) | GET | Get all game variables |
| **Admin** | [`/admin/variables`](#set-game-variables) | POST | Set game variables |
| **Admin** | [`/admin/variables/:key`](#delete-game-variable) | DELETE | Delete a game variable |

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

| Endpoint | Method | Description | Link |
|----------|--------|-------------|------|
| `/ai` | POST | Send message to AI | [Details](#ai-completion) |
| `/health` | GET | Health check | [Details](#health-check) |

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

| Endpoint | Method | Description | Link |
|----------|--------|-------------|------|
| `/npc` | POST | Initialize a single NPC | [Details](#initialize-a-single-npc) |
| `/npc/initialize` | POST | Initialize multiple NPCs | [Details](#initialize-multiple-npcs-batch-method) |
| `/npc/:npcIdOrName/chat` | POST | Chat with an NPC | [Details](#chat-with-npc) |
| `/npc/:npcIdOrName/history` | GET | Get conversation history | [Details](#get-npc-conversation-history) |
| `/npc/:npcIdOrName/history` | DELETE | Clear conversation history | [Details](#clear-npc-conversation-history) |
| `/npc/summary` | GET | Get all NPCs summary | [Details](#get-all-npcs-summary) |
| `/npc/find` | GET | Find NPC by name | [Details](#find-npc-by-name) |
| `/npc/relationship` | GET | Get NPC relationship | [Details](#get-npc-relationship) |
| `/npc/debug/log` | GET | Log all NPC data | [Details](#debug-log-all-npc-data) |

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

**Endpoint:** `POST /npc/:npcIdOrName/chat`

**URL Parameters:**
- `npcIdOrName` - Either the unique ID or the name of the NPC to chat with

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

**Endpoint:** `GET /npc/:npcIdOrName/history`

**URL Parameters:**
- `npcIdOrName` - Either the unique ID or the name of the NPC

**Query Parameters:**
- `limit` (optional) - Maximum number of messages to return (most recent first)

**Response:**
```json
{
  "status": "success",
  "npc_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "npc_name": "Innkeeper",
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

**Endpoint:** `DELETE /npc/:npcIdOrName/history`

**URL Parameters:**
- `npcIdOrName` - Either the unique ID or the name of the NPC

**Response:**
```json
{
  "status": "success",
  "message": "Cleared conversation history for NPC Innkeeper (ID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8)"
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
- `npc1` - Either the ID or name of the first NPC
- `npc2` - Either the ID or name of the second NPC

**Response:**
```json
{
  "status": "success",
  "relationship": {
    "npc1_id": "550e8400-e29b-41d4-a716-446655440000",
    "npc2_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
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

| Endpoint | Method | Description | Link |
|----------|--------|-------------|------|
| `/admin/command` | POST | Process admin command | [Details](#process-admin-command) |
| `/admin/variables` | GET | Get game variables | [Details](#get-game-variables) |
| `/admin/variables` | POST | Set game variables | [Details](#set-game-variables) |
| `/admin/variables/:key` | DELETE | Delete game variable | [Details](#delete-game-variable) |

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

## 🧠 NPC System

The NPC system manages game characters with rich metadata and conversation history.

### NPC Data Structure

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | NPC's name |
| `description` | String | Brief description of the NPC |
| `backstory` | String | NPC's background story |
| `personality` | String | NPC's personality traits |
| `location` | String | Current location of the NPC |
| `currentState` | String | What the NPC is currently doing |
| `faction` | String | Group the NPC belongs to |
| `player_relationship` | Object | Relationship with the player |
| `relationships` | Object | Relationships with other NPCs |
| `inventory` | Array | Items the NPC possesses |
| `skills` | Array | Skills the NPC has |

### Player Relationship Structure

```javascript
{
  "status": "neutral",       // friendly, neutral, hostile, etc.
  "affinity": 50,            // 0-100 scale: 0=hostile, 50=neutral, 100=friendly
  "trust": 50,               // 0-100 scale
  "respect": 50,             // 0-100 scale
  "history": []              // Array of significant interactions
}
```

> **Note**: The `history` array in player_relationship stores significant milestones in the relationship, not every conversation message.

## 💬 Conversation Management & Memory

The system provides NPCs with persistent memory and contextual awareness, allowing them to recall past conversations and maintain consistent personalities across multiple interactions.

### 🧠 Persistent Memory System

NPCs remember their interactions with the player and can reference them in future conversations:

- **Conversation Recall**: NPCs remember what was discussed in previous conversations
- **Event Memory**: NPCs remember significant events and player actions
- **Contextual References**: NPCs can refer back to previous topics naturally
- **Personality Consistency**: NPCs maintain consistent character traits across interactions
- **Relationship Evolution**: NPC relationships evolve based on conversation history

### 📝 Memory Storage Architecture

The memory system uses a sophisticated architecture to maintain context:

- **Dedicated History Per NPC**: Each NPC has their own isolated conversation history
- **Timestamped Interactions**: All messages are stored with precise timestamps
- **Role Identification**: Messages are tagged as player or NPC for clear context
- **Metadata Enrichment**: Conversations include contextual metadata about the NPC's state
- **Session Persistence**: Memory persists throughout the game session

### ⚙️ Memory Configuration

Fine-tune how NPCs use their memory:

- **Adjustable Memory Depth**: Control how far back NPCs remember with the `history_limit` parameter
- **Memory Prioritization**: The system automatically prioritizes significant interactions
- **Memory Reset**: Clear an NPC's memory when appropriate with the history deletion endpoint
- **Memory Inspection**: Examine what an NPC remembers through the history retrieval endpoint

### 🔍 Accessing NPC Memory

Retrieve an NPC's conversation history programmatically:

```
GET /npc/Blacksmith/history?limit=5
```

This returns the 5 most recent interactions with the Blacksmith, including:
- The exact messages exchanged
- When each message was sent
- Who said what (player vs. NPC)

### 📊 Memory in Action

When a player returns to an NPC after previous interactions:

```
Player: "Hello again!"

Blacksmith: "Ah, welcome back! Last time you were asking about that enchanted sword.
Have you gathered those rare materials I mentioned? I remember you said you were
heading to the northern mountains to look for them."
```

The NPC seamlessly recalls:
- Previous conversation topics
- Pending quests or tasks
- Player's stated intentions
- The relationship context

## 👥 Relationship System

The system features a sophisticated social network that models complex relationships between NPCs and with the player, creating a living, interconnected world.

### 🌐 Social Network Mapping

NPCs maintain a rich web of relationships that influence their behavior, dialogue, and decision-making:

- **Direct Relationships**: Explicit connections between characters
- **Indirect Relationships**: "Friend-of-a-friend" connections discovered automatically
- **Relationship Types**: Friendships, rivalries, family ties, professional associations, etc.
- **Relationship Qualities**: Mutual relationships, conflicting relationships, one-sided relationships
- **Relationship History**: Significant events and interactions that shaped the relationship

### 🔍 Enhanced Relationship Context

Each relationship includes detailed metadata about the related character:

```javascript
{
  "name": "Mayor",
  "description": "The elected leader of the village",
  "personality": "Stern but fair",
  "faction": "Village Council",
  "location": "Town Hall",
  "currentState": "Reviewing tax records",
  "relationship": "Respectful",
  "mutual": true,
  "reverse_relationship": "Reliable"
}
```

### 🤝 NPC-to-NPC Relationships

NPCs maintain relationships with other characters in the world:

```javascript
"relationships": {
  "Mayor": "Respectful",
  "Innkeeper": "Friends",
  "Guard": "Distrustful"
}
```

### 👤 NPC-to-Player Relationship

The player relationship is tracked separately with more detailed metrics:

```javascript
"player_relationship": {
  "status": "friendly",
  "affinity": 65,
  "trust": 70,
  "respect": 80,
  "history": ["Player helped fix the forge", "Player delivered rare metals"]
}
```

### 🔄 Automatic Relationship Discovery

The system intelligently maps the social network by:

1. **Analyzing Direct Connections**: Identifying explicit relationships in NPC data
2. **Finding Common Connections**: Discovering shared relationships between NPCs
3. **Mapping Indirect Relationships**: Creating "friend-of-a-friend" connections
4. **Identifying Relationship Patterns**: Detecting mutual, conflicting, and one-sided relationships
5. **Building Relationship Context**: Enriching relationships with detailed character metadata

#### Discovery Triggers

Relationship discovery happens:

- **During Chat**: Automatically before generating NPC responses (configurable)
- **Periodically**: Background refresh every 10 minutes (configurable)
- **On Demand**: Through dedicated API endpoints

#### Relationship-Aware Conversations

When an NPC discusses another character, they have access to:

```
"I know the Mayor is a stern but fair leader of the Village Council.
He's usually at Town Hall reviewing tax records. I have a respectful
relationship with him, and he considers me reliable. He's also
connected to the Innkeeper, who I'm friends with."
```

#### Example: Asking About Relationships

```json
{
  "message": "What do you think about the Innkeeper?",
  "options": {
    "model": "gpt-4o-mini",
    "temperature": 0.7
  }
}
```

This triggers relationship discovery, providing the NPC with rich context about:
- Their direct relationship with the Innkeeper
- The Innkeeper's detailed metadata (personality, location, etc.)
- Mutual connections they share with the Innkeeper
- The Innkeeper's relationship with the player

#### Advanced Control

Fine-tune relationship discovery with options:

```json
{
  "message": "Hello there!",
  "options": {
    "model": "gpt-4o-mini",
    "discover_relationships": false,  // Disable for this interaction
    "relationship_depth": 2           // How many degrees of separation to explore
  }
}
```

## 📊 Response Formats

The system supports different response formats based on the prompt used.

### Standard JSON Response

Using the `jsonResponse` prompt:

```json
{
  "message": "The capital of France is Paris.",
  "details": {
    "country": "France",
    "capital": "Paris",
    "location": "Western Europe"
  }
}
```

### Game Character Response

Using the `gameCharacter` prompt:

```json
{
  "reply": "Well met, traveler! Indeed I do! They say the old wizard on the hill has been acting strange lately.",
  "playerResponseChoices": {
    "1": "Tell me more about the wizard.",
    "2": "What's this about the mayor's daughter?",
    "3": "Any other news around town?"
  },
  "metadata": {
    "mood": "cheerful",
    "location": "The Golden Goose Inn",
    "memory": "Player asked about gossip"
  }
}
```

## ⚙️ Configuration

### Available Prompts

| Prompt | Description | Use Case | Location |
|--------|-------------|----------|----------|
| [`defaultBehaviour.txt`](prompts/defaultBehaviour.txt) | Standard helpful assistant behavior | General AI interactions | [prompts/defaultBehaviour.txt](prompts/defaultBehaviour.txt) |
| [`jsonResponse.txt`](prompts/jsonResponse.txt) | Forces responses in JSON format | Structured data responses | [prompts/jsonResponse.txt](prompts/jsonResponse.txt) |
| [`gameCharacter.txt`](prompts/gameCharacter.txt) | Game character interactions with response choices | NPC conversations | [prompts/gameCharacter.txt](prompts/gameCharacter.txt) |
| [`gameAdmin.txt`](prompts/gameAdmin.txt) | Emotionless game administrator | Managing game variables | [prompts/gameAdmin.txt](prompts/gameAdmin.txt) |
| [`jsonSchema.txt`](prompts/jsonSchema.txt) | Structured JSON responses with schema validation | Complex data structures | [prompts/jsonSchema.txt](prompts/jsonSchema.txt) |
| [`context.txt`](prompts/context.txt) | World administrator character | Game world management | [prompts/context.txt](prompts/context.txt) |

### Request Options

| Option | Description | Default |
|--------|-------------|---------|
| `model` | OpenAI model to use | `gpt-4o-mini` |
| `temperature` | Response randomness (0-1) | `0.7` |
| `max_tokens` | Maximum tokens in response | `1000` |
| `stream` | Enable streaming response | `false` |
| `response_format` | Format type (`text` or `json`) | `json` |
| `prompt_name` | System prompt to use | `jsonResponse` |
| `history_limit` | Number of previous messages to include | `10` |
| `system_message` | Custom system message (overrides prompt) | `null` |
| `discover_relationships` | Trigger relationship discovery before chat | `true` |

## 📝 Logging

The system includes comprehensive logging:

### Log Structure

| Feature | Description |
|---------|-------------|
| **Session-based log files** | Each server session creates a new log file |
| **Timestamps** | Each log entry includes a timestamp |
| **Request IDs** | Each request gets a unique ID for tracking |
| **Structured sections** | Logs are organized into clear sections |
| **Multiple log levels** | INFO, DEBUG, ERROR, etc. |
| **Periodic NPC logging** | Automatic logging of NPC state every 5 minutes |

### Log File Format

- **File naming**: `YYYY-MM-DD_HHmm_SESSION-ID.log`
  - Example: `2025-04-28_0104_ab263418.log`
- **Location**: `./logs/` directory (configurable via `LOG_DIR` environment variable)
- **Format**: `[timestamp] [level] [requestId] message`

### AI Response Logging

The complete AI response content is logged with clear markers:
```
--- RESPONSE CONTENT START ---
(Full AI response content here)
--- RESPONSE CONTENT END ---
```

This makes it easy to review AI responses for debugging and quality control.

## 🎮 Unreal Engine Integration

For the best integration with Unreal Engine, we strongly recommend using [Unreal-Fetch](https://github.com/GDi4k/unreal-fetch), a powerful HTTP client plugin for Unreal Engine.

### Why Unreal-Fetch?

- **Blueprint Support**: Complete Blueprint integration for easy implementation
- **Async Operations**: Non-blocking HTTP requests to maintain game performance
- **JSON Handling**: Built-in JSON serialization/deserialization
- **Request Queuing**: Automatic request management
- **Error Handling**: Robust error handling and retry mechanisms

### Installation

1. Download the [Unreal-Fetch plugin](https://github.com/GDi4k/unreal-fetch)
2. Add it to your project's Plugins folder
3. Enable the plugin in your project settings

### Example Implementation

Here's a basic example of how to chat with an NPC using Unreal-Fetch:

```cpp
// C++ Example
#include "FetchSubsystem.h"
#include "Kismet/GameplayStatics.h"

void ANPCCharacter::SendChatMessage(FString Message)
{
    // Get the Fetch subsystem
    UFetchSubsystem* FetchSubsystem = GEngine->GetEngineSubsystem<UFetchSubsystem>();

    // Create the request body
    TSharedPtr<FJsonObject> RequestBody = MakeShareable(new FJsonObject);
    RequestBody->SetStringField("message", Message);

    // Create options object
    TSharedPtr<FJsonObject> Options = MakeShareable(new FJsonObject);
    Options->SetStringField("model", "gpt-4o-mini");
    Options->SetNumberField("temperature", 0.7);
    Options->SetNumberField("max_tokens", 1000);
    Options->SetBoolField("stream", false);

    // Add options to request body
    RequestBody->SetObjectField("options", Options);

    // Convert to JSON string
    FString RequestBodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&RequestBodyString);
    FJsonSerializer::Serialize(RequestBody.ToSharedRef(), Writer);

    // Create the request
    FFetchRequestOptions RequestOptions;
    RequestOptions.URL = FString::Printf(TEXT("http://localhost:3000/npc/%s/chat"), *NPCName);
    RequestOptions.Method = EFetchRequestMethod::POST;
    RequestOptions.Headers.Add("Content-Type", "application/json");
    RequestOptions.Body = RequestBodyString;

    // Send the request
    FetchSubsystem->Fetch(RequestOptions, FFetchResponseDelegate::CreateUObject(this, &ANPCCharacter::OnChatResponseReceived));
}

void ANPCCharacter::OnChatResponseReceived(FFetchResponse Response)
{
    if (Response.Success)
    {
        // Parse the JSON response
        TSharedPtr<FJsonObject> JsonObject;
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Response.Content);
        if (FJsonSerializer::Deserialize(Reader, JsonObject))
        {
            // Extract the NPC's reply
            TSharedPtr<FJsonObject> DataObject = JsonObject->GetObjectField("data");
            FString Reply = DataObject->GetStringField("reply");

            // Update the NPC's dialogue
            UpdateDialogue(Reply);
        }
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to get response from API: %s"), *Response.Error);
    }
}
```

For Blueprint implementation, Unreal-Fetch provides nodes for all these operations, making it even easier to integrate.

### Blueprint Example

![Unreal-Fetch Blueprint Example](https://raw.githubusercontent.com/GDi4k/unreal-fetch/main/Resources/blueprint-example.png)

## 🏆 Best Practices

### NPC Initialization

- **Initialize NPCs individually**: Use `POST /npc` for each NPC rather than batch initialization
- **Include unique identifiers**: Add an `actorId` field that matches your game's internal actor ID
- **Avoid duplicate NPCs**: Check if an NPC exists before creating a new one with the same name
- **Use Unreal-Fetch**: For the best integration experience with Unreal Engine

### Conversation Management

- **Limit history when needed**: Use the `history_limit` parameter to control context size
- **Clear history when appropriate**: Use the DELETE endpoint to reset conversations
- **Update relationship data**: The AI can suggest relationship updates in the metadata

### Performance Optimization

- **Use the right model**: `gpt-4o-mini` offers a good balance of quality and speed
- **Adjust max_tokens**: Set appropriate limits based on expected response length
- **Use non-streaming mode**: For most game interactions, non-streaming is more efficient

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Duplicate NPCs | Use `GET /npc/summary` to check for duplicates and remove them |
| Missing conversation history | Verify the NPC ID or name is correct |
| Invalid JSON responses | Check that the prompt is set to use JSON format |
| High token usage | Reduce the history_limit parameter |
| Slow responses | Consider using a faster model like gpt-4o-mini |

### Debugging

- Use the `/npc/debug/log` endpoint to log all NPC data
- Check the log files in the `logs` directory
- Enable DEBUG level logging for more detailed information

---

## 📄 License

This project is licensed under a custom **Non-Commercial License** - see the [LICENSE](LICENSE) file for details.

### License Summary

- ✅ **Allowed**: Private, personal use
- ✅ **Allowed**: Educational and academic use
- ✅ **Allowed**: Non-profit organization use
- ✅ **Allowed**: Evaluation and testing
- ✅ **Allowed**: Creating derivative works for non-commercial purposes
- ❌ **Not Allowed**: Commercial use of any kind
- ❌ **Not Allowed**: Using in commercial products or services
- ❌ **Not Allowed**: Using in for-profit organizations

### Commercial Licensing

If you wish to use this software for commercial purposes, please contact [ceo@lustrecrew.net](mailto:ceo@lustrecrew.net) to inquire about commercial licensing options.

## 🙏 Acknowledgements

- OpenAI for providing the API
- Express.js for the web framework
- The Unreal Engine community for inspiration and feedback
