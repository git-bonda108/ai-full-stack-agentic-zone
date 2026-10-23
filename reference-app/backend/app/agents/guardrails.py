"""Guardrails: checks that run around the agents, outside the model's control.

- Input guardrail on the Intake Agent: trips on prompt-injection phrases in the
  untrusted invoice text, BEFORE the model sees it (run_in_parallel=False).
- Output guardrail on the Resolution Agent: trips if the drafted text claims an
  approval/payment that the deterministic policy did not grant.
"""

import re

from agents import (
    Agent,
    GuardrailFunctionOutput,
    RunContextWrapper,
    TResponseInputItem,
    input_guardrail,
    output_guardrail,
)

from backend.app.agents.context import CaseContext
from backend.app.domain.risk import detect_prompt_injection
from backend.app.schemas import ResolutionDraft

APPROVAL_CLAIM = re.compile(
    r"\b(has been|is|was)\s+(approved|released for payment|paid)\b|\bapproved for payment\b",
    re.IGNORECASE,
)


def claims_unauthorised_approval(text: str, decision: str) -> bool:
    """True when text says 'approved/paid' but the policy decision is not AUTO_APPROVE."""
    return decision != "AUTO_APPROVE" and bool(APPROVAL_CLAIM.search(text or ""))


def _as_text(value: str | list[TResponseInputItem]) -> str:
    if isinstance(value, str):
        return value
    return " ".join(str(item.get("content", "")) for item in value if isinstance(item, dict))


@input_guardrail(name="prompt_injection_tripwire", run_in_parallel=False)
async def prompt_injection_guardrail(
    ctx: RunContextWrapper[CaseContext], agent: Agent, user_input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    hits = detect_prompt_injection(_as_text(user_input))
    return GuardrailFunctionOutput(output_info={"hits": hits}, tripwire_triggered=bool(hits))


@output_guardrail(name="no_unauthorised_approval")
async def no_unauthorised_approval_guardrail(
    ctx: RunContextWrapper[CaseContext], agent: Agent, output: ResolutionDraft
) -> GuardrailFunctionOutput:
    outcome = ctx.context.outcome
    decision = outcome.decision.value if outcome else ""
    text = f"{output.explanation}\n{output.vendor_message}"
    tripped = claims_unauthorised_approval(text, decision)
    return GuardrailFunctionOutput(output_info={"decision": decision}, tripwire_triggered=tripped)
