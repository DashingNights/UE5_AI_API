// NPC Debug Dashboard JavaScript

// API endpoints
const API = {
    health: '/health',
    npcSummary: '/npc/summary',
    npcDebug: (npcIdOrName) => `/npc/${npcIdOrName}/debug`,
    npcHistory: (npcIdOrName) => `/npc/${npcIdOrName}/history`,
    npcRelationship: '/npc/relationship',
    debugLog: '/npc/debug/log',
    discoverRelationships: '/npc/discover-relationships'
};

// State management
let currentNpcId = null;
let allNpcs = [];

// DOM Elements
const elements = {
    serverStatus: document.getElementById('server-status'),
    npcList: document.getElementById('npc-list'),
    npcSearch: document.getElementById('npc-search'),
    npcDetails: document.getElementById('npc-details'),
    relationshipNetwork: document.getElementById('relationship-network'),
    conversationHistory: document.getElementById('conversation-history'),
    refreshButton: document.getElementById('refresh-data'),
    logAllDataButton: document.getElementById('log-all-data'),
    discoverRelationshipsButton: document.getElementById('discover-relationships')
};

// Initialize the dashboard
async function initDashboard() {
    checkServerStatus();
    await loadNpcList();
    setupEventListeners();
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch(API.health);
        if (response.ok) {
            elements.serverStatus.textContent = 'Server Status: Online';
            elements.serverStatus.classList.add('online');
        } else {
            throw new Error('Server returned an error');
        }
    } catch (error) {
        elements.serverStatus.textContent = 'Server Status: Offline';
        elements.serverStatus.classList.add('offline');
        console.error('Server status check failed:', error);
    }
}

// Load NPC list
async function loadNpcList() {
    try {
        const response = await fetch(API.npcSummary);
        if (!response.ok) throw new Error('Failed to fetch NPC list');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        allNpcs = data.npcs || [];
        renderNpcList(allNpcs);
    } catch (error) {
        elements.npcList.innerHTML = `<li class="error">Error loading NPCs: ${error.message}</li>`;
        console.error('Failed to load NPC list:', error);
    }
}

// Render NPC list
function renderNpcList(npcs) {
    if (!npcs || npcs.length === 0) {
        elements.npcList.innerHTML = '<li class="no-data">No NPCs found</li>';
        return;
    }
    
    elements.npcList.innerHTML = npcs.map(npc => `
        <li data-id="${npc.id}" class="${currentNpcId === npc.id ? 'active' : ''}">
            ${npc.name} <span class="message-count">(${npc.messageCount} messages)</span>
        </li>
    `).join('');
}

// Load NPC details
async function loadNpcDetails(npcId) {
    try {
        elements.npcDetails.innerHTML = '<p class="loading">Loading NPC details...</p>';
        
        const response = await fetch(API.npcDebug(npcId));
        if (!response.ok) throw new Error('Failed to fetch NPC details');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        renderNpcDetails(data);
        renderRelationshipNetwork(data.relationship_network);
        loadNpcHistory(npcId);
    } catch (error) {
        elements.npcDetails.innerHTML = `<p class="error">Error loading NPC details: ${error.message}</p>`;
        console.error('Failed to load NPC details:', error);
    }
}

// Render NPC details
function renderNpcDetails(npcData) {
    const metadata = npcData.raw_metadata || {};
    const relationships = npcData.relationships_object || {};
    
    // Create stats cards
    const statsHtml = `
        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-value">${npcData.relationship_count || 0}</div>
                <div class="stat-label">Relationships</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${metadata.player_relationship?.affinity || 'N/A'}</div>
                <div class="stat-label">Player Affinity</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${metadata.player_relationship?.trust || 'N/A'}</div>
                <div class="stat-label">Player Trust</div>
            </div>
        </div>
    `;
    
    // Create basic info card
    const basicInfoHtml = `
        <div class="npc-card">
            <h3>${metadata.name || 'Unknown NPC'}</h3>
            <div class="npc-property"><strong>ID:</strong> ${npcData.npc_id}</div>
            ${metadata.description ? `<div class="npc-property"><strong>Description:</strong> ${metadata.description}</div>` : ''}
            ${metadata.personality ? `<div class="npc-property"><strong>Personality:</strong> ${metadata.personality}</div>` : ''}
            ${metadata.location ? `<div class="npc-property"><strong>Location:</strong> ${metadata.location}</div>` : ''}
            ${metadata.faction ? `<div class="npc-property"><strong>Faction:</strong> ${metadata.faction}</div>` : ''}
        </div>
    `;
    
    // Create relationships table
    let relationshipsHtml = '';
    if (Object.keys(relationships).length > 0) {
        relationshipsHtml = `
            <div class="npc-card">
                <h3>Relationships</h3>
                <table class="relationship-table">
                    <thead>
                        <tr>
                            <th>NPC</th>
                            <th>Relationship</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(relationships).map(([name, relation]) => `
                            <tr>
                                <td>${name}</td>
                                <td><span class="relationship-tag ${getRelationshipClass(relation)}">${relation}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Create inventory list if available
    let inventoryHtml = '';
    if (metadata.inventory && metadata.inventory.length > 0) {
        inventoryHtml = `
            <div class="npc-card">
                <h3>Inventory</h3>
                <ul class="inventory-list">
                    ${metadata.inventory.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Create skills list if available
    let skillsHtml = '';
    if (metadata.skills && metadata.skills.length > 0) {
        skillsHtml = `
            <div class="npc-card">
                <h3>Skills</h3>
                <ul class="skills-list">
                    ${metadata.skills.map(skill => `<li>${skill}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Combine all sections
    elements.npcDetails.innerHTML = statsHtml + basicInfoHtml + relationshipsHtml + inventoryHtml + skillsHtml;
}

// Helper function to get relationship class for styling
function getRelationshipClass(relationship) {
    const rel = relationship.toLowerCase();
    if (rel.includes('friend')) return 'friend';
    if (rel.includes('enemy') || rel.includes('hostile')) return 'enemy';
    if (rel.includes('family') || rel.includes('relative')) return 'family';
    if (rel.includes('acquaintance')) return 'acquaintance';
    return 'neutral';
}

// Load NPC conversation history
async function loadNpcHistory(npcId) {
    try {
        elements.conversationHistory.innerHTML = '<p class="loading">Loading conversation history...</p>';
        
        const response = await fetch(API.npcHistory(npcId));
        if (!response.ok) throw new Error('Failed to fetch conversation history');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        renderConversationHistory(data.history || []);
    } catch (error) {
        elements.conversationHistory.innerHTML = `<p class="error">Error loading conversation history: ${error.message}</p>`;
        console.error('Failed to load conversation history:', error);
    }
}

// Render conversation history
function renderConversationHistory(history) {
    if (!history || history.length === 0) {
        elements.conversationHistory.innerHTML = '<p class="no-data">No conversation history found</p>';
        return;
    }
    
    const historyHtml = history.map(message => `
        <div class="message ${message.role}">
            <div class="message-content">${message.content}</div>
            <div class="timestamp">${new Date(message.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
    
    elements.conversationHistory.innerHTML = historyHtml;
    
    // Scroll to the bottom to show the most recent messages
    elements.conversationHistory.scrollTop = elements.conversationHistory.scrollHeight;
}

// Render relationship network using D3.js
function renderRelationshipNetwork(networkData) {
    if (!networkData || !networkData.nodes || !networkData.links || networkData.nodes.length === 0) {
        elements.relationshipNetwork.innerHTML = '<p class="no-data">No relationship data available</p>';
        return;
    }
    
    const svg = d3.select('#relationship-network svg');
    svg.selectAll('*').remove();
    
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    
    // Create a force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
        .force('link', d3.forceLink(networkData.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Add links
    const link = svg.append('g')
        .selectAll('line')
        .data(networkData.links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Add nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(networkData.nodes)
        .enter().append('circle')
        .attr('r', 10)
        .attr('fill', d => d.id === currentNpcId ? '#e74c3c' : '#3498db')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add node labels
    const text = svg.append('g')
        .selectAll('text')
        .data(networkData.nodes)
        .enter().append('text')
        .text(d => d.name)
        .attr('font-size', 12)
        .attr('dx', 15)
        .attr('dy', 4);
    
    // Add relationship labels
    const linkText = svg.append('g')
        .selectAll('text')
        .data(networkData.links)
        .enter().append('text')
        .text(d => d.relationship)
        .attr('font-size', 10)
        .attr('fill', '#666');
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        text
            .attr('x', d => d.x)
            .attr('y', d => d.y);
        
        linkText
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
    });
    
    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Log all NPC data
async function logAllNpcData() {
    try {
        const response = await fetch(API.debugLog);
        if (!response.ok) throw new Error('Failed to log NPC data');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        alert(`Successfully logged all NPC data.\nTimestamp: ${data.timestamp}\nRequest ID: ${data.request_id}`);
    } catch (error) {
        alert(`Error logging NPC data: ${error.message}`);
        console.error('Failed to log NPC data:', error);
    }
}

// Discover relationships
async function discoverRelationships() {
    try {
        const response = await fetch(API.discoverRelationships);
        if (!response.ok) throw new Error('Failed to discover relationships');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        alert(`Successfully discovered relationships.\nDirect relationships: ${data.total_direct_relationships}\nIndirect relationships: ${data.total_indirect_relationships}`);
        
        // Refresh the current NPC if one is selected
        if (currentNpcId) {
            loadNpcDetails(currentNpcId);
        }
    } catch (error) {
        alert(`Error discovering relationships: ${error.message}`);
        console.error('Failed to discover relationships:', error);
    }
}

// Filter NPCs by search term
function filterNpcs(searchTerm) {
    if (!searchTerm) {
        renderNpcList(allNpcs);
        return;
    }
    
    const filteredNpcs = allNpcs.filter(npc => 
        npc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    renderNpcList(filteredNpcs);
}

// Setup event listeners
function setupEventListeners() {
    // NPC list click
    elements.npcList.addEventListener('click', (event) => {
        const li = event.target.closest('li');
        if (!li || !li.dataset.id) return;
        
        // Update active state
        document.querySelectorAll('#npc-list li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        
        // Load NPC details
        currentNpcId = li.dataset.id;
        loadNpcDetails(currentNpcId);
    });
    
    // NPC search
    elements.npcSearch.addEventListener('input', (event) => {
        filterNpcs(event.target.value);
    });
    
    // Refresh button
    elements.refreshButton.addEventListener('click', async () => {
        await loadNpcList();
        if (currentNpcId) {
            loadNpcDetails(currentNpcId);
        }
    });
    
    // Log all data button
    elements.logAllDataButton.addEventListener('click', logAllNpcData);
    
    // Discover relationships button
    elements.discoverRelationshipsButton.addEventListener('click', discoverRelationships);
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);
