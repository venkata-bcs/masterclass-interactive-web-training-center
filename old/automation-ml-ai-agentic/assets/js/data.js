/* ==========================================================================
   NeuralAtlas — shared content data (industries + search index)
   Loaded as a classic script so pages work from file:// as well as a server.
   ========================================================================== */
(function () {
  const PILLARS = {
    automation: { id: 'automation', name: 'Automation', color: '#2dd4bf', icon: 'workflow', href: 'automation.html' },
    ml: { id: 'ml', name: 'Machine Learning', color: '#8b5cf6', icon: 'brain-circuit', href: 'ml.html' },
    ai: { id: 'ai', name: 'Artificial Intelligence', color: '#ec4899', icon: 'sparkles', href: 'ai.html' },
    agentic: { id: 'agentic', name: 'Agentic AI', color: '#f59e0b', icon: 'bot', href: 'agentic.html' }
  };

  /* Each industry: 4-pillar examples, adoption scores (0-100), and an
     agentic flow (steps auto-laid-out as a serpentine JointJS diagram). */
  const INDUSTRIES = [
    {
      id: 'healthcare', name: 'Healthcare', emoji: '🏥', color: '#34d399',
      tagline: 'From paperwork to precision medicine — giving clinicians time back.',
      stats: [{ v: '30%', l: 'of clinician time on admin' }, { v: '2.5×', l: 'faster prior auth' }, { v: '-40%', l: 'readmission misses' }],
      pillars: {
        automation: { title: 'Claims & prior authorization', text: 'Rule-based bots move claims between EHR, payer portals and billing, auto-filling forms.', metric: '70% fewer manual touches' },
        ml: { title: 'Readmission risk scoring', text: 'Gradient-boosted models predict 30-day readmission from vitals, labs and history.', metric: 'AUC 0.81' },
        ai: { title: 'Ambient clinical notes', text: 'Speech + LLMs listen to the visit and draft SOAP notes for physician sign-off.', metric: '-2h/day documentation' },
        agentic: { title: 'Care-coordination agent', text: 'An agent schedules follow-ups, checks insurance, orders labs and nudges patients — escalating to nurses.', metric: '24/7 patient follow-up' }
      },
      adoption: [85, 70, 62, 35],
      flow: [
        { icon: '🩺', title: 'Patient discharged', sub: 'EHR event', kind: 'data' },
        { icon: '📈', title: 'Risk model', sub: 'Readmission score', kind: 'ml' },
        { icon: '🤖', title: 'Care agent plans', sub: 'Goal: avoid readmit', kind: 'agent' },
        { icon: '📅', title: 'Book follow-up', sub: 'Scheduling API', kind: 'auto' },
        { icon: '💬', title: 'Patient check-in', sub: 'LLM SMS chat', kind: 'ai' },
        { icon: '👩‍⚕️', title: 'Nurse escalation', sub: 'If red flags', kind: 'human' }
      ]
    },
    {
      id: 'finance', name: 'Finance & Banking', emoji: '🏦', color: '#60a5fa',
      tagline: 'Real-time decisions on trillions of transactions, with auditability.',
      stats: [{ v: '<50ms', l: 'fraud decision latency' }, { v: '90%', l: 'KYC docs auto-processed' }, { v: '$40B', l: 'annual fraud losses' }],
      pillars: {
        automation: { title: 'Reconciliation bots', text: 'Scheduled jobs match ledgers, bank statements and invoices, flagging breaks.', metric: '95% auto-matched' },
        ml: { title: 'Fraud detection', text: 'Streaming anomaly + graph models score each card swipe in milliseconds.', metric: '-60% false positives' },
        ai: { title: 'KYC document understanding', text: 'Vision-language models read IDs, utility bills and contracts, extracting entities.', metric: 'Onboarding 3d → 10min' },
        agentic: { title: 'Financial analyst agent', text: 'Agent pulls filings, runs models in a sandbox, writes an investment memo and cites sources.', metric: 'Memo in 15 min' }
      },
      adoption: [92, 88, 70, 40],
      flow: [
        { icon: '💳', title: 'Transaction', sub: 'Kafka stream', kind: 'data' },
        { icon: '🧮', title: 'Fraud model', sub: 'Score 0.93', kind: 'ml' },
        { icon: '⚙️', title: 'Rules engine', sub: 'Hold > 0.9', kind: 'auto' },
        { icon: '🤖', title: 'Investigator agent', sub: 'Gathers evidence', kind: 'agent' },
        { icon: '📝', title: 'Case summary', sub: 'LLM narrative', kind: 'ai' },
        { icon: '🧑‍💼', title: 'Analyst decision', sub: 'Approve / block', kind: 'human' }
      ]
    },
    {
      id: 'manufacturing', name: 'Manufacturing', emoji: '🏭', color: '#fb923c',
      tagline: 'Smart factories that see, predict and self-optimize.',
      stats: [{ v: '-50%', l: 'unplanned downtime' }, { v: '99.7%', l: 'visual QA accuracy' }, { v: '20%', l: 'energy savings' }],
      pillars: {
        automation: { title: 'PLC & robotic cells', text: 'Deterministic control loops and robots execute repeatable assembly steps.', metric: 'Cycle time -18%' },
        ml: { title: 'Predictive maintenance', text: 'Vibration & temperature time-series models forecast bearing failures days ahead.', metric: '-50% downtime' },
        ai: { title: 'Computer-vision QA', text: 'CNNs/vision transformers spot micro-defects on the line at camera speed.', metric: '99.7% defect recall' },
        agentic: { title: 'Maintenance planner agent', text: 'Agent reads alerts, checks spare-parts inventory, books technicians and reorders parts.', metric: 'MTTR -35%' }
      },
      adoption: [95, 75, 60, 28],
      flow: [
        { icon: '📡', title: 'IoT sensors', sub: 'Vibration spike', kind: 'data' },
        { icon: '🔮', title: 'Failure forecast', sub: 'RUL: 4 days', kind: 'ml' },
        { icon: '🤖', title: 'Maint. agent', sub: 'Plans repair', kind: 'agent' },
        { icon: '📦', title: 'Check inventory', sub: 'ERP lookup', kind: 'auto' },
        { icon: '🧾', title: 'Work order', sub: 'Auto-drafted', kind: 'ai' },
        { icon: '👷', title: 'Technician', sub: 'Executes fix', kind: 'human' }
      ]
    },
    {
      id: 'retail', name: 'Retail & E-commerce', emoji: '🛍️', color: '#f472b6',
      tagline: 'Personalized shopping and supply chains that anticipate demand.',
      stats: [{ v: '35%', l: 'revenue from recommendations' }, { v: '-30%', l: 'stock-outs' }, { v: '80%', l: 'tickets self-served' }],
      pillars: {
        automation: { title: 'Order-to-cash workflows', text: 'Orders flow automatically through payment, warehouse picking and shipping labels.', metric: 'Same-day dispatch' },
        ml: { title: 'Recommendations & demand forecasting', text: 'Collaborative filtering and time-series models predict what each shopper and store needs.', metric: '+12% basket size' },
        ai: { title: 'Generative product content', text: 'LLMs write product descriptions, translate catalogs and power visual search.', metric: '10k SKUs/day' },
        agentic: { title: 'Personal shopping agent', text: 'Agent understands intent, compares items, applies coupons, checks out and tracks returns.', metric: '+18% conversion' }
      },
      adoption: [88, 85, 72, 38],
      flow: [
        { icon: '🗣️', title: 'Shopper intent', sub: '"Hiking gear < $200"', kind: 'data' },
        { icon: '🧠', title: 'Understand need', sub: 'LLM parsing', kind: 'ai' },
        { icon: '🎯', title: 'Recommender', sub: 'Top-k items', kind: 'ml' },
        { icon: '🤖', title: 'Shopping agent', sub: 'Compare & bundle', kind: 'agent' },
        { icon: '🛒', title: 'Checkout', sub: 'Payment workflow', kind: 'auto' },
        { icon: '✅', title: 'Shopper confirms', sub: 'One tap', kind: 'human' }
      ]
    },
    {
      id: 'logistics', name: 'Logistics & Supply Chain', emoji: '🚚', color: '#facc15',
      tagline: 'Moving goods smarter — routes, warehouses and disruptions handled in real time.',
      stats: [{ v: '-15%', l: 'fuel per delivery' }, { v: '3×', l: 'warehouse throughput' }, { v: '2h', l: 'disruption response' }],
      pillars: {
        automation: { title: 'Warehouse robotics & WMS', text: 'AMRs and conveyor logic pick, sort and pack based on WMS instructions.', metric: '3× picks/hour' },
        ml: { title: 'ETA & route optimization', text: 'Models learn traffic, weather and dwell-time patterns to predict ETAs and optimize routes.', metric: 'ETA error -40%' },
        ai: { title: 'Document & email triage', text: 'AI reads bills of lading, customs forms and carrier emails, structuring the data.', metric: '85% straight-through' },
        agentic: { title: 'Disruption response agent', text: 'When a port closes, the agent re-plans routes, rebooks carriers and notifies customers.', metric: 'Hours → minutes' }
      },
      adoption: [90, 78, 58, 32],
      flow: [
        { icon: '🌪️', title: 'Storm alert', sub: 'Weather API', kind: 'data' },
        { icon: '📉', title: 'Delay prediction', sub: '42 shipments at risk', kind: 'ml' },
        { icon: '🤖', title: 'Logistics agent', sub: 'Re-plan routes', kind: 'agent' },
        { icon: '🔁', title: 'Rebook carriers', sub: 'TMS API calls', kind: 'auto' },
        { icon: '✉️', title: 'Customer notices', sub: 'Personalized', kind: 'ai' },
        { icon: '🧑‍✈️', title: 'Ops approval', sub: 'Cost > $5k', kind: 'human' }
      ]
    },
    {
      id: 'energy', name: 'Energy & Utilities', emoji: '⚡', color: '#22d3ee',
      tagline: 'Balancing a renewable grid with forecasting and autonomous control.',
      stats: [{ v: '25%', l: 'better solar forecasts' }, { v: '-30%', l: 'outage duration' }, { v: '1M+', l: 'smart meters per utility' }],
      pillars: {
        automation: { title: 'SCADA & meter-to-bill', text: 'Automated control systems and billing pipelines process millions of meter reads.', metric: '99.9% billing accuracy' },
        ml: { title: 'Load & renewables forecasting', text: 'Models forecast demand and solar/wind output to schedule generation and storage.', metric: 'MAPE 3.2%' },
        ai: { title: 'Grid inspection vision', text: 'Drones + vision models spot damaged insulators, vegetation and corrosion.', metric: '5× inspection speed' },
        agentic: { title: 'Grid operations agent', text: 'Agent coordinates battery dispatch, demand response and crew routing during peaks.', metric: 'Peak shaved 8%' }
      },
      adoption: [87, 72, 50, 22],
      flow: [
        { icon: '☀️', title: 'Weather + load', sub: 'Telemetry', kind: 'data' },
        { icon: '📊', title: 'Peak forecast', sub: 'Next 6h', kind: 'ml' },
        { icon: '🤖', title: 'Grid agent', sub: 'Optimize dispatch', kind: 'agent' },
        { icon: '🔋', title: 'Battery dispatch', sub: 'SCADA command', kind: 'auto' },
        { icon: '📣', title: 'Demand response', sub: 'Customer nudges', kind: 'ai' },
        { icon: '🧑‍🔧', title: 'Operator', sub: 'Oversight', kind: 'human' }
      ]
    },
    {
      id: 'insurance', name: 'Insurance', emoji: '🛡️', color: '#a78bfa',
      tagline: 'Faster, fairer claims and underwriting powered by data.',
      stats: [{ v: '5 min', l: 'simple claim payout' }, { v: '-25%', l: 'loss ratio leakage' }, { v: '60%', l: 'claims auto-adjudicated' }],
      pillars: {
        automation: { title: 'Policy admin workflows', text: 'Renewals, endorsements and payments run through BPM workflows with rules.', metric: '-50% processing cost' },
        ml: { title: 'Risk pricing & fraud', text: 'Models price risk from telematics and detect suspicious claim patterns.', metric: '+4pt combined ratio' },
        ai: { title: 'Damage assessment', text: 'Vision models estimate repair cost from photos of cars and homes.', metric: 'Estimate in 30s' },
        agentic: { title: 'Claims concierge agent', text: 'Agent guides the claimant, gathers evidence, checks coverage and proposes settlement.', metric: 'NPS +22' }
      },
      adoption: [86, 80, 64, 30],
      flow: [
        { icon: '📸', title: 'Claim photos', sub: 'Mobile upload', kind: 'data' },
        { icon: '🔍', title: 'Damage vision', sub: 'Est. $2,340', kind: 'ai' },
        { icon: '🚩', title: 'Fraud score', sub: 'Low risk', kind: 'ml' },
        { icon: '🤖', title: 'Claims agent', sub: 'Check coverage', kind: 'agent' },
        { icon: '💸', title: 'Payout', sub: 'Payment rails', kind: 'auto' },
        { icon: '🧑‍⚖️', title: 'Adjuster review', sub: 'If > $10k', kind: 'human' }
      ]
    },
    {
      id: 'software', name: 'Software & IT', emoji: '💻', color: '#4ade80',
      tagline: 'Self-healing systems and AI pair-programmers shipping faster.',
      stats: [{ v: '55%', l: 'faster coding tasks' }, { v: '-70%', l: 'MTTR with AIOps' }, { v: '1000s', l: 'deploys/day via CI/CD' }],
      pillars: {
        automation: { title: 'CI/CD & infrastructure as code', text: 'Pipelines build, test and deploy every commit; Terraform provisions infra declaratively.', metric: 'Deploy in minutes' },
        ml: { title: 'AIOps anomaly detection', text: 'Models learn normal metric baselines and flag anomalies before users notice.', metric: '-70% alert noise' },
        ai: { title: 'Code assistants', text: 'LLMs autocomplete, explain and refactor code, and generate tests.', metric: '+55% velocity' },
        agentic: { title: 'SRE / coding agents', text: 'Agents triage incidents, read logs, open PRs with fixes and run the test suite.', metric: 'Auto-fix 30% of P3s' }
      },
      adoption: [97, 82, 85, 55],
      flow: [
        { icon: '🚨', title: 'Pager alert', sub: 'p99 latency ↑', kind: 'data' },
        { icon: '📐', title: 'Anomaly model', sub: 'Root-cause hints', kind: 'ml' },
        { icon: '🤖', title: 'SRE agent', sub: 'Reads logs & traces', kind: 'agent' },
        { icon: '🧑‍💻', title: 'Draft fix PR', sub: 'LLM code gen', kind: 'ai' },
        { icon: '🧪', title: 'CI pipeline', sub: 'Tests + canary', kind: 'auto' },
        { icon: '👀', title: 'Engineer review', sub: 'Merge', kind: 'human' }
      ]
    }
  ];

  const ARCHITECTURES = [
    { id: 'enterprise', name: 'Enterprise AI Platform', icon: 'layers' },
    { id: 'rag', name: 'RAG Pipeline', icon: 'database-zap' },
    { id: 'multiagent', name: 'Multi-Agent System', icon: 'network' },
    { id: 'mlops', name: 'MLOps Lifecycle', icon: 'refresh-cw' },
    { id: 'eventdriven', name: 'Event-Driven Hyperautomation', icon: 'zap' }
  ];

  /* ---- Search index ---- */
  const S = [];
  const add = (title, href, cat, text, tags) => S.push({ title, href, cat, text, tags: tags || [] });

  add('Home — The AI Spectrum', 'index.html', 'Overview', 'Overview of automation, machine learning, artificial intelligence and agentic AI. Radar comparison, timeline of AI history and comparison table.', ['overview', 'spectrum', 'compare']);
  add('Pillar comparison radar', 'index.html#compare', 'Overview', 'Compare determinism, adaptability, autonomy, data needs, explainability and reasoning across the four pillars.', ['radar', 'd3']);
  add('History of AI timeline', 'index.html#timeline', 'Overview', 'From Turing test 1950 and Dartmouth, expert systems, deep learning, AlphaGo, transformers, ChatGPT to autonomous agents.', ['history', 'timeline']);
  add('Automation vs ML vs AI vs Agentic table', 'index.html#table', 'Overview', 'Side by side comparison: how it works, decision making, strengths, weaknesses, example tools.', ['table', 'difference']);

  add('Automation', 'automation.html', 'Automation', 'Rule-based automation, RPA, workflow orchestration, scripts, CI/CD and hyperautomation. Deterministic if-this-then-that execution.', ['rpa', 'workflow', 'bpm']);
  add('Invoice processing workflow (live)', 'automation.html#workflow', 'Automation', 'Interactive JointJS workflow: email trigger, OCR extraction, validation rules, approval routing, ERP posting and exception handling.', ['jointjs', 'invoice', 'ap']);
  add('Automation ROI calculator', 'automation.html#roi', 'Automation', 'Estimate hours and dollars saved by automating a repetitive task with an interactive D3 chart.', ['roi', 'savings', 'calculator']);
  add('Automation maturity ladder', 'automation.html#levels', 'Automation', 'Scripts, RPA, business process automation, intelligent automation, hyperautomation.', ['maturity', 'levels']);
  add('Types of automation', 'automation.html#types', 'Automation', 'RPA bots, workflow BPM, infrastructure as code, CI/CD pipelines, test automation and event-driven integration (iPaaS).', ['types', 'tools', 'uipath', 'zapier']);

  add('Machine Learning', 'ml.html', 'Machine Learning', 'Systems that learn patterns from data: supervised, unsupervised and reinforcement learning, neural networks and MLOps.', ['ml', 'learning']);
  add('Classifier playground', 'ml.html#classifier', 'Machine Learning', 'Click to add data points and watch logistic regression or k-nearest neighbours draw a decision boundary in real time.', ['knn', 'logistic regression', 'decision boundary']);
  add('Gradient descent visualizer', 'ml.html#gradient', 'Machine Learning', 'Watch linear regression fit a line by minimizing mean squared error loss. Tune the learning rate.', ['loss', 'optimization', 'regression']);
  add('Neural network forward pass', 'ml.html#neural', 'Machine Learning', 'Animated multi-layer perceptron showing weights, activations and a forward pass.', ['neural network', 'deep learning', 'mlp']);
  add('Types of machine learning', 'ml.html#types', 'Machine Learning', 'Supervised, unsupervised, reinforcement and self-supervised learning with examples.', ['supervised', 'unsupervised', 'reinforcement']);
  add('MLOps pipeline diagram', 'ml.html#mlops', 'Machine Learning', 'Data ingestion, feature store, training, evaluation, model registry, deployment, monitoring and drift retraining loop.', ['mlops', 'pipeline', 'drift']);

  add('Artificial Intelligence', 'ai.html', 'AI', 'The broad field of making machines perceive, reason and generate: NLP, computer vision, speech, generative AI and LLMs.', ['ai', 'genai', 'llm']);
  add('AI landscape (zoomable)', 'ai.html#landscape', 'AI', 'Zoomable circle-pack showing how AI contains ML, deep learning, generative AI and large language models.', ['taxonomy', 'circle pack']);
  add('Tokens & attention playground', 'ai.html#attention', 'AI', 'Type a sentence and see tokenization and a self-attention heatmap like in a transformer.', ['transformer', 'attention', 'tokens']);
  add('Next-token prediction & temperature', 'ai.html#nexttoken', 'AI', 'See how LLMs predict the next token with a probability distribution and how temperature changes sampling.', ['temperature', 'sampling', 'softmax']);
  add('RAG — Retrieval Augmented Generation', 'ai.html#rag', 'AI', 'Interactive diagram of embedding, vector database retrieval, re-ranking, prompt building and grounded LLM answers.', ['rag', 'vector db', 'embeddings']);

  add('Agentic AI', 'agentic.html', 'Agentic', 'Autonomous agents that plan, use tools, remember and act toward goals with human oversight.', ['agents', 'autonomy']);
  add('The agent loop', 'agentic.html#loop', 'Agentic', 'Perceive, reason, plan, act, observe, reflect — the core cycle of an AI agent.', ['react', 'loop']);
  add('Multi-agent simulator', 'agentic.html#simulator', 'Agentic', 'Run a simulated multi-agent system: supervisor, planner, researcher, coder, critic, tools and human-in-the-loop approval.', ['simulation', 'supervisor', 'human in the loop']);
  add('Agent design patterns', 'agentic.html#patterns', 'Agentic', 'ReAct, plan-and-execute, reflection, supervisor multi-agent, handoff swarm and tool use with MCP.', ['patterns', 'mcp', 'react', 'reflection']);
  add('Levels of autonomy', 'agentic.html#autonomy', 'Agentic', 'From L0 manual to L5 fully autonomous agents — what the human does at each level.', ['levels', 'autonomy']);
  add('Agent guardrails & governance', 'agentic.html#guardrails', 'Agentic', 'Permissions, sandboxing, budgets, approvals, audit logs and evaluation for safe agents.', ['safety', 'governance']);

  add('Industries overview', 'industries.html', 'Industries', 'How automation, ML, AI and agents are applied across healthcare, finance, manufacturing, retail, logistics, energy, insurance and software.', ['use cases']);
  add('Industry adoption heatmap', 'industries.html#heatmap', 'Industries', 'Heatmap of adoption maturity for each pillar across industries.', ['heatmap', 'adoption']);

  add('Architecture gallery', 'architecture.html', 'Architecture', 'Interactive reference architecture diagrams built with JointJS: zoom, pan, drag, inspect and simulate request flow.', ['diagrams', 'jointjs']);

  INDUSTRIES.forEach(i => {
    add(`${i.emoji} ${i.name}`, `industries.html#${i.id}`, 'Industries', `${i.tagline} ${Object.values(i.pillars).map(p => p.title + ': ' + p.text).join(' ')}`, [i.id]);
  });
  ARCHITECTURES.forEach(a => add(`${a.name} architecture`, `architecture.html#${a.id}`, 'Architecture', `Reference architecture diagram for ${a.name}.`, [a.id]));

  window.APP_DATA = { PILLARS, INDUSTRIES, ARCHITECTURES, SEARCH_INDEX: S };
})();
