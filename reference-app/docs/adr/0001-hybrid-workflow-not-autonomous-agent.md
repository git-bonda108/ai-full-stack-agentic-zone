# ADR-0001: Hybrid workflow with agentic islands, not a fully autonomous agent

- Status: Accepted
- Date: 2026-10-23
- Deciders: AP product owner, tech lead

## Context

Invoice triage always follows the same steps: read the invoice, gather PO /
goods-receipt / vendor evidence, decide, explain, notify. An autonomous agent
(an LLM planning its own steps in a loop) could do this, but every extra LLM
turn adds cost, latency and non-determinism, and makes testing harder.

## Decision

The orchestration is **plain Python** (`backend/app/agents/pipeline.py`).
LLM agents are used only where judgement over unstructured input helps:
extraction (Intake), evidence gathering via tools (Match, Risk) and
explanation/drafting (Resolution). Match and Risk run **in parallel**
(`asyncio.gather`). Specialists return typed objects, never transcripts.

## Alternatives considered

| Option | Why not |
|---|---|
| Single autonomous agent with all tools | Unpredictable step order, hard to test, higher token cost |
| LLM orchestrator with agents-as-tools | Kept as a teaching variant (`build_llm_orchestrator`); adds an LLM turn per decision with no benefit while the steps are fixed |
| Handoffs between agents | Control and conversation move to the specialist; we need the orchestrator to keep control and collect results |

## Consequences

- Deterministic, testable control flow; 8/8 golden cases in offline mode.
- Adding a step means changing code, not a prompt — intentional.
- If future cases need open-ended investigation (e.g. vendor disputes), revisit
  with an agent loop inside a bounded sub-step.
