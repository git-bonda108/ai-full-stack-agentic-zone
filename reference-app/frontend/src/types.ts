// Mirrors backend/app/schemas.py - keep in sync with the OpenAPI contract (/docs).

export type Decision = "AUTO_APPROVE" | "ROUTE_TO_HUMAN" | "HOLD" | "REJECT";

export interface Invoice {
  id: number;
  invoice_number: string;
  vendor_id: string;
  po_number: string;
  currency: string;
  total: number;
  bank_account: string;
}

export interface AuditEvent {
  id: number;
  actor: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface LineComparison {
  sku: string;
  invoice_qty: number;
  invoice_unit_price: number;
  po_qty: number | null;
  po_unit_price: number | null;
  received_qty: number | null;
  price_variance_pct: number | null;
  issues: string[];
}

export interface CaseSummary {
  id: number;
  decision: Decision;
  reason_codes: string[];
  status: "OPEN" | "CLOSED";
  jira_key: string | null;
  created_at: string;
  invoice: Invoice;
}

export interface CaseDetail extends CaseSummary {
  explanation: string;
  evidence: {
    policy_rule?: string;
    match_summary?: string;
    line_comparison?: LineComparison[];
    risk_findings?: { code: string; detail: string }[];
    extraction_confidence?: number;
    processing_ms?: number;
    tokens?: { input: number; output: number; erp_tokens_saved_by_trimming: number };
    vendor_message_draft?: string;
  };
  closed_at: string | null;
  closed_by: string | null;
  audit_events: AuditEvent[];
}

export interface Metrics {
  total_cases: number;
  by_decision: Record<string, number>;
  by_reason: Record<string, number>;
  open_cases: number;
  auto_approved_pct: number;
  avg_processing_ms: number;
  est_llm_cost_usd: number;
}
