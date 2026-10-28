"""Roadmap content: Claude SDK (Anthropic API + Claude Agent SDK), Google Gemini SDK (google-genai + ADK)."""

CLAUDE = {
    "slug": "claude-sdk",
    "name": "Claude SDK",
    "title": "Claude API, Tool Runner & Claude Agent SDK",
    "badge": "Claude SDK",
    "accent": "#d97757",
    "logo": "claude.svg",
    "lede": "Build on Claude at the level of control you need: the Messages API and Tool Runner for agents with your own tools, the Claude Agent SDK for the Claude Code harness with built-in file, shell and web tools, and Managed Agents when Anthropic should host the loop and sandbox.",
    "glance": [
        ("Control model", "Your code, or the model's tool loop"),
        ("State lives in", "Messages you own; SDK sessions"),
        ("Language", "Python, TypeScript, Java, Go, C#, Ruby, PHP"),
        ("Ships to", "Your infra, Managed Agents, Bedrock, Vertex, Foundry"),
    ],
    "modules": {
        "setup": dict(
            s="Install the API SDK (anthropic) and, if you want the Claude Code harness, claude-agent-sdk. The client reads ANTHROPIC_API_KEY. The same models are available on Amazon Bedrock, Google Vertex AI and Microsoft Foundry through dedicated clients.",
            a=["anthropic", "claude-agent-sdk", "Anthropic()", "messages.create", "AnthropicBedrockMantle / AnthropicVertex / AnthropicFoundry"],
            m="anthropic + claude-agent-sdk"),
        "anatomy": dict(
            s="Four ways to build: a manual loop over messages.create; the Tool Runner, where the SDK drives the loop over tools you define; Managed Agents, where Anthropic hosts the loop and a sandbox; or the Claude Agent SDK, which runs the Claude Code harness on your infrastructure.",
            a=["manual loop", "tool_runner", "Managed Agents", "claude_agent_sdk.query", "ClaudeAgentOptions"],
            m="Messages API, Tool Runner, Agent SDK"),
        "state": dict(
            s="The Messages API is stateless: you own the conversation and send it each turn. Append the assistant's full content blocks (tool_use, thinking, compaction), not only its text. The Agent SDK manages session state for you.",
            a=["messages[]", "role: user / assistant", "content blocks", "mid-conversation system messages"],
            m="Client-owned message history"),
        "memory": dict(
            s="Server-side compaction summarises old context automatically as a thread grows. The memory tool lets Claude read and write files in a memory directory you host, for knowledge that outlives a conversation. Agent SDK sessions resume by id.",
            a=["compact_20260112", "memory_20250818", "context editing", "resume=session_id"],
            m="Compaction + memory tool"),
        "edges": dict(
            s="There is no graph DSL: in a workflow, control flow is your code; in an agent, the model chooses the next tool. Use structured outputs to get a reliable decision, then branch on it in code.",
            a=["output_config.format", "json_schema", "code-driven routing", "stop_reason"],
            m="Your code + structured outputs"),
        "lifecycle": dict(
            s="Stream long or tool-heavy responses and read stop_reason: end_turn, tool_use, max_tokens, pause_turn or refusal. In the Agent SDK, ClaudeSDKClient keeps an interactive session open and interrupt() stops it mid-run.",
            a=["messages.stream", "get_final_message", "stop_reason", "ClaudeSDKClient", "interrupt()"],
            m="stream, stop_reason, interrupt()"),
        "errors": dict(
            s="The SDK retries 408, 409, 429 and 5xx responses and connection errors with backoff (two retries by default). Catch typed errors from most to least specific, and check for a refusal stop reason before reading content.",
            a=["max_retries", "RateLimitError", "APIStatusError", "APIConnectionError", "stop_reason == refusal"],
            m="Typed errors + SDK retries"),
        "tools": dict(
            s="Define tools with JSON schema, or with @beta_tool where the signature and docstring become the schema. The Tool Runner calls the API, runs your functions and loops until Claude is done. strict: true guarantees schema-valid inputs.",
            a=["@beta_tool", "client.beta.messages.tool_runner", "until_done()", "strict: true", "parallel tool use"],
            m="@beta_tool + Tool Runner"),
        "rag": dict(
            s="Retrieve with your own search, pass the passages as document blocks with citations enabled, and Claude returns answers whose text blocks cite the exact source spans. Cache the stable part of the corpus to cut cost on repeat questions.",
            a=["document blocks", "citations: enabled", "Files API", "prompt caching", "web_search tool"],
            m="Document blocks + citations"),
        "mcp": dict(
            s="The MCP connector lets the API call remote MCP servers directly: declare the server in mcp_servers and reference it with an mcp_toolset tool. In the Agent SDK, pass mcp_servers or build in-process tools with create_sdk_mcp_server.",
            a=["mcp_servers", "mcp_toolset", "mcp-client-2025-11-20", "create_sdk_mcp_server"],
            m="MCP connector + SDK servers"),
        "orchestration": dict(
            s="In the Agent SDK, define subagents with their own prompt and tool set; the main agent delegates and each subagent keeps its own context. Managed Agents can fan work out across several agents server-side. With the API, an orchestrator calls worker models as tools.",
            a=["AgentDefinition", "agents={...}", "subagent context isolation", "Managed Agents multiagent"],
            m="Subagents, multi-agent workflows"),
        "hitl": dict(
            s="In the Agent SDK, can_use_tool is called before tool use so a person can allow or deny it; permission modes set the default. With the API, your loop pauses before running a tool_use block until someone approves.",
            a=["can_use_tool", "PermissionResultAllow / Deny", "permission_mode", "approval before tool_result"],
            m="can_use_tool, permission modes"),
        "guardrails": dict(
            s="Hooks run your code at fixed points: PreToolUse can deny a call, PostToolUse can inspect results. Combine with allowed and disallowed tools, a sandboxed working directory, and stop_reason checks for refusals.",
            a=["hooks", "PreToolUse / PostToolUse", "HookMatcher", "disallowed_tools", "permissionDecision"],
            m="Hooks + tool allow/deny lists"),
        "testing": dict(
            s="Build an eval set from real or synthetic cases, grade with code where possible and an LLM judge where not, and run it on every prompt or model change. The Message Batches API runs large eval sets at half the cost.",
            a=["eval datasets", "code graders", "LLM-as-judge", "Message Batches", "count_tokens"],
            m="Evals + Batches API"),
        "auditing": dict(
            s="Log the request id, model, stop reason and token usage of every call, including cache reads. Agent SDK hooks record every tool call; OpenTelemetry exports traces; Managed Agents sessions are inspectable event by event in the Console.",
            a=["_request_id", "usage", "PostToolUse hooks", "OpenTelemetry", "Console session viewer"],
            m="Usage logs, hooks, OpenTelemetry"),
        "mlops": dict(
            s="Pin model ids and migrate with evals. Managed Agents stores versioned agent configs (kept in git and synced with ant apply) and runs scheduled deployments. Agent SDK services ship as containers with a sandboxed filesystem.",
            a=["pinned model ids", "ant apply", "Managed Agents versions", "scheduled deployments", "containers"],
            m="Pinned models, Managed Agents versions"),
        "security": dict(
            s="Cache the stable prefix (tools, system prompt, corpus) so repeats cost a fraction, tune effort per route, and count tokens before large requests. Restrict tools and filesystem scope; keep credentials in vaults or host-side tools.",
            a=["cache_control", "output_config.effort", "count_tokens", "allowed_tools", "vault credentials"],
            m="Prompt caching, effort, scoped tools"),
    },
}

GEMINI = {
    "slug": "google-gemini-sdk",
    "name": "Google Gemini SDK",
    "title": "Google Gen AI SDK & Agent Development Kit",
    "badge": "Google Gemini SDK",
    "accent": "#4f8df7",
    "logo": "google-gemini.svg",
    "lede": "Use the Google Gen AI SDK for direct Gemini calls (function calling, structured output, context caching, File Search) and the Agent Development Kit (ADK) for agents: sessions with scoped state, workflow agents, callbacks, built-in evaluation and one-command deploys to Vertex AI.",
    "glance": [
        ("Control model", "LLM transfer + Sequential / Parallel / Loop agents"),
        ("State lives in", "Session state with scope prefixes"),
        ("Language", "Python, Java, Go, TypeScript"),
        ("Ships to", "Vertex AI Agent Engine, Cloud Run, GKE"),
    ],
    "modules": {
        "setup": dict(
            s="pip install google-genai (the unified SDK for the Gemini API and Vertex AI) and google-adk. One Client works with an API key or with Vertex AI project credentials.",
            a=["google-genai", "genai.Client()", "vertexai=True", "google-adk", "generate_content"],
            m="google-genai Client"),
        "anatomy": dict(
            s="An ADK Agent (LlmAgent) has a name, model, instruction, tools and optional sub-agents. Plain Python functions become tools. A Runner executes it against a session service; adk web gives a local UI with an event inspector.",
            a=["Agent / LlmAgent", "instruction", "tools=[fn]", "Runner", "adk web"],
            m="LlmAgent + Runner"),
        "state": dict(
            s="session.state is a key-value store with scope prefixes: no prefix is this session, user: spans a user's sessions, app: is global and temp: lasts one invocation. Tools write through ToolContext, output_key saves an agent's reply, and {key} injects state into instructions.",
            a=["session.state", "user: / app: / temp:", "ToolContext.state", "output_key", "{key?} templating"],
            m="Scoped session state"),
        "memory": dict(
            s="SessionService stores sessions (in memory, in a database or on Vertex AI). MemoryService holds long-term knowledge across sessions; Vertex AI Memory Bank extracts memories automatically, and load_memory lets the agent search them.",
            a=["InMemorySessionService", "DatabaseSessionService", "VertexAiSessionService", "VertexAiMemoryBankService", "load_memory"],
            m="SessionService + MemoryService"),
        "edges": dict(
            s="Workflow agents fix the shape: SequentialAgent runs sub-agents in order, ParallelAgent runs them concurrently, LoopAgent repeats until max_iterations or an escalate. An LlmAgent with sub_agents routes dynamically by transferring control.",
            a=["SequentialAgent", "ParallelAgent", "LoopAgent", "sub_agents", "transfer_to_agent"],
            m="Sequential / Parallel / Loop agents"),
        "lifecycle": dict(
            s="Create a session, then iterate runner.run_async: it yields events (model text, function calls and responses, state deltas) until a final response. RunConfig sets streaming mode and max_llm_calls; escalate exits a loop.",
            a=["create_session", "runner.run_async", "is_final_response()", "RunConfig", "actions.escalate"],
            m="run_async events, RunConfig"),
        "errors": dict(
            s="API failures raise errors.APIError with an HTTP code (429 RESOURCE_EXHAUSTED, 503 UNAVAILABLE); HttpRetryOptions adds retries. Check finish_reason for MAX_TOKENS or SAFETY. In ADK, on-error callbacks and max_llm_calls contain failures.",
            a=["errors.APIError", "HttpRetryOptions", "finish_reason", "max_llm_calls"],
            m="APIError, retry options"),
        "tools": dict(
            s="Pass Python functions as tools and the SDK calls them automatically (automatic function calling), or declare FunctionDeclarations and handle calls yourself. response_schema with a Pydantic model returns parsed, typed output.",
            a=["automatic function calling", "FunctionDeclaration", "response_schema", "response.parsed", "built-in tools"],
            m="Auto function calling, response_schema"),
        "rag": dict(
            s="The Gemini API File Search tool is managed RAG: create a store, upload files, and generate with the store attached. On Vertex AI, use RAG Engine or Vertex AI Search, and ground with Google Search for fresh facts.",
            a=["file_search_stores", "types.FileSearch", "Vertex AI RAG Engine", "Vertex AI Search", "Google Search grounding"],
            m="File Search, RAG Engine"),
        "mcp": dict(
            s="MCPToolset connects an ADK agent to MCP servers over stdio or streamable HTTP, with tool_filter to allow-list tools. ADK tools can also be served as an MCP server for other clients.",
            a=["MCPToolset", "StdioConnectionParams", "StreamableHTTPConnectionParams", "tool_filter"],
            m="MCPToolset"),
        "orchestration": dict(
            s="Build hierarchies: a coordinator with sub_agents transfers control by description, AgentTool calls an agent like a function and returns its answer, and workflow agents fix the order. The A2A protocol connects agents across frameworks.",
            a=["sub_agents", "AgentTool", "workflow agents", "A2A (RemoteA2aAgent)"],
            m="sub_agents, AgentTool, A2A"),
        "hitl": dict(
            s="Tool confirmation pauses a call until a person approves, optionally only when a condition holds. LongRunningFunctionTool starts work that finishes later, such as an approval ticket, and the agent resumes when the result arrives.",
            a=["FunctionTool(require_confirmation=)", "LongRunningFunctionTool", "tool confirmation events"],
            m="Tool confirmation, long-running tools"),
        "guardrails": dict(
            s="Callbacks run before and after the model and each tool: return a response from before_model_callback to block a request, or validate arguments in before_tool_callback. safety_settings tune Gemini's filters; Model Armor screens prompts and responses on Google Cloud.",
            a=["before_model_callback", "before_tool_callback", "after_model_callback", "safety_settings", "Model Armor"],
            m="Callbacks + safety settings"),
        "testing": dict(
            s="adk eval runs .test.json eval sets and scores both the tool trajectory and the final response against references. AgentEvaluator puts the same check in pytest; Vertex AI Gen AI evaluation adds model-based metrics.",
            a=["adk eval", "AgentEvaluator.evaluate", "tool_trajectory_avg_score", "response_match_score", "Vertex AI evaluation"],
            m="adk eval, trajectory scores"),
        "auditing": dict(
            s="ADK emits OpenTelemetry spans for each agent run, model call and tool call, visible in adk web and exportable to Cloud Trace. Every event records its author, function calls and state delta, which is a natural audit log.",
            a=["OpenTelemetry spans", "Cloud Trace", "event.author", "event.actions.state_delta", "--trace_to_cloud"],
            m="Events + OpenTelemetry / Cloud Trace"),
        "mlops": dict(
            s="adk deploy ships an agent to Vertex AI Agent Engine (managed sessions, memory and scaling) or to Cloud Run; GKE suits custom stacks. Pin model versions, run adk eval in CI, and tune or distil models on Vertex AI.",
            a=["adk deploy agent_engine", "adk deploy cloud_run", "Agent Engine", "Vertex AI tuning"],
            m="Agent Engine, Cloud Run"),
        "security": dict(
            s="Cache large stable context with explicit context caching, cap thinking with a thinking budget, and read usage_metadata for tokens. On Google Cloud, use service accounts with IAM, VPC Service Controls, CMEK and Model Armor.",
            a=["caches.create", "cached_content", "ThinkingConfig", "usage_metadata", "IAM / VPC-SC / CMEK"],
            m="Context caching, IAM, VPC-SC"),
    },
}
