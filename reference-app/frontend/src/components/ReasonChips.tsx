import { humanise } from "../format";

export default function ReasonChips({ codes }: { codes: string[] }) {
  return (
    <span className="chips">
      {codes.map((code) => (
        <span key={code} className={`chip ${code === "MATCHED" ? "chip-ok" : ""}`}>
          {humanise(code)}
        </span>
      ))}
    </span>
  );
}
