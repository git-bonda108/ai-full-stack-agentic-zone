import { useEffect, useState } from "react";
import { api } from "../api";
import CaseTable from "../components/CaseTable";
import { DECISION_LABEL } from "../format";
import type { CaseSummary, Decision } from "../types";

const FILTERS: (Decision | "")[] = ["", "AUTO_APPROVE", "ROUTE_TO_HUMAN", "HOLD", "REJECT"];

export default function CasesPage() {
  const [filter, setFilter] = useState<Decision | "">("");
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .cases(filter || undefined)
      .then(setCases)
      .catch((e: Error) => setError(e.message));
  }, [filter]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Cases</h2>
        <div className="segmented">
          {FILTERS.map((f) => (
            <button key={f || "all"} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f ? DECISION_LABEL[f] : "All"}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="error">{error}</p> : <CaseTable cases={cases} />}
    </section>
  );
}
