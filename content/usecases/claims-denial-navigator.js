/* Second built-in use case, canvas only: its modules are generated from the canvas (see assets/js/lab.js).
   Matches the git-bonda108/claims-denial-navigator repo. Turn it into a full pack with the prompt on its canvas page. */
Zone.addUseCase({
  id: "claims-denial-navigator", icon: "🏥", color: "teal",
  vars: {
    name: "Claims Denial Navigator", short: "cdn", slug: "claims-denial-navigator", jiraKey: "CDN",
    tagline: "simpler denied-claims resolution for provider revenue-cycle teams",
    domain: "Healthcare · Revenue Cycle Management",
    input: "remittance advice (835 / EOB text) and payer denial letters",
    erp: "Practice-management / billing system (mocked claims API)", db: "PostgreSQL", tracker: "Jira",
    core: "map CARC/RARC denial codes to root-cause categories, compute appeal deadlines from payer timely-filing rules, and prioritise by recoverable amount × probability",
    outcomes: "AUTO_RESUBMIT, APPEAL, WRITE_OFF_REVIEW, ROUTE_TO_CODER",
  },
  canvas: {
    problem: "Hospitals and clinics lose a meaningful share of revenue to denied insurance claims. Each denial needs someone to read the remittance, find the root cause (eligibility, coding, authorisation, timely filing), check the payer policy, and correct-and-resubmit or appeal before a deadline. Teams are understaffed and deadlines are missed.",
    users: ["Denial analyst: a prioritised worklist with the root cause already identified", "Medical coder: coding-related denials with the suggested correction", "RCM manager: recovery rate, deadlines at risk, write-off approvals", "Compliance officer: PHI handling and an audit trail of every appeal"],
    agents: ["Intake Agent: parse 835/EOB text into typed claim + denial codes", "Root-Cause Agent: classify using CARC/RARC mapping and claim history", "Policy Agent: retrieve the payer policy clause (grounded RAG, cite the source)", "Appeal Agent: draft the appeal letter or corrected claim (never submits)"],
    hitl: ["Every appeal letter before sending", "Write-offs above 1,000 USD", "Any denial needing clinical judgement"],
    risks: ["PHI exposure → mask identifiers before any LLM call", "Hallucinated policy citations → retrieval-only citations with source IDs", "Missed appeal deadline → deterministic deadline engine + alerts", "Prompt injection in payer letters → input guardrail"],
    kpis: ["Denials recovered (USD)", "Days to resolution", "Appeals filed before deadline (%)", "Cost per denial worked"],
  },
  rubric: { value: 5, integration: 4, agentic: 5, deterministic: 4, risk: 5, hitl: 5, data: 3, feasible: 3 },
  backlog: [
    { key: "CDN-E1", title: "Foundations: claims mock, denial-code engine, API", sprint: "Sprint 1", stories: [
      { key: "CDN-2", title: "Mock claims system", story: "As a developer, I want a mock billing API with claims and remittances so that we can build without PHI.", ac: "Given claim C-1001, when I GET /claims/C-1001, then I receive synthetic data only", pts: 3 },
      { key: "CDN-3", title: "Deadline engine", story: "As an RCM manager, I want appeal deadlines computed per payer so that none are missed.", ac: "Given payer P-01 with a 90-day window and a denial on 2026-09-01, when computed, then the deadline is 2026-11-30", pts: 3 },
    ] },
  ],
});
