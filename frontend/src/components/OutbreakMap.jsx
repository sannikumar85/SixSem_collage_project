import React, { useState, useEffect } from "react";
import IndiaMap3D from "./IndiaMap";

const API = "http://localhost:5000/api";

const RISK_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const RISK_CONFIG = {
  High: { bg: "rgba(127,29,29,0.15)", border: "rgba(239,68,68,0.35)", text: "#f87171", badge: "rgba(239,68,68,0.15)" },
  Medium: { bg: "rgba(120,53,15,0.15)", border: "rgba(245,158,11,0.35)", text: "#fbbf24", badge: "rgba(245,158,11,0.15)" },
  Low: { bg: "rgba(6,78,59,0.12)", border: "rgba(34,197,94,0.35)", text: "#4ade80", badge: "rgba(34,197,94,0.15)" },
};

export default function OutbreakMap({ prediction }) {
  const [hospitals, setHospitals] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("fever");

  useEffect(() => {
    fetch(`${API}/hospitals`)
      .then(r => r.json())
      .then(d => { setHospitals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getRisk = (h) => {
    const fc = h.fever_cases;
    return fc >= 90 ? "High" : fc >= 50 ? "Medium" : "Low";
  };

  const sorted = [...hospitals].sort((a, b) => {
    if (sortBy === "fever") return b.fever_cases - a.fever_cases;
    if (sortBy === "vacc") return b.vaccination_rate - a.vaccination_rate;
    if (sortBy === "pop") return b.population - a.population;
    return 0;
  });

  const filtered = filter === "all" ? sorted : sorted.filter(h => {
    const fc = h.fever_cases;
    if (filter === "high") return fc >= 90;
    if (filter === "medium") return fc >= 50 && fc < 90;
    if (filter === "low") return fc < 50;
    return true;
  });

  const totalFever = hospitals.reduce((s, h) => s + h.fever_cases, 0);
  const avgVacc = hospitals.length ? (hospitals.reduce((s, h) => s + h.vaccination_rate, 0) / hospitals.length * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">India Outbreak Risk Map</h2>
          <p className="text-sm mt-1" style={{color: "var(--text-secondary)"}}>
            20 hospital nodes · 3D interactive map · Hover cities for details
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "high", "medium", "low"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === f
                  ? f === "high" ? "rgba(127,29,29,0.4)" : f === "medium" ? "rgba(120,53,15,0.4)" : f === "low" ? "rgba(6,78,59,0.3)" : "rgba(37,99,235,0.3)"
                  : "rgba(10,16,32,0.8)",
                border: filter === f
                  ? f === "high" ? "1px solid rgba(239,68,68,0.5)" : f === "medium" ? "1px solid rgba(245,158,11,0.5)" : f === "low" ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(59,130,246,0.5)"
                  : "1px solid rgba(51,65,85,0.4)",
                color: filter === f
                  ? f === "high" ? "#f87171" : f === "medium" ? "#fbbf24" : f === "low" ? "#4ade80" : "#60a5fa"
                  : "#64748b"
              }}
            >
              {f === "all" ? "🌍 All" : f === "high" ? "🔴 High" : f === "medium" ? "🟡 Medium" : "🟢 Low"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Hospitals Tracked", value: hospitals.length, icon: "🏥", color: "#3b82f6" },
          { label: "Total Fever Cases", value: totalFever.toLocaleString(), icon: "🌡️", color: "#ef4444" },
          { label: "Avg Vaccination", value: `${avgVacc}%`, icon: "💉", color: "#10b981" },
          { label: "Risk Prediction", value: prediction?.risk_level || "—", icon: "⚡", color: prediction ? RISK_COLOR[prediction.risk_level] : "#64748b" },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 kpi-card"
            style={{boxShadow: `0 0 20px rgba(${hexToRgb(s.color)}, 0.06)`}}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{color: "var(--text-muted)"}}>{s.label}</span>
              <span>{s.icon}</span>
            </div>
            <p className="text-xl font-extrabold" style={{color: s.color}}>{s.value}</p>
          </div>
        ))}
      </div>

      {!prediction && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm"
          style={{background: "rgba(120,53,15,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24"}}>
          <span>⚠️</span>
          Run the federated learning pipeline on the Dashboard to see AI risk predictions on the map.
        </div>
      )}

      {/* Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* India Map - 3D */}
        <div className="lg:col-span-3 glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Geographic Distribution</h3>
              <p className="text-xs mt-0.5" style={{color: "var(--text-muted)"}}>
                3D interactive · Rotate with mouse · Hover cities
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {["Low", "Medium", "High"].map(r => (
                <span key={r} className="flex items-center gap-1.5" style={{color: "var(--text-secondary)"}}>
                  <span className="w-2.5 h-2.5 rounded-full"
                    style={{background: RISK_COLOR[r], boxShadow: `0 0 6px ${RISK_COLOR[r]}`}} />
                  {r}
                </span>
              ))}
            </div>
          </div>
          <IndiaMap3D prediction={prediction} hospitals={hospitals} />
        </div>

        {/* Hospital List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Sort + Count */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Hospital Nodes</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{color: "var(--text-muted)"}}>{filtered.length}/{hospitals.length}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-xs rounded-lg px-2 py-1"
                style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#94a3b8", outline: "none"}}
              >
                <option value="fever">Sort: Fever</option>
                <option value="vacc">Sort: Vacc</option>
                <option value="pop">Sort: Pop</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto custom-scroll" style={{maxHeight: "530px"}}>
            {loading ? Array.from({length: 8}).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-16" />
            )) : filtered.map((h, i) => {
              const risk = getRisk(h);
              const cfg = RISK_CONFIG[risk];
              const isSelected = selectedHospital === h.hospital_id;
              return (
                <div key={h.hospital_id}
                  className="rounded-xl p-3 cursor-pointer transition-all duration-200 fade-in"
                  style={{
                    background: isSelected ? cfg.bg : "rgba(10,16,32,0.6)",
                    border: `1px solid ${isSelected ? cfg.border : "rgba(30,41,59,0.6)"}`,
                    animationDelay: `${i * 30}ms`,
                    boxShadow: isSelected ? `0 0 20px rgba(${hexToRgb(RISK_COLOR[risk])}, 0.08)` : "none",
                  }}
                  onClick={() => setSelectedHospital(isSelected ? null : h.hospital_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg text-xs font-bold text-white flex items-center justify-center flex-shrink-0"
                        style={{background: `linear-gradient(135deg, ${RISK_COLOR[risk]}66, ${RISK_COLOR[risk]}33)`, border: `1px solid ${RISK_COLOR[risk]}40`}}>
                        {h.hospital_id}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white leading-none">{h.region.split(",")[0]}</p>
                        <p className="text-xs leading-none mt-0.5" style={{color: "var(--text-muted)"}}>{h.region.split(",")[1]?.trim()}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{background: cfg.badge, color: cfg.text, border: `1px solid ${cfg.border}`}}>
                      {risk}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="flex items-center gap-1" style={{color: "#f87171"}}>
                      <span>🌡</span><span className="font-semibold">{h.fever_cases}</span>
                    </div>
                    <div className="flex items-center gap-1" style={{color: "#10b981"}}>
                      <span>💉</span><span className="font-semibold">{(h.vaccination_rate*100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1" style={{color: "#60a5fa"}}>
                      <span>👥</span><span className="font-semibold">{(h.population/1000).toFixed(0)}K</span>
                    </div>
                  </div>

                  {/* Mini fever bar */}
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{background: "rgba(30,41,59,0.8)"}}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (h.fever_cases / 120) * 100)}%`,
                        background: `linear-gradient(90deg, ${RISK_COLOR[risk]}88, ${RISK_COLOR[risk]})`,
                        boxShadow: `0 0 8px ${RISK_COLOR[risk]}80`
                      }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Prediction Panel */}
          {prediction && (
            <div className="rounded-xl p-4 mt-1 fade-in"
              style={{
                background: `rgba(${hexToRgb(RISK_COLOR[prediction.risk_level])}, 0.06)`,
                border: `1px solid rgba(${hexToRgb(RISK_COLOR[prediction.risk_level])}, 0.35)`,
              }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{background: `rgba(${hexToRgb(RISK_COLOR[prediction.risk_level])}, 0.2)`}}>
                  🤖
                </div>
                <p className="text-xs font-bold" style={{color: "#60a5fa"}}>AI Outbreak Prediction</p>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Risk Level", value: prediction.risk_level, color: RISK_COLOR[prediction.risk_level] },
                  { label: "Disease", value: prediction.primary_disease, color: "white" },
                  { label: "Confidence", value: `${prediction.confidence}%`, color: "#a78bfa" },
                  { label: "Peak", value: prediction.peak_expected, color: "#60a5fa" },
                ].map(({label, value, color}) => (
                  <div key={label} className="flex justify-between items-center">
                    <span style={{color: "var(--text-muted)"}}>{label}:</span>
                    <span className="font-semibold" style={{color}}>{value}</span>
                  </div>
                ))}
              </div>
              {prediction.affected_regions?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs mb-2" style={{color: "var(--text-muted)"}}>High Risk Regions:</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction.affected_regions.map(r => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#cbd5e1"}}>
                        📍 {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  if (!hex) return "59,130,246";
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : "59,130,246";
}
