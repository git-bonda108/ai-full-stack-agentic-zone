---
name: explain-code
description: Explain files Claude created or changed, for developers new to Python, and keep docs/EXPLAIN.md current. Use when the user asks what a file does, why it exists, or for a walkthrough of generated code.
argument-hint: "[path or 'recent']"
context: fork
agent: Explore
---

# Explain the code

Target: $ARGUMENTS (if `recent`, read `.ai-trace/ledger.jsonl` and take the files written in this session).

For each file produce:

1. **Purpose**: one sentence. Which of the 9 layers it belongs to.
2. **How it works**: 3–6 bullets, in plain words. Map Python idioms to Java/TypeScript
   where it helps (decorator ≈ annotation, Pydantic model ≈ DTO + Bean Validation,
   `async def` ≈ returns a Promise/CompletableFuture, `with` ≈ try-with-resources).
3. **Inputs → outputs**: what calls it and what it returns.
4. **Risks**: what could go wrong and which test covers it (or "no test yet").
5. **Why this design**: link to an ADR if one applies.

Return the result as Markdown sections headed by the file path, ready to paste into
`docs/EXPLAIN.md`. Do not modify source files.
