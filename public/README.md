# NPC Debug Dashboard

A web-based dashboard for debugging and visualizing NPC data in the UE5 OpenAI API Service.

## Features

- **NPC Dashboard**: View all NPCs and their details
- **NPC Viewer**: Detailed view of a single NPC's data
- **Relationship Network**: Visual representation of NPC relationships
- **Debug Tools**: Log NPC data, discover relationships, and more

## Pages

- **Dashboard** (`/index.html`): Main dashboard with list of all NPCs
- **NPC Viewer** (`/npc-viewer.html?npc=<npc_id_or_name>`): Detailed view of a single NPC
- **Network Viewer** (`/network-viewer.html`): Visual representation of all NPC relationships

## API Endpoints

The dashboard uses the following API endpoints:

- `/health`: Check server status
- `/npc/summary`: Get summary of all NPCs
- `/npc/:npcIdOrName/debug`: Get detailed debug information for an NPC
- `/npc/:npcIdOrName/history`: Get conversation history for an NPC
- `/npc/debug/log`: Log all NPC data to the log file
- `/npc/discover-relationships`: Discover relationships for all NPCs
- `/debug/npcs`: Get all NPCs with detailed information
- `/debug/stats`: Get server statistics
- `/debug/relationship-network`: Get global relationship network
- `/debug/recent-conversations`: Get recent conversations across all NPCs

## Usage

1. Start the server with `node server.js`
2. Open a web browser and navigate to `http://localhost:3000`
3. Use the dashboard to view and debug NPC data

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Visualization**: D3.js, Chart.js
- **Backend**: Node.js, Express

## Development

To add new features to the dashboard:

1. Add new HTML pages to the `public` directory
2. Add new JavaScript files to the `public/js` directory
3. Add new CSS styles to the `public/css/styles.css` file
4. Add new API endpoints to the `routes/debugRoutes.js` file
