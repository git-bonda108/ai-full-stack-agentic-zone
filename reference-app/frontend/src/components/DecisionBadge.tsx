import { DECISION_LABEL } from "../format";
import type { Decision } from "../types";

export default function DecisionBadge({ decision }: { decision: Decision }) {
  return <span className={`badge badge-${decision.toLowerCase()}`}>{DECISION_LABEL[decision]}</span>;
}
