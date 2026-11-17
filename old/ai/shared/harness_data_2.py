"""Roadmap content: Amazon Bedrock, Azure AI Foundry. Same module shape as harness_data_1."""

BEDROCK = {
    "slug": "aws-bedrock",
    "name": "AWS Bedrock",
    "title": "Amazon Bedrock Agents, Flows & AgentCore",
    "badge": "AWS Bedrock AI",
    "accent": "#f59e0b",
    "logo": "aws.svg",
    "lede": "Bedrock is AWS's managed home for foundation models and agents: the Converse API for any model, Bedrock Agents with action groups and Knowledge Bases, Flows for visual pipelines, Guardrails for policy, and AgentCore to run any framework at scale inside your AWS account.",
    "glance": [
        ("Control model", "Managed ReAct orchestration + Flows"),
        ("State lives in", "Session attributes + agent memory"),
        ("Language", "Any AWS SDK (boto3 shown)"),
        ("Ships to", "Fully managed in your AWS account"),
    ],
    "modules": {
        "setup": dict(
            s="Enable model access in the console, then call bedrock-runtime. The Converse API is one request shape for every model (Anthropic, Amazon Nova, Meta, Mistral and more). Cross-region inference profiles add capacity; adaptive retries handle throttling.",
            a=["bedrock-runtime", "converse", "inference profiles", "botocore Config(retries=)"],
            m="Converse API, inference profiles"),
        "anatomy": dict(
            s="Three ways to build: a Converse tool loop you own; a Bedrock Agent (instructions, model, action groups, Knowledge Bases, guardrail) that AWS orchestrates; or your own framework hosted on AgentCore Runtime. Agents are invoked through aliases.",
            a=["bedrock-agent", "bedrock-agent-runtime", "invoke_agent", "agent alias", "AgentCore Runtime"],
            m="Managed Agents + AgentCore"),
        "state": dict(
            s="sessionId groups turns. sessionAttributes travel to every action-group Lambda (tenant, role, ids); promptSessionAttributes are injected into the orchestration prompt. With Converse, you own the messages list.",
            a=["sessionId", "sessionAttributes", "promptSessionAttributes", "messages[] (Converse)"],
            m="sessionAttributes / prompt attributes"),
        "memory": dict(
            s="Agent memory summarises past sessions per memoryId and feeds them into new ones. AgentCore Memory is framework-agnostic: short-term events plus long-term strategies (semantic facts, summaries, user preferences).",
            a=["memoryConfiguration", "SESSION_SUMMARY", "memoryId", "AgentCore Memory strategies"],
            m="Agent memory, AgentCore Memory"),
        "edges": dict(
            s="Bedrock Agents decide the next step themselves. When you need explicit edges, Bedrock Flows wire nodes (prompt, condition, iterator, collector, Lambda, Knowledge Base, agent) into a versioned graph. Step Functions covers longer business processes.",
            a=["Bedrock Flows", "condition node", "iterator / collector", "invoke_flow", "Step Functions"],
            m="Bedrock Flows (condition nodes)"),
        "lifecycle": dict(
            s="converse_stream streams deltas and ends with a stopReason (end_turn, tool_use, max_tokens, stop_sequence, guardrail_intervened). invoke_agent streams chunks and traces; endSession=True closes a session.",
            a=["converse_stream", "stopReason", "stopSequences", "endSession", "invoke_agent streaming"],
            m="converse_stream, endSession"),
        "errors": dict(
            s="Throttling, model timeouts and service errors arrive as ClientError codes; adaptive retry mode backs off automatically. Check stopReason for max_tokens or guardrail_intervened instead of assuming success.",
            a=["ClientError", "ThrottlingException", "ModelTimeoutException", "retries mode=adaptive"],
            m="ClientError codes + adaptive retries"),
        "tools": dict(
            s="With Converse, declare toolSpec JSON schemas in toolConfig and answer toolUse blocks with toolResult. With Agents, action groups describe functions by OpenAPI schema or function details and run them in Lambda.",
            a=["toolConfig / toolSpec", "toolUse / toolResult", "action groups", "OpenAPI schema", "Lambda executor"],
            m="toolConfig, action groups"),
        "rag": dict(
            s="Knowledge Bases ingest S3 and other sources, chunk and embed them into a vector store (OpenSearch Serverless, Aurora pgvector, S3 Vectors and others), and expose retrieve and retrieve_and_generate with metadata filters, reranking and citations.",
            a=["Knowledge Bases", "retrieve", "retrieve_and_generate", "metadata filters", "chunking strategies"],
            m="Knowledge Bases"),
        "mcp": dict(
            s="AgentCore Gateway turns Lambda functions, OpenAPI and Smithy APIs into one MCP endpoint with inbound OAuth and outbound credentials. AgentCore Runtime can host MCP servers, and AWS publishes open-source MCP servers for its services.",
            a=["AgentCore Gateway", "MCP targets (Lambda / OpenAPI)", "AgentCore Runtime MCP hosting", "awslabs MCP servers"],
            m="AgentCore Gateway"),
        "orchestration": dict(
            s="Multi-agent collaboration makes one agent a supervisor that plans and delegates to collaborator agents, or routes directly in SUPERVISOR_ROUTER mode. Flows and Step Functions orchestrate deterministic pipelines around agents.",
            a=["agentCollaboration=SUPERVISOR", "SUPERVISOR_ROUTER", "associate_agent_collaborator", "Flows", "Step Functions"],
            m="Supervisor + collaborator agents"),
        "hitl": dict(
            s="Return of control hands the planned action back to your application instead of calling Lambda, so a person can approve it first. Per-function requireConfirmation adds a built-in confirm step. Step Functions waitForTaskToken pauses long workflows.",
            a=["RETURN_CONTROL", "returnControlInvocationResults", "requireConfirmation", "waitForTaskToken"],
            m="Return of control, confirmation"),
        "guardrails": dict(
            s="Bedrock Guardrails apply content filters, denied topics, word filters, PII detection and masking, contextual grounding checks and Automated Reasoning checks. Attach them to Converse, Agents and Knowledge Bases, or call ApplyGuardrail on any text.",
            a=["create_guardrail", "guardrailConfig", "apply_guardrail", "contextual grounding", "Automated Reasoning"],
            m="Bedrock Guardrails"),
        "testing": dict(
            s="Test drafts through the TSTALIASID alias with enableTrace=True and assert on the orchestration trace. Bedrock Evaluations run LLM-as-judge jobs for models, Knowledge Bases and agents; AgentCore adds online evaluation.",
            a=["TSTALIASID", "enableTrace", "Bedrock Evaluations", "RAG evaluation", "LLM-as-judge"],
            m="Test alias, traces, Evaluations"),
        "auditing": dict(
            s="Model invocation logging writes full requests and responses to CloudWatch Logs or S3. CloudTrail records every API call and who made it. Agent traces show each reasoning step, and AgentCore Observability sends OpenTelemetry spans to CloudWatch.",
            a=["put_model_invocation_logging_configuration", "CloudTrail", "agent traces", "AgentCore Observability"],
            m="Invocation logs, CloudTrail, traces"),
        "mlops": dict(
            s="prepare_agent builds the draft; versions are immutable and aliases point at them, which gives blue/green releases and rollback. Define agents, Knowledge Bases, Guardrails and Flows in CloudFormation, CDK or Terraform. Prompt Management versions prompts.",
            a=["prepare_agent", "create_agent_alias", "CloudFormation / CDK", "Prompt Management", "custom models"],
            m="Versions + aliases, IaC"),
        "security": dict(
            s="Use least-privilege IAM per agent role, VPC endpoints (PrivateLink) and KMS keys. Data is not used to train base models. Control cost with prompt caching, batch inference, Intelligent Prompt Routing and Provisioned Throughput for steady load.",
            a=["IAM", "PrivateLink", "KMS", "prompt caching", "batch inference"],
            m="IAM, PrivateLink, KMS"),
    },
}

FOUNDRY = {
    "slug": "azure-foundry",
    "name": "Azure Foundry",
    "title": "Azure AI Foundry Agent Service & Evaluations",
    "badge": "Azure Foundry AI",
    "accent": "#0ea5e9",
    "logo": "azure.svg",
    "lede": "Azure AI Foundry brings models, agents, tools, safety and evaluation into one Azure project: the Agent Service runs threads and tool calls server-side, Microsoft Agent Framework adds workflows, and Content Safety, evaluators and Application Insights cover production.",
    "glance": [
        ("Control model", "Server-side runs + Agent Framework workflows"),
        ("State lives in", "Threads (bring your own Cosmos DB)"),
        ("Language", "Python, C#, JavaScript, Java"),
        ("Ships to", "Foundry Agent Service in your subscription"),
    ],
    "modules": {
        "setup": dict(
            s="Create a Foundry resource and project, deploy a model (Azure OpenAI, Claude, Llama, Mistral and others) and connect with AIProjectClient using Entra ID through DefaultAzureCredential, with no keys in code.",
            a=["AIProjectClient", "DefaultAzureCredential", "project endpoint", "model deployment"],
            m="AIProjectClient + Entra ID"),
        "anatomy": dict(
            s="An agent is a stored definition (model deployment, instructions, tools). Conversations live in threads of messages; a run executes the agent on a thread and moves through statuses until it completes.",
            a=["create_agent", "threads", "messages", "runs", "create_and_process"],
            m="Agent / thread / run"),
        "state": dict(
            s="Threads hold conversation state server-side, with metadata for your own keys and attachments for files. Each run has a status, usage and last_error. In Agent Framework workflows, state flows between executors as typed messages.",
            a=["thread metadata", "message attachments", "run.status", "run.usage", "workflow messages"],
            m="Server-side threads + metadata"),
        "memory": dict(
            s="Threads persist until deleted, so a conversation can resume days later. The Standard setup stores threads in your own Cosmos DB, files in your Storage account and vectors in your AI Search. Truncation strategies keep long threads in budget.",
            a=["threads.get", "truncation_strategy", "BYO Cosmos DB", "Agent Framework memory"],
            m="Persistent threads (BYO storage)"),
        "edges": dict(
            s="A single agent plans its own steps. For explicit control flow, Microsoft Agent Framework workflows connect executors with edges, conditional edges, fan-out and fan-in, and checkpoint so long workflows can resume.",
            a=["WorkflowBuilder", "add_edge(condition=)", "add_fan_out_edges", "add_fan_in_edges", "checkpoints"],
            m="Agent Framework workflows"),
        "lifecycle": dict(
            s="Create a run and poll, use create_and_process to block until done, or stream events. Runs go queued, in_progress, requires_action, then completed, failed, cancelled or expired. runs.cancel stops one; max_completion_tokens caps it.",
            a=["runs.create", "runs.get", "runs.stream", "runs.cancel", "max_completion_tokens"],
            m="Runs: create / stream / cancel"),
        "errors": dict(
            s="HTTP errors arrive as HttpResponseError (429 means the deployment's tokens-per-minute quota). Failed runs carry last_error. azure-core retries transient failures; add your own backoff for quota and re-run from the thread.",
            a=["HttpResponseError", "run.last_error", "429 / TPM quota", "azure-core retry policy"],
            m="HttpResponseError, run.last_error"),
        "tools": dict(
            s="FunctionTool wraps Python functions (docstrings describe parameters); enable_auto_function_calls runs them for you. Built-ins include Code Interpreter, File Search, Bing grounding, OpenAPI, Azure Functions and Logic Apps. response_format gives JSON schema output.",
            a=["FunctionTool", "ToolSet", "enable_auto_function_calls", "CodeInterpreterTool", "OpenApiTool"],
            m="FunctionTool, ToolSet, built-ins"),
        "rag": dict(
            s="File Search builds a managed vector store from uploaded files. The Azure AI Search tool queries your existing index with vector, semantic or hybrid search. Bing grounding adds fresh web results with citations.",
            a=["FileSearchTool", "vector_stores", "AzureAISearchTool", "hybrid search", "Bing grounding"],
            m="File Search, Azure AI Search"),
        "mcp": dict(
            s="McpTool connects an agent to a remote MCP server by label and URL, with an allow-list of tools and an approval mode. Runs pause in requires_action when an MCP call needs approval.",
            a=["McpTool", "server_label / server_url", "allowed_tools", "set_approval_mode"],
            m="McpTool with approvals"),
        "orchestration": dict(
            s="Connected agents let a main agent call specialist agents as tools without custom routing code. Agent Framework adds sequential, concurrent, handoff, group-chat and Magentic orchestration patterns.",
            a=["ConnectedAgentTool", "sequential / concurrent", "handoff", "group chat", "Magentic"],
            m="Connected agents, orchestrations"),
        "hitl": dict(
            s="A run stops in requires_action whenever it needs something from you: tool outputs for function calls or approvals for MCP calls. Your code decides, submits, and the run continues. Agent Framework workflows can request human input mid-flow.",
            a=["requires_action", "SubmitToolApprovalAction", "ToolApproval", "submit_tool_outputs"],
            m="requires_action approvals"),
        "guardrails": dict(
            s="Every deployment has content filters (hate, sexual, violence, self-harm) with configurable thresholds, plus Prompt Shields for jailbreaks and indirect prompt injection, protected-material detection and groundedness detection. Content Safety APIs screen any text.",
            a=["content filters", "Prompt Shields", "groundedness detection", "ContentSafetyClient", "blocklists"],
            m="Content filters, Prompt Shields"),
        "testing": dict(
            s="azure-ai-evaluation scores datasets with quality evaluators (groundedness, relevance), agent evaluators (intent resolution, tool-call accuracy, task adherence) and safety evaluators. The AI Red Teaming Agent probes for attacks; results show in the portal.",
            a=["evaluate()", "GroundednessEvaluator", "IntentResolutionEvaluator", "ToolCallAccuracyEvaluator", "AI Red Teaming Agent"],
            m="azure-ai-evaluation, red teaming"),
        "auditing": dict(
            s="Tracing uses OpenTelemetry into Application Insights: runs, tool calls and token counts become spans viewable in the Foundry portal. Azure Monitor, diagnostic logs and Azure Policy cover the platform side.",
            a=["configure_azure_monitor", "AIAgentsInstrumentor", "Application Insights", "Azure Monitor"],
            m="App Insights tracing"),
        "mlops": dict(
            s="GenAIOps: keep agent definitions and prompts in git, run evaluations in GitHub Actions or Azure DevOps, deploy with Bicep or Terraform, and turn on continuous evaluation over production traffic. Fine-tuning and the model router tune cost and quality.",
            a=["GitHub Actions / Azure DevOps", "Bicep / Terraform", "continuous evaluation", "fine-tuning", "model router"],
            m="GenAIOps pipelines + Bicep"),
        "security": dict(
            s="Use Entra ID and managed identities with Azure RBAC, private endpoints and your own VNet, customer-managed keys in Key Vault, and connections that keep secrets out of code. Control cost with quotas, provisioned throughput and per-run token caps.",
            a=["Entra ID / managed identity", "Azure RBAC", "private endpoints", "Key Vault CMK", "PTU / quotas"],
            m="Entra ID, RBAC, private networking"),
    },
}
