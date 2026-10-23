---
name: agents-sdk-agent
description: Create or modify an agent with the OpenAI Agents SDK (Agent, Runner, function_tool, guardrails, as_tool, handoffs). Use when building intake/match/risk/resolution agents or the orchestrator pipeline.
argument-hint: "[agent name] [responsibility]"
---

# Build an agent with the OpenAI Agents SDK

Agent to build: $ARGUMENTS

Rules for this project:
- One file per agent in `backend/app/agents/<name>_agent.py` exposing `build_<name>_agent()`.
- Structured output only: `Agent(..., output_type=<PydanticModel>)`. Never parse free text.
- Tools are `@function_tool` functions in `backend/app/agents/tools.py`. Their first
  parameter is `ctx: RunContextWrapper[CaseContext]` when they need shared state.
  `CaseContext` is local context: tools see it, the model does not.
- Tools return **trimmed** data (only the fields the agent needs), never raw ERP payloads.
- The agent never decides the outcome. It gathers evidence; `backend/app/domain/policy.py` decides.
- Choose the pattern deliberately:
  - `agent.as_tool(...)` when the orchestrator must keep control and combine results.
  - `handoffs=[...]` when the other agent should take over the conversation.
  - Plain Python + `asyncio.gather` for independent steps (parallel).
- Guardrails: `@input_guardrail` / `@output_guardrail` returning `GuardrailFunctionOutput(output_info=..., tripwire_triggered=bool)`.
- Model comes from `backend/app/agents/model_provider.py` (`LLM_PROVIDER`, `LLM_MODEL`); in
  `offline` mode the pipeline uses deterministic stand-ins so tests need no API key.

Minimal shape:
```python
from agents import Agent, Runner, function_tool, RunContextWrapper


@function_tool
async def get_purchase_order(ctx: RunContextWrapper[CaseContext], po_number: str) -> dict:
    """Fetch a purchase order (trimmed) from the ERP."""
    return await ctx.context.erp.get_purchase_order(po_number)


match_agent = Agent[CaseContext](
    name="Match Agent",
    instructions="Fetch the PO and goods receipts for the invoice, then summarise differences.",
    tools=[get_purchase_order],
    output_type=MatchFindings,
)
result = await Runner.run(match_agent, input=invoice_json, context=case_ctx, max_turns=6)
findings: MatchFindings = result.final_output
```

Finish by adding a unit test that runs the agent path in offline mode.
