import React from "react";

const STATUS_CONFIG = {
  idle: {
    label: "Idle",
    color: "text-slate-400",
    bg: "bg-slate-800",
    border: "border-slate-700",
    dot: "bg-slate-500"
  },
  training: {
    label: "Training...",
    color: "text-yellow-400",
    bg: "bg-yellow-900/20",
    border: "border-yellow-700/50",
    dot: "bg-yellow-400 animate-pulse"
  },
  trained: {
    label: "Model Ready",
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-700/50",
    dot: "bg-blue-400"
  },
  encrypted: {
    label: "Encrypted",
    color: "text-violet-400",
    bg: "bg-violet-900/20",
    border: "border-violet-700/50",
    dot: "bg-violet-400 animate-pulse-slow"
  },
  sent: {
    label: "Weights Sent",
    color: "text-green-400",
    bg: "bg-green-900/20",
    border: "border-green-700/50",
    dot: "bg-green-400"
  }
};

const HOSPITAL_COLORS = {
  A: "from-blue-600 to-cyan-600",
  B: "from-violet-600 to-purple-600",
  C: "from-emerald-600 to-teal-600"
};

export default function HospitalNode({ data, status, onTrain, loading, encryptedDisplay, weights }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const gradColors = HOSPITAL_COLORS[data?.hospital_id] || "from-blue-600 to-violet-600";

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-3 transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradColors} flex items-center justify-center font-bold text-white text-sm`}>
            {data?.hospital_id}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hospital {data?.hospital_id}</p>
            <p className="text-xs text-slate-400">{data?.region}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/50 text-xs ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Fever Cases" value={data.fever_cases} unit="cases" color="text-red-400" />
          <Stat label="Respiratory" value={data.respiratory_cases} unit="cases" color="text-orange-400" />
          <Stat label="Vaccination" value={`${(data.vaccination_rate * 100).toFixed(0)}%`} color="text-green-400" />
          <Stat label="Population" value={data.population?.toLocaleString()} color="text-blue-400" />
        </div>
      )}

      {/* Weights preview */}
      {weights && status === "trained" && (
        <div className="bg-slate-900/50 rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-1.5 font-medium">Local Model Weights</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(weights).slice(0, 4).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-500 truncate pr-1">{k.replace(/_/g, " ")}:</span>
                <span className="text-blue-300 font-mono">{typeof v === "number" ? v.toFixed(4) : v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encrypted display */}
      {encryptedDisplay && (status === "encrypted" || status === "sent") && (
        <div className="bg-slate-900/70 rounded-lg p-2.5 border border-green-900/30">
          <p className="text-xs text-slate-500 mb-1.5 font-medium flex items-center gap-1">
            <span>🔒</span> Encrypted Weights (Paillier HE)
          </p>
          <pre className="garbled-text text-xs leading-relaxed overflow-hidden max-h-16">
            {encryptedDisplay}
          </pre>
        </div>
      )}

      {/* Train button */}
      <button
        onClick={onTrain}
        disabled={loading || status === "sent"}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          status === "sent"
            ? "bg-green-900/30 text-green-400 border border-green-700/30 cursor-default"
            : loading
            ? "bg-slate-700 text-slate-400 cursor-wait"
            : "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 active:scale-95"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Training Locally...
          </span>
        ) : status === "sent" ? (
          "✓ Weights Transmitted"
        ) : (
          "Train Local Model"
        )}
      </button>
    </div>
  );
}

function Stat({ label, value, unit, color }) {
  return (
    <div className="bg-slate-900/40 rounded-lg p-2">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>
        {value}
        {unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}
