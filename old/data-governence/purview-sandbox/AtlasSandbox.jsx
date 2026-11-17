import React, { useState, useMemo } from 'react';
import { Search, Shield, Database, ChevronRight, RefreshCw, Layers, Sliders, Info, GitCommit } from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_NODES = [
  { id: 'raw_cust', label: 'customer_raw.csv', type: 'dataset', format: 'CSV', location: 'Azure Data Lake', classification: 'PII', description: 'Raw customer profile exports from legacy CRM system.', owner: 'Marketing Ops', size: '1.2 GB' },
  { id: 'raw_trans', label: 'transactions.parquet', type: 'dataset', format: 'Parquet', location: 'Azure Data Lake', classification: 'Financial', description: 'Daily transaction ledger records from retail POS systems.', owner: 'Finance IT', size: '4.5 GB' },
  { id: 'spark_job', label: 'Clean & Join Spark Job', type: 'process', format: 'PySpark', location: 'Databricks Compute', classification: 'Internal', description: 'Cleans null values, standardizes date formats, and joins customer keys.', owner: 'Data Engineering', runtime: '14 mins' },
  { id: 'dim_cust', label: 'dim_customers (Gold)', type: 'dataset', format: 'Delta Table', location: 'Unity Catalog / Synapse', classification: 'PII', description: 'Sanitized, unified production customer dimension matrix.', owner: 'Data Platform Team', rows: '2.4M rows' },
  { id: 'fact_sales', label: 'fact_sales (Gold)', type: 'dataset', format: 'Delta Table', location: 'Unity Catalog / Synapse', classification: 'Financial', description: 'Aggregated transactional data connected to dimensions.', owner: 'Data Platform Team', rows: '45M rows' },
  { id: 'pbi_dash', label: 'Executive Revenue Dashboard', type: 'dashboard', format: 'Power BI', location: 'Power BI Service', classification: 'Confidential', description: 'Company-wide high-level revenue and active customer reporting panel.', owner: 'BI Analytics', views: '1.2k / week' }
];

const INITIAL_EDGES = [
  { source: 'raw_cust', target: 'spark_job' },
  { source: 'raw_trans', target: 'spark_job' },
  { source: 'spark_job', target: 'dim_cust' },
  { source: 'spark_job', target: 'fact_sales' },
  { source: 'dim_cust', target: 'pbi_dash' },
  { source: 'fact_sales', target: 'pbi_dash' }
];

export default function AtlasSandbox() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState('raw_cust');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('All');
  const [positions, setPositions] = useState({
    raw_cust: { x: 80, y: 100 },
    raw_trans: { x: 80, y: 260 },
    spark_job: { x: 300, y: 180 },
    dim_cust: { x: 520, y: 100 },
    fact_sales: { x: 520, y: 260 },
    pbi_dash: { x: 740, y: 180 }
  });

  // Handle simple node node dragging to show interactivity
  const handleNodeClick = (id) => {
    setSelectedNodeId(id);
  };

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  // Filters logic
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            node.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClassification === 'All' || node.classification === selectedClassification;
      return matchesSearch && matchesClass;
    });
  }, [nodes, searchQuery, selectedClassification]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedClassification('All');
    setSelectedNodeId('raw_cust');
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-2xl overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-md font-semibold text-white">Apache Atlas & Purview Governance Engine</h2>
            <p className="text-xs text-slate-400">Interactive Open-Source Metadata Graph Sandbox</p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset View</span>
        </button>
      </div>

      {/* Control Panel / Filter Strip */}
      <div className="bg-slate-900/60 p-4 border-b border-slate-800/80 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[240px] items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input 
            type="text" 
            placeholder="Search assets, glossaries, columns..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-slate-200 outline-none w-full placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Filter Classification:
          </span>
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg gap-1">
            {['All', 'PII', 'Financial', 'Confidential'].map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClassification(cls)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                  selectedClassification === cls 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Sandbox Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
        
        {/* Left/Middle: The Graph View Canvas */}
        <div className="lg:col-span-2 bg-slate-950 p-6 relative flex flex-col justify-between overflow-x-auto min-w-[400px]">
          
          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-2 text-[11px] text-slate-400 space-y-1 shadow-md pointer-events-none">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-sky-500 rounded-sm"></div> Data Asset (Table/File)</div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div> Process Node (Transformation)</div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-purple-500 rotate-45 transform origin-center"></div> End-User Asset (Dashboard)</div>
          </div>

          {/* SVG Connector Overlay Container */}
          <div className="relative w-[820px] h-[380px] mx-auto my-auto">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                </marker>
              </defs>
              {INITIAL_EDGES.map((edge, idx) => {
                const start = positions[edge.source];
                const end = positions[edge.target];
                if (!start || !end) return null;
                
                const isSelectedPath = edge.source === selectedNodeId || edge.target === selectedNodeId;
                
                // Draw a nice bezier curve between elements
                const dx = end.x - start.x;
                const cx1 = start.x + dx * 0.4;
                const cy1 = start.y;
                const cx2 = start.x + dx * 0.6;
                const cy2 = end.y;

                return (
                  <path
                    key={idx}
                    d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`}
                    fill="none"
                    stroke={isSelectedPath ? '#6366f1' : '#334155'}
                    strokeWidth={isSelectedPath ? 2.5 : 1.5}
                    strokeDasharray={edge.source === 'spark_job' && !isSelectedPath ? '4,4' : 'none'}
                    markerEnd={isSelectedPath ? 'url(#arrow-active)' : 'url(#arrow)'}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Render Renderable Nodes */}
            {INITIAL_NODES.map((node) => {
              const pos = positions[node.id];
              const isSelected = node.id === selectedNodeId;
              const isFilteredOut = !filteredNodes.some(fn => fn.id === node.id);

              let shapeStyle = "rounded-lg"; 
              let colorBorder = "border-sky-500/40 text-sky-400 bg-sky-950/40";
              if (node.type === 'process') {
                shapeStyle = "rounded-full aspect-square w-14 h-14 flex items-center justify-center";
                colorBorder = "border-amber-500/40 text-amber-400 bg-amber-950/40";
              } else if (node.type === 'dashboard') {
                shapeStyle = "rounded-xl rotate-0";
                colorBorder = "border-purple-500/40 text-purple-400 bg-purple-950/40";
              }

              if (isSelected) {
                if (node.type === 'process') colorBorder = "border-amber-400 text-amber-300 bg-amber-500/20 ring-4 ring-amber-500/10";
                else if (node.type === 'dashboard') colorBorder = "border-purple-400 text-purple-300 bg-purple-500/20 ring-4 ring-purple-500/10";
                else colorBorder = "border-indigo-400 text-indigo-300 bg-indigo-500/20 ring-4 ring-indigo-500/10";
              }

              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  style={{ top: pos.y - 24, left: pos.x - 70, zIndex: 10 }}
                  className={`absolute w-36 p-2 text-center text-xs font-medium border backdrop-blur-sm shadow-xl transition-all duration-300 flex flex-col items-center justify-center group ${shapeStyle} ${colorBorder} ${
                    isFilteredOut ? 'opacity-25 saturate-50 scale-95 hover:opacity-50' : 'opacity-100 scale-100 hover:scale-105'
                  }`}
                >
                  {node.type === 'process' ? (
                    <GitCommit className="w-5 h-5 mx-auto mb-0.5" />
                  ) : node.type === 'dashboard' ? (
                    <Layers className="w-4 h-4 mb-1" />
                  ) : (
                    <Database className="w-4 h-4 mb-1" />
                  )}
                  <span className="truncate w-full block text-[11px] font-semibold text-slate-200 group-hover:text-white">
                    {node.label}
                  </span>
                  
                  {node.classification !== 'Internal' && node.type !== 'process' && (
                    <span className="absolute -top-2 -right-1.5 flex items-center gap-0.5 bg-rose-950 text-rose-400 border border-rose-800 text-[9px] px-1 rounded-full font-bold uppercase shadow-sm">
                      <Shield className="w-2 h-2" /> {node.classification}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-center text-xs text-slate-500 bg-slate-900/40 py-2 border border-slate-800/60 rounded-lg">
            💡 <strong>Interactive Hint:</strong> Click on any asset node or transformation block to drill down into structural definitions and system tracking data.
          </div>
        </div>

        {/* Right Pane: Interactive Detail Sub-Panel */}
        <div className="bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Asset Properties
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${
                selectedNode.type === 'process' ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' : 'bg-sky-950/40 text-sky-400 border-sky-800/50'
              }`}>
                {selectedNode.type.toUpperCase()}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              {selectedNode.label}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {selectedNode.description}
            </p>

            {/* Property Key Values */}
            <div className="space-y-2.5 bg-slate-950/50 p-4 border border-slate-800/60 rounded-xl">
              <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                <span className="text-slate-500">System Core Engine:</span>
                <span className="text-slate-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded">Apache Atlas / Purview v2</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                <span className="text-slate-500">Qualified Name:</span>
                <span className="text-slate-400 font-mono text-[10px] truncate max-w-[160px]" title={`ns.env.cluster.${selectedNode.id}`}>
                  {`org.estate.infra::${selectedNode.id}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                <span className="text-slate-500">Platform Host:</span>
                <span className="text-slate-300 font-medium">{selectedNode.location}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                <span className="text-slate-500">Format Engine:</span>
                <span className="text-slate-300 font-semibold text-indigo-400">{selectedNode.format}</span>
              </div>
              
              {/* Conditional parameters based on type */}
              {selectedNode.size && (
                <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                  <span className="text-slate-500">Physical Footprint:</span>
                  <span className="text-slate-300 font-mono">{selectedNode.size}</span>
                </div>
              )}
              {selectedNode.rows && (
                <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                  <span className="text-slate-500">Record Volume:</span>
                  <span className="text-slate-300 font-mono text-emerald-400">{selectedNode.rows}</span>
                </div>
              )}
              {selectedNode.runtime && (
                <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                  <span className="text-slate-500">Execution Time:</span>
                  <span className="text-amber-400 font-mono">{selectedNode.runtime}</span>
                </div>
              )}
              {selectedNode.views && (
                <div className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-2">
                  <span className="text-slate-500">Analytics Traffic:</span>
                  <span className="text-purple-400 font-mono">{selectedNode.views}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500">Business Owner:</span>
                <span className="text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded text-[11px] border border-slate-800">{selectedNode.owner}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className={`w-4 h-4 ${selectedNode.classification === 'Internal' ? 'text-slate-500' : 'text-rose-400'}`} />
              <span>Security Tag: <strong className="text-slate-200">{selectedNode.classification}</strong></span>
            </div>
            
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
              <span className="text-indigo-400 font-bold text-sm leading-none">i</span>
              <span>This panel maps directly to an Atlas <code>EntityInstance</code> schema definition. Updating configurations here pushes programmatic payloads via REST APIs.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
