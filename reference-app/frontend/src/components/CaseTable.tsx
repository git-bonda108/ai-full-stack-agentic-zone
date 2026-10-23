import { Link } from "react-router-dom";
import { money } from "../format";
import type { CaseSummary } from "../types";
import DecisionBadge from "./DecisionBadge";
import ReasonChips from "./ReasonChips";

export default function CaseTable({ cases }: { cases: CaseSummary[] }) {
  if (cases.length === 0) {
    return <p className="empty">No cases yet. Submit a sample invoice to start.</p>;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Invoice</th>
          <th>Vendor</th>
          <th>PO</th>
          <th className="num">Total</th>
          <th>Decision</th>
          <th>Reasons</th>
          <th>Status</th>
          <th>Ticket</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => (
          <tr key={c.id}>
            <td>
              <Link to={`/cases/${c.id}`}>{c.id}</Link>
            </td>
            <td>
              <Link to={`/cases/${c.id}`}>{c.invoice.invoice_number}</Link>
            </td>
            <td>{c.invoice.vendor_id}</td>
            <td>{c.invoice.po_number}</td>
            <td className="num">{money(c.invoice.total, c.invoice.currency)}</td>
            <td>
              <DecisionBadge decision={c.decision} />
            </td>
            <td>
              <ReasonChips codes={c.reason_codes} />
            </td>
            <td>{c.status}</td>
            <td>{c.jira_key ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
