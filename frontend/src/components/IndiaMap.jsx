import React, { useState, useEffect, useRef } from "react";

// ─── City pin positions as % of image dimensions (calibrated to the map image) ───
// Image is 640x640px showing India. Positions (left%, top%) tuned per state label.
const HOSPITALS = {
  A: { left: 41.0, top: 27.0, city: "North Delhi",          state: "Delhi",            abbr: "DL" },
  B: { left: 17.5, top: 60.0, city: "South Mumbai",         state: "Maharashtra",      abbr: "MH" },
  C: { left: 73.5, top: 47.0, city: "East Kolkata",         state: "West Bengal",      abbr: "WB" },
  D: { left: 46.5, top: 72.0, city: "Hyderabad",            state: "Telangana",        abbr: "TG" },
  E: { left: 38.0, top: 79.5, city: "Bengaluru",            state: "Karnataka",        abbr: "KA" },
  F: { left: 48.0, top: 82.5, city: "Chennai",              state: "Tamil Nadu",       abbr: "TN" },
  G: { left: 27.5, top: 59.0, city: "Pune",                 state: "Maharashtra",      abbr: "MH" },
  H: { left: 18.0, top: 42.5, city: "Ahmedabad",            state: "Gujarat",          abbr: "GJ" },
  I: { left: 29.5, top: 34.5, city: "Jaipur",               state: "Rajasthan",        abbr: "RJ" },
  J: { left: 47.0, top: 34.0, city: "Lucknow",              state: "Uttar Pradesh",    abbr: "UP" },
  K: { left: 57.5, top: 36.5, city: "Patna",                state: "Bihar",            abbr: "BR" },
  L: { left: 38.5, top: 50.0, city: "Bhopal",               state: "Madhya Pradesh",   abbr: "MP" },
  M: { left: 62.0, top: 58.0, city: "Bhubaneswar",          state: "Odisha",           abbr: "OD" },
  N: { left: 79.0, top: 30.5, city: "Guwahati",             state: "Assam",            abbr: "AS" },
  O: { left: 38.5, top: 21.0, city: "Chandigarh",           state: "Punjab/Haryana",   abbr: "PB" },
  P: { left: 27.5, top: 10.0, city: "Srinagar",             state: "J & K",            abbr: "JK" },
  Q: { left: 34.5, top: 93.5, city: "Thiruvananthapuram",   state: "Kerala",           abbr: "KL" },
  R: { left: 47.0, top: 53.5, city: "Nagpur",               state: "Maharashtra",      abbr: "MH" },
  S: { left: 53.5, top: 37.5, city: "Varanasi",             state: "Uttar Pradesh",    abbr: "UP" },
  T: { left: 32.0, top: 87.5, city: "Kochi",                state: "Kerala",           abbr: "KL" },
};

const RISK_COLOR   = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const RISK_GLOW    = { High: "rgba(239,68,68,0.7)", Medium: "rgba(245,158,11,0.7)", Low: "rgba(34,197,94,0.7)" };
const RISK_BG      = { High: "rgba(127,29,29,0.92)", Medium: "rgba(92,52,6,0.92)", Low: "rgba(6,60,46,0.92)" };
const RISK_BORDER  = { High: "rgba(239,68,68,0.6)", Medium: "rgba(245,158,11,0.6)", Low: "rgba(34,197,94,0.6)" };

function getHospitalRisk(hospitalId, hospitals) {
  const h = hospitals?.find(x => x.hospital_id === hospitalId);
  if (!h) return "Low";
  return h.fever_cases >= 90 ? "High" : h.fever_cases >= 55 ? "Medium" : "Low";
}

export default function IndiaMap({ prediction, hospitals }) {
  const [hovered, setHovered] = useState(null);
  const [visiblePins, setVisiblePins] = useState(new Set());
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const pinsRef = useRef({});

  // Stagger-animate pins on mount
  useEffect(() => {
    const ids = Object.keys(HOSPITALS);
    ids.forEach((id, i) => {
      setTimeout(() => {
        setVisiblePins(prev => new Set([...prev, id]));
      }, 120 + i * 60);
    });
  }, []);

  // 3D tilt on mouse move
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    setTilt({ x: -dy * 10, y: dx * 8 });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const getHInfo = (id) => hospitals?.find(h => h.hospital_id === id);

  return (
    <div className="w-full select-none">
      {/* 3D perspective wrapper */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ perspective: "1200px", perspectiveOrigin: "50% 40%", cursor: "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Inner 3D tiltable card */}
        <div
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
            borderRadius: "20px",
            overflow: "visible",
            position: "relative",
          }}
        >
          {/* Glow aura behind map */}
          <div style={{
            position: "absolute", inset: "-20px",
            background: "radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)",
            borderRadius: "30px",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          {/* The actual India map image */}
          <div style={{ position: "relative", width: "100%", zIndex: 1 }}>
            <img
              src="/india_map.png"
              alt="India Map"
              draggable={false}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "16px",
                filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.9)) brightness(1.05) saturate(1.1)",
                userSelect: "none",
              }}
            />

            {/* ─── City Pin Overlay ─── */}
            {Object.entries(HOSPITALS).map(([id, pos]) => {
              const info = getHInfo(id);
              const risk = getHospitalRisk(id, hospitals);
              const rCol  = RISK_COLOR[risk];
              const rGlow = RISK_GLOW[risk];
              const isHov = hovered === id;
              const isVis = visiblePins.has(id);
              const feverPct = info ? Math.min(100, (info.fever_cases / 120) * 100) : 30;
              const vaccPct  = info ? info.vaccination_rate : 65;
              const pinSize  = info
                ? Math.max(10, Math.min(22, 10 + (info.fever_cases / 12)))
                : 12;

              return (
                <div
                  key={id}
                  ref={el => pinsRef.current[id] = el}
                  style={{
                    position: "absolute",
                    left: `${pos.left}%`,
                    top:  `${pos.top}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: isHov ? 100 : 10,
                    opacity: isVis ? 1 : 0,
                    transition: `opacity 0.4s ease, transform 0.2s ease`,
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Pulse rings for High/Medium risk */}
                  {(risk === "High" || risk === "Medium") && (
                    <>
                      <PulseRing color={rCol} delay="0s" size={pinSize + 14} dur={risk === "High" ? "1.6s" : "2.4s"} />
                      <PulseRing color={rCol} delay="0.5s" size={pinSize + 8} dur={risk === "High" ? "1.6s" : "2.4s"} />
                    </>
                  )}

                  {/* Pin body */}
                  <div
                    style={{
                      width:  pinSize,
                      height: pinSize,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 35%, ${lighten(rCol)}, ${rCol})`,
                      border: `2px solid ${rGlow}`,
                      boxShadow: `0 0 ${isHov ? 18 : 10}px ${rGlow}, 0 0 ${isHov ? 40 : 20}px ${rGlow}40, inset 0 0 6px rgba(255,255,255,0.3)`,
                      position: "relative",
                      transform: isHov ? "scale(1.5)" : "scale(1)",
                      transition: "all 0.2s cubic-bezier(0.175,0.885,0.32,1.275)",
                    }}
                  >
                    {/* Specular highlight (3D sphere top) */}
                    <div style={{
                      position: "absolute", top: "18%", left: "18%",
                      width: "35%", height: "30%",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.5)",
                      filter: "blur(1px)",
                    }} />
                  </div>

                  {/* Hospital ID label under pin */}
                  <div style={{
                    position: "absolute",
                    top: "100%", left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "2px",
                    fontSize: "8px",
                    fontWeight: "900",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: rCol,
                    textShadow: `0 0 6px ${rGlow}`,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    lineHeight: 1,
                  }}>
                    {id}
                  </div>

                  {/* ─── TOOLTIP ─── */}
                  {isHov && (
                    <div
                      style={{
                        position: "absolute",
                        // smart positioning: flip when too far right or bottom
                        left: pos.left > 65 ? "auto" : "calc(100% + 10px)",
                        right: pos.left > 65 ? "calc(100% + 10px)" : "auto",
                        top: pos.top > 75 ? "auto" : "-8px",
                        bottom: pos.top > 75 ? "-8px" : "auto",
                        width: "200px",
                        background: RISK_BG[risk],
                        backdropFilter: "blur(20px)",
                        border: `1px solid ${RISK_BORDER[risk]}`,
                        borderRadius: "14px",
                        padding: "12px",
                        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${rGlow}20`,
                        zIndex: 200,
                        animation: "fadeInTooltip 0.15s ease-out",
                      }}
                    >
                      {/* Top accent line */}
                      <div style={{
                        position: "absolute", top: 0, left: "12px", right: "12px",
                        height: "2px", borderRadius: "2px",
                        background: `linear-gradient(90deg, transparent, ${rCol}, transparent)`,
                      }} />

                      {/* City + State */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 800, color: "white", margin: 0, lineHeight: 1.2 }}>
                            {pos.city}
                          </p>
                          <p style={{ fontSize: "9px", color: "#64748b", margin: "2px 0 0", fontWeight: 500 }}>
                            {pos.state} · Node {id}
                          </p>
                        </div>
                        <span style={{
                          fontSize: "9px", fontWeight: 800,
                          padding: "2px 7px", borderRadius: "99px",
                          background: `rgba(${hexRgb(rCol)}, 0.2)`,
                          border: `1px solid ${RISK_BORDER[risk]}`,
                          color: rCol, whiteSpace: "nowrap",
                        }}>
                          {risk} Risk
                        </span>
                      </div>

                      {/* Divider */}
                      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />

                      {info ? (
                        <>
                          {/* Stats grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "8px" }}>
                            <StatBox icon="🌡️" label="Fever" value={info.fever_cases} color="#f87171" />
                            <StatBox icon="🫁" label="Resp." value={info.respiratory_cases} color="#fb923c" />
                            <StatBox icon="💉" label="Vacc" value={`${info.vaccination_rate}%`} color="#4ade80" />
                            <StatBox icon="👥" label="Pop." value={`${(info.population/1000).toFixed(0)}K`} color="#60a5fa" />
                          </div>

                          {/* Fever progress bar */}
                          <div style={{ marginBottom: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                              <span style={{ fontSize: "8px", color: "#64748b" }}>Fever intensity</span>
                              <span style={{ fontSize: "8px", color: rCol, fontWeight: 700 }}>{info.fever_cases} cases</span>
                            </div>
                            <div style={{ height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${feverPct}%`, borderRadius: "4px",
                                background: `linear-gradient(90deg, ${rCol}80, ${rCol})`,
                                boxShadow: `0 0 6px ${rGlow}`,
                                transition: "width 0.6s ease",
                              }} />
                            </div>
                          </div>

                          {/* Vaccination bar */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                              <span style={{ fontSize: "8px", color: "#64748b" }}>Vaccination coverage</span>
                              <span style={{ fontSize: "8px", color: "#4ade80", fontWeight: 700 }}>{info.vaccination_rate}%</span>
                            </div>
                            <div style={{ height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${vaccPct}%`, borderRadius: "4px",
                                background: "linear-gradient(90deg, #10b98180, #10b981)",
                                transition: "width 0.6s ease",
                              }} />
                            </div>
                          </div>

                          {/* Climate row */}
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <span style={{ fontSize: "8.5px", color: "#94a3b8" }}>🌡 {info.temperature_avg}°C</span>
                            <span style={{ fontSize: "8.5px", color: "#94a3b8" }}>💧 {info.humidity}% Hum</span>
                          </div>
                        </>
                      ) : (
                        <p style={{ fontSize: "9px", color: "#475569" }}>No data — run pipeline first</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Legend ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "20px", marginTop: "14px", flexWrap: "wrap",
      }}>
        {["Low", "Medium", "High"].map(r => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%",
              background: RISK_COLOR[r],
              boxShadow: `0 0 8px ${RISK_GLOW[r]}`,
            }} />
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{r} Risk</span>
          </div>
        ))}
        <span style={{ fontSize: "10px", color: "#334155" }}>·</span>
        <span style={{ fontSize: "10px", color: "#334155" }}>Bubble size = fever intensity</span>
        <span style={{ fontSize: "10px", color: "#334155" }}>·</span>
        <span style={{ fontSize: "10px", color: "#334155" }}>Hover city for details</span>
      </div>

      <style>{`
        @keyframes fadeInTooltip {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseRingAnim {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────
function PulseRing({ color, delay, size, dur }) {
  return (
    <div style={{
      position: "absolute",
      top: "50%", left: "50%",
      width: `${size}px`, height: `${size}px`,
      borderRadius: "50%",
      border: `1.5px solid ${color}`,
      opacity: 0,
      animation: `pulseRingAnim ${dur} ease-out infinite`,
      animationDelay: delay,
      pointerEvents: "none",
    }} />
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px",
      padding: "5px 7px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
        <span style={{ fontSize: "10px" }}>{icon}</span>
        <span style={{ fontSize: "8px", color: "#64748b", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "59,130,246";
}

function lighten(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return hex;
  const mix = (v) => Math.min(255, parseInt(v,16) + 60).toString(16).padStart(2,"0");
  return `#${mix(r[1])}${mix(r[2])}${mix(r[3])}`;
}
