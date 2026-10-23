# ADR-0003: Azure Container Apps instead of AKS

- Status: Accepted
- Date: 2026-10-23

## Context

We need to run two small HTTP containers (API, mock ERP) with HTTPS ingress,
autoscaling, managed identity, log shipping and revisions for rollback — at
training-budget cost.

## Decision

Use **Azure Container Apps** (consumption plan) for the API and ERP, **Azure
Static Web Apps (Free)** for the React UI, Log Analytics + Application Insights
for observability.

## Alternatives considered

| Option | Trade-off |
|---|---|
| AKS (Kubernetes) | Full control (custom operators, service mesh, GPU pools) but we would own node pools, upgrades, ingress controllers and a monthly cluster cost. Not justified for 2 services. |
| App Service for Containers | Simple, but no scale-to-zero and less natural for multiple microservices. |
| Azure Functions | Great for event triggers; long agent runs and FastAPI app model fit worse. |

Container Apps runs on Kubernetes + KEDA under the hood, so the skills
(containers, probes, replicas, revisions, scale rules) transfer to AKS later.

## Consequences

- Scale-to-zero and a monthly free grant keep cost near zero for training.
- If we later need queue-driven distributed workers, add a KEDA scale rule on
  an Azure Storage Queue / Service Bus to a `p2p-worker` container app.
