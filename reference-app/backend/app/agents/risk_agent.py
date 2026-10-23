"""Risk Agent: gathers vendor-master and duplicate evidence through tools.

Final risk findings come from the deterministic `assess_risk` engine.
"""

from agents import Agent, Model, ModelSettings

from backend.app.agents.context import CaseContext
from backend.app.agents.tools import find_duplicate_invoice, get_vendor

RISK_INSTRUCTIONS = """You are the Risk Agent of an Accounts Payable team.
Given an extracted invoice, call `get_vendor` for its vendor id and
`find_duplicate_invoice` for its invoice number and vendor id.
Then reply with ONE short sentence summarising the evidence.
Do not decide whether the invoice should be paid."""


def build_risk_agent(model: str | Model) -> Agent[CaseContext]:
    return Agent[CaseContext](
        name="Risk Agent",
        instructions=RISK_INSTRUCTIONS,
        model=model,
        model_settings=ModelSettings(temperature=0),
        tools=[get_vendor, find_duplicate_invoice],
    )
