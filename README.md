# AI Full-Stack Agentic Zone

A card-by-card training runbook for building a production agentic application end to end
with Claude Code: concepts, prompts, commands and labs from planning to deploying and
observing on Azure. It ships with a fully built and tested reference application, a starter kit,
and a Use-Case Lab, so the same runbook can drive any number of applications.

## Open it

No build step. Any of these work:

```bash
# 1. Locally
python3 -m http.server 8000      # then open http://localhost:8000
# (double-clicking index.html also works; diagrams need internet for the Mermaid CDN)

# 2. GitHub Pages: enable Pages (source: GitHub Actions); .github/workflows/training-site.yml publishes on push to main

# 3. Azure Static Web Apps (Free)
az staticwebapp create -g <rg> -n <name> -l eastasia --sku Free
npx @azure/static-web-apps-cli deploy . --deployment-token <token> --env production
```

Keys: `←` `→` move between cards · `P` presenter mode · `T` theme. The top bar switches the active
use case, the shell (bash / PowerShell) and deck vs scroll view.

## What's inside

| Path | What |
|---|---|
| `index.html`, `assets/` | The runbook web app (vanilla JS, no framework, no build) |
| `content/modules/` | Generic modules: agents, multi-agent, context engineering, Claude Code craft, why AI fails + 9 layers, setup, plan (Jira via MCP), design, test, secure/RAI/XAI, deploy, observe |
| `content/usecases/` | Use-case packs. `p2p-sentinel.js` has its own reveal and three sprint modules. Breakout teams add more through the Use-Case Lab |
| `content/data.js` | Session plan, the 9-layer stack, glossary |
| `content/files.js` | Generated: real repo files shown in file cards (`python tools/build_files.py`) |
| `starter-kit/` | What trainees copy into a new project: CLAUDE.md, hooks, skills, subagents, rules, `.mcp.json`, spec, labs |
| `reference-app/` | P2P Sentinel, fully built: FastAPI + OpenAI Agents SDK + React, mock ERP, MCP server, tests, evals, Docker, Azure scripts |
| `.github/workflows/` | Reference-app CI (lint, tests, evals) and keyless deploy (OIDC), plus training-site publishing |
| `docs/AUTHORING.md` | How to add modules, card types and use cases |

## The runbook at a glance

| # | Module | Hands-on |
|---|---|---|
| 00 | Orientation | recap flip cards, working method |
| 01 | Agents & ReAct | ReAct loop lab, watch Claude Code's loop, workflow vs agent |
| 02 | Multi-agent | handoff vs agent-as-tool, parallel vs distributed, parallel subagents |
| 03 | Context engineering | token lab, extract-first fact block, tool-output trimming |
| 04 | Claude Code craft | CLAUDE.md, skills, subagents, hooks lifecycle, MCP, permissions |
| 05 | Why AI apps fail | the podcast, 10 failure modes, the 9-layer stack, readiness checklist |
| 06 | Meet the use case | problem, users, agent team, 8 golden scenarios |
| 07 | Environment setup | Python Rosetta stone, venv, dependencies explained, starter kit |
| 08 | Plan | backlog in Jira through the Atlassian MCP server (REST fallback) |
| 09 | Design | context, container, sequence, agent and ERD diagrams, API contract, ADRs |
| 10–12 | Build sprints | ERP + MCP + deterministic core → agents + guardrails + Jira + HITL → React UI |
| 13 | Test | pyramid, coverage + mutation check, golden-set evals, e2e, evidence pack |
| 14 | Secure · RAI · XAI | OWASP LLM Top 10 mapping, red team, explain AI decisions and AI-written code |
| 15 | Deploy | containers, ACR cloud build, Container Apps, SWA, Entra app registration + OIDC, rollback, AKS compare |
| 16 | Observe | App Insights, KQL, alerts, Phoenix, incident drill back into Jira |

## Reference app status

`reference-app/`: 63 tests pass (100% coverage on the decision engine), 8/8 golden-set evals, the
frontend builds, Playwright e2e passes, and the MCP server handshake was checked. Docker images were
not built in the authoring sandbox (registry access was blocked); `az acr build` builds them in Azure.
