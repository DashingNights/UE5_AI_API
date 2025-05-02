// NPC Viewer JavaScript

// API endpoints
const API = {
    health: '/health',
    npcDebug: (npcIdOrName) => `/npc/${npcIdOrName}/debug`,
    npcHistory: (npcIdOrName) => `/npc/${npcIdOrName}/history`,
    npcRelationship: '/npc/relationship',
    discoverRelationships: (npcIdOrName) => `/npc/${npcIdOrName}/discover-relationships`,
    clearHistory: (npcIdOrName) => `/npc/${npcIdOrName}/history`
};

// State management
let currentNpcId = null;
let currentNpcName = null;

// DOM Elements
const elements = {
    serverStatus: document.getElementById('server-status'),
    npcSearch: document.getElementById('npc-search'),
    searchButton: document.getElementById('search-button'),
    npcBasicInfo: document.getElementById('npc-basic-info'),
    npcDetails: document.getElementById('npc-details'),
    relationshipNetwork: document.getElementById('relationship-network'),
    conversationHistory: document.getElementById('conversation-history'),
    refreshButton: document.getElementById('refresh-data'),
    viewHistoryButton: document.getElementById('view-history'),
    clearHistoryButton: document.getElementById('clear-history'),
    discoverRelationshipsButton: document.getElementById('discover-relationships')
};

// Initialize the viewer
async function initViewer() {
    checkServerStatus();
    setupEventListeners();
    
    // Check if NPC ID or name is in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const npcParam = urlParams.get('npc');
    
    if (npcParam) {
        elements.npcSearch.value = npcParam;
        loadNpcByIdOrName(npcParam);
    }
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

// Load NPC by ID or name
async function loadNpcByIdOrName(npcIdOrName) {
    if (!npcIdOrName) {
        alert('Please enter an NPC name or ID');
        return;
    }
    
    try {
        elements.npcDetails.innerHTML = '<p class="loading">Loading NPC details...</p>';
        elements.npcBasicInfo.innerHTML = '<p class="loading">Loading...</p>';
        
        const response = await fetch(API.npcDebug(npcIdOrName));
        if (!response.ok) throw new Error('Failed to fetch NPC details');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        // Update state
        currentNpcId = data.npc_id;
        currentNpcName = data.npc_name;
        
        // Update URL without reloading the page
        const url = new URL(window.location);
        url.searchParams.set('npc', currentNpcName);
        window.history.pushState({}, '', url);
        
        // Render NPC information
        renderNpcBasicInfo(data);
        renderNpcDetails(data);
        renderRelationshipNetwork(data.relationship_network);
        loadNpcHistory(currentNpcId);
    } catch (error) {
        elements.npcDetails.innerHTML = `<p class="error">Error loading NPC details: ${error.message}</p>`;
        elements.npcBasicInfo.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        console.error('Failed to load NPC details:', error);
    }
}

// Render basic NPC info in sidebar
function renderNpcBasicInfo(npcData) {
    const metadata = npcData.raw_metadata || {};
    
    elements.npcBasicInfo.innerHTML = `
        <div class="npc-basic-info-card">
            <h3>${metadata.name || 'Unknown NPC'}</h3>
            <div class="npc-property"><strong>ID:</strong> ${npcData.npc_id}</div>
            <div class="npc-property"><strong>Relationships:</strong> ${npcData.relationship_count || 0}</div>
            ${metadata.location ? `<div class="npc-property"><strong>Location:</strong> ${metadata.location}</div>` : ''}
            ${metadata.faction ? `<div class="npc-property"><strong>Faction:</strong> ${metadata.faction}</div>` : ''}
        </div>
    `;
}

// Render detailed NPC information
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
            <div class="stat-card">
                <div class="stat-value">${metadata.player_relationship?.respect || 'N/A'}</div>
                <div class="stat-label">Player Respect</div>
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
            ${metadata.currentState ? `<div class="npc-property"><strong>Current State:</strong> ${metadata.currentState}</div>` : ''}
        </div>
    `;
    
    // Create player relationship card
    let playerRelationshipHtml = '';
    if (metadata.player_relationship) {
        const pr = metadata.player_relationship;
        playerRelationshipHtml = `
            <div class="npc-card">
                <h3>Player Relationship</h3>
                <div class="npc-property"><strong>Status:</strong> ${pr.status || 'neutral'}</div>
                <div class="npc-property"><strong>Affinity:</strong> ${pr.affinity || 'N/A'}/100</div>
                <div class="npc-property"><strong>Trust:</strong> ${pr.trust || 'N/A'}/100</div>
                <div class="npc-property"><strong>Respect:</strong> ${pr.respect || 'N/A'}/100</div>
                ${pr.history && pr.history.length > 0 ? `
                    <div class="npc-property">
                        <strong>Significant Interactions:</strong>
                        <ul>
                            ${pr.history.map(h => `<li>${h}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
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
                                <td><a href="npc-viewer.html?npc=${encodeURIComponent(name)}">${name}</a></td>
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
    
    // Create debug info card
    const debugInfoHtml = `
        <div class="npc-card">
            <h3>Debug Information</h3>
            <div class="npc-property"><strong>Metadata Keys:</strong> ${npcData.debug_info?.metadata_keys?.join(', ') || 'None'}</div>
            <div class="npc-property"><strong>Relationships Type:</strong> ${npcData.debug_info?.relationships_type || 'undefined'}</div>
            <div class="npc-property"><strong>Is Relationships Array:</strong> ${npcData.debug_info?.is_relationships_array || false}</div>
            <div class="npc-property"><strong>Original Relationship Field:</strong> <pre>${JSON.stringify(npcData.debug_info?.original_relationship_field || {}, null, 2)}</pre></div>
        </div>
    `;
    
    // Combine all sections
    elements.npcDetails.innerHTML = statsHtml + basicInfoHtml + playerRelationshipHtml + relationshipsHtml + inventoryHtml + skillsHtml + debugInfoHtml;
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
    
    // Make nodes clickable to navigate to that NPC
    node.on('click', (event, d) => {
        if (d.id !== currentNpcId) {
            window.location.href = `npc-viewer.html?npc=${encodeURIComponent(d.name)}`;
        }
    }).style('cursor', 'pointer');
    
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

// Discover relationships for the current NPC
async function discoverRelationships() {
    if (!currentNpcId) {
        alert('Please load an NPC first');
        return;
    }
    
    try {
        const response = await fetch(API.discoverRelationships(currentNpcId));
        if (!response.ok) throw new Error('Failed to discover relationships');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        alert(`Successfully discovered relationships for ${currentNpcName}`);
        
        // Refresh the NPC details
        loadNpcByIdOrName(currentNpcId);
    } catch (error) {
        alert(`Error discovering relationships: ${error.message}`);
        console.error('Failed to discover relationships:', error);
    }
}

// Clear conversation history
async function clearConversationHistory() {
    if (!currentNpcId) {
        alert('Please load an NPC first');
        return;
    }
    
    if (!confirm(`Are you sure you want to clear the conversation history for ${currentNpcName}?`)) {
        return;
    }
    
    try {
        const response = await fetch(API.clearHistory(currentNpcId), {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to clear conversation history');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        alert(`Successfully cleared conversation history for ${currentNpcName}`);
        
        // Refresh the conversation history
        loadNpcHistory(currentNpcId);
    } catch (error) {
        alert(`Error clearing conversation history: ${error.message}`);
        console.error('Failed to clear conversation history:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search button click
    elements.searchButton.addEventListener('click', () => {
        loadNpcByIdOrName(elements.npcSearch.value);
    });
    
    // Search input enter key
    elements.npcSearch.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            loadNpcByIdOrName(elements.npcSearch.value);
        }
    });
    
    // Refresh button
    elements.refreshButton.addEventListener('click', () => {
        if (currentNpcId) {
            loadNpcByIdOrName(currentNpcId);
        } else {
            alert('Please load an NPC first');
        }
    });
    
    // View history button
    elements.viewHistoryButton.addEventListener('click', () => {
        if (currentNpcId) {
            loadNpcHistory(currentNpcId);
            // Scroll to history section
            document.getElementById('conversation-history-section').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Please load an NPC first');
        }
    });
    
    // Clear history button
    elements.clearHistoryButton.addEventListener('click', clearConversationHistory);
    
    // Discover relationships button
    elements.discoverRelationshipsButton.addEventListener('click', discoverRelationships);
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', initViewer);
