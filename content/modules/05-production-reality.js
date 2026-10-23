Zone.addModule({
  id: "production-reality", num: "05", order: 5, phase: "foundations", stage: "Concepts",
  icon: "🏗️", color: "coral", duration: "30 min",
  title: "Why AI apps fail in production, and the 9 layers that stop it", short: "Why AI apps fail",
  subtitle: "Demos are easy. Production is a system. Here's the system.",
  goals: ["Name the top failure modes", "Map each to one of the 9 layers", "Use the readiness checklist"],
  cards: [
    {
      type: "embed", title: "Listen first",
      lead: "Play this in class (or as pre-reading), then we map what you heard onto the 9-layer stack.",
      html: `<iframe style="border-radius:14px;margin-top:10px" src="https://open.spotify.com/embed/episode/00MW0UssGL7Y6zHdBz2QIa?utm_source=generator" width="100%" height="232" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Podcast episode"></iframe>
        <p style="font-size:.82rem;color:var(--ink-3)">Not loading? <a href="https://open.spotify.com/episode/00MW0UssGL7Y6zHdBz2QIa" target="_blank" rel="noopener">Open the episode on Spotify</a>.</p>`,
      points: ["While listening, note each failure you hear and guess which layer it belongs to"],
    },
    {
      type: "flips", title: "Ten ways AI apps die after the demo",
      lead: "Each card: the failure, and the layer that should have caught it.",
      items: [
        { icon: "🎭", front: "Demo-ware", sub: "worked on 5 examples", back: "No golden set, no regression gate. The first prompt tweak breaks yesterday's cases. **L9 Observability & Evaluation.**" },
        { icon: "🤖", front: "Over-agentification", sub: "an agent where a workflow would do", back: "Different path every run, unpredictable cost, impossible to audit. **L3 Orchestration.**" },
        { icon: "🧮", front: "LLM does the maths", sub: "and the policy", back: "Plausible but wrong totals; \"approved\" because the model felt confident. **L8 Guardrails & Governance**: deterministic policy." },
        { icon: "🧠", front: "Context rot", sub: "it forgot the rule", back: "Long sessions, summaries drop facts, tool bloat. **L6 Context & Memory.**" },
        { icon: "💉", front: "Prompt injection", sub: "the invoice gave orders", back: "Untrusted text treated as instructions. **L8** input guardrails + least-privilege tools." },
        { icon: "🔌", front: "Brittle integrations", sub: "ERP timeout = outage", back: "No timeouts, retries or fallbacks; raw 80-field payloads. **L5 Tools & Integration.**" },
        { icon: "💸", front: "Cost blow-out", sub: "found on the invoice", back: "Unbounded loops, no token metrics, the biggest model for everything. **L4** model tiering + **L9** cost telemetry." },
        { icon: "🙈", front: "Black-box decisions", sub: "nobody can say why", back: "No reason codes, no evidence, no trace, so users and auditors reject it. **L1 Experience** + **L7 Data** (audit)." },
        { icon: "🔁", front: "Not idempotent", sub: "paid twice", back: "Retries and redelivery duplicate side effects. **L2 API & Gateway.**" },
        { icon: "🏚️", front: "No owner, no runbook", sub: "Shadow AI", back: "Nobody on call, no rollback, no policy. **L8 Governance** + **L9 Ops.**" },
      ],
    },
    { type: "layers", title: "The 9-layer production stack", lead: "Click any layer: how it fails, the control, and where it lives in **{{app.name}}**. You'll build every layer in this course." },
    {
      type: "compare", title: "Demo vs production: what actually changes",
      cols: [
        { title: "Demo", icon: "🎬", color: "amber", points: ["Happy-path inputs", "One user, one request", "\"Looks right\"", "API key in a notebook", "Runs on my laptop", "Prints to console"] },
        { title: "Production", icon: "🏭", color: "teal", points: ["Adversarial, messy, multilingual inputs", "Concurrency, retries, duplicates, rate limits", "Golden-set evals + regression gates in CI", "Managed identity, secret store, least privilege", "Containers, revisions, rollback", "Traces, metrics, alerts, cost per transaction, a runbook"] },
      ],
    },
    {
      type: "checklist", title: "Production-readiness checklist (we tick these off by the end)",
      groups: [
        { title: "Correctness", items: ["Deterministic core unit-tested (≥ 90% coverage)", "Golden-set eval passes 8/8 in CI", "Typed outputs at every agent boundary"] },
        { title: "Safety", items: ["Input guardrail for prompt injection", "LLM can't set the decision", "Human approval for high-value / risky cases", "No secrets in code, prompts or logs"] },
        { title: "Reliability", items: ["Timeouts + retries on ERP/Jira calls", "Duplicate (idempotency) check", "Offline fallback if the LLM provider is down", "Health and readiness probes"] },
        { title: "Operability", items: ["Traces per agent step", "Token + cost per invoice tracked", "Alerts on 5xx and guardrail spikes", "Runbook + rollback rehearsed"] },
      ],
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "Users say \"the AI rejected a valid invoice and nobody can tell us why\". Which layers failed?",
      options: ["Only L4 (the model)", "L1 Experience and L7 Data/audit (no evidence shown, no trace), and likely L9 (no eval caught it)", "L2 API & Gateway", "None: that's normal for AI"],
      answer: 1,
      why: "The model may have been fine. The **system** gave no reason codes or evidence (L1), kept no audit trail (L7), and had no eval that would have caught the regression (L9).",
    },
  ],
});
