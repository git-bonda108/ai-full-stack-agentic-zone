# P2P Sentinel — Architecture

> All diagrams are Mermaid: they render on GitHub, in VS Code (Markdown Preview
> Mermaid Support extension) and at https://mermaid.live.

## 1. System context (C4 level 1)

```mermaid
flowchart LR
    clerk([AP Clerk]):::person
    manager([AP Manager]):::person
    auditor([Auditor]):::person
    vendor([Vendor]):::ext

    subgraph boundary[P2P Sentinel]
      sentinel[Agentic invoice<br/>exception resolver]
    end

    erp[(ERP<br/>SAP-style OData)]:::ext
    jira[Jira Cloud]:::ext
    llm[LLM provider<br/>OpenAI / Azure OpenAI / Claude]:::ext
    appi[Azure Monitor<br/>Application Insights]:::ext

    vendor -- invoices --> clerk
    clerk -- submits invoices, reviews exceptions --> sentinel
    manager -- approves / rejects risky cases --> sentinel
    auditor -- reads audit trail --> sentinel
    sentinel -- PO, goods receipts, vendor master --> erp
    sentinel -- exception tickets --> jira
    sentinel -- extraction, explanations --> llm
    sentinel -- traces, logs, metrics --> appi

    classDef person fill:#0f766e,color:#fff,stroke:#0f766e
    classDef ext fill:#334155,color:#fff,stroke:#334155
```

## 2. Containers (C4 level 2)

```mermaid
flowchart TB
    browser[Browser]
    subgraph azure[Azure resource group]
      swa[Static Web App<br/>React + Vite UI]
      subgraph aca[Container Apps environment]
        api[p2p-api<br/>FastAPI + OpenAI Agents SDK]
        erp[p2p-erp<br/>Mock ERP FastAPI]
      end
      pg[(PostgreSQL Flexible Server<br/>invoices, cases, audit_events)]
      law[Log Analytics + App Insights]
    end
    jira[Jira Cloud]
    llm[LLM provider]

    browser --> swa
    browser -- REST /api --> api
    api -- HTTP OData --> erp
    api -- SQLAlchemy --> pg
    api -- REST v3 --> jira
    api -- HTTPS --> llm
    api -. OpenTelemetry .-> law
    erp -. stdout logs .-> law
```

Locally the same containers run with `docker compose up --build`
(PostgreSQL in a container) or as plain processes with SQLite.

## 3. Sequence — one invoice

```mermaid
sequenceDiagram
    autonumber
    actor Clerk
    participant UI as React UI
    participant API as FastAPI /api/invoices
    participant Orch as AP Orchestrator (code)
    participant Intake as Intake Agent
    participant Match as Match Agent
    participant Risk as Risk Agent
    participant ERP as ERP (trimmed client)
    participant Policy as Policy Engine (deterministic)
    participant Res as Resolution Agent
    participant DB as Database
    participant Jira

    Clerk->>UI: paste invoice / pick sample
    UI->>API: POST /api/invoices {raw_text}
    API->>Orch: run_pipeline(CaseContext)
    Orch->>Intake: extract (input guardrail: prompt-injection tripwire)
    Intake-->>Orch: ExtractedInvoice
    par evidence in parallel (asyncio.gather)
        Orch->>Match: gather PO + goods receipts
        Match->>ERP: get_purchase_order / get_goods_receipts
        ERP-->>Match: trimmed JSON (5 of ~40 fields)
        Match-->>Orch: MatchResult (three_way_match)
    and
        Orch->>Risk: gather vendor + duplicate evidence
        Risk->>ERP: get_vendor
        Risk->>DB: duplicate lookup
        Risk-->>Orch: RiskReport (assess_risk)
    end
    Orch->>Policy: decide(reason_codes, total, threshold)
    Policy-->>Orch: Decision + rule
    Orch->>Res: FACT BLOCK (decision is final)
    Res-->>Orch: explanation, vendor draft (output guardrail)
    Orch-->>API: PipelineResult
    API->>DB: persist invoice, case, audit events
    alt decision != AUTO_APPROVE
        API->>Jira: create issue (or dry-run outbox)
    end
    API-->>UI: CaseOut
    Clerk->>UI: Approve / Reject (HITL)
    UI->>API: POST /api/cases/{id}/decision
```

## 4. Agent topology and context flow

```mermaid
flowchart LR
    raw[/Untrusted invoice text/] --> g1{{Input guardrail<br/>injection tripwire}}
    g1 -->|clean| intake[Intake Agent<br/>output_type=ExtractedInvoice]
    g1 -->|tripped| parser[Deterministic parser]
    intake --> fact[(Fact block<br/>invoice_number, vendor_id, po_number)]
    parser --> fact
    fact --> match[Match Agent<br/>tools: PO, GR]
    fact --> risk[Risk Agent<br/>tools: vendor, duplicate]
    match --> engine1[three_way_match]
    risk --> engine2[assess_risk]
    engine1 --> policy[policy.decide]
    engine2 --> policy
    policy --> res[Resolution Agent<br/>output_type=ResolutionDraft]
    res --> g2{{Output guardrail<br/>no false approval}}
    g2 -->|ok| out[Case + explanation]
    g2 -->|tripped| tmpl[Template explanation]
    tmpl --> out

    ctx[[CaseContext<br/>local state - never sent to the model]] -.-> match
    ctx -.-> risk
```

What each agent sees:

| Agent | Receives | Returns to orchestrator |
|---|---|---|
| Intake | raw invoice text (after the guardrail) | `ExtractedInvoice` |
| Match | 3-field fact block | one sentence; engine output is `MatchResult` |
| Risk | 3-field fact block | one sentence; engine output is `RiskReport` |
| Resolution | decision + reason codes + evidence | `ResolutionDraft` |

No agent receives another agent's transcript — only typed results flow back.

## 5. Data model

```mermaid
erDiagram
    INVOICES ||--o{ INVOICE_LINES : has
    INVOICES ||--|| CASES : "triaged as"
    CASES ||--o{ AUDIT_EVENTS : records

    INVOICES {
        int id PK
        string invoice_number
        string vendor_id
        string po_number
        string currency
        float total
        string bank_account
        text raw_text
        datetime received_at
    }
    INVOICE_LINES {
        int id PK
        int invoice_id FK
        string sku
        string description
        float qty
        float unit_price
    }
    CASES {
        int id PK
        int invoice_id FK
        string decision
        json reason_codes
        text explanation
        json evidence
        string status
        string jira_key
        datetime created_at
        datetime closed_at
        string closed_by
    }
    AUDIT_EVENTS {
        int id PK
        int case_id FK
        string actor
        string action
        json payload
        datetime created_at
    }
```
