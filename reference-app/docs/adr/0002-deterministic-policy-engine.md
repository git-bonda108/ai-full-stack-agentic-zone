# ADR-0002: Payment decisions are made by a deterministic policy engine

- Status: Accepted
- Date: 2026-10-23

## Context

Paying or rejecting an invoice is a financial control subject to audit. LLM
output is probabilistic and can be manipulated by text inside the document
(prompt injection — see sample `inv_f_prompt_injection.txt`).

## Decision

"The LLM proposes, deterministic code disposes."
`backend/app/domain/policy.py` maps reason codes to exactly one decision with
ordered rules R1–R5 (first match wins). The three-way match and risk checks
are also plain functions with 100 % unit-test coverage. The Resolution Agent
receives the decision as a FINAL fact and an output guardrail blocks any text
that claims an approval the policy did not grant.

## Consequences

- Every decision names the rule that fired (`evidence.policy_rule`) → explainable.
- Changing tolerance or threshold is configuration (`PRICE_TOLERANCE_PCT`,
  `APPROVAL_THRESHOLD`), reviewed like code.
- The model can be swapped (OpenAI ↔ Azure ↔ Claude) without changing outcomes.
