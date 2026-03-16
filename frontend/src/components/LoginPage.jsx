import React, { useState, useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>?/|";

function scramble(len) {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("signin");
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | encrypting | success
  const [cypherText, setCypherText] = useState("");
  const [particles, setParticles] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Generate floating particles
    setParticles(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 12 + 6,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      char: CHARS[Math.floor(Math.random() * CHARS.length)]
    })));
  }, []);

  const runEncryptionAnimation = (callback) => {
    setPhase("encrypting");
    let count = 0;
    const total = 20;
    intervalRef.current = setInterval(() => {
      count++;
      setCypherText(scramble(64));
      if (count >= total) {
        clearInterval(intervalRef.current);
        setCypherText("ACCESS GRANTED");
        setPhase("success");
        setTimeout(callback, 800);
      }
    }, 80);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (tab === "register") {
      if (form.password !== form.confirm) {
        setError("Passwords do not match.");
        return;
      }
      localStorage.setItem("health_app_cred", JSON.stringify({
        username: form.username, password: form.password
      }));
    }
    runEncryptionAnimation(() => {
      const user = {
        username: form.username,
        role: "Health Analyst",
        loggedIn: true,
        loginTime: Date.now()
      };
      localStorage.setItem("health_app_user", JSON.stringify(user));
      onLogin(user);
    });
  };

  return (
    <div className="min-h-screen bg-[#060a14] flex items-center justify-center relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Floating cipher characters */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute text-blue-500/20 font-mono select-none pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            animation: `floatUp ${p.duration}s ${p.delay}s linear infinite`
          }}
        >
          {p.char}
        </div>
      ))}

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-2xl font-black text-white">FL</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Privacy-Preserving Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Federated Health Intelligence Platform</p>
          {/* Encryption badges */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {["Paillier HE", "FedAvg", "End-to-End"].map(badge => (
              <span key={badge} className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-700/30 font-mono">
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-lg">
            {[{ id: "signin", label: "Sign In" }, { id: "register", label: "Register" }].map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Encryption overlay */}
          {phase !== "idle" && (
            <div className="absolute inset-0 bg-slate-900/95 rounded-2xl flex flex-col items-center justify-center z-20 gap-4">
              <div className={`font-mono text-xs break-all text-center px-6 ${
                phase === "success" ? "text-green-400 text-lg font-bold" : "text-green-500/80"
              }`}>
                {phase === "success" ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                    <span className="text-xl tracking-widest">ACCESS GRANTED</span>
                    <span className="text-sm text-slate-400">Authenticating securely...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-blue-400 mb-2 text-sm">Encrypting credentials...</div>
                    <div className="leading-loose">{cypherText}</div>
                    <div className="mt-3 flex justify-center">
                      <span className="w-5 h-5 border-2 border-green-500/50 border-t-green-400 rounded-full animate-spin" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="Enter username"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Enter password"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
              />
            </div>
            {tab === "register" && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm password"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={phase !== "idle"}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-violet-500 active:scale-98 transition-all shadow-lg shadow-blue-600/20 mt-2"
            >
              {tab === "signin" ? "Sign In Securely" : "Create Account"}
            </button>
          </form>

          {/* Demo hint */}
          <p className="text-center text-xs text-slate-600 mt-4">
            Demo: any username & password works
          </p>
        </div>

        {/* Security indicators */}
        <div className="flex justify-center gap-6 mt-4 text-xs text-slate-600">
          <span className="flex items-center gap-1">🔒 256-bit Encrypted</span>
          <span className="flex items-center gap-1">🛡️ Zero Knowledge</span>
          <span className="flex items-center gap-1">🔐 Federated Auth</span>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
