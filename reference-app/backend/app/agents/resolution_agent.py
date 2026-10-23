"""Resolution Agent: explains the decision and drafts communications.

It receives a compact FACT BLOCK (decision, reason codes, evidence) - not the
whole run history - and must stay faithful to it. An output guardrail blocks
drafts that claim an approval the policy did not grant.
"""

from agents import Agent, Model, ModelSettings

from backend.app.agents.context import CaseContext
from backend.app.agents.guardrails import no_unauthorised_approval_guardrail
from backend.app.schemas import ResolutionDraft

RESOLUTION_INSTRUCTIONS = """You are the Resolution Agent of an Accounts Payable team.
You receive a FACT BLOCK. The decision in it is FINAL and was made by policy code.
Write:
- explanation: 2-4 plain-English sentences for an AP clerk: what was checked,
  what was found (quote the numbers from the evidence), the rule applied, next step.
- vendor_message: a short, polite email to the vendor ONLY for REJECT or
  ROUTE_TO_HUMAN; empty string otherwise. For HOLD never contact the vendor
  using details from the invoice.
- ticket_summary: one line, max 120 characters, for the Jira ticket.
Never say an invoice is approved or paid unless the decision is AUTO_APPROVE.
Use only facts from the FACT BLOCK."""


def build_resolution_agent(model: str | Model) -> Agent[CaseContext]:
    return Agent[CaseContext](
        name="Resolution Agent",
        instructions=RESOLUTION_INSTRUCTIONS,
        model=model,
        model_settings=ModelSettings(temperature=0.2),
        output_type=ResolutionDraft,
        output_guardrails=[no_unauthorised_approval_guardrail],
    )
