# Starter kit: a Claude-ready project skeleton

Copy everything in this folder (including the hidden `.claude/` and `.mcp.json`) into a new, empty
project folder. Module 07 of the runbook walks through it.

| Path | What it is |
|---|---|
| `CLAUDE.md` | Project memory: golden rules, stack, layout, commands, conventions. Imports `docs/SPEC.md` and `docs/session-facts.md`. |
| `docs/SPEC.md` | The P2P Sentinel spec everyone builds against |
| `docs/session-facts.md` | Persistent fact block (survives `/compact`) |
| `.claude/settings.json` | Permissions (deny → ask → allow) and all hook wiring |
| `.claude/hooks/` | `session_start` (inject facts), `prompt_guard` (block secrets), `guard_bash` / `protect_files` (deny or ask), `post_edit` (format + provenance ledger), `subagent_log`, `pre_compact` (extract-first), `stop_gate` (tests must pass), `session_end` |
| `.claude/skills/` | `fastapi-endpoint`, `agents-sdk-agent`, `jira-user-story`, `test-evidence`, `azure-deploy`, `explain-code` |
| `.claude/agents/` | `architect`, `test-engineer`, `security-reviewer`, `explainer`, `devops` |
| `.claude/rules/` | Path-scoped rules for backend and frontend files |
| `.mcp.json` | Project MCP servers: `erp` (stdio, built in Sprint 1) and `atlassian` (Jira, remote HTTP + OAuth) |
| `labs/` | Six small Python labs: tokens, ReAct loop, Agents SDK, parallelism, fact block, tool trimming |

Hooks call `python3`. On Windows, replace `python3` with `python` in `.claude/settings.json`.
Test any hook by hand: `echo '{"tool_input":{"command":"rm -rf /"}}' | python3 .claude/hooks/guard_bash.py`.
