interface Props {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "danger";
}

export default function KpiTile({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className={`tile tile-${tone}`}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {hint && <span className="tile-hint">{hint}</span>}
    </div>
  );
}
