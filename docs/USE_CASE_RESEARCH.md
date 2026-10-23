# Use-case and resource research

Research behind the three new use-case packs (`content/usecases/returns-concierge.js`,
`fincrime-triage.js`, `people-policy-desk.js`) and the **Resources** page
(`content/resources.js`). Checked on **2026-10-23**.

## 1. Method

**Resources**
- I opened every GitHub repo named in the brief. For each I read the README, checked install scripts and hook configuration where they exist, and looked at activity.
- Stars, licence (SPDX) and last push come from the GitHub search API (`api.github.com/search/repositories`) on 2026-10-23. The figures for ruflo, ECC, gstack, anthropics/skills, modelcontextprotocol/servers and openai-agents-python were re-checked independently the same day.
- Star counts move daily. Treat them as a snapshot, not a quality score.
- The sandbox proxy blocked rexxulabs.com, mcpmarket.com, tasklet.ai, modelcontextprotocol.io, openai.github.io, cdn.openai.com, genai.owasp.org, invariantlabs.ai, support.atlassian.com and learn.microsoft.com. Anything known about those sites comes from search-result excerpts and is marked **(excerpt)** or **unverified**.
- code.claude.com doc pages were checked for HTTP 200 and their titles.

**Use cases**
- I searched analyst reports (McKinsey, Gartner, BCG, KPMG, PwC), the Anthropic Economic Index, and vendor and customer stories (Anthropic, OpenAI, Microsoft, Salesforce, ServiceNow, SAP, Google Cloud, IBM).
- Only anthropic.com pages could be opened directly from the sandbox. Every other figure is from a search-result excerpt of the cited URL, tagged **[EXCERPT]**. Figures that appear only in secondary blogs are tagged **[UNVERIFIED]**.
- **Re-open every [EXCERPT] URL before a figure goes on a slide.**
- Most outcome numbers are self-reported by vendors or customers. Few have been measured independently.

**Filter for this programme**
- Recognisable to PwC Data & Analytics clients.
- A thin vertical slice in 3 sprints for developers new to Python.
- A system of record (mockable), a database, Jira and an LLM.
- A deterministic core that is the eval ground truth.
- Real guardrail and human-in-the-loop (HITL) lessons.
- Synthetic data in an hour.
- Excluded on purpose:
  - AP three-way match (P2P Sentinel already covers it).
  - Healthcare claims denial (the owner asked for it to stay out).

**Scoring**
- The eight criteria in `assets/js/lab.js`: value, integration, agentic, deterministic, risk, hitl, data, feasible.
- Each scored 1–5. The scores are judgement informed by the evidence below.

## 2. Vetted resources

### 2.1 The resources the owner was sent

| Resource | What it is | Use in this training | Evidence (as of 2026-10-23) | Risks | Verdict |
|---|---|---|---|---|---|
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) (was claude-flow) | Agent "meta-harness" for Claude Code/Codex: swarms, memory, hooks, plugins, "300+" MCP tools. `npx ruflo@latest init` writes `.claude/`, `CLAUDE.md`, settings, hooks and an MCP server | None hands-on. A case study in hype vs substance and supply-chain risk | 78,673★, MIT, pushed 2026-10-23. Benchmarks link to gists without methodology; the README calls its download badge illustrative | Hooks run `npx` on every event. [Issue #1375](https://github.com/ruvnet/ruflo/issues/1375) reports an obfuscated preinstall script (since removed). [Discussion #1513](https://github.com/ruvnet/ruflo/discussions/1513) is an independent audit claiming most MCP tools are stubs. A critical RCE, CVE-2026-59726 (an unauthenticated MCP bridge on 0.0.0.0, fixed in 3.16.3), is reported by [The Hacker News](https://thehackernews.com/2026/07/ruflo-mcp-flaw-lets-unauthenticated.html) (excerpt, not opened) | **Skip** (cautionary mention at most) |
| [ruvnet/agentic-flow](https://github.com/ruvnet/agentic-flow) | Swap cheaper models into Claude Code / Agent SDK; 66 agents, 213 MCP tools; alpha | None | 827★, pushed 2026-10-11; licence unverified (MIT badge, no LICENSE file seen) | `init` writes `Bash(npx:*)` permission and four hook types that run `npx`. "352× faster" claims have no methodology | **Skip** |
| Other ruvnet repos | RuView (WiFi sensing), RuVector, metaharness, sparc, open-claude-code (a *decompile* of Claude Code) | None | MIT / Apache-2.0 per search API | open-claude-code is a decompile of proprietary software: an IP problem | **Skip** |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) (was everything-claude-code) | Very large collection: about 70 agents, 300 skills, rules and runtime hooks; plugin or `install.sh` into `~/.claude` | Reading only, to see skill/agent file structure at scale. An instructor may hand-copy one small skill after review | 287,063★, MIT, pushed 2026-10-23. `hooks/hooks.json`: 27 minified `node -e` hooks, several matching every tool call | Unauditable inline JS with full user permissions. Paid upsell (ECC Pro), affiliate and tracking links, single maintainer | **Mention as reading**; never install the hooks |
| affaan-m/agentshield | Agent-config / MCP security scanner | Optional instructor reading | 1,319★, MIT | Single maintainer | Skip (optional reading) |
| [garrytan/gstack](https://github.com/garrytan/gstack) | Role-based slash-command skills (office hours, plan review, QA, CSO, ship, retro) | Reading: a staged plan → review → QA → ship workflow; adapt one SKILL.md by hand | 137,364★, MIT, pushed 2026-10-23 | `setup` adds default-on Stop / SessionStart hooks to `~/.claude/settings.json`. Network calls (update check, second-model "outside review", OpenAI design binary). Needs Bun and Chromium | **Mention as reading**; don't install in the VM |
| rexxulabs.com | Unclear. The only trace is a "Rexxu AI" YouTube channel pointing to rexxulabs.com/blogs for "free tools" (excerpt) | None | **Unverified**: site blocked; no company, team or GitHub organisation found | Content/influencer funnel of unknown credibility | **Skip** |
| mcpmarket.com | Commercial MCP-server and skills marketplace ("discover, install, and sell"). Privacy policy names Sitka Labs (excerpt) | Only as a "don't trust a directory blindly" example; use the official MCP Registry instead | **Unverified**: site blocked; no published vetting policy found | Arbitrary authors, tool poisoning, rug-pull updates, `npx`/`uvx` code execution, gameable rankings | **Skip** |
| tasklet.ai | Hosted no-code "AI agent for knowledge work" from the Shortwave team; credit-based plans (excerpt) | At most one line as a market example of buy-vs-build | **Unverified**: site blocked | SaaS holding OAuth access to mail and workspace data; not our stack | **Skip** |

### 2.2 Better sources (official and well maintained)

| Group | Resource | Facts | Verdict |
|---|---|---|---|
| Claude Code | [Skills](https://code.claude.com/docs/en/skills), [Subagents](https://code.claude.com/docs/en/sub-agents), [Hooks](https://code.claude.com/docs/en/hooks), [MCP](https://code.claude.com/docs/en/mcp), [Settings](https://code.claude.com/docs/en/settings), [Memory](https://code.claude.com/docs/en/memory), [Plugins](https://code.claude.com/docs/en/plugins), [Security](https://code.claude.com/docs/en/security) | HTTP 200. The Hooks page warns that command hooks run with your full user permissions; the MCP page warns about prompt injection from servers that fetch external content | Use in class |
| Claude Code | [anthropics/skills](https://github.com/anthropics/skills) | 183,219★, pushed 2026-10-09. Many skills Apache-2.0; document skills source-available | Use in class |
| Claude Code | [anthropics/claude-code `plugins/`](https://github.com/anthropics/claude-code/tree/main/plugins) | 13 official plugins incl. `feature-dev`, `code-review`, `hookify`, `security-guidance` | Use in class |
| Claude Code | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action), [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks) | MIT; 9,621★ / 53,697★ | Reading |
| Claude Code | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) | Anthropic engineering posts (2024-12-19, 2025-09-29, 2025-10-16) | Use in class / reading |
| Curated lists | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 56,327★; custom licence; hand-picked, but not a security audit | Reading |
| Curated lists | [wshobson/agents](https://github.com/wshobson/agents) | 41,603★, MIT; includes plugin hooks and MCP config; sponsor links | Reading; cherry-pick single files after review |
| Curated lists | [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 25,971★, MIT; README says it does not audit security; paid placements | Not listed in the app (inferior to the above) |
| MCP | [modelcontextprotocol.io](https://modelcontextprotocol.io) and [security best practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices) | Site blocked from the sandbox; content confirmed by excerpt | Use in class |
| MCP | [python-sdk](https://github.com/modelcontextprotocol/python-sdk) | 24,652★, MIT | Use in class |
| MCP | [servers](https://github.com/modelcontextprotocol/servers) | 91,516★; mixed licences; README says the servers are educational, not production-ready | Use in class |
| MCP | [Inspector](https://github.com/modelcontextprotocol/inspector), [Official MCP Registry](https://registry.modelcontextprotocol.io) | 11,131★; the registry returns HTTP 200 and is community-driven and namespaced, not audited | Use in class |
| MCP | [Atlassian remote MCP server](https://github.com/atlassian/atlassian-mcp-server), [GitHub MCP server](https://github.com/github/github-mcp-server), [microsoft/mcp](https://github.com/microsoft/mcp) (Azure; the old Azure/azure-mcp is archived) | 1,119★ Apache-2.0 / 33,891★ MIT / 3,797★ MIT. Confirm the Atlassian endpoint on the day | Use in class (Atlassian, GitHub); Azure as reading |
| Agents SDK | [openai/openai-agents-python](https://github.com/openai/openai-agents-python) and its [`examples/`](https://github.com/openai/openai-agents-python/tree/main/examples) | 30,245★, MIT. 17 example folders; most relevant: `agent_patterns`, `customer_service`, `handoffs`, `financial_research_agent`, `research_bot`, `mcp`, `hosted_mcp`. `docs/` mirrors the docs site | Use in class |
| Agents SDK | [A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | Blocked; existence confirmed by several secondary sources | Reading |
| Security | [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/), OWASP Top 10 for Agentic Applications, [Invariant Labs tool poisoning](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) | Sites blocked; content confirmed by excerpt. The mcp-scan repo location is unverified | Use in class / reading |

### 2.3 Promotional links left out, and why

The Resources page shows only resources worth a learner's time. The following were seen and deliberately excluded:
- **ruflo:** Discord, an "enterprise" site, sponsor and RuVector promotions, and the ruOS remote MCP endpoint. These are commercial funnels, and the endpoint is an unvetted remote MCP server.
- **ECC:** affiliate links (e.g. `?aff=ecc`), `utm_` tracking links, the paid ECC Pro upsell and sponsor placements.
- **gstack:** a hiring call and third-party tool links. Mild, but not course material.
- **VoltAgent list:** paid sponsor placements and a "feature your product here" call.
- **wshobson/agents:** the maintainer company's own marketplace entry and sponsor buttons.
- **rexxulabs.com / "Rexxu AI" YouTube, mcpmarket.com, tasklet.ai:** content funnel, commercial marketplace and paid SaaS respectively.
- **WhatsApp channels and newsletters:** none found on the pages that could be opened. The three blocked sites could not be checked. A channel whose main purpose is promotion adds noise without teaching value, so none are listed.

## 3. Where enterprises actually deploy agents (cross-cutting evidence)

**Adoption**
- **McKinsey, The state of AI (Nov 2025)** [EXCERPT] ([source](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)):
  - 23 % of respondents are scaling an agentic AI system somewhere and 39 % are experimenting.
  - No more than 10 % are scaling agents in any single function.
  - Agents are most reported in IT (service desk) and knowledge management (deep research).
- **Anthropic Economic Index, January 2026** [OPENED] ([source](https://www.anthropic.com/research/anthropic-economic-index-january-2026-report)):
  - About three-quarters of first-party API use is automation.
  - Office and administrative support rose to 13 % of API traffic.
  - API task success falls from about 60 % for sub-hour tasks to about 45 % for 5+ hour tasks. This is the argument for thin, well-bounded workflows.
- **Anthropic Economic Index, September 2025** [OPENED] ([source](https://www.anthropic.com/research/anthropic-economic-index-september-2025-report)):
  - 77 % of API transcripts show automation patterns.
  - Complex deployment "might be constrained more by access to information" than by model capability. That supports a context-engineering lesson.
- **LangChain, State of Agent Engineering (late 2025)** [EXCERPT] ([source](https://langchain.com/state-of-agent-engineering)): customer service is the most common primary use case (26.5 %), followed by research and data analysis (24.4 %).
- **PwC AI Agent Survey (May 2025)** [EXCERPT via [Digital Commerce 360](https://www.digitalcommerce360.com/2025/07/09/ai-agents-us-business-pwc-survey-data/)]:
  - 79 % of executives say their companies are adopting agents.
  - Among adopters, 66 % see productivity gains.

**Cautions**
- **Gartner (25 Jun 2025)** [EXCERPT] ([source](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)): over 40 % of agentic AI projects will be cancelled by end-2027 because of cost, unclear value or inadequate risk controls. Gartner also warns of "agent washing".
- **Gartner (5 Mar 2025)** [EXCERPT] ([source](https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290)): agentic AI will autonomously resolve 80 % of *common* customer-service issues by 2029.
- **MIT NANDA, "The GenAI Divide" (2025)** [UNVERIFIED primary; [press coverage](https://virtualizationreview.com/articles/2025/08/19/mit-report-finds-most-ai-business-investments-fail-reveals-genai-divide)]: 95 % of organisations report no measurable P&L return. Methodology is reported inconsistently, so treat it as a small-sample study.
- **Klarna** [EXCERPT] ([source](https://tech.co/news/klarna-reverses-ai-overhaul)): partly reversed its customer-service automation in 2025 so customers can always reach a person.

**Design guidance**
- **Anthropic, Building effective agents** [OPENED] ([source](https://www.anthropic.com/engineering/building-effective-agents)):
  - Names customer support and coding as the most promising agent applications.
  - Notes that "actions such as issuing refunds or updating tickets can be handled programmatically".

Every pack's design follows from these cautions: thin slices, deterministic decisions, measurable evals and humans at the risky points.

## 4. Shortlist with rubric scores

Columns: Val = value, Int = integration, Agt = agentic, Det = deterministic, Risk = guardrail value, HITL, Data = mockable in an hour, Feas = feasible in 3 sprints. Total is out of 40. P2P Sentinel scores 38 for reference.

| # | Candidate | Domain | Val | Int | Agt | Det | Risk | HITL | Data | Feas | **Total** | Evidence (strength) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Returns & refunds customer agent** | Customer ops | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | **37** | Strong: [Klarna](https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/) (2.3M conversations in month one, two-thirds of chats) [EXCERPT] and its [2025 partial reversal](https://tech.co/news/klarna-reverses-ai-overhaul); [Salesforce Help on Agentforce](https://www.salesforce.com/news/stories/agentforce-customer-support-lessons-learned/) (500k+ conversations, "more than 84 %" resolved) [EXCERPT]; [Engine on Agentforce](https://www.salesforce.com/customer-stories/engine/agentic-service/) [EXCERPT]; [Decagon via Stripe](https://stripe.com/customers/decagon) [EXCERPT]; [Gartner customer service prediction](https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290) |
| 2 | **AML transaction-monitoring alert triage (L1)** | Risk & compliance | 5 | 4 | 4 | 5 | 5 | 5 | 4 | 4 | **36** | Medium-strong: [HSBC with Google Cloud AML AI](https://cloud.google.com/blog/topics/financial-services/how-hsbc-fights-money-launderers-with-artificial-intelligence) ("2–4× more suspicious activity", alert volumes down more than 60 %; ML scoring, not an LLM agent) [EXCERPT]; [Federal Reserve working paper on LLM sanctions screening](https://www.fedinprint.org/item/fedgfe/102263/original) (benchmark, not a deployment) [EXCERPT]; vendor L1-triage agents ([overview](https://www.tecla.io/blog/agentic-ai-aml-compliance)) [EXCERPT] |
| 3 | **HR policy helpdesk (RAG) + leave requests** | HR | 5 | 4 | 4 | 4 | 4 | 4 | 5 | 5 | **35** | Strong: [IBM AskHR](https://www.ibm.com/case-studies/ibm-askhr) (94 % containment of common questions, 11.5M interactions in 2024) [EXCERPT]; [Cemex Consult HR on Copilot Studio](https://www.microsoft.com/en/customers/story/26985-cemex-microsoft-copilot-studio) [EXCERPT]; [ServiceNow "Resolve HR case" agentic workflow](https://www.servicenow.com/community/hrsd-articles/resolve-hr-case-nbsp-using-nbsp-agentic-nbsp-ai-nbsp-overview/ta-p/3450076) [EXCERPT] |
| 4 | Expense report audit vs T&E policy | Finance | 5 | 4 | 4 | 5 | 4 | 4 | 5 | 4 | 35 | Strong: [Brex on Claude](https://claude.com/customers/brex) (75 % of expense transactions automated, 94 % compliance) [EXCERPT]; [AppZen / Flight Centre](https://www.appzen.com/hubfs/AppZen-Flight-Centre-Canada-Case-Study.pdf) (vendor) [EXCERPT]; [Ramp](https://www.cpapracticeadvisor.com/2025/07/10/ramp-introduces-ai-agents-suited-for-controllers/164684/) (vendor) [EXCERPT] |
| 5 | Access-request provisioning with SoD checks | IT ops / identity | 4 | 4 | 3 | 5 | 5 | 5 | 5 | 4 | 35 | Medium (vendor): [ServiceNow July 2025 release](https://s205.q4cdn.com/537566246/files/doc_news/ServiceNow-Extends-End-to-End-AI-Agent-Orchestration-With-Agentic-Workforce-Management-2025.pdf) ("automated 97 % of software provisioning requests") [EXCERPT]; few named customer metrics |
| 6 | IT service-desk ticket triage and resolution | IT ops | 5 | 5 | 4 | 3 | 4 | 3 | 5 | 5 | 34 | Strong (vendor): McKinsey names service desk as the top agent use case; [ServiceNow](https://s205.q4cdn.com/537566246/files/doc_news/ServiceNow-Extends-End-to-End-AI-Agent-Orchestration-With-Agentic-Workforce-Management-2025.pdf) (85 % of routine IT requests) [EXCERPT]; [ServiceNow Now on Now](https://www.servicenow.com/kr/customers/now-on-now-now-assist.html) [EXCERPT] |
| 7 | AR dispute and deduction resolution | Finance (order-to-cash) | 4 | 5 | 4 | 5 | 4 | 4 | 4 | 4 | 34 | Medium (vendor): [SAP Joule Dispute Resolution Agent](https://learning.sap.com/courses/reviewing-the-use-of-sap-joule-agents-in-finance/streamlining-dispute-management-with-the-dispute-resolution-agent_b08c72ea-949d-42dd-9094-8e20038b256b) [EXCERPT]; [HighRadius](https://www.highradius.com/industry/cpg/) (vendor) [EXCERPT] |
| 8 | Vendor / KYC onboarding due diligence | Risk & compliance / procurement | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 34 | Weak-medium: [Incore Bank PoC](https://fintech.global/2026/09/07/incore-bank-trials-gemini-powered-kyc-with-kyndryl/) [EXCERPT]; vendor products |
| 9 | Shipment delay exception management | Supply chain | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 32 | Medium-strong: [C.H. Robinson](https://www.ajot.com/news/c.h-robinson-launches-ai-agents-to-combat-industrywide-problem) (95 % of missed-pickup checks automated, 350+ hours a day saved) [EXCERPT] |
| 10 | Journal-entry testing / control testing | Audit | 4 | 3 | 3 | 5 | 3 | 4 | 5 | 4 | 31 | Weak (public): EY and KPMG rollouts reported only in [trade blogs](https://agentmarketcap.ai/blog/2026/04/24/ey-130k-auditors-agentic-ai-canvas-multi-agent-audit) [UNVERIFIED] |

**Considered and not shortlisted**
- **Contract review against a playbook:** strong evidence ([Spellbook on Claude](https://claude.com/customers/spellbook) [EXCERPT]), but a weak deterministic core.
- **Policy Q&A alone:** pure RAG, so the deterministic core is too thin. It is folded into #3.
- **Candidate screening:** it is a bias and legal case study ([Mobley v. Workday](https://www.hklaw.com/en/insights/publications/2025/05/federal-court-allows-collective-action-lawsuit-over-alleged) [EXCERPT]), not a learner project.

## 5. Why these three

The top three by score are also the most **complementary** to P2P Sentinel.

| | P2P Sentinel (existing) | Returns Concierge | FinCrime Triage Desk | People Policy Desk |
|---|---|---|---|---|
| Domain | Finance / AP | Customer operations | Risk & compliance | HR |
| Agent pattern | Agents-as-tools, parallel specialists | **Customer-facing conversation with handoffs**, session memory | **Event-driven**: queue → worker, idempotency, retries, dead-letters, parallel evidence agents | **RAG over policy documents** with citations, a retrieval eval and routing by classification |
| Signature guardrail | Injection in invoices, bank-change fraud | Live social engineering, PII (card) redaction, identity check before disclosure, no over-promising | Memo injection, sanctions-first rule, **tipping-off** output filter, deterministic QA sampling | **Grounding check** on citations and numbers, sensitive-topic gate with no model call, self-only data access |
| Irreversible action kept in code | Payment approval | Refund / return authorisation | Disposition (no customer contact, no filing) | Leave booked in the HRIS |
| System of record (mocked) | ERP | OMS / CRM | Core banking + KYC + watchlist | HRIS + handbook |

**Why the runners-up were not chosen**
- **Expense audit (35)** is well evidenced but sits in finance next to P2P Sentinel, with the same "document vs rules" pattern.
- **Access provisioning (35)** has a superb deterministic core (segregation of duties) but thin public evidence.
- **IT service desk (34)** is the most deployed use case, but its deterministic core is thin. Its queue pattern is already taught by the AML pack, and its RAG pattern by the HR pack.

All four are good **breakout canvases** for the Use-Case Lab.

**Design choices common to all three packs**
- **Starter-kit names.** The packs keep the starter kit's folder and variable names (`mock_erp/`, `mcp_servers/erp_mcp.py`, `ERP_BASE_URL`, port 8001), so the generic modules 07, 13, 15 and 16 work unchanged.
- **Fixed business date.** Each spec fixes a business date (`BUSINESS_DATE=2026-11-02`) so time-based rules are testable.
- **Golden scenarios.** Each spec ships eight golden scenarios with exact expected outcomes. I recomputed the dates, working days, scores and similarity values with Python while writing them.
- **No reference implementation.** No reference implementation was built for the new packs, as the brief required.

## 6. What could not be verified

- **rexxulabs.com, mcpmarket.com and tasklet.ai:** the sites were blocked. Ownership, pricing, vetting policy and any promotional links (including WhatsApp channels or newsletters) are unverified.
- **ruflo:** the CVE-2026-59726 details come from news and CVE-site excerpts, not the advisory itself.
- **agentic-flow:** the licence is unverified.
- **ECC:** the behaviour of each hook script was not audited line by line.
- **Repo licences:** hesreallyhim/awesome-claude-code reports NOASSERTION. anthropics/claude-code, modelcontextprotocol/servers, inspector and registry report no SPDX licence or NOASSERTION.
- **Invariant Labs mcp-scan:** the current repo location, stars and licence are unverified.
- **Blocked documentation:** OWASP, modelcontextprotocol.io, openai.github.io, the OpenAI PDF, Atlassian and Microsoft Learn pages were seen only via excerpts. The Atlassian MCP endpoint (`/v1/mcp/authv2`, used in `starter-kit/.mcp.json`) should be confirmed on the day.
- **Use-case figures:** every outcome figure tagged [EXCERPT] (McKinsey, Gartner, Klarna, Salesforce, ServiceNow, IBM, Brex, Google Cloud/HSBC, C.H. Robinson and others) needs re-opening before use on a slide. Figures tagged [UNVERIFIED] (MIT NANDA primary, Stanford AI Index 2026 agent figures, EY/KPMG audit rollouts, LangChain 2024 survey) should not be quoted without a primary source.
- **Not found:** an AWS Bedrock Agents named-customer case with metrics, and the details of PwC's agent OS.

## 7. Sources

**Opened directly**
- https://www.anthropic.com/research/anthropic-economic-index-january-2026-report
- https://www.anthropic.com/research/anthropic-economic-index-september-2025-report
- https://www.anthropic.com/engineering/building-effective-agents
- https://code.claude.com/docs/en/skills · /sub-agents · /hooks · /mcp · /settings · /memory · /plugins · /security
- https://github.com/ruvnet/ruflo · https://github.com/ruvnet/ruflo/issues/1375 · https://github.com/ruvnet/ruflo/discussions/1513 · https://github.com/ruvnet/agentic-flow
- https://github.com/affaan-m/ECC (incl. `hooks/hooks.json`) · https://github.com/garrytan/gstack
- https://github.com/anthropics/skills · https://github.com/anthropics/claude-code · https://github.com/anthropics/claude-cookbooks · https://github.com/anthropics/claude-code-action
- https://github.com/modelcontextprotocol/servers · https://github.com/modelcontextprotocol/python-sdk · https://github.com/modelcontextprotocol/inspector · https://registry.modelcontextprotocol.io
- https://github.com/atlassian/atlassian-mcp-server · https://github.com/github/github-mcp-server · https://github.com/microsoft/mcp
- https://github.com/openai/openai-agents-python (incl. `examples/` and `docs/`)
- https://github.com/hesreallyhim/awesome-claude-code · https://github.com/wshobson/agents · https://github.com/VoltAgent/awesome-claude-code-subagents

**Search excerpts (not opened from the sandbox)**
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents · https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- https://modelcontextprotocol.io/specification/latest/basic/security_best_practices
- https://openai.github.io/openai-agents-python/ · https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- https://genai.owasp.org/llm-top-10/ · https://genai.owasp.org/2024/11/17/owasp-reveals-updated-2025-top-10-risks-for-llms-announces-new-llm-project-sponsorship-program-and-inaugural-sponsors/
- https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks · https://invariantlabs.ai/blog/introducing-mcp-scan
- https://thehackernews.com/2026/07/ruflo-mcp-flaw-lets-unauthenticated.html · https://app.opencve.io/cve/CVE-2026-59726
- https://mcpmarket.com/ja/privacy · https://ycombinator.com/companies/tasklet-2
- https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai
- https://www.anthropic.com/research/economic-index-march-2026-report
- https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027
- https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290
- https://langchain.com/state-of-agent-engineering · https://www.digitalcommerce360.com/2025/07/09/ai-agents-us-business-pwc-survey-data/
- https://kpmg.com/us/en/media/news/q3-ai-pulse.html · https://www.bcg.com/press/30september2025-ai-leaders-outpace-laggards-revenue-growth-cost-savings
- https://virtualizationreview.com/articles/2025/08/19/mit-report-finds-most-ai-business-investments-fail-reveals-genai-divide
- https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/ · https://tech.co/news/klarna-reverses-ai-overhaul
- https://www.salesforce.com/news/stories/agentforce-customer-support-lessons-learned/ · https://www.salesforce.com/customer-stories/engine/agentic-service/ · https://stripe.com/customers/decagon
- https://s205.q4cdn.com/537566246/files/doc_news/ServiceNow-Extends-End-to-End-AI-Agent-Orchestration-With-Agentic-Workforce-Management-2025.pdf · https://www.servicenow.com/kr/customers/now-on-now-now-assist.html
- https://www.servicenow.com/community/hrsd-articles/resolve-hr-case-nbsp-using-nbsp-agentic-nbsp-ai-nbsp-overview/ta-p/3450076
- https://www.ibm.com/case-studies/ibm-askhr · https://www.microsoft.com/en/customers/story/26985-cemex-microsoft-copilot-studio
- https://claude.com/customers/brex · https://www.appzen.com/hubfs/AppZen-Flight-Centre-Canada-Case-Study.pdf · https://www.cpapracticeadvisor.com/2025/07/10/ramp-introduces-ai-agents-suited-for-controllers/164684/
- https://learning.sap.com/courses/reviewing-the-use-of-sap-joule-agents-in-finance/streamlining-dispute-management-with-the-dispute-resolution-agent_b08c72ea-949d-42dd-9094-8e20038b256b · https://www.highradius.com/industry/cpg/
- https://cloud.google.com/blog/topics/financial-services/how-hsbc-fights-money-launderers-with-artificial-intelligence · https://www.fedinprint.org/item/fedgfe/102263/original · https://www.tecla.io/blog/agentic-ai-aml-compliance
- https://fintech.global/2026/09/07/incore-bank-trials-gemini-powered-kyc-with-kyndryl/
- https://www.ajot.com/news/c.h-robinson-launches-ai-agents-to-combat-industrywide-problem
- https://claude.com/customers/spellbook · https://www.hklaw.com/en/insights/publications/2025/05/federal-court-allows-collective-action-lawsuit-over-alleged
- https://agentmarketcap.ai/blog/2026/04/24/ey-130k-auditors-agentic-ai-canvas-multi-agent-audit
