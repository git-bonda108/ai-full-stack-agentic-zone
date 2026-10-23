"""Match Agent: gathers PO + goods-receipt evidence through tools.

The agent decides *which* lookups to make; the deterministic `three_way_match`
engine decides *whether it matches*.
"""

from agents import Agent, Model, ModelSettings

from backend.app.agents.context import CaseContext
from backend.app.agents.tools import get_goods_receipts, get_purchase_order

MATCH_INSTRUCTIONS = """You are the Match Agent of an Accounts Payable team.
Given an extracted invoice, call `get_purchase_order` and `get_goods_receipts`
for its PO number. Then reply with ONE short sentence describing what you found
(e.g. "PO-1001 found with 2 lines; 1 goods receipt posted").
Do not decide whether the invoice should be paid."""


def build_match_agent(model: str | Model) -> Agent[CaseContext]:
    return Agent[CaseContext](
        name="Match Agent",
        instructions=MATCH_INSTRUCTIONS,
        model=model,
        model_settings=ModelSettings(temperature=0),
        tools=[get_purchase_order, get_goods_receipts],
    )
