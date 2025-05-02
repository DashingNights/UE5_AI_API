// NPC Relationship Network Viewer JavaScript

// API endpoints
const API = {
    health: '/health',
    networkData: '/debug/relationship-network',
    stats: '/debug/stats',
    discoverRelationships: '/npc/discover-relationships',
    npcDebug: (npcIdOrName) => `/npc/${npcIdOrName}/debug`
};

// State management
let networkData = null;
let simulation = null;
let selectedNode = null;

// DOM Elements
const elements = {
    serverStatus: document.getElementById('server-status'),
    networkStats: document.getElementById('network-stats'),
    networkVisualization: document.getElementById('network-visualization'),
    selectedNodeInfo: document.getElementById('selected-node-info'),
    nodeSize: document.getElementById('node-size'),
    linkStrength: document.getElementById('link-strength'),
    chargeStrength: document.getElementById('charge-strength'),
    refreshButton: document.getElementById('refresh-network'),
    discoverButton: document.getElementById('discover-all-relationships')
};

// Initialize the network viewer
async function initNetworkViewer() {
    checkServerStatus();
    await loadNetworkData();
    await loadNetworkStats();
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

// Load network data
async function loadNetworkData() {
    try {
        const response = await fetch(API.networkData);
        if (!response.ok) throw new Error('Failed to fetch network data');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        networkData = data.network;
        renderNetwork(networkData);
    } catch (error) {
        elements.networkVisualization.innerHTML = `<p class="error">Error loading network data: ${error.message}</p>`;
        console.error('Failed to load network data:', error);
    }
}

// Load network statistics
async function loadNetworkStats() {
    try {
        const response = await fetch(API.stats);
        if (!response.ok) throw new Error('Failed to fetch network statistics');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        renderNetworkStats(data.stats);
    } catch (error) {
        elements.networkStats.innerHTML = `<p class="error">Error loading statistics: ${error.message}</p>`;
        console.error('Failed to load network statistics:', error);
    }
}

// Render network statistics
function renderNetworkStats(stats) {
    elements.networkStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">NPCs</div>
            <div class="stat-value">${stats.npc_count}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Relationships</div>
            <div class="stat-value">${stats.total_relationships}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Avg. Relationships/NPC</div>
            <div class="stat-value">${stats.avg_relationships_per_npc}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">NPCs with Relationships</div>
            <div class="stat-value">${stats.npcs_with_relationships}</div>
        </div>
    `;
}

// Render the network visualization using D3.js
function renderNetwork(data) {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
        elements.networkVisualization.innerHTML = '<p class="no-data">No network data available</p>';
        return;
    }
    
    const svg = d3.select('#network-visualization svg');
    svg.selectAll('*').remove();
    
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    
    // Create a force simulation
    simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(parseInt(elements.linkStrength.value)))
        .force('charge', d3.forceManyBody().strength(-parseInt(elements.chargeStrength.value)))
        .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Create a group for links
    const linkGroup = svg.append('g')
        .attr('class', 'links');
    
    // Add links
    const link = linkGroup.selectAll('line')
        .data(data.links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Create a group for nodes
    const nodeGroup = svg.append('g')
        .attr('class', 'nodes');
    
    // Add nodes
    const node = nodeGroup.selectAll('circle')
        .data(data.nodes)
        .enter().append('circle')
        .attr('r', parseInt(elements.nodeSize.value))
        .attr('fill', d => getNodeColor(d))
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add node labels
    const text = svg.append('g')
        .attr('class', 'node-labels')
        .selectAll('text')
        .data(data.nodes)
        .enter().append('text')
        .text(d => d.name)
        .attr('font-size', 12)
        .attr('dx', 15)
        .attr('dy', 4);
    
    // Add relationship labels
    const linkText = svg.append('g')
        .attr('class', 'link-labels')
        .selectAll('text')
        .data(data.links)
        .enter().append('text')
        .text(d => d.relationship)
        .attr('font-size', 10)
        .attr('fill', '#666');
    
    // Add tooltips
    node.append('title')
        .text(d => `${d.name}\nGroup: ${d.group}`);
    
    // Make nodes clickable
    node.on('click', (event, d) => {
        selectedNode = d;
        highlightNode(d.id);
        loadNodeDetails(d.id);
    });
    
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

// Get node color based on group
function getNodeColor(node) {
    if (node.isPlaceholder) return '#aaaaaa'; // Gray for placeholder nodes
    
    // Color based on faction/group
    const groupColors = {
        'none': '#3498db',
        'placeholder': '#aaaaaa',
        'villager': '#2ecc71',
        'guard': '#e74c3c',
        'merchant': '#f39c12',
        'noble': '#9b59b6',
        'outlaw': '#e67e22'
    };
    
    return groupColors[node.group] || '#3498db';
}

// Highlight the selected node and its connections
function highlightNode(nodeId) {
    // Reset all nodes and links
    d3.selectAll('.nodes circle')
        .attr('stroke', null)
        .attr('stroke-width', 0)
        .attr('r', parseInt(elements.nodeSize.value))
        .attr('fill-opacity', 0.7);
    
    d3.selectAll('.links line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Highlight the selected node
    d3.selectAll('.nodes circle')
        .filter(d => d.id === nodeId)
        .attr('stroke', '#ff0000')
        .attr('stroke-width', 2)
        .attr('r', parseInt(elements.nodeSize.value) * 1.3)
        .attr('fill-opacity', 1);
    
    // Highlight connected links and nodes
    const connectedLinks = networkData.links.filter(link => 
        link.source.id === nodeId || link.target.id === nodeId
    );
    
    const connectedNodeIds = new Set();
    connectedLinks.forEach(link => {
        if (link.source.id === nodeId) {
            connectedNodeIds.add(link.target.id);
        } else {
            connectedNodeIds.add(link.source.id);
        }
    });
    
    // Highlight connected links
    d3.selectAll('.links line')
        .filter(d => d.source.id === nodeId || d.target.id === nodeId)
        .attr('stroke', '#ff0000')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', d => Math.sqrt(d.value) + 1);
    
    // Highlight connected nodes
    d3.selectAll('.nodes circle')
        .filter(d => connectedNodeIds.has(d.id))
        .attr('stroke', '#ff0000')
        .attr('stroke-width', 1)
        .attr('fill-opacity', 1);
}

// Load details for a selected node
async function loadNodeDetails(nodeId) {
    try {
        elements.selectedNodeInfo.innerHTML = '<p class="loading">Loading NPC details...</p>';
        
        const response = await fetch(API.npcDebug(nodeId));
        if (!response.ok) throw new Error('Failed to fetch NPC details');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        renderNodeDetails(data);
    } catch (error) {
        elements.selectedNodeInfo.innerHTML = `<p class="error">Error loading NPC details: ${error.message}</p>`;
        console.error('Failed to load NPC details:', error);
    }
}

// Render details for a selected node
function renderNodeDetails(npcData) {
    const metadata = npcData.raw_metadata || {};
    const relationships = npcData.relationships_object || {};
    
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
                <h3>Relationships (${Object.keys(relationships).length})</h3>
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
    
    // Add view details link
    const viewDetailsHtml = `
        <div class="action-links">
            <a href="npc-viewer.html?npc=${encodeURIComponent(npcData.npc_id)}" class="action-button">View Full Details</a>
        </div>
    `;
    
    // Combine all sections
    elements.selectedNodeInfo.innerHTML = basicInfoHtml + relationshipsHtml + viewDetailsHtml;
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

// Discover all relationships
async function discoverAllRelationships() {
    try {
        const response = await fetch(API.discoverRelationships);
        if (!response.ok) throw new Error('Failed to discover relationships');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Unknown error');
        
        alert(`Successfully discovered relationships.\nDirect relationships: ${data.total_direct_relationships}\nIndirect relationships: ${data.total_indirect_relationships}`);
        
        // Refresh the network data
        await loadNetworkData();
        await loadNetworkStats();
    } catch (error) {
        alert(`Error discovering relationships: ${error.message}`);
        console.error('Failed to discover relationships:', error);
    }
}

// Update network visualization based on control changes
function updateNetworkVisualization() {
    if (!simulation || !networkData) return;
    
    // Update node size
    d3.selectAll('.nodes circle')
        .attr('r', parseInt(elements.nodeSize.value));
    
    // Update link distance
    simulation.force('link')
        .distance(parseInt(elements.linkStrength.value));
    
    // Update charge strength
    simulation.force('charge')
        .strength(-parseInt(elements.chargeStrength.value));
    
    // Restart the simulation
    simulation.alpha(0.3).restart();
}

// Setup event listeners
function setupEventListeners() {
    // Node size slider
    elements.nodeSize.addEventListener('input', updateNetworkVisualization);
    
    // Link strength slider
    elements.linkStrength.addEventListener('input', updateNetworkVisualization);
    
    // Charge strength slider
    elements.chargeStrength.addEventListener('input', updateNetworkVisualization);
    
    // Refresh button
    elements.refreshButton.addEventListener('click', async () => {
        await loadNetworkData();
        await loadNetworkStats();
    });
    
    // Discover relationships button
    elements.discoverButton.addEventListener('click', discoverAllRelationships);
}

// Initialize the network viewer when the page loads
document.addEventListener('DOMContentLoaded', initNetworkViewer);
