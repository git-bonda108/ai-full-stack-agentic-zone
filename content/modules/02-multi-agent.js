Zone.addModule({
  id: "multi-agent", num: "02", order: 2, phase: "foundations", stage: "Concepts",
  icon: "🕸️", color: "violet", duration: "45 min",
  title: "Multi-agent systems & orchestration", short: "Multi-agent",
  subtitle: "Sub-agents, handoffs, parallel vs distributed, and how context flows between agents",
  goals: ["Pick handoff vs agent-as-tool", "Explain what a sub-agent keeps", "Run agents in parallel"],
  cards: [
    {
      type: "compare", title: "Why split work across agents, and what it costs",
      cols: [
        { title: "Benefits", icon: "✅", color: "green", points: ["**Focus**: short instructions, few tools, so fewer mistakes", "**Context isolation**: each agent gets a clean window, no noise from others", "**Parallelism**: independent work at the same time", "**Least privilege**: the Risk Agent can't create Jira tickets"] },
        { title: "Costs", icon: "⚠️", color: "coral", points: ["Tokens multiply: every agent re-reads its own context", "Coordination bugs: lost facts, duplicated work, contradictions", "Harder to trace without good observability", "More moving parts to test"] },
      ],
      callouts: [{ kind: "why", title: "Rule of thumb", text: "Add an agent when a task needs **different tools, different instructions or a clean context**. Not because \"multi-agent\" sounds advanced." }],
    },
    {
      type: "diagram", title: "{{app.name}} as orchestrator–workers", mermaidRef: "agents",
      lead: "Code orchestrates. Agents are workers with typed outputs. The policy engine decides.",
      points: ["Solid arrows = calls with typed results · the shared `CaseContext` is visible to tools but **not** sent to the model"],
    },
    {
      type: "compare", title: "Three ways to connect agents",
      lead: "All three exist in the OpenAI Agents SDK. Choose by **who owns the conversation afterwards**.",
      cols: [
        { title: "Handoff", icon: "🤝", color: "amber", points: ["`Agent(handoffs=[billing_agent])`", "Control **transfers**; the new agent replies to the user", "Receives the conversation history (filterable)", "Use for triage → specialist chat flows"], verdict: "\"You take it from here\"" },
        { title: "Agent as tool", icon: "🧰", color: "brand", points: ["`orchestrator.tools=[match.as_tool(...)]`", "Caller **keeps control**; gets the result back like a function return", "Sub-agent sees only the input it's given", "Use when an orchestrator must combine results"], verdict: "\"Do this and report back\"" },
        { title: "Code orchestration", icon: "🧑‍💻", color: "teal", points: ["Plain Python calls `Runner.run()` per agent", "`asyncio.gather` for parallel steps", "Deterministic order, easy to test and trace", "Use when the flow is known (our pipeline)"], verdict: "\"The workflow decides\"" },
      ],
    },
    {
      type: "table", title: "What a sub-agent gets, keeps and returns",
      lead: "Same idea in Claude Code (subagents) and in our app (specialist agents). **A sub-agent starts with a fresh context window.**",
      head: ["", "Claude Code subagent", "Agents SDK specialist in our app"],
      rows: [
        ["Starts with", "Its own system prompt (from `.claude/agents/<name>.md`) + the delegation message + CLAUDE.md. **Not** your chat history", "Its `instructions` + the input the orchestrator passes (e.g. the extracted invoice JSON)"],
        ["Can use", "Only the tools listed in its frontmatter (`tools:`)", "Only the `tools=[...]` it was built with"],
        ["Keeps", "Nothing after it finishes; its working context is thrown away", "Nothing; state lives in `CaseContext` and the DB"],
        ["Returns", "**Only its final message** (a summary) to the parent", "A typed Pydantic object (`MatchFindings`, `RiskReport`)"],
        ["Why it matters", "Exploration noise stays out of your main context", "The orchestrator gets compact, validated facts, not transcripts"],
      ],
    },
    {
      type: "flips", title: "How context is shared between agents",
      lead: "Four patterns. Production systems combine them.",
      items: [
        { icon: "📦", front: "Typed results", sub: "message passing", back: "Each agent returns a schema-validated object. The orchestrator passes only the fields the next agent needs. **Cheapest, safest.**" },
        { icon: "🗃️", front: "Shared local context", sub: "blackboard", back: "A `CaseContext` object (ERP client, DB session, case id) is available to tools via `RunContextWrapper` and is **never sent to the LLM**. Ideal for heavy or sensitive data." },
        { icon: "📌", front: "Persistent fact block", sub: "always-injected facts", back: "A short structured block (IDs, thresholds, decisions) injected into every agent's prompt. Survives summarisation. In Claude Code: `docs/session-facts.md`." },
        { icon: "🔗", front: "Reference indirection", sub: "pass an ID, not a payload", back: "Store the big document (raw invoice, ERP payload) and pass `case_id`. Agents fetch details only if needed." },
      ],
    },
    {
      type: "compare", title: "Parallel vs distributed processing",
      cols: [
        { title: "Parallel (concurrent)", icon: "⚡", color: "brand", points: ["Many tasks in **one process**", "`asyncio.gather(match(), risk())`", "Great for I/O-bound work: LLM calls, HTTP, DB", "Bound it: `asyncio.Semaphore(4)` protects ERP and rate limits"], verdict: "Our batch endpoint" },
        { title: "Distributed", icon: "🌐", color: "teal", points: ["Tasks across **many machines / replicas**", "A queue (Azure Service Bus / Storage Queue) feeds workers", "Container Apps scales replicas on queue length (KEDA)", "Needs **idempotency**: the same invoice can arrive twice"], verdict: "When one process isn't enough" },
      ],
      callouts: [{ kind: "java", title: "Java / JS mapping", text: "`asyncio.gather` ≈ `CompletableFuture.allOf(...)` / `Promise.all([...])`. A distributed worker pool ≈ Kafka/JMS consumers in a consumer group." }],
    },
    {
      type: "lab", title: "Lab: feel the difference", time: "5 min",
      steps: [
        { text: "Run the timing lab:", cmd: "python labs/lab04_parallel_vs_sequential.py", expect: "sequential ≈ 3.0 s, parallel ≈ 1.0 s, batch of 12 with limit 4 ≈ 1.5 s." },
        { text: "Ask Claude why the bounded batch takes 1.5 s and not 0.5 s:", prompt: "In labs/lab04_parallel_vs_sequential.py, explain why the batch of 12 with a semaphore limit of 4 takes about 1.5 seconds. Then tell me what limit you would choose for real ERP calls and why." },
      ],
    },
    {
      type: "lab", title: "Lab: spawn Claude Code subagents in parallel", time: "8 min",
      lead: "Same orchestrator–workers pattern, inside your IDE. The main agent delegates; each subagent explores in its own context and returns a summary.",
      steps: [
        { text: "Ask for parallel exploration:", prompt: "Use three Explore subagents in parallel:\n1) summarise what every file in .claude/hooks/ does,\n2) list every skill in .claude/skills/ with its description,\n3) list the subagents in .claude/agents/ with their tools and model.\nThen combine the three results into one table. Tell me how many tokens of my main context you saved by delegating." },
        { text: "Watch the panel: three subagent runs start, each returns one summary. Run `/context` afterwards: the files they read are **not** in your main context." },
        { text: "If you installed the starter-kit hooks, see the orchestration on disk:", cmd: { bash: "tail -n 6 .ai-trace/ledger.jsonl", ps: "Get-Content .ai-trace/ledger.jsonl -Tail 6" }, expect: "SubagentStart / SubagentStop lines with `agent_type` and a short summary." },
      ],
      checkpoint: "You can say what a subagent receives (its prompt plus the task), what it returns (a final message only), and why that protects the main context.",
    },
    {
      type: "file", title: "What our orchestrator looks like in code", fileRef: "reference-app/backend/app/agents/pipeline.py",
      lead: "The reference implementation. Find: the parallel step, the deterministic decision, and where each agent's typed result is consumed.",
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "A triage agent should hand a disputing vendor over to a *Vendor Relations* agent that then chats with them. Which pattern?",
      options: ["Agent as tool", "Handoff", "asyncio.gather", "A Claude Code subagent"],
      answer: 1,
      why: "The specialist takes over the conversation, so it's a **handoff**. If the triage agent needed the answer back to combine with other results, `as_tool()` would be right.",
    },
  ],
});
