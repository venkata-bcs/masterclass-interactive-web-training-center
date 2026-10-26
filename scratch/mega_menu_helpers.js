const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to copy branding assets into any directory
function ensureAssets(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  ['tinitiate_header-banner.png', 'tinitiate_header-banner-dark.png', 'favicon.png'].forEach(file => {
    const src = path.join(ROOT_DIR, file);
    const dest = path.join(dir, file);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      try { fs.copyFileSync(src, dest); } catch (e) {}
    }
  });
}

// 5-Domain Mega Menu Definition
const DOMAINS = [
  {
    name: 'Foundational',
    key: 'foundational',
    color: '#38bdf8',
    badge: 'Core CS',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>`,
    items: [
      { name: 'Python', folder: 'foundational/python', desc: 'Print, Variables, Datatypes, Operators, Strings & Lists', icon: 'terminal' },
      { name: 'Data Structures', folder: 'foundational/data-structures', desc: 'Trees, Graphs, HashTables & Heaps', icon: 'binary' },
      { name: 'Authentication', folder: 'foundational/authentication', desc: 'OAuth2, OIDC, JWT, SAML & PKCE', icon: 'key' },
      { name: 'APIs', folder: 'foundational/apis', desc: 'REST, GraphQL, gRPC & WebSockets', icon: 'cloud-lightning' },
      { name: 'MicroServices', folder: 'foundational/microservices', desc: 'Sagas, Service Mesh & Event-Driven', icon: 'boxes' },
      { name: 'OOP', folder: 'foundational/oop', desc: 'SOLID, Polymorphism & Abstraction', icon: 'code-2' },
      { name: 'Design Patterns', folder: 'foundational/design-patterns', desc: 'GoF Creational, Structural & Behavioral', icon: 'layout-grid' }
    ]
  },
  {
    name: 'AI',
    key: 'ai',
    color: '#a855f7',
    badge: 'GenAI & Agents',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
    items: [
      { name: 'Automation GenAI Agentic', folder: 'automation-ml-ai-agentic', desc: 'Swarm Agents, MCP & LangChain', icon: 'bot' },
      { name: 'Langgraph', folder: 'ai/langgraph', desc: 'Cyclic State Graphs & Multi-Agent DAGs', icon: 'git-fork' },
      { name: 'AWS Bedrock', folder: 'ai/aws-bedrock', desc: 'Managed Foundation Models & Guardrails', icon: 'cpu' },
      { name: 'Azure Foundry', folder: 'ai/azure-foundry', desc: 'Azure AI Studio, Prompt Flow & Evaluators', icon: 'server' },
      { name: 'Claude SDK', folder: 'ai/claude-sdk', desc: 'Anthropic SDK, Tools & Prompt Caching', icon: 'sparkles' },
      { name: 'Google Gemini SDK', folder: 'ai/google-gemini-sdk', desc: 'Gemini 1.5 Pro, Multimodal & Context Cache', icon: 'zap' }
    ]
  },
  {
    name: 'Data Engineering',
    key: 'data-engineering',
    color: '#0284c7',
    badge: 'Lakehouse & MPP',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
    items: [
      { name: 'Data Engineering Master Class', folder: 'data-engineering', desc: 'Modern Lakehouse, Fabric & Kafka Streams', icon: 'database' },
      { name: 'Databricks', folder: 'databricks-dataengineering', desc: 'Unity Catalog, Delta Live & Photon', icon: 'layers' },
      { name: 'AWS Data Engineering', folder: 'aws-dataengineering', desc: 'EMR, Glue, Redshift, Kinesis & S3', icon: 'cloud' },
      { name: 'SnowFlake', folder: 'snowflake-dataengineering', desc: 'Snowpark, Dynamic Tables & Warehouses', icon: 'snowflake' },
      { name: 'Azure Data Engineering', folder: 'azure-dataengineering', desc: 'Fabric, Synapse Analytics & ADLS Gen2', icon: 'server' },
      { name: 'On Prem Pandas, Polars, SQL', folder: 'data-engineering/onprem-pandas-polars-sql', desc: 'Vectorized LazyFrames & Local Engines', icon: 'terminal' },
      { name: 'DuckDB', folder: 'data-engineering/duckdb', desc: 'In-Process Columnar Analytical OLAP', icon: 'feather' }
    ]
  },
  {
    name: 'Data Governance',
    key: 'data-governance',
    color: '#10b981',
    badge: 'Trust & Catalog',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
    items: [
      { name: 'Atlas', folder: 'data-governence/atlas', desc: 'Apache Atlas Metadata & Lineage Graph', icon: 'map' },
      { name: 'Unity', folder: 'data-governence/unity', desc: 'Unity Catalog Fine-Grained ABAC & Grants', icon: 'shield-alert' },
      { name: 'Purview', folder: 'data-governence/purview-sandbox', desc: 'Purview Data Map, Stewardship & Scanning', icon: 'shield-check' }
    ]
  },
  {
    name: 'Full Stack',
    key: 'full-stack',
    color: '#f43f5e',
    badge: 'Modern Web',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    items: [
      { name: 'Python fastAPI', folder: 'full-stack/python-fastapi', desc: 'Pydantic v2, Async ASGI & OpenTelemetry', icon: 'code' },
      { name: 'NodeJS React NextJS', folder: 'full-stack/nodejs-react-nextjs', desc: 'React 19, Server Components & App Router', icon: 'globe' },
      { name: 'C#/.Net Full Stack', folder: 'full-stack/dotnet-csharp', desc: 'ASP.NET Core Web API & Entity Framework', icon: 'hash' },
      { name: 'Java Full Stack', folder: 'full-stack/java-fullstack', desc: 'Spring Boot 3, Hibernate JPA & Microservices', icon: 'coffee' }
    ]
  }
];

function getIconSvg(name) {
  const icons = {
    'binary': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="8" x="3" y="3" rx="2"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>',
    'key': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-1.5 1.5L13 10m0 0a5 5 0 1 1-7-7 5 5 0 0 1 7 7Z"/></svg>',
    'cloud-lightning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>',
    'boxes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l6 3.43a2 2 0 0 0 1.97 0l6-3.43a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L11 9.49a2 2 0 0 0-2.06 0l-5.97 3.43Z"/></svg>',
    'code-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>',
    'layout-grid': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    'bot': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    'git-fork': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/></svg>',
    'cpu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>',
    'server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
    'sparkles': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    'zap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'database': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
    'layers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    'cloud': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    'snowflake': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="2" y2="22"/><line x1="12" x2="12" y1="10" y2="14"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="20" x2="4" y1="4" y2="20"/><line x1="4" x2="20" y1="4" y2="20"/></svg>',
    'terminal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
    'feather': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" x2="2" y1="8" y2="22"/><line x1="17.5" x2="9" y1="15" y2="15"/></svg>',
    'map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>',
    'shield-alert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    'shield-check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    'code': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    'globe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    'hash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
    'coffee': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>'
  };
  return icons[name] || icons['code'];
}

function buildMegaDropdownHtml(relPrefix) {
  const columnsHtml = DOMAINS.map(domain => {
    const itemsHtml = domain.items.map(item => {
      return `          <a href="${relPrefix}${item.folder}/index.html" class="mega-category-item" title="${item.name}: ${item.desc}">
            <span class="mega-item-arrow">&gt;</span>
            <span class="mega-item-icon">${getIconSvg(item.icon)}</span>
            <span class="mega-item-text">
              <span class="mega-item-name">${item.name}</span>
            </span>
          </a>`;
    }).join('\n');

    return `        <!-- Category: ${domain.name} -->
        <div class="mega-category-col" style="--cat-accent:${domain.color};">
          <div class="mega-category-header">
            <span class="mega-cat-badge" style="color:${domain.color};">
              ${domain.iconSvg}
              <span>${domain.name}</span>
            </span>
            <span class="mega-cat-count">${domain.items.length} Tracks</span>
          </div>
          <div class="mega-category-list">
${itemsHtml}
          </div>
        </div>`;
  }).join('\n');

  return `<div class="master-dropdown" id="subjectsDropdown">
          <button type="button" class="master-dropdown-toggle" onclick="toggleSubjectsDropdown(event)" aria-haspopup="true" aria-expanded="false" title="Explore All Subjects">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            <span>Subjects</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="master-dropdown-menu mega-menu" id="subjectsMegaMenu">
            <div class="mega-menu-header">
              <div class="mega-menu-title-wrap">
                <span class="mega-menu-eyebrow">TINITIATE AI ACADEMY • ARCHITECTURE CURRICULUM</span>
                <h4 class="mega-menu-title">Explore Engineering Curricula by Domain</h4>
              </div>
              <div class="mega-menu-stats-pill">
                <span>5 Core Domains</span> • <span>26 Specialized Tracks</span>
              </div>
            </div>

            <div class="mega-menu-grid">
${columnsHtml}
            </div>

            <div class="mega-menu-footer">
              <div class="mega-footer-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span>Each module includes <strong>zero-code visual architectures</strong>, <strong>interactive sandboxes</strong>, and <strong>production blueprints</strong>.</span>
              </div>
              <div class="mega-footer-right">
                <span>Lead Architect: <strong>Venkata Bhattaram</strong></span>
              </div>
            </div>
          </div>
        </div>`;
}

module.exports = {
  ROOT_DIR,
  DOMAINS,
  ensureAssets,
  getIconSvg,
  buildMegaDropdownHtml
};
