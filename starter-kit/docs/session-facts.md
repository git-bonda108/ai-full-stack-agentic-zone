# Session facts (persistent fact block)

Claude: consult this block before answering. Update it when we agree on a
decision, an ID, a number or a name. Replace a value when it changes
(replace-on-conflict) and note the old value in the log at the bottom.

## Identifiers
- Jira project key: AP
- Current sprint: Sprint 0 (setup)
- Repo / branch: p2p-sentinel / main

## Numeric limits
- Approval threshold: 10000 (EUR)
- Price tolerance: 2.0 %
- Batch concurrency limit: 4

## Named entities
- Vendors: V-100 Acme Industrial Supplies, V-200 Northwind Logistics,
  V-300 Globex Components (blocked), V-400 Initech Office Solutions
- Ports: API 8000, mock ERP 8001, frontend 5173 (dev) / 8080 (container)

## Decisions
- Hybrid workflow, not an autonomous agent (ADR-0001)
- Deterministic policy engine owns the decision (ADR-0002)
- Azure Container Apps, not AKS (ADR-0003)

## Change log
<!-- 2026-10-24 · approval threshold 5000 → 10000 · agreed with AP manager -->

## Auto-extracted before /compact
<!-- The PreCompact hook appends IDs it finds in the transcript below. -->
