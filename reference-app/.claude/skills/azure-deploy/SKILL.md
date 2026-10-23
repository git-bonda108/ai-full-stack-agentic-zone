---
name: azure-deploy
description: Deploy or update the app on Azure (Container Apps for API and mock ERP, Static Web Apps for the frontend, App Insights). Use when the user asks to deploy, redeploy, roll back or check the Azure environment.
disable-model-invocation: true
argument-hint: "[deploy | update-api | rollback | status]"
---

# Azure deployment helper

Action: $ARGUMENTS

Ground rules:
- Read names from `infra/azure/env.sh` (or ask the user). Never invent resource names.
- Never run `az group delete` or any `delete` yourself; print it for the human.
- Prefer `az acr build` (cloud build) so no local Docker daemon is needed.
- Secrets go in Container Apps secrets (`--secrets name=value`, then `secretref:name`), never in plain env vars or files.

Steps:
- **deploy**: follow `infra/azure/deploy.sh` step by step, explaining each command before you run it, and checking each result (`--query ... -o tsv`).
- **update-api**: `az acr build` a new tag, then `az containerapp update --image ...`, then smoke test `/healthz` and `/readyz`.
- **rollback**: `az containerapp revision list`, then `az containerapp ingress traffic set --revision-weight <previous>=100`.
- **status**: show revisions, replica count, the latest 50 log lines, and the App Insights failed-request count for the last hour.

Finish with a short deployment record appended to `docs/deployments.md`:
date, commit, image tag, revision name, smoke-test result.
