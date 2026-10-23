import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { sampleLabel } from "../format";

const TEMPLATE = `INVOICE
Invoice Number: INV-X-100
Vendor ID: V-100
Vendor Name: Acme Industrial Supplies
PO Number: PO-1001
Invoice Date: 2026-10-20
Currency: EUR
Bank Account (IBAN): DE89370400440532013000
Lines:
- GLV-01 | Safety gloves | qty 100 | unit 4.50
Total: 450.00`;

export default function SubmitPage() {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<string[]>([]);
  const [text, setText] = useState(TEMPLATE);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.samples().then(setSamples).catch((e: Error) => setError(e.message));
  }, []);

  async function run(label: string, call: () => Promise<{ id: number }>) {
    setBusy(label);
    setError("");
    try {
      const result = await call();
      navigate(`/cases/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Sample invoices</h2>
        <p className="muted">
          Each sample exercises one path through the agents. Run <b>A</b> before <b>D</b> (D is a
          duplicate of A).
        </p>
        <div className="sample-grid">
          {samples.map((name) => (
            <button
              key={name}
              className="sample"
              disabled={!!busy}
              onClick={() => run(name, () => api.submitSample(name))}
            >
              {busy === name ? "Processing…" : sampleLabel(name)}
            </button>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Paste invoice text</h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} spellCheck={false} />
        <button className="btn" disabled={!!busy} onClick={() => run("text", () => api.submitText(text))}>
          {busy === "text" ? "Agents working…" : "Run triage"}
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}
