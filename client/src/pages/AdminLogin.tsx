import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAdminSession } from "@/App";
import { BRAND_NAME } from "@/lib/brand";
import faetaLogo from "@assets/faeta-logo.png";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { session, setSession } = useAdminSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) setLocation("/admin/dashboard");
  }, [session, setLocation]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username: username.trim(), password });
      const user = await res.json();
      setSession(user);
    } catch (err) {
      const message = err instanceof Error && err.message.startsWith("401:")
        ? "Credenziali non valide"
        : "Errore di connessione";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-marble flex flex-col items-center justify-center px-6">
      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5 h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40">
            <img src={faetaLogo} alt={BRAND_NAME} className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-black font-headline text-[#f5f2ea] tracking-tight">{BRAND_NAME}</h1>
          <p className="text-sm text-[#a8a29a] mt-1">Pannello di amministrazione</p>
        </div>

        {/* Login card */}
        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <h2 className="text-lg font-bold font-headline text-[#f5f2ea] mb-6">Accedi</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-sm">error</span>
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Username</label>
              <input
                data-testid="input-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f2ea] placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/50 focus:border-[#7c7266]/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Password</label>
              <input
                data-testid="input-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f2ea] placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/50 focus:border-[#7c7266]/50 transition-all"
              />
            </div>
          </div>

          <button
            data-testid="btn-login"
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-4 bg-[#7c7266] text-white rounded-xl font-bold font-headline shadow-lg shadow-[#7c7266]/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="material-symbols-outlined animate-spin">refresh</span> Accesso in corso...</>
            ) : (
              <><span className="material-symbols-outlined">login</span> Accedi</>
            )}
          </button>

          <p className="text-center text-[#a8a29a] text-xs mt-4">
            Default: admin / admin123
          </p>
        </form>

        <button
          onClick={() => setLocation("/")}
          className="mt-6 w-full text-center text-[#a8a29a] text-sm hover:text-[#f5f2ea] transition-colors"
        >
          ← Torna alla prenotazione
        </button>
      </div>
    </div>
  );
}
