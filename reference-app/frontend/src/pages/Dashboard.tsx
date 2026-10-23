import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import CaseTable from "../components/CaseTable";
import KpiTile from "../components/KpiTile";
import type { CaseSummary, Metrics } from "../types";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<CaseSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.metrics(), api.cases()])
      .then(([m, cases]) => {
        setMetrics(m);
        setRecent(cases.slice(0, 6));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">Cannot reach the API: {error}</p>;
  if (!metrics) return <p className="muted">Loading…</p>;

  const held = metrics.by_decision.HOLD ?? 0;
  return (
    <>
      <section className="hero">
        <h1>Accounts Payable control tower</h1>
        <p>
          Every invoice is extracted, three-way matched against the ERP, risk-checked and decided by
          policy. Agents explain; people approve anything risky.
        </p>
        <Link className="btn" to="/submit">
          Submit an invoice →
        </Link>
      </section>
      <section className="tiles">
        <KpiTile label="Invoices processed" value={metrics.total_cases} />
        <KpiTile
          label="Auto-approved"
          value={`${metrics.auto_approved_pct}%`}
          hint="clean match under threshold"
          tone="good"
        />
        <KpiTile label="Open exceptions" value={metrics.open_cases} hint="waiting for a human" tone="warn" />
        <KpiTile label="Held for fraud review" value={held} hint="bank change / injection" tone="danger" />
        <KpiTile label="Avg processing" value={`${metrics.avg_processing_ms} ms`} />
        <KpiTile label="Est. LLM cost" value={`$${metrics.est_llm_cost_usd.toFixed(4)}`} hint="all cases" />
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Recent cases</h2>
          <Link to="/cases">All cases →</Link>
        </div>
        <CaseTable cases={recent} />
      </section>
    </>
  );
}
