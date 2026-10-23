import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import DecisionBadge from "../components/DecisionBadge";
import ReasonChips from "../components/ReasonChips";
import { money, needsHuman } from "../format";
import type { CaseDetail } from "../types";

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<CaseDetail | null>(null);
  const [user, setUser] = useState("ap.manager");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) api.caseById(id).then(setItem).catch((e: Error) => setError(e.message));
  }, [id]);

  async function decide(action: "approve" | "reject") {
    if (!item) return;
    try {
      setItem(await api.decide(item.id, action, user, comment));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!item) return <p className="muted">Loading…</p>;
  const ev = item.evidence;

  return (
    <>
      <Link to="/cases" className="muted">
        ← All cases
      </Link>
      <section className={`banner banner-${item.decision.toLowerCase()}`}>
        <div>
          <DecisionBadge decision={item.decision} />
          <h1>
            {item.invoice.invoice_number} · {money(item.invoice.total, item.invoice.currency)}
          </h1>
          <p>
            Vendor {item.invoice.vendor_id} · {item.invoice.po_number} · status <b>{item.status}</b>
            {item.jira_key && (
              <>
                {" "}
                · ticket <code>{item.jira_key}</code>
              </>
            )}
          </p>
          <ReasonChips codes={item.reason_codes} />
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Why? (explanation)</h2>
          <p className="explanation">{item.explanation}</p>
          <dl className="facts">
            <dt>Policy rule</dt>
            <dd>{ev.policy_rule}</dd>
            <dt>Extraction confidence</dt>
            <dd>{ev.extraction_confidence}</dd>
            <dt>Processing time</dt>
            <dd>{ev.processing_ms} ms</dd>
            <dt>LLM tokens (in / out)</dt>
            <dd>
              {ev.tokens?.input ?? 0} / {ev.tokens?.output ?? 0}
            </dd>
            <dt>ERP tokens saved by trimming</dt>
            <dd>{ev.tokens?.erp_tokens_saved_by_trimming ?? 0}</dd>
          </dl>
          {ev.risk_findings && ev.risk_findings.length > 0 && (
            <>
              <h3>Risk findings</h3>
              <ul className="findings">
                {ev.risk_findings.map((f) => (
                  <li key={f.code}>
                    <b>{f.code}</b> — {f.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card">
          <h2>Human decision</h2>
          {needsHuman(item.decision, item.status) ? (
            <div className="hitl">
              <label>
                Your name
                <input value={user} onChange={(e) => setUser(e.target.value)} />
              </label>
              <label>
                Comment
                <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              <div className="actions">
                <button className="btn btn-good" onClick={() => decide("approve")}>
                  Approve
                </button>
                <button className="btn btn-danger" onClick={() => decide("reject")}>
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="muted">
              {item.status === "CLOSED"
                ? `Closed by ${item.closed_by ?? "—"}.`
                : "No human action available for this decision."}
            </p>
          )}
          {ev.vendor_message_draft && (
            <>
              <h3>Draft vendor message</h3>
              <pre className="draft">{ev.vendor_message_draft}</pre>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Evidence: invoice vs PO vs goods receipt</h2>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th className="num">Invoice qty</th>
              <th className="num">PO qty</th>
              <th className="num">Received</th>
              <th className="num">Invoice price</th>
              <th className="num">PO price</th>
              <th className="num">Variance %</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {(ev.line_comparison ?? []).map((line) => (
              <tr key={line.sku} className={line.issues.length ? "row-issue" : ""}>
                <td>{line.sku}</td>
                <td className="num">{fmt(line.invoice_qty)}</td>
                <td className="num">{fmt(line.po_qty)}</td>
                <td className="num">{fmt(line.received_qty)}</td>
                <td className="num">{fmt(line.invoice_unit_price)}</td>
                <td className="num">{fmt(line.po_unit_price)}</td>
                <td className="num">{fmt(line.price_variance_pct)}</td>
                <td>
                  <ReasonChips codes={line.issues} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">{ev.match_summary}</p>
      </section>

      <section className="card">
        <h2>Agent timeline (audit trail)</h2>
        <ol className="timeline">
          {item.audit_events.map((event) => (
            <li key={event.id}>
              <span className="actor">{event.actor}</span>
              <span className="action">{event.action}</span>
              <code>{JSON.stringify(event.payload)}</code>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
