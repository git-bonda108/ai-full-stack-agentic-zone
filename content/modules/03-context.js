Zone.addModule({
  id: "context", num: "03", order: 3, phase: "foundations", stage: "Concepts",
  icon: "🧩", color: "amber", duration: "50 min",
  title: "Context engineering", short: "Context engineering",
  subtitle: "The context window is a budget: spend it on signal, protect your facts, trim your tools",
  goals: ["Budget a context window", "Use extract-first", "Trim tool output at the wrapper"],
  cards: [
    {
      type: "concept", title: "Everything counts against the window",
      lead: "The **context window** is everything the model can see in one call. Anything outside it is invisible. In agent systems the visible prompt is often a small fraction of the total.",
      side: { table: { head: ["Component", "Typical size"], rows: [
        ["System prompt / CLAUDE.md", "hundreds – thousands"], ["Tool definitions (schemas)", "~100–500 each"],
        ["Conversation history", "grows every turn"], ["Retrieved docs & tool results", "often the biggest share"],
        ["The model's own output", "counts too, and costs more"],
      ] } },
      points: [
        "**Token** ≈ 4 characters of English. Input and output both count against the limit",
        "Exceed the limit → hard truncation, a request error, or quiet degradation",
        "Output tokens are priced higher than input on most tiers. Long reasoning burns output budget",
      ],
    },
    {
      type: "flips", title: "Not all content tokenizes the same",
      items: [
        { icon: "📝", front: "English prose", sub: "≈ 1 token / 4 chars", back: "The baseline everyone quotes." },
        { icon: "💻", front: "Code", sub: "efficient", back: "Common keywords tokenize well, but long identifiers and deep indentation add up." },
        { icon: "🧱", front: "JSON / XML", sub: "punctuation overhead", back: "Braces, quotes and repeated keys are tokens too. Pretty-printed JSON can cost ~40% more than compact." },
        { icon: "🌏", front: "Non-English", sub: "more tokens per word", back: "Many scripts (Hindi, Tamil, Japanese…) use several times more tokens for the same meaning. It matters for multilingual invoices." },
      ],
    },
    {
      type: "lab", title: "Lab: measure it", time: "5 min",
      steps: [
        { text: "Same invoice, five formats:", cmd: "python labs/lab01_tokens.py", expect: "Compact JSON and key:value lines are far cheaper than pretty JSON; the Hindi line costs more per character." },
        { text: "Optional, exact counts:", cmd: "pip install tiktoken && python labs/lab01_tokens.py" },
      ],
    },
    {
      type: "concept", title: "Budget, don't fill",
      lead: "A **context budget** is a deliberate token allocation, enforced in code, so nothing crowds out what matters.",
      side: { table: { head: ["Intake Agent budget (example)", "Tokens"], rows: [
        ["Instructions (stable, cacheable)", "800"], ["Persistent fact block", "300"], ["Invoice text (trimmed)", "1,500"],
        ["Tool schemas (2 tools)", "400"], ["Output headroom (typed JSON)", "600"], ["**Total cap**", "**3,600**"],
      ] } },
      points: [
        "**Lost in the middle**: models attend most to the start and end of the context. Put critical facts there",
        "**Context degradation**: recall and instruction-following decline as the window fills",
        "Set `max_tokens` for output, log tokens per call, and alert on runaway growth",
      ],
    },
    {
      type: "compare", title: "Economics: three cost levers + caching",
      lead: "A 10,000-token system prompt × 1,000 requests/day = **10M input tokens** before any user message.",
      cols: [
        { title: "System prompt size", icon: "📜", color: "amber", points: ["Paid on **every** request", "Audit and remove redundant rules", "Same for CLAUDE.md: keep it short"] },
        { title: "History policy", icon: "🕰️", color: "violet", points: ["Verbatim history grows cost linearly", "Summarise older turns, but **extract facts first**"] },
        { title: "Retrieval precision", icon: "🎯", color: "teal", points: ["Loosely relevant chunks cost money **and** quality", "Fewer, better chunks win"] },
        { title: "Prompt caching", icon: "⚡", color: "green", points: ["Stable prefix computed once, reused", "Cached tokens billed much cheaper; lower time-to-first-token", "Put stable content first, variable content last"] },
      ],
      callouts: [{ kind: "trap", title: "The trap", text: "More context ≠ better answers. Irrelevant tokens actively compete for attention. **Precision beats volume.**" }],
    },
    {
      type: "concept", title: "Why summaries lose facts",
      lead: "When history is summarised (Claude Code's `/compact`, or your app's memory), **fluency is kept and specificity is dropped**. Loss compounds: a summary of a summary keeps only the broad story.",
      side: { table: { head: ["At risk", "Example"], rows: [
        ["Identifiers", "AP-12, PO-1001, INV-B-002"], ["Numeric limits", "threshold 10,000; tolerance 2%"],
        ["Named entities", "V-300 Globex (blocked)"], ["Decisions", "\"we chose Container Apps, not AKS\""],
      ] } },
      points: [
        "**Constraint amnesia**: a rule from early on is silently ignored",
        "**Entity confusion**: a plausible but wrong name or value is substituted",
        "**Decision drift**: a settled choice is reopened as if undecided",
      ],
    },
    {
      type: "flow", title: "The fix: extract first, summarise second",
      nodes: [
        { e: "📥", b: "Raw turn", s: "user + assistant" }, { e: "🔎", b: "1 · Extract", s: "IDs, numbers, entities, decisions → JSON" },
        { e: "📌", b: "2 · Write fact block", s: "append-only or replace-on-conflict" }, { e: "🗜️", b: "3 · Summarise", s: "rolling history" },
        { e: "📤", b: "Next request", s: "fact block in a system block + summary" },
      ],
      points: [
        "**Append-only**: never overwrite; simple, but needs pruning. **Replace-on-conflict**: newest value wins; log the old one",
        "Cap the block, age out stale facts, mark some facts permanent",
        "⚠️ Most common failure: a fact block that **no instruction tells the model to consult**. It becomes an expensive no-op",
      ],
    },
    {
      type: "lab", title: "Lab: extract-first in 40 lines, then in Claude Code", time: "10 min",
      steps: [
        { text: "See the pattern in plain Python:", cmd: "python labs/lab05_fact_block.py", expect: "The summary can't answer \"what is the threshold?\"; the fact block can. The tolerance change shows up in the conflict log." },
        { text: "Our starter kit does the same thing for Claude Code itself. `docs/session-facts.md` is the fact block; CLAUDE.md tells Claude to consult it; the **PreCompact** hook extracts IDs from the transcript before compaction; the **SessionStart** hook re-injects the block after compaction. Try it:", prompt: "We agreed the approval threshold is 10000 EUR and the price tolerance is 2.0%. Story AP-12 covers the tolerance rule. Record these in docs/session-facts.md using replace-on-conflict." },
        { text: "Now compact with focus instructions, then test recall:", prompt: "/compact Keep all identifiers, thresholds and decisions verbatim; drop exploration details." },
        { text: "Ask:", prompt: "What is the approval threshold, the tolerance, and which story covers it? Quote the source you used.", expect: "Claude cites `docs/session-facts.md` (re-injected by the SessionStart hook with `source: compact`)." },
      ],
    },
    {
      type: "compare", title: "Tool-output bloat: filter, summarise or refer",
      lead: "APIs return everything. An SAP-style PO has 40+ fields; the Match Agent needs about 6. Every unused field is a token on **every later call** in the chain, and it pushes signal into the low-attention middle.",
      cols: [
        { title: "Filter", icon: "🧹", color: "teal", points: ["Stable, versioned schema", "Allow-list of fields, deterministic", "Zero model cost, zero latency"], verdict: "Our ERP client" },
        { title: "Summarise", icon: "🗜️", color: "violet", points: ["Unstable or varying schema", "One small, cheap model call distils it", "Adds a call, removes far more tokens"] },
        { title: "Refer", icon: "🔗", color: "sky", points: ["Huge payload the agent may not need", "Store it; pass an ID; fetch on demand", "Most runs never fetch it"] },
      ],
      callouts: [
        { kind: "trap", title: "Common mistake", text: "Trimming at **display** time. The UI looks clean but the model still saw every field. **Trim at the tool wrapper**, before output enters the context." },
        { kind: "tip", title: "Keep a trim audit log", text: "Log which fields you dropped. When a downstream step needs one, you'll know immediately instead of guessing (over-trimming)." },
      ],
    },
    {
      type: "lab", title: "Lab: trim an ERP payload", time: "5 min",
      steps: [
        { text: "Run:", cmd: "python labs/lab06_tool_trimming.py", expect: "raw ≈ 420 tokens → trimmed ≈ 45 tokens (about 90% less), with a list of dropped fields." },
        { text: "Later, in Sprint 1, you'll put exactly this into `backend/app/integrations/erp_client.py`, and the ERP MCP server returns trimmed data too." },
      ],
    },
    {
      type: "table", title: "Context engineering inside Claude Code",
      lead: "Everything above applies to **your coding agent** as much as to the app you build.",
      head: ["Tool", "What it does for your context", "When"],
      rows: [
        ["`/context`", "Shows what fills the window: system, tools, memory files, messages", "Whenever Claude seems to forget things"],
        ["`/compact <focus>`", "Summarises history; your focus text says what to keep", "Between tasks in a long session"],
        ["`/clear`", "Fresh conversation (CLAUDE.md reloads)", "New, unrelated task"],
        ["`CLAUDE.md` (< 200 lines)", "Persistent project memory loaded every session", "Conventions, commands, golden rules"],
        ["`.claude/rules/*.md` with `paths:`", "Rules that load only when matching files are touched", "Frontend-only or backend-only rules"],
        ["Skills", "Only the description sits in context until the skill is needed (progressive disclosure)", "Repeatable procedures"],
        ["Subagents", "Exploration happens in a separate window; only the summary returns", "Searching, reviewing, test runs"],
        ["MCP tool search", "MCP tool definitions are deferred and loaded on demand", "Many connected servers"],
        ["Hooks (SessionStart, PreCompact)", "Inject facts at start, extract facts before compaction", "Always on"],
      ],
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "After a long session Claude starts using a 5% tolerance instead of the 2% you agreed earlier. What's the most robust fix?",
      options: ["Say it again in the chat", "Put tolerance in a persistent fact block that the instructions say to consult, extracted before compaction", "Switch to a bigger model", "Turn off /compact forever"],
      answer: 1,
      why: "This is **constraint amnesia** from summarisation. Repeating it helps until the next compaction. A consulted fact block, written by extract-first, survives every compaction.",
    },
  ],
});
