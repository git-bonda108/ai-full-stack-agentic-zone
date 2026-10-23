---
paths:
  - "frontend/src/**/*.{ts,tsx}"
---
- React function components + hooks, TypeScript strict. No `any`.
- All API calls go through `frontend/src/api.ts`; base URL from `import.meta.env.VITE_API_BASE_URL`.
- Every AI decision shown in the UI must show its reason codes and evidence.
- Accessible: buttons have labels, colour is never the only signal.
