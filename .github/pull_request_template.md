## What & why
<!-- Jira key(s) and one paragraph. -->

## How it was verified
- [ ] `ruff check .` and `pytest -q` pass locally
- [ ] Evals: `python -m evals.run_evals` 8/8 (if agents, prompts or policy changed)
- [ ] Screenshots / test evidence attached for UI changes

## AI assistance
- [ ] I reviewed every AI-written line in this diff (`.ai-trace/ledger.jsonl` lists the files)
- [ ] No secrets, keys or customer data in code, prompts or logs
- [ ] Decisions are still made by deterministic code, not by an LLM

## Risk & rollback
<!-- What could break, and how to roll back (revision name). -->
