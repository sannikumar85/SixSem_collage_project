import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const DEFAULT_API = "/api";
const API = (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes("your-backend-production-url.com"))
  ? process.env.REACT_APP_API_URL
  : DEFAULT_API;

const PALETTE = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#06b6d4",
  "#6366f1","#f97316","#84cc16","#e879f9","#22d3ee","#fb7185",
  "#a78bfa","#34d399","#fbbf24","#60a5fa","#4ade80","#f472b6","#c084fc","#38bdf8"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip px-3 py-2.5 text-xs" style={{minWidth: 120}}>
      <p className="font-semibold mb-1.5" style={{color: "#94a3b8"}}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex justify-between gap-4" style={{color: p.color || p.fill}}>
          <span>{p.name}:</span>
          <span className="font-bold">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const start = Date.now();
    const step = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(target * ease));
      if (t < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);
  return val;
}

function KpiCard({ label, value, numValue, icon, color, sub }) {
  const count = useCountUp(numValue || 0);
  const colorsMap = {
    blue: { from: "rgba(37,99,235,0.12)", to: "rgba(37,99,235,0.04)", border: "rgba(59,130,246,0.3)", text: "#60a5fa", glow: "rgba(59,130,246,0.15)" },
    red: { from: "rgba(185,28,28,0.12)", to: "rgba(185,28,28,0.04)", border: "rgba(239,68,68,0.3)", text: "#f87171", glow: "rgba(239,68,68,0.15)" },
    green: { from: "rgba(5,150,105,0.12)", to: "rgba(5,150,105,0.04)", border: "rgba(16,185,129,0.3)", text: "#34d399", glow: "rgba(16,185,129,0.15)" },
    orange: { from: "rgba(194,65,12,0.12)", to: "rgba(194,65,12,0.04)", border: "rgba(249,115,22,0.3)", text: "#fb923c", glow: "rgba(249,115,22,0.15)" },
    violet: { from: "rgba(109,40,217,0.12)", to: "rgba(109,40,217,0.04)", border: "rgba(139,92,246,0.3)", text: "#a78bfa", glow: "rgba(139,92,246,0.15)" },
  };
  const c = colorsMap[color] || colorsMap.blue;
  return (
    <div className="kpi-card rounded-xl p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 25px ${c.glow}`,
      }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium" style={{color: "var(--text-muted)"}}>{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-extrabold stat-number" style={{color: c.text}}>
        {numValue ? count.toLocaleString() + (value?.includes('%') ? '%' : value?.includes('M') ? 'M' : '') : value}
      </p>
      {sub && <p className="text-xs mt-1" style={{color: "var(--text-muted)"}}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{color: "var(--text-muted)"}}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function DataScienceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [animateCharts, setAnimateCharts] = useState(false);

  useEffect(() => {
    fetch(`${API}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); setTimeout(() => setAnimateCharts(true), 100); })
      .catch(() => setLoading(false));
  }, []);

  const TABS = [
    { id: "overview", label: "📊 Overview" },
    { id: "trends", label: "📈 Weekly Trends" },
    { id: "comparison", label: "🔍 Comparison" },
    { id: "analysis", label: "🧬 Statistical" },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" style={{animationDirection: "reverse", animationDuration: "1.5s"}} />
      </div>
      <p className="text-sm font-medium" style={{color: "var(--text-secondary)"}}>Loading analytics data...</p>
    </div>
  );

  if (!data) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="font-semibold text-red-400">Failed to load analytics</p>
      <p className="text-sm mt-1" style={{color: "var(--text-muted)"}}>Ensure the Flask backend is running on port 5000</p>
    </div>
  );

  const { hospitals, weekly_totals, total_hospitals } = data;
  const totalFever = hospitals.reduce((s, h) => s + h.fever_cases, 0);
  const totalResp = hospitals.reduce((s, h) => s + h.respiratory_cases, 0);
  const avgVacc = (hospitals.reduce((s, h) => s + h.vaccination_rate, 0) / hospitals.length).toFixed(1);
  const totalPop = hospitals.reduce((s, h) => s + h.population, 0);
  const highestFever = hospitals.reduce((max, h) => h.fever_cases > max.fever_cases ? h : max, hospitals[0]);

  const riskDist = [
    { name: "Low Risk", value: hospitals.filter(h => h.fever_cases < 50).length, color: "#22c55e" },
    { name: "Medium Risk", value: hospitals.filter(h => h.fever_cases >= 50 && h.fever_cases < 90).length, color: "#f59e0b" },
    { name: "High Risk", value: hospitals.filter(h => h.fever_cases >= 90).length, color: "#ef4444" },
  ];

  const topHospitals = [...hospitals].sort((a, b) => b.fever_cases - a.fever_cases).slice(0, 10);
  const avgStats = {
    fever: totalFever / hospitals.length,
    resp: totalResp / hospitals.length,
    vacc: parseFloat(avgVacc),
    humidity: hospitals.reduce((s, h) => s + h.humidity, 0) / hospitals.length,
    temp: hospitals.reduce((s, h) => s + h.temperature_avg, 0) / hospitals.length,
  };

  const selectedH = hospitals.find(h => h.hospital_id === selectedHospital) || hospitals[0];
  const radarData = [
    { metric: "Fever Rate", hospital: Math.min(100, selectedH.fever_cases / 1.5), avg: Math.min(100, avgStats.fever / 1.5) },
    { metric: "Resp. Rate", hospital: Math.min(100, selectedH.respiratory_cases * 1.5), avg: Math.min(100, avgStats.resp * 1.5) },
    { metric: "Vaccination", hospital: selectedH.vaccination_rate, avg: parseFloat(avgVacc) },
    { metric: "Humidity", hospital: selectedH.humidity, avg: Math.round(avgStats.humidity) },
    { metric: "Temperature", hospital: Math.min(100, selectedH.temperature_avg * 2.5), avg: Math.min(100, avgStats.temp * 2.5) },
  ];

  const selectedWeekly = selectedH.weekly_data?.map(w => ({
    week: w.week.replace("2024-", ""),
    fever: w.fever_cases,
    respiratory: w.respiratory_cases,
  })) || [];

  const weeklyWithArea = weekly_totals.map((w, i) => ({
    ...w,
    week: w.week.replace("2024-", ""),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Analytics Dashboard</h2>
          <p className="text-sm mt-1" style={{color: "var(--text-secondary)"}}>
            Interactive analytics across {total_hospitals} hospital nodes · Federated data insights
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl"
          style={{background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399"}}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Data
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Active Hospitals" value={String(total_hospitals)} numValue={total_hospitals} icon="🏥" color="blue" sub="All online" />
        <KpiCard label="Total Fever Cases" value={`${totalFever.toLocaleString()}`} numValue={totalFever} icon="🌡️" color="red" sub="Latest week" />
        <KpiCard label="Respiratory Cases" value={`${totalResp.toLocaleString()}`} numValue={totalResp} icon="🫁" color="orange" sub="Latest week" />
        <KpiCard label="Avg Vaccination %" value={`${avgVacc}%`} numValue={parseFloat(avgVacc)} icon="💉" color="green" sub="Across all nodes" />
        <KpiCard label="Population Covered" value={`${(totalPop/1000000).toFixed(1)}M`} numValue={Math.round(totalPop/1000000)} icon="👥" color="violet" sub="Total coverage" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background: "rgba(10,16,32,0.8)", border: "1px solid rgba(30,58,138,0.25)"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={activeTab === t.id ? {
              background: "linear-gradient(135deg, rgba(37,99,235,0.8), rgba(124,58,237,0.8))",
              color: "white",
              boxShadow: "0 0 15px rgba(99,102,241,0.3)"
            } : {
              color: "#64748b"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 page-enter">
          <ChartCard title="Risk Distribution" subtitle="Across all 20 hospital nodes">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={riskDist} cx="50%" cy="50%" innerRadius={65} outerRadius={105}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent*100).toFixed(0)}%)`}
                  labelLine={{ stroke: "#334155" }}
                  isAnimationActive={animateCharts}
                >
                  {riskDist.map((e, i) => (
                    <Cell key={i} fill={e.color} stroke="#03060f" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="National Outbreak Trend" subtitle="Aggregated weekly cases — all hospitals">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weeklyWithArea}>
                <defs>
                  <linearGradient id="feverGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                <XAxis dataKey="week" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Area type="monotone" dataKey="total_fever" name="Total Fever" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#feverGrad)" dot={{ fill: "#ef4444", r: 4 }} activeDot={{ r: 7, strokeWidth: 0 }} isAnimationActive={animateCharts} />
                <Area type="monotone" dataKey="total_respiratory" name="Total Respiratory" stroke="#f97316" strokeWidth={2}
                  fill="url(#respGrad)" dot={{ fill: "#f97316", r: 3 }} isAnimationActive={animateCharts} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 10 Hospitals by Fever Cases" subtitle="Latest week · Sorted by severity" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topHospitals} margin={{ left: 0, right: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                <XAxis dataKey="region" tick={{ fill: "#475569", fontSize: 9 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Bar dataKey="fever_cases" name="Fever Cases" radius={[5, 5, 0, 0]} isAnimationActive={animateCharts}>
                  {topHospitals.map((h, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
                <Bar dataKey="respiratory_cases" name="Respiratory Cases" fill="#f97316" opacity={0.7} radius={[5, 5, 0, 0]} isAnimationActive={animateCharts} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* TRENDS */}
      {activeTab === "trends" && (
        <div className="grid grid-cols-1 gap-4 page-enter">
          <ChartCard title="National Weekly Trends" subtitle="Total cases all 20 hospitals · 10 week epidemic curve">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyWithArea}>
                <defs>
                  <linearGradient id="fGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="rGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="vGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                <XAxis dataKey="week" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#475569", fontSize: 10 }} domain={[50, 90]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Area yAxisId="left" type="monotone" dataKey="total_fever" name="Fever Cases" stroke="#ef4444" strokeWidth={2.5} fill="url(#fGrad2)" dot={{ r: 4 }} activeDot={{ r: 7 }} isAnimationActive={animateCharts} />
                <Area yAxisId="left" type="monotone" dataKey="total_respiratory" name="Respiratory" stroke="#f97316" strokeWidth={2} fill="url(#rGrad2)" dot={{ r: 3 }} isAnimationActive={animateCharts} />
                <Line yAxisId="right" type="monotone" dataKey="avg_vaccination" name="Avg Vacc %" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" isAnimationActive={animateCharts} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-white">Hospital: </span>
              <div className="flex flex-wrap gap-1.5">
                {hospitals.slice(0, 10).map(h => (
                  <button key={h.hospital_id} onClick={() => setSelectedHospital(h.hospital_id)}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                    style={(selectedHospital || hospitals[0].hospital_id) === h.hospital_id ? {
                      background: "linear-gradient(135deg, rgba(37,99,235,0.8), rgba(124,58,237,0.8))",
                      color: "white",
                      border: "1px solid rgba(99,102,241,0.4)"
                    } : {
                      background: "rgba(15,23,42,0.8)",
                      color: "#64748b",
                      border: "1px solid rgba(51,65,85,0.4)"
                    }}>
                    {h.hospital_id} · {h.region.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>
            <ChartCard title={`${selectedH.region} — Weekly Trend`} subtitle="10-week epidemic curve for selected hospital">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={selectedWeekly}>
                  <defs>
                    <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                  <XAxis dataKey="week" tick={{ fill: "#475569", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                  <Area type="monotone" dataKey="fever" name="Fever Cases" stroke="#ef4444" strokeWidth={2.5} fill="url(#sGrad)" dot={{ r: 4 }} activeDot={{ r: 7 }} isAnimationActive={animateCharts} />
                  <Line type="monotone" dataKey="respiratory" name="Respiratory" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={animateCharts} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* COMPARISON */}
      {activeTab === "comparison" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 page-enter">
          <ChartCard title="Vaccination Coverage by Hospital" subtitle="% of population vaccinated · Color coded by threshold" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hospitals} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                <XAxis dataKey="hospital_id" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} formatter={v => [`${v}%`, "Vaccination Rate"]} />
                <Bar dataKey="vaccination_rate" name="Vaccination Rate %" radius={[5, 5, 0, 0]} isAnimationActive={animateCharts}>
                  {hospitals.map((h, i) => (
                    <Cell key={i} fill={h.vaccination_rate >= 70 ? "#22c55e" : h.vaccination_rate >= 55 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Hospital Profile Analysis" subtitle="Multi-dimensional radar comparison">
            <div className="flex flex-wrap gap-1 mb-3">
              {hospitals.slice(0, 8).map(h => (
                <button key={h.hospital_id} onClick={() => setSelectedHospital(h.hospital_id)}
                  className="px-1.5 py-0.5 rounded text-xs font-medium transition-all"
                  style={(selectedHospital || hospitals[0].hospital_id) === h.hospital_id ? {
                    background: "rgba(37,99,235,0.5)", color: "white", border: "1px solid rgba(59,130,246,0.4)"
                  } : {
                    background: "rgba(15,23,42,0.8)", color: "#64748b", border: "1px solid rgba(51,65,85,0.4)"
                  }}>
                  {h.hospital_id}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(30,58,138,0.4)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 9 }} />
                <Radar name={selectedH.region} dataKey="hospital" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} isAnimationActive={animateCharts} />
                <Radar name="Average" dataKey="avg" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeDasharray="4 2" isAnimationActive={animateCharts} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Temperature vs Fever Cases" subtitle="Environmental correlation · Horizontal bars">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hospitals.slice(0, 14)} layout="vertical" margin={{ left: 55 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} />
                <YAxis dataKey="region" type="category" tick={{ fill: "#475569", fontSize: 8 }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="fever_cases" name="Fever Cases" radius={[0, 5, 5, 0]} isAnimationActive={animateCharts}>
                  {hospitals.slice(0, 14).map((h, i) => (
                    <Cell key={i} fill={h.temperature_avg > 33 ? "#ef4444" : h.temperature_avg > 28 ? "#f59e0b" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* STATISTICAL */}
      {activeTab === "analysis" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 page-enter">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Max Fever (1 hospital)", value: Math.max(...hospitals.map(h => h.fever_cases)), suffix: " cases", color: "red" },
              { label: "Min Vaccination Rate", value: `${Math.min(...hospitals.map(h => h.vaccination_rate)).toFixed(1)}%`, color: "orange" },
              { label: "Avg Humidity", value: `${(hospitals.reduce((s,h) => s+h.humidity,0)/hospitals.length).toFixed(1)}%`, color: "blue" },
              { label: "Most Affected", value: highestFever.region.split(",")[0], color: "violet" },
            ].map(s => (
              <div key={s.label} className="glass-card kpi-card p-4">
                <p className="text-xs mb-1" style={{color: "var(--text-muted)"}}>{s.label}</p>
                <p className={`text-lg font-extrabold ${
                  s.color === "red" ? "text-red-400" : s.color === "orange" ? "text-orange-400" :
                  s.color === "blue" ? "text-blue-400" : "text-violet-400"
                }`}>{s.value}{s.suffix || ""}</p>
              </div>
            ))}
          </div>

          <ChartCard title="Humidity vs Respiratory Cases" subtitle="Climate-health correlation" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...hospitals].sort((a,b) => b.humidity - a.humidity).slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                <XAxis dataKey="region" tick={{ fill: "#475569", fontSize: 9 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Bar dataKey="humidity" name="Humidity %" fill="#06b6d4" opacity={0.8} radius={[5,5,0,0]} isAnimationActive={animateCharts} />
                <Bar dataKey="respiratory_cases" name="Respiratory Cases" fill="#8b5cf6" radius={[5,5,0,0]} isAnimationActive={animateCharts} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="lg:col-span-2 glass-card p-4">
            <h3 className="text-sm font-bold text-white mb-3">All Hospitals — Data Summary</h3>
            <div className="overflow-x-auto custom-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{borderBottom: "1px solid rgba(30,41,59,0.8)"}}>
                    {["ID","Region","Fever","Resp.","Vacc%","Pop","Temp","Humidity"].map(h => (
                      <th key={h} className="text-left py-2 pr-4 font-semibold whitespace-nowrap" style={{color: "#475569"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map(h => (
                    <tr key={h.hospital_id}
                      className="transition-colors"
                      style={{borderBottom: "1px solid rgba(30,41,59,0.4)"}}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(30,41,59,0.3)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="py-2 pr-4 font-mono font-bold" style={{color: "#60a5fa"}}>{h.hospital_id}</td>
                      <td className="py-2 pr-4 font-medium text-white">{h.region.split(",")[0]}</td>
                      <td className="py-2 pr-4 font-bold" style={{color: h.fever_cases >= 90 ? "#f87171" : h.fever_cases >= 55 ? "#fbbf24" : "#4ade80"}}>{h.fever_cases}</td>
                      <td className="py-2 pr-4" style={{color: "#fb923c"}}>{h.respiratory_cases}</td>
                      <td className="py-2 pr-4 font-semibold" style={{color: h.vaccination_rate >= 70 ? "#4ade80" : h.vaccination_rate >= 55 ? "#fbbf24" : "#f87171"}}>{h.vaccination_rate}%</td>
                      <td className="py-2 pr-4" style={{color: "#94a3b8"}}>{(h.population/1000).toFixed(0)}K</td>
                      <td className="py-2 pr-4" style={{color: "#60a5fa"}}>{h.temperature_avg}°C</td>
                      <td className="py-2" style={{color: "#22d3ee"}}>{h.humidity}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
