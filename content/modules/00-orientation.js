Zone.addModule({
  id: "orientation", num: "00", order: 0, phase: "foundations", stage: "Orientation",
  icon: "🧭", color: "brand", duration: "15 min",
  title: "Where we are, where we're going", short: "Orientation",
  subtitle: "Recap of sessions 1–2, the working method, and the app we'll ship",
  goals: ["Recall next-token prediction", "Know the working method", "See the finish line"],
  cards: [
    {
      type: "flips", title: "Recap: how an LLM picks the next word",
      lead: "Tap each card. If you can explain the back of every card to a colleague, you're ready for agents.",
      items: [
        { icon: "🦒", front: "\"I wrote to the zoo to send me a pet, and they sent me a…\"", sub: "the zoo game", back: "The model scores **every** token in its vocabulary and turns the scores into probabilities: *dog* 0.21, *giraffe* 0.08, *letter* 0.02… It then **samples** one. Text is generated one token at a time." },
        { icon: "🌡️", front: "Temperature", sub: "how adventurous", back: "Divides the scores before softmax. **Low (0–0.3)** = nearly always the top token: extraction, code, classification. **High (0.8+)** = more variety: brainstorming, copy." },
        { icon: "🔝", front: "Top-k", sub: "shortlist by count", back: "Only the *k* most likely tokens stay in the draw. k=1 is greedy decoding." },
        { icon: "🎯", front: "Top-p (nucleus)", sub: "shortlist by probability mass", back: "Keep the smallest set of tokens whose probabilities add up to *p* (e.g. 0.9). Adapts to how confident the model is." },
        { icon: "🪙", front: "Tokens", sub: "the unit of everything", back: "≈ 4 characters of English. Context limits, latency and the bill are all measured in tokens." },
        { icon: "🤖", front: "Model vs agent", sub: "from session 2", back: "A model **answers**. An agent **acts**: it loops, calls tools, observes results and decides the next step towards a goal." },
      ],
    },
    {
      type: "concept", title: "Today's promise: one real app, end to end",
      lead: "We build **{{app.name}}**, {{app.tagline}}, the way a team would in a real engagement, with Claude Code as our pair.",
      side: { flow: [
        { e: "🗂️", b: "Plan", s: "Jira via MCP" }, { e: "📐", b: "Design", s: "diagrams, ADRs" },
        { e: "🛠️", b: "Build", s: "3 sprints" }, { e: "🧪", b: "Test", s: "evals + evidence" },
        { e: "🛡️", b: "Secure", s: "guardrails, RAI" }, { e: "☁️", b: "Deploy", s: "Azure" }, { e: "📈", b: "Observe", s: "App Insights" },
      ] },
      points: [
        "Front end: **React + TypeScript** dashboard with explainable decisions and human approval",
        "Back end: **Python + FastAPI**, multi-agent workflow on the **OpenAI Agents SDK**",
        "Integrations: **ERP** (mocked SAP-style API + MCP server), **PostgreSQL**, **Jira**",
        "Ship: **Docker**, **Azure Container Apps**, **Static Web Apps**, **GitHub Actions** with OIDC",
        "Operate: **OpenTelemetry → Application Insights**, evals as regression gates",
      ],
    },
    {
      type: "flow", title: "The working method: you stay accountable",
      lead: "Claude writes most of the code. **You** own every line that ships. Each studio follows the same six moves:",
      nodes: [
        { e: "📚", b: "Context", s: "CLAUDE.md, spec, facts" }, { e: "🎯", b: "Delegate", s: "one bounded task" },
        { e: "🔍", b: "Inspect", s: "read the diff" }, { e: "✅", b: "Verify", s: "run tests, evals" },
        { e: "🔧", b: "Correct", s: "fix or re-prompt" }, { e: "🧾", b: "Record", s: "ADR, facts, commit" },
      ],
      callouts: [{ kind: "trap", title: "The #1 failure in AI-assisted teams", text: "Accepting output because it *looks* right. \"Claude said the tests pass\" is not evidence. The terminal output is." }],
    },
    {
      type: "table", title: "Our sandbox, and what it means for how we prompt",
      lead: "We're on a VM with **VS Code + the Claude Code extension**, mostly on **Haiku**: fast and cheap, with less headroom than bigger models. Prompt for it accordingly.",
      head: ["Constraint", "So we…"],
      rows: [
        ["Smaller model (Haiku)", "Give **one bounded task per prompt**; name the files; paste the acceptance criteria"],
        ["Limited context budget", "Keep **CLAUDE.md** tight, use **subagents** for exploration, `/compact` with focus instructions"],
        ["Shared VM", "**Hooks** block destructive commands; secrets never go in prompts"],
        ["VS Code extension", "Most slash commands work in the chat box; for CLI-only ones open the terminal and run `claude`"],
        ["No Max plan", "Watch `/usage` (alias `/cost`); prefer **offline mode** for tests so the app's own LLM calls cost nothing"],
      ],
    },
    {
      type: "quiz", title: "Warm-up check",
      q: "You need an agent to extract the invoice number and total from supplier emails. Which setting do you want?",
      options: ["Temperature 1.2, top-p 1.0", "Temperature 0–0.2 with structured (typed) output", "Temperature 0.7 and ask nicely for JSON", "It doesn't matter for extraction"],
      answer: 1,
      why: "Extraction has one right answer, so you want predictable sampling **and** a schema (Pydantic `output_type`) so the result is validated. That is exactly what our Intake Agent does.",
    },
  ],
});
