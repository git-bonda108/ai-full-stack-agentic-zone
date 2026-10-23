Zone.addModule({
  id: "agents", num: "01", order: 1, phase: "foundations", stage: "Concepts",
  icon: "🔁", color: "brand", duration: "40 min",
  title: "Agents: from next word to ReAct", short: "Agents & ReAct",
  subtitle: "Reason, plan, act, observe, verify, and when NOT to use an agent",
  goals: ["Explain the ReAct loop", "Spot a ReAct trace in Claude Code", "Choose workflow vs agent"],
  cards: [
    {
      type: "compare", title: "A model answers. An agent acts.",
      lead: "Same model underneath. The difference is the **loop** and the **tools** around it.",
      cols: [
        { title: "Single LLM call", icon: "💬", color: "sky", points: ["Input → output, once", "Knows only what's in the prompt", "Can't check anything", "Great for: summarise, classify, extract"], verdict: "Stateless function" },
        { title: "Agent", icon: "🤖", color: "brand", points: ["**Model + instructions + tools + loop + memory + guardrails**", "Calls tools (ERP, DB, Jira) and reads the results", "Decides the next step from what it observed", "Stops when the goal is met, or at a step limit"], verdict: "Goal-seeking program" },
      ],
      callouts: [{ kind: "java", title: "In Java/React terms", text: "A tool is a typed method the model may call. The agent loop is a `while (!done)` controller around the model. The SDK generates the JSON schema from your function signature, much like Spring builds an OpenAPI spec from annotations." }],
    },
    {
      type: "flow", title: "The ReAct loop, with plan and verify",
      lead: "**ReAct = Reason + Act** (Yao et al., 2022). Production agents add an explicit **plan** up front and a **verify** step before answering.",
      nodes: [
        { e: "🧠", b: "Reason", s: "What do I know? What's missing?" }, { e: "🗺️", b: "Plan", s: "Steps + which tools" },
        { e: "🔧", b: "Act", s: "Call one tool" }, { e: "👀", b: "Observe", s: "Read the result" },
        { e: "✅", b: "Verify", s: "Is the answer backed by evidence?" }, { e: "🔁", b: "Repeat / answer", s: "Loop or stop" },
      ],
      points: [
        "**Observe** is what makes it an agent: the next thought depends on real data, not on the model's memory",
        "**Verify** catches the classic failure: a confident answer that no tool result supports",
        "Always cap the loop: `max_turns`, timeouts and a budget. Unbounded loops are a cost incident waiting to happen",
      ],
    },
    {
      type: "concept", title: "A ReAct trace for {{app.name}}",
      lead: "Read it out loud. Every **Observation** is data from a system of record, and the final answer cites it.",
      side: { code: "GOAL  Is invoice INV-B-002 payable?\n\nTHOUGHT  I need the agreed prices. Look up the PO.\nACTION   get_purchase_order(\"PO-1001\")\nOBSERVE  GLV-01 qty 100 @ 4.50 · HLM-02 qty 50 @ 22.00\n\nTHOUGHT  Check what was actually received.\nACTION   get_goods_receipts(\"PO-1001\")\nOBSERVE  GLV-01 100 · HLM-02 50   (quantities match)\n\nTHOUGHT  Gloves billed at 4.80. Compute the variance.\nACTION   price_variance_pct(billed=4.80, agreed=4.50)\nOBSERVE  6.67\n\nVERIFY   6.67% > 2.0% tolerance, backed by the tool result ✓\nANSWER   ROUTE_TO_HUMAN · PRICE_VARIANCE on GLV-01 (+6.67%)", kind: "file", lang: "text", label: "react-trace.txt" },
      points: [
        "The model **chose** which tool to call next; nobody hard-coded the order",
        "The maths came from a **tool** (`price_variance_pct`), not from the model's head",
        "In our app the final decision is made by deterministic code; the agent gathers and explains the evidence",
      ],
    },
    {
      type: "lab", title: "Lab: run a ReAct loop in 60 lines of Python", time: "8 min",
      lead: "No API key needed: the \"model\" is scripted so you can read the loop itself. Swap in a real LLM call and nothing else changes.",
      steps: [
        { text: "Open the starter kit in VS Code (set up in Module 07, or clone the repo now) and run:", cmd: "python labs/lab02_react_loop.py", expect: "Four THOUGHT / ACTION / OBSERVE blocks, a VERIFY line, then `ANSWER: Route to human: PRICE_VARIANCE on GLV-01 (+6.67%)`." },
        { text: "Ask Claude to explain it. Python-from-Java translation is a great first use of Claude:", prompt: "Explain labs/lab02_react_loop.py to me as a Java developer. Map each part to the ReAct loop (reason, plan, act, observe, verify) and point to the exact line where the loop is capped. Don't change the file." },
        { text: "Break it on purpose: ask Claude to change the billed price to 4.55 and re-run. What does VERIFY do now?", prompt: "In labs/lab02_react_loop.py change the billed glove price from 4.80 to 4.55, run the script, and tell me what the verify step did and why." },
      ],
      checkpoint: "You can point at the line where the loop stops, and explain why `verify()` checks the observations instead of trusting the model's final text.",
    },
    {
      type: "lab", title: "Lab: Claude Code is a ReAct agent. Watch it.", time: "7 min",
      lead: "Its tools are `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash`, plus any MCP tools. Every tool call you see in the chat panel is an **Act**, and its output is the **Observation**.",
      steps: [
        { text: "Paste this into the Claude Code panel:", prompt: "Before each tool call, write one line starting with THOUGHT: explaining why you are calling it. After each result write OBSERVED: with what you learned.\n\nTask: find every Python file under labs/, tell me which one has the most functions, and verify your count by actually reading the file rather than guessing." },
        { text: "Watch the panel: Glob → Read → Read… Notice that it **re-plans** after each observation." },
        { text: "Now give it an under-specified task and see the loop wander:", prompt: "Make the labs better." , expect: "Vague goals produce long, expensive loops. Good prompts name the goal, the files, the constraints and \"done\"." },
      ],
      callouts: [{ kind: "tip", title: "Prompt shape that works on Haiku", text: "**Goal** (one sentence) · **Context** (files to read) · **Constraints** (what not to touch) · **Done when** (test passes / output shown)." }],
    },
    {
      type: "compare", title: "Workflow, agent or hybrid? Decide before you build.",
      lead: "Anthropic's guidance in *Building effective agents*: use the simplest thing that works. Most production systems are **workflows with agentic islands**.",
      cols: [
        { title: "Workflow / pipeline", icon: "🛤️", color: "teal", points: ["Steps fixed in code; LLM fills in the blanks", "Predictable, testable, cheap, easy to audit", "Use when the path is known"], verdict: "Default choice" },
        { title: "Autonomous agent", icon: "🧭", color: "coral", points: ["Model chooses the path and the tools", "Flexible, but variable cost and behaviour", "Use when the steps can't be known up front"], verdict: "Use sparingly" },
        { title: "Hybrid ← {{app.name}}", icon: "🧩", color: "brand", points: ["Code orchestrates: extract → [match ∥ risk] → decide → resolve", "Agents handle the unstructured parts: reading invoices, picking lookups, writing explanations", "Deterministic code makes the decision"], verdict: "What we build" },
      ],
    },
    {
      type: "flips", title: "Five workflow patterns (plus the agent)",
      lead: "From *Building effective agents* (Anthropic). Each one shows up somewhere in our app.",
      items: [
        { icon: "⛓️", front: "Prompt chaining", sub: "step 1 output → step 2 input", back: "Fixed sequence with checks between steps. **Ours:** extract → validate schema → match." },
        { icon: "🔀", front: "Routing", sub: "classify, then dispatch", back: "A classifier sends input to a specialist. **Ours:** the decision routes to auto-approve, human queue, hold or reject." },
        { icon: "⚡", front: "Parallelization", sub: "sectioning or voting", back: "Independent subtasks at once. **Ours:** Match Agent ∥ Risk Agent with `asyncio.gather`." },
        { icon: "🎼", front: "Orchestrator–workers", sub: "dynamic split", back: "A lead breaks down the task and delegates. **Ours:** the pipeline orchestrates the specialist agents. **Claude Code:** the main agent spawning subagents." },
        { icon: "🔍", front: "Evaluator–optimizer", sub: "generate, critique, refine", back: "One model drafts, another grades against criteria. **Ours:** the output guardrail checks the Resolution Agent's draft." },
        { icon: "🤖", front: "Autonomous agent", sub: "open-ended loop", back: "The model plans and acts until done. **Claude Code itself** works this way, which is why we fence it with hooks and permissions." },
      ],
    },
    {
      type: "file", title: "The OpenAI Agents SDK in one file", fileRef: "starter-kit/labs/lab03_agents_sdk_hello.py",
      lead: "You met the constructs in session 2. Here they are in code: `@function_tool`, `Agent(output_type=…)`, `agent.as_tool()`, `@input_guardrail`, `Runner.run()`. It runs with an OpenAI key, or with Claude via LiteLLM.",
      points: [
        "Install: `pip install \"openai-agents[litellm]\"` · Run: `python labs/lab03_agents_sdk_hello.py`",
        "Decorators (`@function_tool`) work like Java annotations: they wrap the function and register metadata",
        "`async def` + `await` ≈ returning a `Promise` / `CompletableFuture`; `asyncio.run(main())` is the event loop entry point",
      ],
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "The Match Agent finds the PO and GR. Who should calculate whether a 6.67% price variance breaks the 2% tolerance?",
      options: ["The agent, in its reasoning", "A deterministic Python function the agent (or pipeline) calls", "A second LLM acting as a judge", "The human, every time"],
      answer: 1,
      why: "Maths and policy belong in tested code: same input, same answer, every time, and auditable. The agent's job is to gather the inputs and explain the result. **The LLM proposes, deterministic code disposes.**",
    },
  ],
});
