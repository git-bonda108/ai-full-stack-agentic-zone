import type { Decision } from "./types";

export const DECISION_LABEL: Record<Decision, string> = {
  AUTO_APPROVE: "Auto-approved",
  ROUTE_TO_HUMAN: "Needs review",
  HOLD: "On hold",
  REJECT: "Rejected",
};

export function money(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

export function humanise(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function sampleLabel(stem: string): string {
  // "inv_b_price_variance" -> "B · Price Variance"
  const match = /^inv_([a-z])_(.+)$/.exec(stem);
  if (!match) return stem;
  return `${match[1].toUpperCase()} · ${humanise(match[2])}`;
}

export function needsHuman(decision: Decision, status: string): boolean {
  return status === "OPEN" && (decision === "ROUTE_TO_HUMAN" || decision === "HOLD");
}
