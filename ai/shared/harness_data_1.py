"""Roadmap content: LangGraph, CrewAI, AWS Strands Agents.

Each module: s = summary (one bullet per sentence), a = key APIs, m = short phrase.
"""

LANGGRAPH = {
    "slug": "langgraph",
    "name": "LangGraph",
    "title": "LangGraph Stateful Agent Graphs",
    "badge": "LangGraph State Machines",
    "accent": "#8b5cf6",
    "logo": "langgraph.svg",
    "lede": "Build agents as explicit graphs: typed state flows through nodes, edges decide what runs next, and a checkpointer saves every step so runs can pause for a human, recover from failure and be replayed for audit.",
    "glance": [
        ("Control model", "Explicit graph: you draw the edges"),
        ("State lives in", "Typed state + checkpointer"),
        ("Language", "Python & JavaScript"),
        ("Ships to", "LangSmith Deployment or any container"),
    ],
    "modules": {
        "setup": dict(
            s="Install the graph runtime and wire a chat model. init_chat_model gives one interface over Anthropic, OpenAI, Bedrock, Vertex and local models, so the graph never hard-codes a provider.",
            a=["langgraph", "init_chat_model", "langchain-anthropic", "LANGSMITH_API_KEY"],
            m="init_chat_model, any provider"),
        "anatomy": dict(
            s="An agent is a StateGraph: nodes are plain functions that read state and return partial updates; START and END mark the entry and exit. compile() turns the builder into a runnable graph.",
            a=["StateGraph", "MessagesState", "add_node", "START / END", "compile()"],
            m="StateGraph of nodes"),
        "state": dict(
            s="State is a TypedDict or Pydantic schema. Each key is a channel with a reducer that decides how updates merge: add_messages appends and de-duplicates by id, operator.add concatenates, plain keys are last-write-wins.",
            a=["TypedDict / Pydantic", "Annotated[..., reducer]", "add_messages", "input/output schema", "Command(update=)"],
            m="Typed state + reducers"),
        "memory": dict(
            s="Checkpointers persist the full state after every super-step, keyed by thread_id: that is short-term memory, crash recovery and time travel in one. A Store holds long-term, cross-thread memory under namespaces.",
            a=["InMemorySaver", "SqliteSaver / PostgresSaver", "thread_id", "get_state_history", "BaseStore"],
            m="Checkpointers + Store"),
        "edges": dict(
            s="Normal edges always fire; conditional edges call a router that returns the next node name. Send fans out one node per item (map-reduce), and a node can return Command(goto=...) to route and update state in one step.",
            a=["add_edge", "add_conditional_edges", "Send", "Command(goto=)", "subgraphs"],
            m="Conditional edges, Send, Command"),
        "lifecycle": dict(
            s="Run with invoke or ainvoke, or stream updates, full values, LLM tokens or custom events. recursion_limit caps steps. Cancelling the task stops the run; invoking the same thread with None resumes from the last checkpoint.",
            a=["invoke / ainvoke", "stream(stream_mode=)", "astream_events", "recursion_limit", "invoke(None, cfg)"],
            m="invoke / stream / resume"),
        "errors": dict(
            s="Attach a RetryPolicy to flaky nodes such as API calls, with backoff and a retry_on filter. GraphRecursionError is the runaway-loop alarm. Because state is checkpointed, a failed node can be re-run without repeating earlier work.",
            a=["RetryPolicy", "GraphRecursionError", "retry_on", "node-level fallbacks"],
            m="RetryPolicy, recursion_limit"),
        "tools": dict(
            s="Define functions with @tool (the docstring and type hints become the schema), bind them to the model, and let ToolNode run them. tools_condition routes to tools when the model asks for one. with_structured_output returns typed objects.",
            a=["@tool", "bind_tools", "ToolNode", "tools_condition", "with_structured_output"],
            m="@tool + ToolNode"),
        "rag": dict(
            s="Make retrieval a node or a tool, then use the graph to add judgement: grade the retrieved documents, rewrite the query when they miss, and loop. This is corrective or self-RAG, which a linear chain cannot express.",
            a=["retriever node", "create_retriever_tool", "document grader", "query rewrite loop"],
            m="Agentic / corrective RAG graphs"),
        "mcp": dict(
            s="langchain-mcp-adapters connects to many MCP servers over stdio or streamable HTTP and returns them as standard LangChain tools, so ToolNode and agents use them unchanged.",
            a=["MultiServerMCPClient", "get_tools()", "stdio", "streamable_http"],
            m="langchain-mcp-adapters"),
        "orchestration": dict(
            s="Multi-agent systems are graphs of graphs. A supervisor routes with Command(goto=), workers are compiled subgraphs, and handoffs can jump to the parent graph. Prebuilt langgraph-supervisor and langgraph-swarm cover the common shapes.",
            a=["Command(goto=, graph=Command.PARENT)", "subgraphs", "langgraph-supervisor", "langgraph-swarm"],
            m="Supervisor, swarm, subgraphs"),
        "hitl": dict(
            s="interrupt() pauses a node and surfaces a payload to your UI; the checkpoint waits indefinitely. Resume with Command(resume=...) to approve, edit or reject. interrupt_before on compile pauses ahead of whole nodes such as tools.",
            a=["interrupt()", "Command(resume=)", "interrupt_before", "update_state"],
            m="interrupt() + Command(resume)"),
        "guardrails": dict(
            s="Guardrails are nodes and edges: an input guard before the agent, an output validator after it, and a route to END when policy fails. LangChain agent middleware adds PII redaction and call limits; Guardrails AI or NeMo plug in as nodes.",
            a=["guard nodes", "Command(goto=END)", "PIIMiddleware", "output validators", "recursion_limit"],
            m="Guard nodes + middleware"),
        "testing": dict(
            s="Nodes and routers are pure functions, so unit-test them directly. Test the whole graph with a fake chat model and an in-memory checkpointer. LangSmith datasets and agentevals score answers and tool trajectories.",
            a=["GenericFakeChatModel", "InMemorySaver", "LangSmith evaluate()", "agentevals trajectory"],
            m="Pure nodes, fake LLMs, LangSmith evals"),
        "auditing": dict(
            s="LangSmith traces every node, LLM call and tool call with tags and metadata. The checkpoint history is an ordered, replayable record of every state change in a thread, which makes a strong audit trail. OpenTelemetry and Langfuse are alternatives.",
            a=["LANGSMITH_TRACING", "tags / metadata", "get_state_history", "checkpoint_id", "OpenTelemetry"],
            m="LangSmith + checkpoint history"),
        "mlops": dict(
            s="langgraph.json declares graphs and dependencies. langgraph dev runs Studio locally; langgraph build makes a container image; LangSmith Deployment hosts it with task queues, cron jobs and versioned assistants. Gate releases on dataset evals.",
            a=["langgraph.json", "langgraph dev", "langgraph build", "assistants", "LangSmith Deployment"],
            m="langgraph.json, LangSmith Deployment"),
        "security": dict(
            s="Scope threads to authenticated users with custom auth handlers on the platform, rate-limit model calls, and read usage_metadata to track tokens per node. Keep tools least-privilege and secrets in the runtime environment, never in state.",
            a=["@auth.authenticate", "@auth.on", "InMemoryRateLimiter", "usage_metadata"],
            m="Platform auth, rate limiters"),
    },
}

CREWAI = {
    "slug": "crewai",
    "name": "CrewAI",
    "title": "CrewAI Role-Based Agent Crews & Flows",
    "badge": "Multi-Agent Crews",
    "accent": "#f97316",
    "logo": "crewai.svg",
    "lede": "Model a team: agents with a role, goal and backstory take on tasks with expected outputs, a crew runs them in sequence or under a manager, and Flows add event-driven state, routing and persistence around your crews.",
    "glance": [
        ("Control model", "Roles + tasks; Flows for events"),
        ("State lives in", "Flow state (Pydantic) + crew memory"),
        ("Language", "Python"),
        ("Ships to", "CrewAI AMP or any container"),
    ],
    "modules": {
        "setup": dict(
            s="Install crewai and crewai-tools, scaffold a project with the CLI, and pick a model. LLM() routes through LiteLLM, so the same agent runs on Anthropic, OpenAI, Bedrock, Azure, Gemini or Ollama.",
            a=["crewai create crew", "LLM(model=)", "agents.yaml / tasks.yaml", "@CrewBase"],
            m="LLM() via LiteLLM, YAML config"),
        "anatomy": dict(
            s="An Agent has a role, goal, backstory, tools and model. A Task has a description, an expected_output and an owner. A Crew binds agents and tasks under a Process. Placeholders like {claim_id} are filled from kickoff inputs.",
            a=["Agent", "Task", "Crew", "Process.sequential", "kickoff(inputs=)"],
            m="Agent / Task / Crew"),
        "state": dict(
            s="Inside a crew, data moves through task outputs and context=[other_task]. Around crews, a Flow holds typed Pydantic state in self.state that every step reads and writes; each run gets a unique state id.",
            a=["Flow[State]", "self.state", "context=[task]", "output_pydantic", "TaskOutput"],
            m="Flow state + task context"),
        "memory": dict(
            s="memory=True gives a crew short-term (current run), long-term (SQLite, across runs) and entity memory backed by embeddings. External memory such as Mem0 can be plugged in. @persist saves Flow state so a run can resume by id.",
            a=["memory=True", "embedder", "long-term memory", "external memory", "@persist"],
            m="Crew memory + @persist"),
        "edges": dict(
            s="Flows are the control-flow layer. @start marks entry points, @listen(step) runs after a step, @router returns a label that chooses the branch, and or_ / and_ join branches. Inside a crew, the Process decides order.",
            a=["@start", "@listen", "@router", "or_ / and_", "flow.plot()"],
            m="@router / @listen in Flows"),
        "lifecycle": dict(
            s="Start with kickoff, kickoff_async or kickoff_for_each over many inputs. Stop with agent limits: max_iter, max_execution_time and max_rpm. The CLI runs, replays from a given task and resets memories.",
            a=["kickoff / kickoff_async", "kickoff_for_each", "max_iter", "max_execution_time", "crewai replay -t"],
            m="kickoff*, max_iter, max_execution_time"),
        "errors": dict(
            s="Agents retry failed LLM or tool calls up to max_retry_limit; respect_context_window summarises when the window overflows. Task guardrails send a failing output back to the agent for another attempt.",
            a=["max_retry_limit", "respect_context_window", "guardrail_max_retries", "step_callback"],
            m="max_retry_limit, guardrail retries"),
        "tools": dict(
            s="Wrap functions with @tool or subclass BaseTool, or use crewai-tools (search, scraping, files, databases). Attach tools to an agent or a single task. output_pydantic or output_json gives structured results.",
            a=["@tool", "BaseTool._run", "crewai_tools", "output_pydantic", "cache_function"],
            m="@tool / BaseTool, output_pydantic"),
        "rag": dict(
            s="Knowledge sources (PDF, CSV, text, web) are chunked and embedded for an agent or a whole crew. RAG tools such as PDFSearchTool and WebsiteSearchTool let an agent decide when to retrieve.",
            a=["knowledge_sources", "PDFKnowledgeSource", "RagTool", "PDFSearchTool", "embedder"],
            m="Knowledge sources + RAG tools"),
        "mcp": dict(
            s="MCPServerAdapter connects to stdio, SSE or streamable-HTTP MCP servers and exposes their tools as CrewAI tools. Use it as a context manager so the server is shut down cleanly.",
            a=["MCPServerAdapter", "StdioServerParameters", "streamable-http", "tool filtering"],
            m="MCPServerAdapter"),
        "orchestration": dict(
            s="Process.hierarchical adds a manager (manager_llm or a custom manager_agent) that plans, delegates and validates. allow_delegation lets agents ask each other. Flows chain several crews into one pipeline.",
            a=["Process.hierarchical", "manager_agent", "allow_delegation", "async_execution", "Flows of crews"],
            m="Hierarchical manager, Flows of crews"),
        "hitl": dict(
            s="human_input=True makes a task pause for reviewer feedback before it is final. In Flows, route risky cases to a review step and resume later from persisted state; the hosted platform adds HITL webhooks.",
            a=["human_input=True", "@router review gate", "@persist resume", "HITL webhooks"],
            m="human_input=True, review routers"),
        "guardrails": dict(
            s="A task guardrail is a function returning (passed, result_or_feedback), or a plain-language rule checked by an LLM. Failures go back to the agent with the feedback. Combine with tool restrictions and allow_code_execution=False.",
            a=["Task(guardrail=)", "(bool, Any) contract", "LLM guardrail string", "guardrail_max_retries"],
            m="Task guardrails"),
        "testing": dict(
            s="crewai test runs the crew N times and scores each task; crewai train collects human feedback to improve agent behaviour. Unit-test custom tools directly and Flows with stubbed crews.",
            a=["crewai test -n", "crewai train -n", "tool.run()", "stub crews"],
            m="crewai test / train"),
        "auditing": dict(
            s="Every crew, agent, task, tool and LLM call emits events on the event bus; a BaseEventListener can write them to an audit store. output_log_file saves run logs, usage_metrics reports tokens, and integrations export to Langfuse, MLflow, Phoenix and others.",
            a=["BaseEventListener", "crewai_event_bus", "output_log_file", "usage_metrics", "OpenTelemetry"],
            m="Event listeners + log files"),
        "mlops": dict(
            s="Keep agents and tasks in versioned YAML, gate merges on crewai test, and deploy with crewai deploy to CrewAI AMP, which exposes the crew as a REST API with kickoff and status endpoints. Or containerise main.py yourself.",
            a=["crewai deploy create", "crewai deploy status", "POST /kickoff", "GET /status/{id}"],
            m="crewai deploy, CrewAI AMP"),
        "security": dict(
            s="Give each agent only the tools it needs, keep code execution off by default, cap request rates and cache tool results. result.token_usage shows cost per run; API keys stay in environment variables read by LiteLLM.",
            a=["max_rpm", "cache=True", "allow_code_execution=False", "token_usage"],
            m="Per-agent tools, max_rpm, token_usage"),
    },
}

STRANDS = {
    "slug": "aws-strands",
    "name": "AWS Strands Agents",
    "title": "AWS Strands Agents SDK",
    "badge": "Strands Agents",
    "accent": "#14b8a6",
    "logo": "aws.svg",
    "lede": "Strands is AWS's open-source, model-driven agent SDK: give an agent a model, a prompt and tools, and the model plans the loop itself. Add Graph, Swarm or agents-as-tools when you need structure, and deploy to Bedrock AgentCore, Lambda or containers.",
    "glance": [
        ("Control model", "Model-driven loop; Graph / Swarm when needed"),
        ("State lives in", "agent.state + session manager"),
        ("Language", "Python & TypeScript"),
        ("Ships to", "AgentCore Runtime, Lambda, Fargate, EKS"),
    ],
    "modules": {
        "setup": dict(
            s="Install strands-agents and the community tools package. The default model is Amazon Bedrock; BedrockModel, AnthropicModel, OpenAIModel, LiteLLMModel and OllamaModel are drop-in providers.",
            a=["strands-agents", "strands-agents-tools", "BedrockModel", "AnthropicModel", "LiteLLMModel"],
            m="BedrockModel + other providers"),
        "anatomy": dict(
            s="An Agent is a model, a system prompt and tools running the event loop: the model reasons, calls tools, reads results and repeats until it stops. Calling the agent returns an AgentResult with the stop reason, final message and metrics.",
            a=["Agent()", "@tool", "system_prompt", "AgentResult", "stop_reason"],
            m="Model-driven event loop"),
        "state": dict(
            s="agent.messages is the conversation; agent.state is a JSON key-value store that is not sent to the model. Tools reach both through ToolContext, and per-call invocation_state carries request data such as user ids.",
            a=["agent.state.get/set", "agent.messages", "@tool(context=True)", "ToolContext", "invocation_state"],
            m="agent.state + ToolContext"),
        "memory": dict(
            s="Conversation managers keep context in budget: sliding window, summarising or none. Session managers (file, S3, or AgentCore Memory) persist messages and state so a session resumes on any host.",
            a=["SlidingWindowConversationManager", "SummarizingConversationManager", "FileSessionManager", "S3SessionManager", "AgentCore Memory"],
            m="Conversation + session managers"),
        "edges": dict(
            s="A single agent has no edges: the model decides. When you need a fixed shape, GraphBuilder adds nodes (agents or nested graphs) and edges with condition functions over the shared graph state.",
            a=["GraphBuilder", "add_node", "add_edge(condition=)", "set_entry_point", "GraphState"],
            m="GraphBuilder conditional edges"),
        "lifecycle": dict(
            s="Call the agent directly, await invoke_async, or iterate stream_async for text deltas and tool events. Cancel the task to stop. Multi-agent runs take hard limits: handoffs, iterations, node and total timeouts.",
            a=["agent(prompt)", "invoke_async", "stream_async", "callback_handler", "execution_timeout"],
            m="agent() / invoke_async / stream_async"),
        "errors": dict(
            s="The event loop retries throttled model calls with backoff and lets the conversation manager shrink context on overflow. Hooks such as AfterToolCallEvent observe or rewrite failing tool results; typed exceptions surface the rest.",
            a=["HookProvider", "AfterToolCallEvent", "ContextWindowOverflowException", "MaxTokensReachedException"],
            m="Hooks + typed exceptions"),
        "tools": dict(
            s="@tool turns a typed, documented function into a tool; strands-agents-tools ships calculator, http_request, file_read, shell, use_aws and more. agent.tool.name(...) calls a tool directly, and structured_output returns a Pydantic object.",
            a=["@tool", "strands_tools", "agent.tool.<name>()", "structured_output", "load_tools_from_directory"],
            m="@tool + strands_tools, structured_output"),
        "rag": dict(
            s="The retrieve tool queries an Amazon Bedrock Knowledge Base, so retrieval is a decision the model makes. For custom stores, write a @tool over your vector database and ask for citations in the system prompt.",
            a=["strands_tools.retrieve", "Bedrock Knowledge Bases", "custom vector @tool", "citations"],
            m="retrieve tool + Bedrock KB"),
        "mcp": dict(
            s="MCPClient wraps any MCP transport (stdio, streamable HTTP, SSE). Inside the client context, list_tools_sync returns tools an Agent uses like native ones. AWS publishes MCP servers for its docs and services.",
            a=["MCPClient", "stdio_client", "streamablehttp_client", "list_tools_sync"],
            m="MCPClient"),
        "orchestration": dict(
            s="Four patterns: agents-as-tools (an orchestrator calls specialists), Swarm (agents hand off to each other with shared context), Graph (fixed edges), and Workflow (task dependencies). A2A exposes agents across frameworks.",
            a=["agents-as-tools", "Swarm", "GraphBuilder", "workflow tool", "A2A"],
            m="Agents-as-tools, Swarm, Graph, A2A"),
        "hitl": dict(
            s="A BeforeToolCallEvent hook can pause the agent with an interrupt and wait for a human answer, or cancel the tool call. The handoff_to_user tool lets the model itself ask a person for input.",
            a=["BeforeToolCallEvent", "event.interrupt()", "cancel_tool", "handoff_to_user"],
            m="Hooks + interrupts, handoff_to_user"),
        "guardrails": dict(
            s="Attach an Amazon Bedrock Guardrail to the model for content, topic, PII and grounding policies, with optional redaction of blocked input. Hooks add your own rules on tool calls and model output.",
            a=["guardrail_id / guardrail_version", "guardrail_redact_input", "guardrail_trace", "BeforeToolCallEvent"],
            m="Bedrock Guardrails + hooks"),
        "testing": dict(
            s="Decorated tools stay callable, so test them as functions. Integration-test agents with callback_handler=None and assert on result metrics such as tool calls. Add an eval set scored by an LLM judge for open-ended answers.",
            a=["pytest", "callback_handler=None", "result.metrics", "LLM-as-judge evals"],
            m="pytest + metrics + LLM judge"),
        "auditing": dict(
            s="Strands emits OpenTelemetry traces for each invocation, event-loop cycle, model call and tool call. Send them to X-Ray/CloudWatch, Langfuse or Datadog, and add trace attributes such as session and user ids.",
            a=["StrandsTelemetry", "setup_otlp_exporter", "trace_attributes", "metrics.get_summary()"],
            m="OpenTelemetry built in"),
        "mlops": dict(
            s="Package the agent behind BedrockAgentCoreApp and deploy to AgentCore Runtime for session isolation, identity and observability, or run it in Lambda, Fargate, EKS or EC2. Version prompts and tools in git and gate on evals.",
            a=["BedrockAgentCoreApp", "@app.entrypoint", "agentcore configure / launch", "Lambda / Fargate / EKS"],
            m="AgentCore Runtime, Lambda, containers"),
        "security": dict(
            s="Run under a least-privilege IAM role, keep powerful tools such as shell and use_aws out of production agents, and cache stable prompts. AgentCore Identity handles outbound OAuth; token usage comes from result metrics.",
            a=["IAM task role", "AgentCore Identity", "cache_prompt", "accumulated_usage"],
            m="IAM, AgentCore Identity, caching"),
    },
}
