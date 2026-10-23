# Evaluation report - golden set

- Run at: 2026-10-23T12:53:01+00:00
- LLM provider / model: offline / -
- **Result: 8/8 passed (100.0%)**
- Average latency: 13.7 ms

| ID | Sample | Expected | Actual | Reason codes | Latency (ms) | Result |
|---|---|---|---|---|---|---|
| G1 | `inv_a_clean` | AUTO_APPROVE | AUTO_APPROVE | MATCHED | 43.6 | PASS |
| G2 | `inv_b_price_variance` | ROUTE_TO_HUMAN | ROUTE_TO_HUMAN | PRICE_VARIANCE | 10.3 | PASS |
| G3 | `inv_c_qty_mismatch` | ROUTE_TO_HUMAN | ROUTE_TO_HUMAN | QTY_MISMATCH | 9.3 | PASS |
| G4 | `inv_d_duplicate` | REJECT | REJECT | DUPLICATE_INVOICE | 8.7 | PASS |
| G5 | `inv_e_bank_change` | HOLD | HOLD | BANK_DETAILS_CHANGED | 8.5 | PASS |
| G6 | `inv_f_prompt_injection` | HOLD | HOLD | PROMPT_INJECTION_SUSPECTED | 9.1 | PASS |
| G7 | `inv_g_blocked_vendor` | REJECT | REJECT | VENDOR_BLOCKED | 10.0 | PASS |
| G8 | `inv_h_high_value` | ROUTE_TO_HUMAN | ROUTE_TO_HUMAN | HIGH_VALUE | 9.8 | PASS |

Each case: decision exact match AND reason codes exact match AND explanation.
