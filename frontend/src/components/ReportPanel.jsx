import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const DEFAULT_API = "/api";
const API = (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes("your-backend-production-url.com"))
  ? process.env.REACT_APP_API_URL
  : DEFAULT_API;

const PIPELINE_STEPS = [
  { id: 1, icon: "🏥", label: "Training 20 Hospital Nodes", sub: "Federated local training..." },
  { id: 2, icon: "🔒", label: "Federated Aggregation (FedAvg)", sub: "Aggregating encrypted weights..." },
  { id: 3, icon: "🤖", label: "Querying Gemini AI", sub: "Generating outbreak prediction..." },
];

export default function ReportPanel({ prediction, hasAggregation, onPredictionUpdate }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineMsg, setPipelineMsg] = useState("");
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  const runFullPipeline = async () => {
    setError(null); setPipelineLoading(true);
    try {
      setPipelineStep(1); setPipelineMsg("Training 20 hospital nodes locally...");
      const r1 = await fetch(`${API}/train-all`, { method: "POST" });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error);

      setPipelineStep(2); setPipelineMsg("Running federated aggregation (FedAvg)...");
      const r2 = await fetch(`${API}/aggregate`, { method: "POST" });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error);

      setPipelineStep(3); setPipelineMsg("Querying Gemini 2.0 Flash AI...");
      const r3 = await fetch(`${API}/predict`, { method: "POST" });
      const d3 = await r3.json();
      if (!r3.ok) throw new Error(d3.error);

      onPredictionUpdate(d3.prediction);
      setPipelineMsg("");
    } catch (e) {
      setError(e.message); setPipelineMsg("");
    } finally {
      setPipelineLoading(false); setPipelineStep(0);
    }
  };

  const runPredictionOnly = async () => {
    setError(null); setPipelineLoading(true);
    setPipelineStep(3); setPipelineMsg("Querying Gemini AI for outbreak prediction...");
    try {
      const r = await fetch(`${API}/predict`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onPredictionUpdate(d.prediction);
    } catch (e) {
      setError(e.message);
    } finally {
      setPipelineLoading(false); setPipelineStep(0); setPipelineMsg("");
    }
  };

  const generateReport = async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API}/report`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadMd = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `outbreak-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  const riskColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
  const riskBg = {
    High: { bg: "rgba(127,29,29,0.12)", border: "rgba(239,68,68,0.35)", text: "#f87171" },
    Medium: { bg: "rgba(120,53,15,0.12)", border: "rgba(245,158,11,0.35)", text: "#fbbf24" },
    Low: { bg: "rgba(6,78,59,0.1)", border: "rgba(34,197,94,0.35)", text: "#4ade80" },
  };
  const rs = riskBg[prediction?.risk_level] || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Surveillance Report</h2>
          <p className="text-sm mt-1" style={{color: "var(--text-secondary)"}}>
            Gemini 2.0 Flash · AI-generated outbreak report · Based on federated model predictions
          </p>
        </div>
        {report && (
          <div className="flex gap-2">
            <button onClick={downloadMd}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-medium transition-all"
              style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#94a3b8"}}
            >
              ⬇ Download .md
            </button>
            <button onClick={() => setReport(null)}
              className="px-3 py-2 text-xs rounded-xl font-medium transition-all"
              style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#94a3b8"}}
            >
              🔄 Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm fade-in"
          style={{background: "rgba(127,29,29,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171"}}>
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-bold">Error</p>
            <p className="text-xs mt-1 leading-relaxed opacity-80">{error}</p>
            {error.includes("API") && (
              <p className="text-xs mt-2 text-yellow-400 font-medium">
                💡 Check that GEMINI_API_KEY or OPENAI_API_KEY is set correctly in backend/.env
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pipeline not run */}
      {!prediction && !pipelineLoading && (
        <div className="glass-card p-6 space-y-5 fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.3))", border: "1px solid rgba(99,102,241,0.4)"}}>
              🚀
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {hasAggregation ? "Aggregation Ready — Generate AI Prediction" : "Launch Full Pipeline"}
              </h3>
              <p className="text-sm mt-1" style={{color: "var(--text-secondary)"}}>
                {hasAggregation
                  ? "Federated aggregation complete. Run Gemini AI to generate outbreak prediction and unlock the report."
                  : "Train all 20 hospital nodes, run FedAvg aggregation, and generate a Gemini AI outbreak prediction — in one click."}
              </p>
            </div>
          </div>

          {hasAggregation ? (
            <button onClick={runPredictionOnly}
              className="w-full py-4 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
                border: "1px solid rgba(59,130,246,0.4)",
                color: "white",
                boxShadow: "0 0 30px rgba(59,130,246,0.25)"
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                🤖 Generate AI Prediction
              </span>
            </button>
          ) : (
            <button onClick={runFullPipeline}
              className="w-full py-4 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                border: "1px solid rgba(99,102,241,0.4)",
                color: "white",
                boxShadow: "0 0 30px rgba(99,102,241,0.25)"
              }}
            >
              <span className="flex items-center justify-center gap-2">⚡ Run Full Pipeline + Generate Prediction</span>
            </button>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🏥", label: "20 Hospitals", sub: "Locally trained nodes", color: "#3b82f6" },
              { icon: "🔒", label: "Paillier HE", sub: "Encrypted weight vectors", color: "#8b5cf6" },
              { icon: "🤖", label: "Gemini AI", sub: "Outbreak prediction", color: "#06b6d4" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 text-center"
                style={{background: `rgba(${hexToRgb(item.color)}, 0.06)`, border: `1px solid rgba(${hexToRgb(item.color)}, 0.2)`}}>
                <p className="text-2xl mb-1.5">{item.icon}</p>
                <p className="text-xs font-semibold text-white">{item.label}</p>
                <p className="text-xs mt-0.5" style={{color: "var(--text-muted)"}}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline running */}
      {pipelineLoading && (
        <div className="glass-card p-8 flex flex-col items-center gap-6 fade-in">
          {/* Animated loader */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" style={{animationDuration: "1.5s", animationDirection: "reverse"}} />
            <div className="absolute inset-4 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" style={{animationDuration: "2s"}} />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  pipelineStep >= step.id ? "text-white" : "text-slate-600"
                }`}
                  style={pipelineStep >= step.id ? {
                    background: pipelineStep === step.id ? "rgba(37,99,235,0.3)" : "rgba(16,185,129,0.2)",
                    border: pipelineStep === step.id ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(16,185,129,0.4)"
                  } : {
                    background: "rgba(15,23,42,0.5)",
                    border: "1px solid rgba(51,65,85,0.3)"
                  }}>
                  <span>{pipelineStep > step.id ? "✓" : step.icon}</span>
                  <span className="hidden sm:inline">{step.label.split(" ").slice(0, 2).join(" ")}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="w-6 h-px" style={{background: pipelineStep > step.id ? "rgba(16,185,129,0.5)" : "rgba(30,41,59,0.8)"}} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold" style={{color: "#60a5fa"}}>{pipelineMsg}</p>
            <p className="text-xs mt-1" style={{color: "var(--text-muted)"}}>This may take 15–45 seconds</p>
          </div>
        </div>
      )}

      {/* Prediction summary + generate report */}
      {prediction && !report && (
        <div className="space-y-4 fade-in">
          <div className="rounded-xl p-5"
            style={{background: rs.bg || "rgba(10,16,32,0.6)", border: `1px solid ${rs.border || "rgba(51,65,85,0.5)"}`}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Prediction Summary</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{background: riskColor[prediction.risk_level]}} />
                <span className="text-2xl font-black" style={{color: riskColor[prediction.risk_level]}}>
                  {prediction.risk_level}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Primary Disease", value: prediction.primary_disease, color: "white" },
                { label: "Confidence", value: `${prediction.confidence}%`, color: "#a78bfa" },
                { label: "Peak Expected", value: prediction.peak_expected, color: "#60a5fa" },
                { label: "AI Model", value: "Gemini 2.0 Flash", color: "#06b6d4" },
                { label: "Method", value: "Federated Learning", color: "#8b5cf6" },
                { label: "Privacy", value: "Zero Raw Data", color: "#22c55e" },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3"
                  style={{background: "rgba(10,16,32,0.6)", border: "1px solid rgba(30,41,59,0.6)"}}>
                  <p className="text-xs mb-1" style={{color: "var(--text-muted)"}}>{item.label}</p>
                  <p className="text-sm font-bold" style={{color: item.color}}>{item.value || "—"}</p>
                </div>
              ))}
            </div>

            {prediction.affected_regions?.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={{color: "var(--text-muted)"}}>Affected Regions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {prediction.affected_regions.map(r => (
                    <span key={r} className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(51,65,85,0.5)", color: "#cbd5e1"}}>
                      📍 {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={generateReport} disabled={loading}
            className="w-full py-4 rounded-xl text-sm font-bold transition-all"
            style={loading ? {
              background: "rgba(30,58,138,0.2)", border: "1px solid rgba(59,130,246,0.3)",
              color: "#60a5fa", cursor: "wait"
            } : {
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              border: "1px solid rgba(99,102,241,0.4)",
              color: "white",
              boxShadow: "0 0 30px rgba(99,102,241,0.25)"
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <span>Generating AI Surveillance Report...</span>
                <span className="text-xs opacity-70">(10–15 seconds)</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                📋 Generate Full AI Outbreak Report
              </span>
            )}
          </button>
        </div>
      )}

      {/* Report Content */}
      {report && (
        <div className="space-y-4 fade-in">
          {/* Report meta */}
          <div className="glass-card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span style={{color: "var(--text-muted)"}}>Model: <span className="font-semibold" style={{color: "#60a5fa"}}>Gemini 2.0 Flash</span></span>
              <span style={{color: "rgba(71,85,105,0.5)"}}>|</span>
              <span style={{color: "var(--text-muted)"}}>Method: <span className="font-semibold" style={{color: "#a78bfa"}}>Federated Learning</span></span>
              <span style={{color: "rgba(71,85,105,0.5)"}}>|</span>
              <span style={{color: "var(--text-muted)"}}>Privacy: <span className="font-semibold" style={{color: "#34d399"}}>No raw data transmitted</span></span>
              {prediction && (
                <>
                  <span style={{color: "rgba(71,85,105,0.5)"}}>|</span>
                  <span style={{color: "var(--text-muted)"}}>Risk: <span className="font-bold" style={{color: riskColor[prediction.risk_level]}}>{prediction.risk_level}</span></span>
                </>
              )}
            </div>
          </div>

          {/* Report body */}
          <div ref={printRef} className="glass-card p-6">
            <div className="markdown-body max-w-none">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </div>

          {/* Recommendations */}
          {prediction?.recommendations?.length > 0 && (
            <div className="rounded-xl p-5"
              style={{background: "rgba(37,99,235,0.06)", border: "1px solid rgba(59,130,246,0.25)"}}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{color: "#60a5fa"}}>
                🎯 Key Recommendations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prediction.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-3"
                    style={{background: "rgba(10,16,32,0.6)", border: "1px solid rgba(30,41,59,0.6)"}}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                      style={{background: "linear-gradient(135deg, #2563eb, #7c3aed)", boxShadow: "0 0 10px rgba(99,102,241,0.3)"}}>
                      {i + 1}
                    </span>
                    <span className="text-xs leading-relaxed" style={{color: "#cbd5e1"}}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy & Methodology */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          🛡️ Privacy & Methodology
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: "🔗", title: "Federated Learning", color: "#3b82f6",
              desc: "Hospital data stays on-premises. Only encrypted model weight vectors are transmitted to the aggregation server." },
            { icon: "🔒", title: "Paillier Homomorphic HE", color: "#8b5cf6",
              desc: "Encrypted weights support addition operations, enabling server-side FedAvg without decrypting individual hospital data." },
            { icon: "🤖", title: "Gemini AI Prediction", color: "#06b6d4",
              desc: "Gemini 2.0 Flash analyzes only aggregated, privacy-preserved statistics to generate actionable outbreak predictions." },
          ].map(item => (
            <div key={item.title} className="rounded-xl p-4"
              style={{background: `rgba(${hexToRgb(item.color)}, 0.06)`, border: `1px solid rgba(${hexToRgb(item.color)}, 0.2)`}}>
              <p className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                <span>{item.icon}</span>
                <span style={{color: item.color}}>{item.title}</span>
              </p>
              <p className="text-xs leading-relaxed" style={{color: "var(--text-secondary)"}}>{item.desc}</p>
            </div>
          ))}
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
