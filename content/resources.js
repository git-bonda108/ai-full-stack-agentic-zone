/* Curated resources, vetted 2026-10-23. Method, the full vetting table and what was left out (and why): docs/USE_CASE_RESEARCH.md */
Zone.set("resources", {
  lead: "Only sources we vetted and would use. Official docs and repos first; community lists as **reading**. Never install third-party hooks or MCP servers in the VM without reading every command they run. Vetted 2026-10-23; method and exclusions in `docs/USE_CASE_RESEARCH.md`.",
  groups: [
    {
      title: "Claude Code: skills, subagents, hooks, plugins", icon: "🧰", hint: "official first",
      items: [
        { kind: "Docs", name: "Claude Code docs: Skills", url: "https://code.claude.com/docs/en/skills", desc: "How SKILL.md works, where skills live and how Claude picks one.", verdict: "Use in class" },
        { kind: "Docs", name: "Claude Code docs: Subagents", url: "https://code.claude.com/docs/en/sub-agents", desc: "Defining subagents, their tools and their own context windows.", verdict: "Use in class" },
        { kind: "Docs", name: "Claude Code docs: Hooks", url: "https://code.claude.com/docs/en/hooks", desc: "Every hook event and its JSON contract.", note: "Read the security section: command hooks run with your full user permissions.", verdict: "Use in class" },
        { kind: "Docs", name: "Claude Code docs: Settings, memory, plugins, security", url: "https://code.claude.com/docs/en/settings", desc: "Settings precedence and permissions; see also /memory (CLAUDE.md), /plugins and /security on the same site.", verdict: "Use in class" },
        { kind: "Repo", name: "anthropics/skills", url: "https://github.com/anthropics/skills", desc: "Anthropic's example Agent Skills, the spec and a template.", note: "Many skills Apache-2.0; the document skills (docx, pdf, pptx, xlsx) are source-available, not open source.", verdict: "Use in class" },
        { kind: "Repo", name: "anthropics/claude-code (plugins/)", url: "https://github.com/anthropics/claude-code/tree/main/plugins", desc: "Official plugins: `feature-dev`, `code-review`, `hookify`, `security-guidance` (a PreToolUse hook) and more.", verdict: "Use in class" },
        { kind: "Repo", name: "anthropics/claude-code-action", url: "https://github.com/anthropics/claude-code-action", desc: "Claude Code inside GitHub Actions (MIT). Good demo for PR review in CI.", verdict: "Reading" },
        { kind: "Repo", name: "anthropics/claude-cookbooks", url: "https://github.com/anthropics/claude-cookbooks", desc: "Notebooks for tool use, RAG, evals and agents (MIT).", verdict: "Reading" },
        { kind: "Article", name: "Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", desc: "Workflows vs agents and the five workflow patterns; the course's design vocabulary.", verdict: "Use in class" },
        { kind: "Article", name: "Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", desc: "Context as a finite resource: compaction, note-taking, sub-agents.", verdict: "Use in class" },
        { kind: "Article", name: "Equipping agents for the real world with Agent Skills", url: "https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills", desc: "Why skills use progressive disclosure, and how to write good ones.", verdict: "Reading" },
        { kind: "Community", name: "garrytan/gstack", url: "https://github.com/garrytan/gstack", desc: "Role-based slash-command skills (plan review, QA, ship, retro). Good ideas for a staged workflow.", note: "Read, don't install: setup adds default-on hooks and network calls, and needs Bun + Chromium. Adapt one SKILL.md by hand if you like it.", verdict: "Reading" },
        { kind: "Community", name: "affaan-m/ECC (everything-claude-code)", url: "https://github.com/affaan-m/ECC", desc: "A very large collection of agents, skills and rules; useful to see file structure at scale.", note: "Don't install the plugin or its hooks: 27 minified `node -e` hooks, several on every tool call. Commercial upsell and affiliate links in the README.", verdict: "Reading" },
        { kind: "Community", name: "hesreallyhim/awesome-claude-code", url: "https://github.com/hesreallyhim/awesome-claude-code", desc: "Hand-picked list of Claude Code skills, hooks, commands and tools.", note: "A list, not an audit: vet anything before you run it.", verdict: "Reading" },
        { kind: "Community", name: "wshobson/agents", url: "https://github.com/wshobson/agents", desc: "Large MIT collection of subagents and plugins; cherry-pick single agent files after review.", verdict: "Reading" },
      ],
    },
    {
      title: "MCP: protocol, servers, registry, tools", icon: "🔌", hint: "official servers and the registry, not marketplaces",
      items: [
        { kind: "Docs", name: "Claude Code docs: MCP", url: "https://code.claude.com/docs/en/mcp", desc: "Adding servers, scopes, `.mcp.json`, OAuth and the prompt-injection warning.", verdict: "Use in class" },
        { kind: "Docs", name: "Model Context Protocol docs", url: "https://modelcontextprotocol.io", desc: "The spec, concepts (tools, resources, prompts) and transports.", verdict: "Use in class" },
        { kind: "Docs", name: "MCP security best practices", url: "https://modelcontextprotocol.io/specification/latest/basic/security_best_practices", desc: "Confused deputy, token passthrough, session hijacking: what servers and clients must do.", verdict: "Use in class" },
        { kind: "Repo", name: "modelcontextprotocol/python-sdk", url: "https://github.com/modelcontextprotocol/python-sdk", desc: "The SDK our ERP/OMS/HRIS MCP servers are built with (MIT).", verdict: "Use in class" },
        { kind: "Repo", name: "modelcontextprotocol/servers", url: "https://github.com/modelcontextprotocol/servers", desc: "Reference servers (Filesystem, Fetch, Git, Memory, Time…).", note: "Their README calls them educational examples, not production-ready.", verdict: "Use in class" },
        { kind: "Tool", name: "MCP Inspector", url: "https://github.com/modelcontextprotocol/inspector", desc: "Visual tester for an MCP server: list tools, call them, see the JSON.", verdict: "Use in class" },
        { kind: "Registry", name: "Official MCP Registry", url: "https://registry.modelcontextprotocol.io", desc: "Namespaced, community-driven registry of MCP servers.", note: "Listing is not a security audit: still read the server before you run it.", verdict: "Use in class" },
        { kind: "Server", name: "Atlassian Remote MCP Server (Jira, Confluence)", url: "https://github.com/atlassian/atlassian-mcp-server", desc: "Official remote server over OAuth; what Module 08 uses for the Jira backlog.", note: "Confirm the endpoint URL on the day; usage is rate-limited by plan.", verdict: "Use in class" },
        { kind: "Server", name: "GitHub MCP Server", url: "https://github.com/github/github-mcp-server", desc: "GitHub's official server: issues, PRs, Actions, code search (MIT).", verdict: "Use in class" },
        { kind: "Server", name: "Microsoft MCP (Azure MCP Server)", url: "https://github.com/microsoft/mcp", desc: "Microsoft's MCP servers including Azure; the older Azure/azure-mcp repo is archived.", verdict: "Reading" },
      ],
    },
    {
      title: "OpenAI Agents SDK", icon: "🤖", hint: "the SDK the apps are built on",
      items: [
        { kind: "Repo", name: "openai/openai-agents-python", url: "https://github.com/openai/openai-agents-python", desc: "The SDK (MIT). Its `docs/` folder mirrors the docs site if that is blocked in the VM.", verdict: "Use in class" },
        { kind: "Examples", name: "examples/agent_patterns", url: "https://github.com/openai/openai-agents-python/tree/main/examples/agent_patterns", desc: "Routing, agents-as-tools, parallelisation, guardrails, LLM-as-judge: one small file each.", verdict: "Use in class" },
        { kind: "Examples", name: "examples/customer_service", url: "https://github.com/openai/openai-agents-python/tree/main/examples/customer_service", desc: "Triage agent with handoffs to specialists: the shape of Returns Concierge.", verdict: "Use in class" },
        { kind: "Examples", name: "examples/financial_research_agent and research_bot", url: "https://github.com/openai/openai-agents-python/tree/main/examples/financial_research_agent", desc: "Planner → parallel searchers → writer → verifier; structured outputs throughout.", verdict: "Reading" },
        { kind: "Examples", name: "examples/mcp and hosted_mcp", url: "https://github.com/openai/openai-agents-python/tree/main/examples/mcp", desc: "Connecting an Agents SDK agent to MCP servers (stdio, HTTP).", verdict: "Reading" },
        { kind: "Docs", name: "Agents SDK docs: guardrails, handoffs, context, tracing", url: "https://openai.github.io/openai-agents-python/", desc: "The four pages Sprint 2 relies on most.", verdict: "Use in class" },
        { kind: "Guide", name: "OpenAI: A practical guide to building agents", url: "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf", desc: "When to build an agent, single vs multi-agent orchestration, layered guardrails.", verdict: "Reading" },
      ],
    },
    {
      title: "Security & responsible AI", icon: "🛡️", hint: "for Module 14",
      items: [
        { kind: "Standard", name: "OWASP Top 10 for LLM Applications (2025)", url: "https://genai.owasp.org/llm-top-10/", desc: "LLM01 prompt injection to LLM10 unbounded consumption; Module 14 maps the apps to it.", verdict: "Use in class" },
        { kind: "Standard", name: "OWASP Top 10 for Agentic Applications", url: "https://genai.owasp.org/", desc: "Agent goal hijack, tool misuse, identity and privilege abuse and more.", verdict: "Reading" },
        { kind: "Research", name: "Invariant Labs: MCP tool poisoning", url: "https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks", desc: "Hidden instructions in tool descriptions and \"rug pull\" updates: why you vet MCP servers.", verdict: "Reading" },
      ],
    },
    {
      title: "Use-case evidence", icon: "📊", hint: "why these apps; most outcome figures are self-reported by vendors",
      items: [
        { kind: "Research", name: "Anthropic Economic Index", url: "https://www.anthropic.com/economic-index", desc: "How Claude is used at work; the API data is about three-quarters automation.", verdict: "Reading" },
        { kind: "Research", name: "McKinsey: The state of AI", url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai", desc: "Where organisations scale agents; IT service desk and knowledge management lead.", verdict: "Reading" },
        { kind: "Research", name: "Gartner: 40% of agentic AI projects cancelled by 2027", url: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027", desc: "Cost, unclear value and weak risk controls: the reasons this course is built the way it is.", verdict: "Use in class" },
        { kind: "Case", name: "Klarna AI assistant (and its 2025 partial reversal)", url: "https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/", desc: "Customer-service agent at scale; later rebalanced so customers can always reach a person. Evidence for Returns Concierge.", verdict: "Use in class" },
        { kind: "Case", name: "Google Cloud AML AI at HSBC", url: "https://cloud.google.com/blog/topics/financial-services/how-hsbc-fights-money-launderers-with-artificial-intelligence", desc: "ML in production AML monitoring (not an LLM agent). Evidence for FinCrime Triage Desk.", verdict: "Reading" },
        { kind: "Case", name: "IBM AskHR", url: "https://www.ibm.com/case-studies/ibm-askhr", desc: "HR self-service assistant at enterprise scale. Evidence for People Policy Desk.", verdict: "Reading" },
        { kind: "Case", name: "Brex on Claude (expense audit)", url: "https://claude.com/customers/brex", desc: "Expense compliance automation; the runner-up use case in our shortlist.", verdict: "Reading" },
      ],
    },
  ],
  footer: "**Left out on purpose:** agent \"meta-harnesses\" that install many hooks and MCP servers in one command (e.g. ruvnet's claude-flow/ruflo and agentic-flow), unvetted MCP marketplaces, hosted agent SaaS products, and channels or newsletters whose main purpose is promotion. See `docs/USE_CASE_RESEARCH.md` for the reasons.",
});
