import React, { useState, useEffect, useRef } from "react";
import Dashboard from "./components/Dashboard";
import OutbreakMap from "./components/OutbreakMap";
import ReportPanel from "./components/ReportPanel";
import DataScienceDashboard from "./components/DataScienceDashboard";
import LoginPage from "./components/LoginPage";

const API = "http://localhost:5000/api";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )},
  { id: "map", label: "India Map", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  )},
  { id: "analytics", label: "Analytics", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 4-5"/>
    </svg>
  )},
  { id: "report", label: "AI Report", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>
    </svg>
  )},
];

const STEPS = ["Local Train", "HE Encrypt", "Encrypted Upload", "Secure Aggregation", "AI Prediction", "Report Gen"];

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [prediction, setPrediction] = useState(null);
  const [hasAggregation, setHasAggregation] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("health_app_user")); }
    catch { return null; }
  });
  const [activeStep, setActiveStep] = useState(0);
  const [pageKey, setPageKey] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!user?.loggedIn) return;
    fetch(`${API}/status`)
      .then(r => r.json())
      .then(data => {
        if (data.prediction) { setPrediction(data.prediction); setHasAggregation(true); setActiveStep(6); }
        else if (data.has_aggregation) { setHasAggregation(true); setActiveStep(4); }
        else if (data.trained_nodes?.length > 0) { setActiveStep(3); }
      })
      .catch(() => {});
  }, [user]);

  const navigate = (id) => {
    setActivePage(id);
    setPageKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const logout = () => {
    localStorage.removeItem("health_app_user");
    setUser(null);
    setPrediction(null);
    setHasAggregation(false);
    setActiveStep(0);
  };

  if (!user?.loggedIn) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen grid-bg" style={{ background: "var(--bg-primary)" }}>
      {/* Ambient glow orbs */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] pointer-events-none" style={{background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)"}} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] pointer-events-none" style={{background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)"}} />

      {/* TOP NAV */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "shadow-2xl" : ""}`}
        style={{
          background: scrolled ? "rgba(3, 6, 15, 0.97)" : "rgba(3, 6, 15, 0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(30, 58, 138, 0.3)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-lg"
                style={{background: "linear-gradient(135deg, #2563eb, #7c3aed)", boxShadow: "0 0 20px rgba(99,102,241,0.4)"}}>
                FL
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#03060f]"
                style={{background: "#10b981", boxShadow: "0 0 8px #10b981"}}/>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white leading-none tracking-tight">
                Privacy-Preserving Health Analytics
              </h1>
              <p className="text-xs mt-0.5" style={{color: "var(--text-muted)"}}>
                Federated Learning · Disease Prediction · 20 Hospitals
              </p>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(30,58,138,0.25)"}}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activePage === item.id
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                style={activePage === item.id ? {
                  background: "linear-gradient(135deg, rgba(37,99,235,0.8), rgba(124,58,237,0.8))",
                  boxShadow: "0 0 15px rgba(99,102,241,0.3)"
                } : {
                  background: "transparent"
                }}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>

          {/* User + Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {prediction && (
              <span className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
                prediction.risk_level === "High"
                  ? "bg-red-900/20 border-red-700/40 text-red-400"
                  : prediction.risk_level === "Medium"
                  ? "bg-amber-900/20 border-amber-700/40 text-amber-400"
                  : "bg-emerald-900/20 border-emerald-700/40 text-emerald-400"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {prediction.risk_level} Risk
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{background: "linear-gradient(135deg, #2563eb, #7c3aed)"}}>
                {user.username[0].toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm text-slate-300 font-medium">{user.username}</span>
            </div>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
              style={{borderColor: "rgba(51,65,85,0.5)", color: "#64748b"}}
              onMouseEnter={e => { e.target.style.color="#f87171"; e.target.style.borderColor="rgba(239,68,68,0.4)"; }}
              onMouseLeave={e => { e.target.style.color="#64748b"; e.target.style.borderColor="rgba(51,65,85,0.5)"; }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Privacy Chain Progress */}
        <div style={{background: "rgba(7,13,26,0.6)", borderTop: "1px solid rgba(30,58,138,0.15)"}}>
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto custom-scroll">
              <span className="text-xs font-semibold whitespace-nowrap flex-shrink-0" style={{color: "var(--text-muted)"}}>
                Privacy Chain:
              </span>
              {STEPS.map((step, i) => (
                <React.Fragment key={i}>
                  <div className={`flex items-center gap-1 whitespace-nowrap text-xs transition-all duration-500 ${
                    activeStep > i ? "text-emerald-400" : activeStep === i ? "text-blue-400 font-semibold" : "text-slate-600"
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-500 ${
                      activeStep > i ? "bg-emerald-500 text-white" : activeStep === i ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-600"
                    }`}>
                      {activeStep > i ? "✓" : i + 1}
                    </span>
                    {step}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="step-connector flex-shrink-0 w-6 h-px" style={{background: activeStep > i ? "rgba(16,185,129,0.4)" : "rgba(30,41,59,0.8)"}} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-6" key={pageKey}>
        <div className="page-enter">
          {activePage === "dashboard" && (
            <Dashboard
              onPredictionUpdate={setPrediction}
              prediction={prediction}
              onStepChange={setActiveStep}
            />
          )}
          {activePage === "map" && <OutbreakMap prediction={prediction} />}
          {activePage === "analytics" && <DataScienceDashboard />}
          {activePage === "report" && (
            <ReportPanel
              prediction={prediction}
              hasAggregation={hasAggregation}
              onPredictionUpdate={(p) => {
                setPrediction(p);
                if (p) { setHasAggregation(true); setActiveStep(6); }
              }}
            />
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-12" style={{borderTop: "1px solid rgba(30,58,138,0.2)"}}>
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-4" style={{color: "var(--text-muted)"}}>
            <span>Privacy-Preserving Health Analytics</span>
            <span>·</span>
            <span>Federated Learning</span>
            <span>·</span>
            <span>Paillier HE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{background: "#10b981", boxShadow: "0 0 6px #10b981"}} />
            <span style={{color: "var(--text-muted)"}}>System Active</span>
            <span style={{color: "rgba(71,85,105,0.6)"}}>·</span>
            <span style={{color: "#64748b"}}>{user.role}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
