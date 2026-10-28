"""Enterprise AI Architecture Matrix, extra roadmap steps and sidebar tools for the harness pages.

Rows follow enterprise_architecture_matrix.md. Each cell is (icons, primitive, detail); icons are
file stems in assets/icons/tech. Column keys are harness slugs.
"""

ICON_LABELS = {
    "langgraph": "LangGraph", "langchain": "LangChain", "crewai": "CrewAI", "aws": "AWS",
    "aws-lambda": "Lambda", "aws-s3": "S3", "aws-dynamodb": "DynamoDB", "aws-cloudwatch": "CloudWatch",
    "aws-cloudtrail": "CloudTrail", "aws-xray": "X-Ray", "aws-step-functions": "Step Functions",
    "aws-cloudformation": "CloudFormation", "aws-iam": "IAM", "aws-kms": "KMS", "aws-fargate": "Fargate",
    "aws-eks": "EKS", "aws-cognito": "Cognito", "azure": "Azure", "azure-cosmos": "Cosmos DB",
    "azure-monitor": "Monitor", "azure-functions": "Functions", "azure-key-vault": "Key Vault",
    "azure-entra": "Entra ID", "azure-devops": "Azure DevOps", "claude": "Claude", "anthropic": "Anthropic",
    "google-gemini": "Gemini", "google-cloud": "Google Cloud", "google-cloud-run": "Cloud Run",
    "python": "Python", "docker": "Docker", "kubernetes": "Kubernetes", "postgresql": "Postgres",
    "redis": "Redis", "sqlite": "SQLite", "pinecone": "Pinecone", "qdrant": "Qdrant", "opensearch": "OpenSearch",
    "ollama": "Ollama", "onnx": "ONNX", "mcp": "MCP", "opentelemetry": "OpenTelemetry", "langfuse": "Langfuse",
    "pydantic": "Pydantic", "pytest": "pytest", "github-actions": "GitHub Actions", "openapi": "OpenAPI",
    "markdown": "Markdown", "yaml": "YAML", "mem0": "Mem0", "huggingface": "Hugging Face", "fastapi": "FastAPI",
    "terraform": "Terraform", "mlflow": "MLflow", "typescript": "TypeScript", "nodejs": "Node.js",
}

# Matrix rows: key, label, lucide icon, colour
ROWS = [
    ("sandbox", "Harness & Sandbox", "box", "#6366f1"),
    ("state", "State & Data", "database", "#0284c7"),
    ("tools", "Function Calling", "square-function", "#0891b2"),
    ("edge", "Edge Deployment", "cpu", "#0d9488"),
    ("lifecycle", "Start & Stop", "circle-play", "#16a34a"),
    ("testing", "Testing & Eval", "flask-conical", "#65a30d"),
    ("auditing", "Auditing & Tracing", "scan-search", "#ca8a04"),
    ("orchestration", "Orchestration", "network", "#ea580c"),
    ("guardrails", "Guardrails", "shield-check", "#dc2626"),
    ("rag", "RAG Pipeline", "library", "#db2777"),
    ("mcp", "MCP Integration", "plug", "#c026d3"),
    ("mlops", "MLOps / LLMOps", "rocket", "#9333ea"),
    ("hitl", "Human-in-the-Loop", "user-check", "#7c3aed"),
    ("skills", "skills.md", "file-badge", "#4f46e5"),
    ("memoryfile", "memory.md", "brain", "#2563eb"),
    ("toolsfile", "tools.md", "file-cog", "#0369a1"),
    ("tuning", "LLM Training / Tuning", "sliders-horizontal", "#475569"),
]

MATRIX = {
    "sandbox": {
        "langgraph": (["langgraph", "docker"], "Your runtime", "No built-in sandbox; graphs run in LangSmith Deployment or your own containers."),
        "crewai": (["crewai", "docker"], "Docker code mode", "allow_code_execution with code_execution_mode=\"safe\" runs agent code in Docker."),
        "aws-bedrock": (["aws", "aws-lambda"], "AgentCore Runtime", "Per-session microVM isolation, managed Code Interpreter; action groups run in Lambda."),
        "aws-strands": (["aws", "docker"], "In-process + AgentCore", "The loop runs in your process; AgentCore Runtime adds session isolation."),
        "azure-foundry": (["azure"], "Agent Service", "Hosted runs with a sandboxed Code Interpreter for generated code."),
        "claude-sdk": (["claude", "docker"], "Code execution + containers", "Server-side code execution tool; Managed Agents give each session a container."),
        "google-gemini-sdk": (["google-gemini", "google-cloud"], "Code execution + Agent Engine", "Built-in code_execution tool and ADK code executors; Agent Engine hosting."),
    },
    "state": {
        "langgraph": (["langgraph", "postgresql", "redis"], "Typed state + checkpointers", "Reducers merge updates; Postgres, SQLite or Redis checkpointers enable resume and time travel."),
        "crewai": (["crewai", "pydantic"], "Flow state + crew memory", "Pydantic Flow state with @persist; short-term, long-term and entity memory."),
        "aws-bedrock": (["aws", "aws-dynamodb"], "Session state APIs", "sessionAttributes, prompt attributes, session summaries and AgentCore Memory."),
        "aws-strands": (["aws", "aws-s3"], "agent.state + sessions", "JSON agent.state, conversation managers and File or S3 session managers."),
        "azure-foundry": (["azure", "azure-cosmos"], "Threads", "Server-side threads and runs; Standard setup stores threads in your Cosmos DB."),
        "claude-sdk": (["anthropic"], "Client-owned messages", "History sent each turn, compaction and the memory tool; SDK sessions resume by id."),
        "google-gemini-sdk": (["google-gemini", "postgresql"], "Scoped session state", "session.state with user:, app: and temp: prefixes; database or Vertex AI sessions."),
    },
    "tools": {
        "langgraph": (["langchain", "pydantic"], "@tool + ToolNode", "Docstrings and type hints become the schema; ToolNode runs calls inside the graph."),
        "crewai": (["crewai", "pydantic"], "@tool / BaseTool", "Pydantic args_schema validation, the crewai-tools library and per-task tools."),
        "aws-bedrock": (["aws", "aws-lambda", "openapi"], "Action groups / toolConfig", "OpenAPI or function schemas executed by Lambda; Converse toolSpec schemas."),
        "aws-strands": (["aws", "python"], "@tool decorator", "Typed Python functions become tools; strands-agents-tools ships ready-made tools."),
        "azure-foundry": (["azure", "azure-functions", "openapi"], "FunctionTool + OpenAPI", "Auto function calling plus Azure Functions, OpenAPI and Logic Apps tools."),
        "claude-sdk": (["claude", "pydantic"], "Tool Runner + strict tools", "JSON-schema tools with strict: true and parallel calls; the Tool Runner drives the loop."),
        "google-gemini-sdk": (["google-gemini", "python"], "Automatic function calling", "Python functions as tools; FunctionDeclarations for manual control."),
    },
    "edge": {
        "langgraph": (["python", "ollama"], "Runs anywhere", "Pure Python or JS; pair with local models through Ollama on edge servers."),
        "crewai": (["crewai", "ollama"], "Local Python", "Runs on local hardware with Ollama or llama.cpp models through LiteLLM."),
        "aws-bedrock": (["aws"], "Cloud service", "No on-device runtime; use AWS IoT Greengrass with local models at the edge."),
        "aws-strands": (["aws", "ollama"], "Local model providers", "OllamaModel and other local providers; the Python agent runs on edge hosts."),
        "azure-foundry": (["azure", "onnx"], "Foundry Local", "Run models on-device with Foundry Local and ONNX Runtime; Azure IoT Edge."),
        "claude-sdk": (["claude"], "Cloud API", "Models run in the cloud; an edge host can run the Agent SDK and call the API."),
        "google-gemini-sdk": (["google-gemini", "ollama"], "Gemini Nano + Gemma", "Gemini Nano on Android and Chrome; open Gemma models locally."),
    },
    "lifecycle": {
        "langgraph": (["langgraph"], "invoke / stream / resume", "recursion_limit caps steps; cancel and resume from the last checkpoint."),
        "crewai": (["crewai"], "kickoff / max_iter", "kickoff, kickoff_async, kickoff_for_each; max_iter and max_execution_time stop runs."),
        "aws-bedrock": (["aws"], "invoke_agent / endSession", "Streaming sessions by sessionId; endSession closes; stopReason on Converse."),
        "aws-strands": (["aws"], "agent() / stream_async", "Sync, async and streaming calls; Swarm and Graph timeouts and handoff limits."),
        "azure-foundry": (["azure"], "Runs: create / cancel", "Run statuses from queued to completed; runs.cancel and token caps."),
        "claude-sdk": (["claude"], "stream + stop_reason", "end_turn, tool_use, pause_turn and refusal; ClaudeSDKClient.interrupt()."),
        "google-gemini-sdk": (["google-gemini"], "run_async events", "Event stream to a final response; max_llm_calls; escalate exits loops."),
    },
    "testing": {
        "langgraph": (["langchain", "pytest"], "LangSmith evals", "Unit-test nodes; datasets, LLM judges and trajectory evals."),
        "crewai": (["crewai", "pytest"], "crewai test", "Scores each task over N runs; crewai train adds human feedback."),
        "aws-bedrock": (["aws"], "Bedrock Evaluations", "LLM-as-judge jobs for models, Knowledge Bases and agents; test-alias traces."),
        "aws-strands": (["aws", "pytest"], "pytest + metrics", "Test tools as functions and assert on tool metrics; LLM-judge eval sets."),
        "azure-foundry": (["azure", "python"], "azure-ai-evaluation", "Groundedness, intent, tool-call accuracy and safety evaluators; red teaming."),
        "claude-sdk": (["anthropic", "pytest"], "Evals + Batches", "Code and LLM graders; large eval sets through the Batches API."),
        "google-gemini-sdk": (["google-gemini", "pytest"], "adk eval", "Tool-trajectory and response-match scores; AgentEvaluator in pytest."),
    },
    "auditing": {
        "langgraph": (["langchain", "opentelemetry"], "LangSmith traces", "Node-level trace trees; checkpoint history as a replayable audit log."),
        "crewai": (["crewai", "opentelemetry"], "Event listeners", "Event-bus listeners, log files, and Langfuse or AgentOps integrations."),
        "aws-bedrock": (["aws-cloudwatch", "aws-cloudtrail", "aws-s3"], "Invocation logs + CloudTrail", "Prompt and response logs to CloudWatch or S3; API audit in CloudTrail."),
        "aws-strands": (["opentelemetry", "aws-xray"], "OpenTelemetry built in", "Spans for every cycle, model and tool call to X-Ray, CloudWatch or Langfuse."),
        "azure-foundry": (["azure-monitor", "opentelemetry"], "Application Insights", "OpenTelemetry tracing of runs and tool calls; Azure Monitor."),
        "claude-sdk": (["anthropic", "opentelemetry"], "Usage logs + hooks", "Request ids and token usage; Agent SDK hooks log tool calls."),
        "google-gemini-sdk": (["google-cloud", "opentelemetry"], "Cloud Trace", "ADK spans; events record author, calls and state deltas."),
    },
    "orchestration": {
        "langgraph": (["langgraph"], "Supervisor / swarm graphs", "Subgraphs, Command handoffs, Send fan-out, prebuilt supervisor and swarm."),
        "crewai": (["crewai"], "Crews + Flows", "Sequential or hierarchical crews; Flows chain crews with routers."),
        "aws-bedrock": (["aws", "aws-step-functions"], "Multi-agent collaboration", "Supervisor and collaborator agents; Flows and Step Functions."),
        "aws-strands": (["aws"], "Swarm, Graph, agents-as-tools", "Model-driven or explicit multi-agent patterns; A2A protocol."),
        "azure-foundry": (["azure"], "Connected agents", "Agents as tools; Agent Framework sequential, concurrent, handoff and group chat."),
        "claude-sdk": (["claude"], "Subagents", "Agent SDK subagents with isolated context; Managed Agents multi-agent workflows."),
        "google-gemini-sdk": (["google-gemini"], "Workflow agents", "Sequential, Parallel and Loop agents; sub-agent transfer; AgentTool; A2A."),
    },
    "guardrails": {
        "langgraph": (["langgraph", "langchain"], "Guard nodes + middleware", "Validator nodes route to END; PII and call-limit middleware."),
        "crewai": (["crewai", "pydantic"], "Task guardrails", "Function or LLM guardrails retry failing outputs with feedback."),
        "aws-bedrock": (["aws"], "Bedrock Guardrails", "Content filters, denied topics, PII masking, grounding and Automated Reasoning checks."),
        "aws-strands": (["aws"], "Guardrails + hooks", "Bedrock Guardrails on the model; hooks block or cancel tool calls."),
        "azure-foundry": (["azure"], "Content Safety", "Content filters, Prompt Shields, groundedness and protected-material detection."),
        "claude-sdk": (["claude"], "Hooks + permissions", "PreToolUse hooks deny calls; tool allow and deny lists; refusal stop reason."),
        "google-gemini-sdk": (["google-gemini", "google-cloud"], "Callbacks + Model Armor", "before_model and before_tool callbacks; safety settings; Model Armor."),
    },
    "rag": {
        "langgraph": (["langchain", "pinecone"], "Agentic RAG graphs", "Retrieve, grade and rewrite loops over any LangChain vector store."),
        "crewai": (["crewai", "qdrant"], "Knowledge + RAG tools", "Knowledge sources per agent or crew; PDF, web and vector search tools."),
        "aws-bedrock": (["aws", "opensearch", "aws-s3"], "Knowledge Bases", "Managed ingestion, chunking and vector stores with filters and citations."),
        "aws-strands": (["aws", "opensearch"], "retrieve tool", "Queries Bedrock Knowledge Bases; custom vector tools for other stores."),
        "azure-foundry": (["azure"], "AI Search + File Search", "Hybrid vector and semantic search, managed vector stores, Bing grounding."),
        "claude-sdk": (["claude", "pinecone"], "Citations", "Bring your own retrieval; document blocks return cited spans."),
        "google-gemini-sdk": (["google-gemini", "google-cloud"], "File Search / RAG Engine", "Managed File Search stores; Vertex AI RAG Engine and Search grounding."),
    },
    "mcp": {
        "langgraph": (["mcp", "langchain"], "MCP adapters", "MultiServerMCPClient loads stdio and HTTP servers as LangChain tools."),
        "crewai": (["mcp", "crewai"], "MCPServerAdapter", "Stdio, SSE and streamable-HTTP servers exposed as CrewAI tools."),
        "aws-bedrock": (["mcp", "aws"], "AgentCore Gateway", "Turns Lambda and OpenAPI targets into a secured MCP endpoint."),
        "aws-strands": (["mcp", "aws"], "MCPClient", "Native MCP client for stdio, SSE and streamable HTTP."),
        "azure-foundry": (["mcp", "azure"], "McpTool", "Remote MCP servers with tool allow-lists and approval modes."),
        "claude-sdk": (["mcp", "claude"], "MCP connector", "The API calls remote MCP servers directly; the Agent SDK runs local ones."),
        "google-gemini-sdk": (["mcp", "google-gemini"], "MCPToolset", "Connects ADK agents to MCP servers with tool filters."),
    },
    "mlops": {
        "langgraph": (["langchain", "docker", "github-actions"], "LangSmith Deployment", "langgraph.json, container builds, assistant versions and eval gates."),
        "crewai": (["crewai", "docker"], "CrewAI AMP", "crewai deploy exposes crews as APIs; versioned YAML configs."),
        "aws-bedrock": (["aws-cloudformation", "aws"], "Versions + aliases", "Immutable agent versions, alias rollouts, CloudFormation or CDK."),
        "aws-strands": (["aws", "docker"], "AgentCore / Lambda", "BedrockAgentCoreApp entrypoint; Lambda, Fargate or EKS."),
        "azure-foundry": (["azure-devops", "github-actions"], "GenAIOps", "Evals in CI, Bicep or Terraform deploys, continuous evaluation."),
        "claude-sdk": (["anthropic", "github-actions"], "Pinned models + versions", "Eval-gated model changes; Managed Agents versions and schedules."),
        "google-gemini-sdk": (["google-cloud", "google-cloud-run"], "Agent Engine / Cloud Run", "adk deploy to Vertex AI Agent Engine or Cloud Run."),
    },
    "hitl": {
        "langgraph": (["langgraph"], "interrupt()", "Pause any node; resume with Command(resume=...) to approve or edit."),
        "crewai": (["crewai"], "human_input=True", "Tasks pause for reviewer feedback; Flow routers queue risky cases."),
        "aws-bedrock": (["aws"], "Return of control", "Hands planned actions back to the app; per-function user confirmation."),
        "aws-strands": (["aws"], "Interrupts", "BeforeToolCall hooks pause for approval; handoff_to_user tool."),
        "azure-foundry": (["azure"], "requires_action", "Runs pause for tool outputs or MCP approvals before continuing."),
        "claude-sdk": (["claude"], "can_use_tool", "Approve or deny each tool call; permission modes set defaults."),
        "google-gemini-sdk": (["google-gemini"], "Tool confirmation", "require_confirmation on tools; long-running tools for async approvals."),
    },
    "skills": {
        "langgraph": (["markdown", "langgraph"], "Prompts per node", "Load skill files into node prompts and route to them with conditional edges."),
        "crewai": (["yaml", "crewai"], "agents.yaml", "Role, goal and backstory per agent carry each skill description."),
        "aws-bedrock": (["markdown", "aws"], "Agent instructions", "Instructions plus prompt-override templates per orchestration step."),
        "aws-strands": (["markdown", "aws"], "system_prompt", "Load skill files into the system prompt or specialist agents-as-tools."),
        "azure-foundry": (["markdown", "azure"], "Agent instructions", "Instructions per agent; connected agents for separate skills."),
        "claude-sdk": (["markdown", "claude"], "Agent Skills (SKILL.md)", "Skill folders with SKILL.md load on demand in the API and Agent SDK."),
        "google-gemini-sdk": (["markdown", "google-gemini"], "Instructions + sub-agents", "Skill text in instructions; sub-agent descriptions drive routing."),
    },
    "memoryfile": {
        "langgraph": (["markdown", "postgresql"], "Store namespaces", "Memory notes in the long-term Store, written by a memory node."),
        "crewai": (["mem0", "crewai"], "Knowledge + external memory", "Text knowledge sources or Mem0-backed external memory."),
        "aws-bedrock": (["aws", "aws-dynamodb"], "AgentCore Memory", "Session summaries and long-term memory strategies."),
        "aws-strands": (["aws", "mem0"], "Sessions + mem0 tool", "Session managers persist state; the mem0_memory tool keeps long-term notes."),
        "azure-foundry": (["azure-cosmos", "azure"], "Threads + files", "Thread history plus a File Search store holding memory notes."),
        "claude-sdk": (["markdown", "claude"], "CLAUDE.md + memory tool", "The Agent SDK loads CLAUDE.md; the memory tool reads and writes memory files."),
        "google-gemini-sdk": (["google-cloud", "markdown"], "Memory Bank", "MemoryService and load_memory recall long-term facts."),
    },
    "toolsfile": {
        "langgraph": (["pydantic", "langchain"], "Tool docstrings", "Generate tools.md from @tool names, docstrings and Pydantic args."),
        "crewai": (["pydantic", "crewai"], "BaseTool schemas", "name, description and args_schema document each tool."),
        "aws-bedrock": (["openapi", "aws"], "OpenAPI schemas", "Action-group OpenAPI or function-detail definitions."),
        "aws-strands": (["python", "aws"], "@tool docstrings", "Docstrings become tool specs; tools can load from a directory."),
        "azure-foundry": (["openapi", "azure"], "OpenAPI specs", "Function definitions and OpenAPI tool specs per agent."),
        "claude-sdk": (["claude", "mcp"], "JSON-schema tools", "Name, description and input_schema; MCP servers describe their own tools."),
        "google-gemini-sdk": (["python", "google-gemini"], "FunctionDeclarations", "Function docstrings or explicit declarations describe each tool."),
    },
    "tuning": {
        "langgraph": (["langchain", "huggingface"], "Model-agnostic", "Use LangSmith traces as datasets; fine-tune in your model platform."),
        "crewai": (["crewai"], "crewai train", "Human feedback improves agent guidance; tuned models via LiteLLM."),
        "aws-bedrock": (["aws"], "Custom models", "Fine-tuning, continued pre-training, distillation and model import."),
        "aws-strands": (["aws"], "Bedrock or SageMaker models", "Point the model provider at a tuned Bedrock or SageMaker model."),
        "azure-foundry": (["azure"], "Fine-tuning + distillation", "Supervised, preference and reinforcement fine-tuning for supported models."),
        "claude-sdk": (["anthropic"], "Prompting over tuning", "Steer with prompts, Skills, examples and effort; no first-party fine-tuning."),
        "google-gemini-sdk": (["google-cloud", "google-gemini"], "Vertex AI tuning", "Supervised and preference tuning for Gemini; LoRA for Gemma."),
    },
}

# Extra roadmap step: model training / tuning (s = summary, a = key APIs)
TUNING = {
    "langgraph": dict(
        s="LangGraph is model-agnostic, so tuning happens in your model platform. Export LangSmith traces and annotated runs as datasets for fine-tuning or few-shot examples. Optimise prompts against evals before reaching for fine-tuning.",
        a=["LangSmith datasets", "few-shot examples", "prompt optimisation", "init_chat_model(tuned model)"]),
    "crewai": dict(
        s="crewai train runs the crew with human feedback and saves improved guidance for each agent. Sharper expected_output descriptions and few-shot examples are the first lever. Any fine-tuned model plugs in through LLM(model=...).",
        a=["crewai train -n", "expected_output", "few-shot examples", "LLM(model=)"]),
    "aws-bedrock": dict(
        s="Bedrock customises models in place: supervised fine-tuning, continued pre-training on unlabelled data and distillation from a larger teacher. Custom Model Import serves your own open-weight models. Tuned models run on demand or on Provisioned Throughput.",
        a=["create_model_customization_job", "distillation", "Custom Model Import", "Provisioned Throughput"]),
    "aws-strands": dict(
        s="Strands runs whatever model you point it at: a Bedrock custom model, a SageMaker endpoint or a local fine-tune through Ollama. Tune prompts and tool descriptions first, because they steer the model-driven loop.",
        a=["BedrockModel(model_id=custom)", "SageMaker provider", "OllamaModel", "tool docstrings"]),
    "azure-foundry": dict(
        s="Foundry fine-tunes supported models with supervised, preference (DPO) and reinforcement fine-tuning. Distillation trains a smaller model from a larger one's stored completions. Tuned deployments go through the same evaluators before release.",
        a=["fine-tuning jobs", "DPO", "reinforcement fine-tuning", "distillation"]),
    "claude-sdk": dict(
        s="Claude is steered rather than fine-tuned on the first-party API. The levers are system prompts, Agent Skills, few-shot examples, structured outputs and the effort setting. Measure every change with evals and pin model ids.",
        a=["system prompt", "Agent Skills", "output_config.effort", "evals"]),
    "google-gemini-sdk": dict(
        s="Vertex AI offers supervised fine-tuning and preference tuning for Gemini models, and parameter-efficient tuning for open Gemma models. Prompt design and context caching remain the cheaper first step.",
        a=["Vertex AI tuning jobs", "preference tuning", "Gemma LoRA", "context caching"]),
}

# Sidebar: essential tools per harness (icon stems)
TOOLS = {
    "langgraph": ["langgraph", "langchain", "python", "postgresql", "redis", "mcp", "opentelemetry", "docker"],
    "crewai": ["crewai", "python", "pydantic", "yaml", "qdrant", "mem0", "mcp", "ollama"],
    "aws-bedrock": ["aws", "aws-lambda", "aws-s3", "opensearch", "aws-dynamodb", "aws-cloudwatch", "aws-cloudtrail", "aws-cloudformation"],
    "aws-strands": ["aws", "python", "aws-s3", "mcp", "opentelemetry", "aws-xray", "ollama", "docker"],
    "azure-foundry": ["azure", "python", "azure-cosmos", "azure-functions", "azure-monitor", "azure-key-vault", "azure-entra", "github-actions"],
    "claude-sdk": ["claude", "anthropic", "python", "mcp", "markdown", "pydantic", "opentelemetry", "docker"],
    "google-gemini-sdk": ["google-gemini", "google-cloud", "python", "mcp", "google-cloud-run", "postgresql", "opentelemetry", "pytest"],
}

# Learn-box icons for steps that have no matching matrix row
SECURITY_ICONS = {
    "langgraph": ["langchain", "python"], "crewai": ["crewai", "python"],
    "aws-bedrock": ["aws-iam", "aws-kms"], "aws-strands": ["aws-iam", "aws-cognito"],
    "azure-foundry": ["azure-entra", "azure-key-vault"], "claude-sdk": ["anthropic", "claude"],
    "google-gemini-sdk": ["google-cloud", "google-gemini"],
}
