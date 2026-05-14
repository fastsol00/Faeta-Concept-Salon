import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BRAND_ADDRESS, BRAND_HOURS, BRAND_NAME } from "@/lib/brand";
import ThemeToggle from "@/components/ThemeToggle";
import faetaLogo from "@assets/faeta-logo.png";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showManage, setShowManage] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSearchCode() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) { toast({ title: "Inserisci il codice completo (6 lettere)" }); return; }
    setLocation(`/gestisci?code=${trimmed}`);
  }

  return (
    <div className="min-h-screen bg-marble flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#101010]/80 backdrop-blur-xl shadow-sm shadow-black/20">
        <div className="max-w-md mx-auto px-6 py-6 flex flex-col items-center relative">
          <div className="absolute right-6 top-6 z-10">
            <ThemeToggle compact />
          </div>
          <div className="mb-4 h-24 w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/30">
            <img src={faetaLogo} alt={BRAND_NAME} className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-black font-headline text-[#f5f2ea] tracking-tight">{BRAND_NAME}</h1>
          <p className="text-sm text-[#a8a29a] mt-1">{BRAND_HOURS}</p>
          <p className="text-xs text-[#a8a29a] mt-1">{BRAND_ADDRESS}</p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-10 flex flex-col gap-4">
        <p className="text-center text-[#a8a29a] text-sm mb-2">Cosa vuoi fare?</p>

        {/* Nuova prenotazione */}
        <button
          onClick={() => setLocation("/prenota")}
          className="w-full bg-gradient-to-br from-[#7c7266] to-[#3b3732] text-white rounded-3xl p-7 text-left shadow-xl shadow-[#7c7266]/25 hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-white text-2xl">calendar_add_on</span>
          </div>
          <h2 className="text-xl font-extrabold font-headline mb-1">Nuova Prenotazione</h2>
          <p className="text-white/70 text-sm leading-relaxed">Scegli il servizio, la data e l'orario che preferisci.</p>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm font-bold">Inizia subito</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </div>
        </button>

        {/* Gestisci prenotazione */}
        <button
          onClick={() => setShowManage(v => !v)}
          className={`w-full bg-[#101010] rounded-3xl p-7 text-left shadow-sm border-2 transition-all hover:scale-[1.01] active:scale-[0.99] ${showManage ? "border-[#7c7266]/40 shadow-md" : "border-[#303030]/50"}`}
        >
          <div className="w-12 h-12 bg-[#7c7266]/8 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#c9c1b6] text-2xl">manage_search</span>
          </div>
          <h2 className="text-xl font-extrabold font-headline text-[#f5f2ea] mb-1">Gestisci Prenotazione</h2>
          <p className="text-[#a8a29a] text-sm leading-relaxed">Hai già prenotato? Inserisci il codice per modificare o cancellare.</p>
          <div className="flex items-center gap-2 mt-4 text-[#c9c1b6]">
            <span className="text-sm font-bold">Cerca prenotazione</span>
            <span className={`material-symbols-outlined text-base transition-transform duration-200 ${showManage ? "rotate-90" : ""}`}>chevron_right</span>
          </div>
        </button>

        {/* Code input (animated expand) */}
        <div className={`overflow-hidden transition-all duration-300 ${showManage ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 p-5 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-3">Codice prenotazione</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6))}
              placeholder="Es. ABCXYZ"
              maxLength={6}
              className="w-full bg-[#161616] rounded-xl px-4 py-3.5 text-center font-mono text-xl font-bold tracking-[0.3em] text-[#f5f2ea] border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 mb-3"
            />
            <button
              onClick={handleSearchCode}
              disabled={loading || code.length < 6}
              className="w-full py-3.5 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><span className="material-symbols-outlined animate-spin text-sm">refresh</span> Cercando...</> : <><span className="material-symbols-outlined text-sm">search</span> Cerca</>}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full px-6 pb-8 flex flex-col items-center gap-3">
        <p className="text-xs text-[#a8a29a]">{BRAND_NAME} · {BRAND_ADDRESS}</p>
        {/* Admin access link */}
        <button
          onClick={() => setLocation("/admin")}
          className="flex items-center gap-1.5 text-[#a8a29a] text-xs font-medium hover:text-[#a8a29a] transition-colors group"
        >
          <span className="material-symbols-outlined text-sm opacity-60 group-hover:opacity-100 transition-opacity">admin_panel_settings</span>
          Accedi alla dashboard admin
        </button>
      </footer>
    </div>
  );
}
