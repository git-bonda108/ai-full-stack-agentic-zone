---
name: jira-user-story
description: Write INVEST user stories with Gherkin acceptance criteria and create them in Jira through the Atlassian MCP server. Use when the user asks for stories, epics, a backlog or Jira tickets.
argument-hint: "[feature or epic description]"
---

# Write user stories and push them to Jira

Input: $ARGUMENTS

1. Read `docs/SPEC.md` and `docs/session-facts.md` (Jira project key, sprint).
2. Draft stories in this exact shape and show them to the user **before** creating anything:

```
Title: <verb> <outcome>  (max 80 chars)
As a <persona>, I want <capability>, so that <benefit>.
Acceptance criteria:
  Scenario: <name>
    Given <context>
    When <action>
    Then <observable result>
Story points: 1 | 2 | 3 | 5 | 8
Labels: sprint-<n>, <layer e.g. backend|frontend|agents|infra>
Definition of done: tests green, ruff clean, docs updated, demoable
```

3. Check each story against INVEST (Independent, Negotiable, Valuable, Estimable,
   Small, Testable). Split anything over 8 points.
4. After the user approves, create them with the Atlassian MCP tools (issue type
   Story, under the right Epic), then list the created keys.
5. Write the new keys into `docs/session-facts.md` under Identifiers.

If the Atlassian MCP server is not connected, write the stories to
`docs/backlog.md` instead and say so.
