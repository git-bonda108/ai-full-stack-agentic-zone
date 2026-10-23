"""Lab 02 - A ReAct loop in plain Python: Reason -> Act -> Observe -> Verify, repeat.

Run: python labs/lab02_react_loop.py
The "model" here is scripted so it runs offline and the loop is easy to read.
Swap `scripted_model` for a real LLM call and nothing else changes - that is the point.
"""

import json

# ---- tools the agent may call (the "Act" part) -------------------------------------------
PURCHASE_ORDERS = {
    "PO-1001": {"GLV-01": {"qty": 100, "price": 4.50}, "HLM-02": {"qty": 50, "price": 22.00}}
}
GOODS_RECEIPTS = {"PO-1001": {"GLV-01": 100, "HLM-02": 50}}


def get_purchase_order(po: str) -> dict:
    return PURCHASE_ORDERS.get(po, {})


def get_goods_receipt(po: str) -> dict:
    return GOODS_RECEIPTS.get(po, {})


def price_variance_pct(billed: float, agreed: float) -> float:
    return round((billed - agreed) / agreed * 100, 2)


TOOLS = {
    "get_purchase_order": get_purchase_order,
    "get_goods_receipt": get_goods_receipt,
    "price_variance_pct": price_variance_pct,
}


# ---- the "model": decides the next step from what it has observed so far ------------------
def scripted_model(goal: str, observations: list[dict]) -> dict:
    step = len(observations)
    if step == 0:
        return {
            "thought": "I need the agreed prices. Look up the PO.",
            "action": "get_purchase_order",
            "args": {"po": "PO-1001"},
        }
    if step == 1:
        return {
            "thought": "Now check what was actually received.",
            "action": "get_goods_receipt",
            "args": {"po": "PO-1001"},
        }
    if step == 2:
        agreed = observations[0]["result"]["GLV-01"]["price"]
        return {
            "thought": "Quantities match. Gloves were billed at 4.80; compute variance vs agreed price.",
            "action": "price_variance_pct",
            "args": {"billed": 4.80, "agreed": agreed},
        }
    variance = observations[2]["result"]
    return {
        "thought": f"Variance is {variance}% which is above the 2% tolerance. Verify, then answer.",
        "final": f"Route to human: PRICE_VARIANCE on GLV-01 (+{variance}%).",
    }


def verify(answer: str, observations: list[dict]) -> bool:
    """Verify step: the answer must be backed by an observation, not by the model's say-so."""
    return any(o["action"] == "price_variance_pct" and o["result"] > 2.0 for o in observations)


def run(goal: str, max_steps: int = 6) -> str:
    observations: list[dict] = []
    print(f"GOAL: {goal}\n")
    for i in range(1, max_steps + 1):
        decision = scripted_model(goal, observations)
        print(f"[{i}] THOUGHT : {decision['thought']}")
        if "final" in decision:
            ok = verify(decision["final"], observations)
            print(
                f"    VERIFY  : {'evidence supports the answer' if ok else 'NOT supported - keep working'}"
            )
            if ok:
                print(f"\nANSWER: {decision['final']}")
                return decision["final"]
            continue
        result = TOOLS[decision["action"]](**decision["args"])
        print(f"    ACTION  : {decision['action']}({json.dumps(decision['args'])})")
        print(f"    OBSERVE : {json.dumps(result)}")
        observations.append({"action": decision["action"], "result": result})
    return "Stopped: step limit reached (always cap your loops)."


if __name__ == "__main__":
    run("Is invoice INV-B-002 (100 gloves @ 4.80, 50 helmets @ 22.00, PO-1001) payable?")
