import React, { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000/api";

const STEPS = [
  { id: 1, short: "Local Train", icon: "🏥", label: "Each hospital trains locally — raw data never leaves the node", color: "#3b82f6" },
  { id: 2, short: "HE Encrypt", icon: "🔒", label: "Local weights encrypted using Paillier Homomorphic Encryption", color: "#8b5cf6" },
  { id: 3, short: "Secure Send", icon: "🔗", label: "Only encrypted weight vectors sent to central aggregation", color: "#06b6d4" },
  { id: 4, short: "FedAvg", icon: "⚡", label: "Server performs FedAvg aggregation without accessing raw data", color: "#10b981" },
  { id: 5, short: "AI Predict", icon: "🤖", label: "Aggregated global model used for outbreak prediction via Gemini", color: "#f59e0b" },
  { id: 6, short: "Report", icon: "📋", label: "AI generates comprehensive outbreak surveillance report", color: "#ec4899" },
];

const STATUS_CONFIG = {
  idle: { label: "Idle", bg: "rgba(30,41,59,0.8)", border: "rgba(51,65,85,0.5)", text: "#64748b", dot: "#475569" },
  training: { label: "Training...", bg: "rgba(180,120,0,0.1)", border: "rgba(245,158,11,0.4)", text: "#fbbf24", dot: "#f59e0b" },
  trained: { label: "Model Ready", bg: "rgba(30,58,138,0.1)", border: "rgba(59,130,246,0.4)", text: "#60a5fa", dot: "#3b82f6" },
  encrypted: { label: "Encrypted", bg: "rgba(76,29,149,0.12)", border: "rgba(139,92,246,0.4)", text: "#a78bfa", dot: "#8b5cf6" },
  sent: { label: "✓ Sent", bg: "rgba(6,78,59,0.1)", border: "rgba(16,185,129,0.4)", text: "#34d399", dot: "#10b981" },
};

const HOSPITAL_GRADIENTS = [
  ["#2563eb", "#0ea5e9"], ["#7c3aed", "#a855f7"], ["#059669", "#10b981"],
  ["#dc2626", "#f97316"], ["#d97706", "#fbbf24"], ["#0284c7", "#38bdf8"],
  ["#7c3aed", "#ec4899"], ["#16a34a", "#4ade80"], ["#b91c1c", "#f87171"],
  ["#0369a1", "#06b6d4"], ["#4338ca", "#818cf8"], ["#be185d", "#f472b6"],
  ["#c2410c", "#fb923c"], ["#0e7490", "#22d3ee"], ["#15803d", "#86efac"],
  ["#6d28d9", "#c084fc"], ["#1d4ed8", "#93c5fd"], ["#b45309", "#fcd34d"],
  ["#334155", "#94a3b8"], ["#047857", "#6ee7b7"],
];

function AnimatedCounter({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  
  useEffect(() => {
    const start = Date.now();
    const from = 0;
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * ease));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  
  return <span>{display}</span>;
}

export default function Dashboard({ onPredictionUpdate, prediction, onStepChange }) {
  const [hospitals, setHospitals] = useState([]);
  const [nodeStatus, setNodeStatus] = useState({});
  const [nodeLoading, setNodeLoading] = useState({});
  const [encryptedDisplays, setEncryptedDisplays] = useState({});
  const [nodeWeights, setNodeWeights] = useState({});
  const [aggregating, setAggregating] = useState(false);
  const [aggregated, setAggregated] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [trainingAll, setTrainingAll] = useState(false);
  const [localStep, setLocalStep] = useState(0);
  const [error, setError] = useState(null);
  const [showWeights, setShowWeights] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [trainedThisSession, setTrainedThisSession] = useState(new Set());

  const advanceStep = (s) => { setLocalStep(s); onStepChange?.(s); };

  useEffect(() => { fetchHospitals(); fetchStatus(); }, []);

  const fetchHospitals = async () => {
    try {
      const res = await fetch(`${API}/hospitals`);
      const data = await res.json();
      setHospitals(data);
      const ids = data.map(h => h.hospital_id);
      setNodeStatus(Object.fromEntries(ids.map(id => [id, "idle"])));
      setNodeLoading(Object.fromEntries(ids.map(id => [id, false])));
    } catch {
      setError("Cannot connect to backend. Make sure Flask is running on port 5000.");
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/status`);
      const data = await res.json();
      if (data.prediction) onPredictionUpdate(data.prediction);
      if (data.trained_nodes?.length > 0) {
        const updated = {};
        data.trained_nodes.forEach(id => { updated[id] = "sent"; });
        setNodeStatus(p => ({ ...p, ...updated }));
      }
    } catch {}
  };

  const trainNode = async (hospitalId) => {
    setError(null);
    setNodeLoading(p => ({ ...p, [hospitalId]: true }));
    setNodeStatus(p => ({ ...p, [hospitalId]: "training" }));
    advanceStep(1);
    try {
      const res = await fetch(`${API}/train-node`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital_id: hospitalId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNodeWeights(p => ({ ...p, [hospitalId]: data.weights_preview }));
      setNodeStatus(p => ({ ...p, [hospitalId]: "trained" }));
      advanceStep(2);
      await new Promise(r => setTimeout(r, 400));
      setEncryptedDisplays(p => ({ ...p, [hospitalId]: data.encrypted_display }));
      setNodeStatus(p => ({ ...p, [hospitalId]: "encrypted" }));
      advanceStep(3);
      await new Promise(r => setTimeout(r, 500));
      setNodeStatus(p => ({ ...p, [hospitalId]: "sent" }));
      setTrainedThisSession(s => new Set([...s, hospitalId]));
    } catch (e) {
      setError(e.message);
      setNodeStatus(p => ({ ...p, [hospitalId]: "idle" }));
    } finally {
      setNodeLoading(p => ({ ...p, [hospitalId]: false }));
    }
  };

  const trainAll = async () => {
    setError(null);
    setTrainingAll(true);
    advanceStep(1);
    try {
      setNodeStatus(p => Object.fromEntries(Object.keys(p).map(k => [k, "training"])));
      const res = await fetch(`${API}/train-all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      advanceStep(2);
      await new Promise(r => setTimeout(r, 700));
      const encUpdated = {};
      data.trained?.forEach(({ hospital_id }) => { encUpdated[hospital_id] = "encrypted"; });
      setNodeStatus(p => ({ ...p, ...encUpdated }));
      advanceStep(3);
      await new Promise(r => setTimeout(r, 700));
      const sentUpdated = {};
      data.trained?.forEach(({ hospital_id }) => { sentUpdated[hospital_id] = "sent"; });
      setNodeStatus(p => ({ ...p, ...sentUpdated }));
      setTrainedThisSession(new Set(data.trained?.map(t => t.hospital_id) || []));
    } catch (e) {
      setError(e.message);
      setNodeStatus(p => Object.fromEntries(Object.keys(p).map(k => [k, "idle"])));
    } finally {
      setTrainingAll(false);
    }
  };

  const runAggregation = async () => {
    setError(null);
    setAggregating(true);
    advanceStep(4);
    try {
      const res = await fetch(`${API}/aggregate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAggregated(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setAggregating(false);
    }
  };

  const runPrediction = async () => {
    setError(null);
    setPredicting(true);
    advanceStep(5);
    try {
      const res = await fetch(`${API}/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onPredictionUpdate(data.prediction);
      advanceStep(6);
    } catch (e) {
      setError(e.message);
    } finally {
      setPredicting(false);
    }
  };

  const resetAll = async () => {
    await fetch(`${API}/reset`, { method: "POST" });
    const ids = hospitals.map(h => h.hospital_id);
    setNodeStatus(Object.fromEntries(ids.map(id => [id, "idle"])));
    setNodeWeights({});
    setEncryptedDisplays({});
    setAggregated(null);
    advanceStep(0);
    onPredictionUpdate(null);
    setError(null);
    setTrainedThisSession(new Set());
  };

  const trainedCount = Object.values(nodeStatus).filter(s => s === "sent" || s === "encrypted").length;
  const totalNodes = hospitals.length;
  const progressPct = totalNodes > 0 ? (trainedCount / totalNodes) * 100 : 0;
  const riskColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#10b981" };
  const riskGlow = { High: "rgba(239,68,68,0.3)", Medium: "rgba(245,158,11,0.3)", Low: "rgba(16,185,129,0.3)" };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Federated Learning Dashboard</h2>
          <p className="text-sm mt-1" style={{color: "var(--text-secondary)"}}>
            {totalNodes} hospital nodes · Train locally, aggregate securely, predict globally
          </p>
        </div>
        <button onClick={resetAll}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-medium transition-all"
          style={{background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#94a3b8"}}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
          </svg>
          Reset Session
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm fade-in"
          style={{background: "rgba(127,29,29,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171"}}>
          <span className="flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* PRIVACY STEPS */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{color: "var(--text-muted)"}}>
            Privacy Simulation Steps
          </h3>
          <div className="flex-1 h-px" style={{background: "rgba(30,58,138,0.3)"}} />
          <span className="text-xs font-semibold" style={{color: localStep >= 6 ? "#10b981" : "#3b82f6"}}>
            {localStep}/6 complete
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STEPS.map((step, i) => {
            const isActive = localStep >= step.id;
            const isCurrent = localStep === step.id - 1;
            return (
              <div key={step.id}
                className="relative p-3 rounded-xl transition-all duration-500 overflow-hidden"
                style={{
                  background: isActive ? `rgba(${hexToRgb(step.color)}, 0.08)` : "rgba(10,16,32,0.6)",
                  border: isActive ? `1px solid rgba(${hexToRgb(step.color)}, 0.35)` : "1px solid rgba(30,41,59,0.6)",
                  boxShadow: isActive ? `0 0 20px rgba(${hexToRgb(step.color)}, 0.1)` : "none",
                }}
              >
                {isCurrent && <div className="absolute inset-0 shimmer" />}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-500"
                    style={{
                      background: isActive ? step.color : "rgba(30,41,59,0.8)",
                      color: isActive ? "white" : "#475569",
                      boxShadow: isActive ? `0 0 12px rgba(${hexToRgb(step.color)}, 0.4)` : "none",
                    }}>
                    {localStep > step.id ? "✓" : step.id}
                  </div>
                </div>
                <div className="text-xs font-bold mb-1" style={{color: isActive ? step.color : "#475569"}}>
                  {step.short}
                </div>
                <div className="text-xs leading-snug line-clamp-2" style={{color: isActive ? "rgba(203,213,225,0.7)" : "#334155"}}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HOSPITAL NODES */}
      <div>
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-bold text-white">
            Hospital Nodes
            <span className="ml-2 text-xs font-normal" style={{color: "var(--text-muted)"}}>
              ({trainedCount}/{totalNodes})
            </span>
          </h3>
          <div className="flex-1 relative h-2 rounded-full overflow-hidden" style={{background: "rgba(30,41,59,0.8)"}}>
            <div className="absolute top-0 left-0 h-full rounded-full progress-bar-animated"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #3b82f6, #10b981)",
                boxShadow: "0 0 10px rgba(59,130,246,0.5)"
              }} />
          </div>
          <span className="text-xs font-bold" style={{color: progressPct === 100 ? "#10b981" : "#3b82f6"}}>
            {Math.round(progressPct)}%
          </span>
          <button
            onClick={trainAll}
            disabled={trainingAll || trainedCount === totalNodes}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-semibold transition-all"
            style={{
              background: trainedCount === totalNodes
                ? "rgba(6,78,59,0.2)"
                : trainingAll
                ? "rgba(30,41,59,0.8)"
                : "linear-gradient(135deg, #2563eb, #7c3aed)",
              border: trainedCount === totalNodes
                ? "1px solid rgba(16,185,129,0.4)"
                : trainingAll
                ? "1px solid rgba(51,65,85,0.5)"
                : "1px solid rgba(99,102,241,0.4)",
              color: trainedCount === totalNodes ? "#34d399" : trainingAll ? "#64748b" : "white",
              cursor: trainingAll || trainedCount === totalNodes ? "not-allowed" : "pointer",
              boxShadow: (!trainingAll && trainedCount < totalNodes) ? "0 0 20px rgba(99,102,241,0.3)" : "none"
            }}
          >
            {trainingAll ? (
              <>
                <span className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                Training All...
              </>
            ) : trainedCount === totalNodes ? "✓ All Trained" : "Train All Nodes"}
          </button>
        </div>

        {/* Hospital cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {hospitals.map((h, idx) => {
            const status = nodeStatus[h.hospital_id] || "idle";
            const loading = nodeLoading[h.hospital_id] || false;
            const encDisplay = encryptedDisplays[h.hospital_id];
            const cfg = STATUS_CONFIG[status];
            const [c1, c2] = HOSPITAL_GRADIENTS[idx % HOSPITAL_GRADIENTS.length];
            const isSent = status === "sent";
            const isNew = trainedThisSession.has(h.hospital_id);

            return (
              <div key={h.hospital_id}
                className="hospital-card rounded-xl p-3 cursor-pointer"
                style={{
                  background: hoveredCard === h.hospital_id ? "rgba(13,20,40,0.9)" : cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  boxShadow: isSent ? "0 0 15px rgba(16,185,129,0.08)" : "none",
                }}
                onMouseEnter={() => setHoveredCard(h.hospital_id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setShowWeights(showWeights === h.hospital_id ? null : h.hospital_id)}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: `0 0 12px ${c1}50`}}>
                    {h.hospital_id}
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold badge-animate"
                    style={{background: `rgba(${hexToRgb(cfg.dot)}, 0.15)`, border: `1px solid ${cfg.border}`, color: cfg.text}}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status === "training" ? "animate-pulse" : ""}`}
                      style={{background: cfg.dot}} />
                    <span>{cfg.label}</span>
                  </div>
                </div>

                {/* Region */}
                <p className="text-xs font-semibold text-white truncate leading-none mb-0.5">
                  {h.region.split(",")[0]}
                </p>
                <p className="text-xs truncate mb-2.5" style={{color: "var(--text-muted)"}}>
                  {h.region.split(",")[1]?.trim()}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  <div className="rounded-lg p-1.5 text-center" style={{background: "rgba(0,0,0,0.3)"}}>
                    <p className="text-xs font-bold leading-none" style={{color: "#f87171"}}>
                      {h.fever_cases}
                    </p>
                    <p className="text-xs leading-none mt-0.5" style={{color: "var(--text-muted)"}}>fever</p>
                  </div>
                  <div className="rounded-lg p-1.5 text-center" style={{background: "rgba(0,0,0,0.3)"}}>
                    <p className={`text-xs font-bold leading-none`}
                      style={{color: h.vaccination_rate >= 0.70 ? "#10b981" : h.vaccination_rate >= 0.55 ? "#f59e0b" : "#ef4444"}}>
                      {(h.vaccination_rate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs leading-none mt-0.5" style={{color: "var(--text-muted)"}}>vacc</p>
                  </div>
                </div>

                {/* Encrypted display */}
                {encDisplay && (status === "encrypted" || status === "sent") && (
                  <div className="rounded-lg p-1.5 mb-2.5" style={{background: "rgba(0,0,0,0.4)", border: "1px solid rgba(16,185,129,0.2)"}}>
                    <p className="garbled-text leading-tight break-all line-clamp-2" style={{fontSize: "0.55rem"}}>
                      {encDisplay.substring(0, 50)}...
                    </p>
                  </div>
                )}

                {/* Train button */}
                <button
                  onClick={e => { e.stopPropagation(); trainNode(h.hospital_id); }}
                  disabled={loading || isSent}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isSent
                      ? "rgba(6,78,59,0.2)"
                      : loading
                      ? "rgba(30,41,59,0.8)"
                      : `linear-gradient(135deg, ${c1}cc, ${c2}cc)`,
                    border: isSent
                      ? "1px solid rgba(16,185,129,0.3)"
                      : loading
                      ? "1px solid rgba(51,65,85,0.5)"
                      : `1px solid ${c1}50`,
                    color: isSent ? "#34d399" : loading ? "#64748b" : "white",
                    cursor: (loading || isSent) ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="w-3 h-3 border border-slate-400 border-t-white rounded-full animate-spin" />
                      Training
                    </span>
                  ) : isSent ? "✓ Sent" : "Train"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* AGGREGATION + PREDICTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aggregation */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)"}}>
              🔗
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Federated Aggregation</h3>
              <p className="text-xs" style={{color: "var(--text-muted)"}}>FedAvg on encrypted weights · Privacy preserved</p>
            </div>
          </div>

          {aggregated && (
            <div className="rounded-xl p-3 space-y-2 fade-in"
              style={{background: "rgba(6,78,59,0.08)", border: "1px solid rgba(16,185,129,0.25)"}}>
              <p className="text-xs font-semibold flex items-center gap-2" style={{color: "#34d399"}}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Aggregation Complete — {aggregated.nodes_included?.length} nodes
              </p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(aggregated.summary || {}).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 text-xs">
                    <span className="truncate" style={{color: "var(--text-muted)"}}>
                      {k.replace(/_/g, " ").slice(0, 18)}:
                    </span>
                    <span className="font-mono font-semibold" style={{color: "#86efac", flexShrink: 0}}>
                      {typeof v === "number" ? v.toFixed(3) : String(v).slice(0, 12)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={runAggregation}
            disabled={aggregating || trainedCount === 0}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
            style={{
              background: trainedCount === 0
                ? "rgba(15,23,42,0.6)"
                : aggregating
                ? "rgba(76,29,149,0.2)"
                : "linear-gradient(135deg, #7c3aed, #a855f7)",
              border: trainedCount === 0
                ? "1px solid rgba(30,41,59,0.6)"
                : "1px solid rgba(139,92,246,0.4)",
              color: trainedCount === 0 ? "#334155" : aggregating ? "#a78bfa" : "white",
              cursor: (aggregating || trainedCount === 0) ? "not-allowed" : "pointer",
              boxShadow: trainedCount > 0 && !aggregating ? "0 0 25px rgba(139,92,246,0.3)" : "none"
            }}
          >
            {aggregating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                Aggregating {trainedCount} nodes...
              </span>
            ) : aggregated ? "⚡ Re-run Aggregation" : "⚡ Run Federated Aggregation"}
          </button>
        </div>

        {/* Prediction */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)"}}>
              🤖
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Outbreak Prediction</h3>
              <p className="text-xs" style={{color: "var(--text-muted)"}}>Gemini 2.0 Flash · No raw data exposed</p>
            </div>
          </div>

          {prediction && (
            <div className="rounded-xl p-3 fade-in"
              style={{
                background: `rgba(${hexToRgb(riskColor[prediction.risk_level] || "#3b82f6")}, 0.07)`,
                border: `1px solid rgba(${hexToRgb(riskColor[prediction.risk_level] || "#3b82f6")}, 0.3)`,
              }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{color: "var(--text-secondary)"}}>Global Risk Level</span>
                <span className="text-2xl font-black" style={{color: riskColor[prediction.risk_level], textShadow: `0 0 20px ${riskColor[prediction.risk_level]}`}}>
                  {prediction.risk_level?.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div><span style={{color: "var(--text-muted)"}}>Disease: </span><span className="font-semibold text-white">{prediction.primary_disease}</span></div>
                <div><span style={{color: "var(--text-muted)"}}>Confidence: </span><span className="font-semibold text-white">{prediction.confidence}%</span></div>
                <div className="col-span-2"><span style={{color: "var(--text-muted)"}}>Peak: </span><span className="font-semibold text-white">{prediction.peak_expected}</span></div>
              </div>
              {prediction.recommendations?.slice(0, 2).map((r, i) => (
                <p key={i} className="text-xs flex items-start gap-1 mt-1" style={{color: "#cbd5e1"}}>
                  <span className="font-bold flex-shrink-0 mt-0.5" style={{color: "#60a5fa"}}>→</span>{r}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={runPrediction}
            disabled={predicting || !aggregated}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
            style={{
              background: !aggregated
                ? "rgba(15,23,42,0.6)"
                : predicting
                ? "rgba(30,58,138,0.2)"
                : "linear-gradient(135deg, #2563eb, #0ea5e9)",
              border: !aggregated
                ? "1px solid rgba(30,41,59,0.6)"
                : "1px solid rgba(59,130,246,0.4)",
              color: !aggregated ? "#334155" : predicting ? "#60a5fa" : "white",
              cursor: (predicting || !aggregated) ? "not-allowed" : "pointer",
              boxShadow: aggregated && !predicting ? "0 0 25px rgba(59,130,246,0.3)" : "none"
            }}
          >
            {predicting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                Querying Gemini AI...
              </span>
            ) : prediction ? "🔄 Re-run Prediction" : "🤖 Generate AI Prediction"}
          </button>
        </div>
      </div>

      {/* GLOBAL RISK METER */}
      {prediction && (
        <div className="relative rounded-2xl p-8 text-center overflow-hidden fade-in"
          style={{
            background: `radial-gradient(ellipse at center, rgba(${hexToRgb(riskColor[prediction.risk_level])}, 0.06) 0%, rgba(3,6,15,0.95) 70%)`,
            border: `1px solid rgba(${hexToRgb(riskColor[prediction.risk_level])}, 0.3)`,
            boxShadow: `0 0 60px rgba(${hexToRgb(riskColor[prediction.risk_level])}, 0.1)`,
          }}>
          {/* Decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[200, 280, 360].map((size, i) => (
              <div key={i} className="absolute rounded-full border"
                style={{
                  width: size, height: size,
                  borderColor: `rgba(${hexToRgb(riskColor[prediction.risk_level])}, ${0.06 - i * 0.015})`,
                  animation: `pulse-ring ${2.5 + i * 0.5}s ease-out infinite`,
                  animationDelay: `${i * 0.4}s`
                }} />
            ))}
          </div>

          <p className="text-xs uppercase tracking-[0.25em] mb-3 relative" style={{color: "var(--text-muted)"}}>
            🌍 Global Outbreak Risk Assessment
          </p>
          <p className="text-6xl font-black relative mb-2"
            style={{color: riskColor[prediction.risk_level], textShadow: `0 0 60px ${riskGlow[prediction.risk_level]}, 0 0 120px ${riskGlow[prediction.risk_level]}`}}>
            {prediction.risk_level?.toUpperCase()}
          </p>
          <p className="text-sm relative mb-4" style={{color: "var(--text-secondary)"}}>
            <span className="font-semibold text-white">{prediction.confidence}%</span> confidence
            <span className="mx-2" style={{color: "var(--text-muted)"}}>·</span>
            <span className="font-semibold" style={{color: riskColor[prediction.risk_level]}}>{prediction.primary_disease}</span>
            <span className="mx-2" style={{color: "var(--text-muted)"}}>·</span>
            Peak: {prediction.peak_expected}
          </p>
          <div className="flex flex-wrap justify-center gap-2 relative">
            {prediction.affected_regions?.map(r => (
              <span key={r} className="px-3 py-1 rounded-full text-xs font-medium"
                style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#cbd5e1"}}>
                📍 {r}
              </span>
            ))}
          </div>
          <p className="text-xs mt-4 relative" style={{color: "var(--text-muted)"}}>
            Based on federated model trained on {trainedCount} nodes · Raw data never shared · Paillier HE protected
          </p>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex) {
  if (!hex) return "59,130,246";
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : "59,130,246";
}
