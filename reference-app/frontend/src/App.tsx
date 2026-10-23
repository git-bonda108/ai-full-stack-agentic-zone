import { NavLink, Route, Routes } from "react-router-dom";
import { API_BASE_URL } from "./api";
import CaseDetailPage from "./pages/CaseDetail";
import CasesPage from "./pages/Cases";
import DashboardPage from "./pages/Dashboard";
import SubmitPage from "./pages/Submit";

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">✓</span>
          <div>
            <strong>P2P Sentinel</strong>
            <small>Agentic invoice exception resolver</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/submit">Submit invoice</NavLink>
          <NavLink to="/cases">Cases</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
        </Routes>
      </main>
      <footer className="footer">
        API: <code>{API_BASE_URL}</code> · AI decisions are explained and auditable · humans
        approve anything risky
      </footer>
    </div>
  );
}
