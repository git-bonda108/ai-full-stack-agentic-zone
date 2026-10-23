import type { CaseDetail, CaseSummary, Metrics } from "./types";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return (await response.json()) as T;
}

export const api = {
  metrics: () => request<Metrics>("/api/metrics/summary"),
  cases: (decision?: string) =>
    request<CaseSummary[]>(`/api/cases${decision ? `?decision=${decision}` : ""}`),
  caseById: (id: number | string) => request<CaseDetail>(`/api/cases/${id}`),
  samples: () => request<string[]>("/api/invoices/samples"),
  submitSample: (name: string) =>
    request<CaseDetail>(`/api/invoices/samples/${name}`, { method: "POST" }),
  submitText: (rawText: string) =>
    request<CaseDetail>("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ raw_text: rawText }),
    }),
  decide: (id: number, action: "approve" | "reject", user: string, comment: string) =>
    request<CaseDetail>(`/api/cases/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ action, user, comment }),
    }),
};
