import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import type { ShopHours, Service, BlockedSlot, Holiday, AdminUser } from "@shared/schema";
import { useAdminSession } from "@/App";
import TimeInput from "@/components/TimeInput";
import DatePickerIT from "@/components/DatePickerIT";
import { BRAND_ADDRESS, BRAND_NAME } from "@/lib/brand";

const DAYS = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];

const TABS = [
  { id: "profilo",    icon: "person",       label: "Profilo" },
  { id: "account",   icon: "lock",         label: "Account" },
  { id: "orari",     icon: "schedule",     label: "Orari" },
  { id: "festivita", icon: "event_busy",   label: "Festività" },
  { id: "servizi",   icon: "content_cut",  label: "Servizi" },
];

export default function AdminSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { session } = useAdminSession();

  const [activeTab, setActiveTab] = useState("profilo");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 min-h-screen">
        {/* Page header */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold font-headline text-[#f5f2ea] tracking-tight mb-1">Impostazioni</h2>
          <p className="text-[#a8a29a] text-sm">Gestisci profilo, orari, festività e servizi</p>
        </div>

        {/* Horizontal tab bar */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#7c7266] text-white shadow-md shadow-[#7c7266]/20"
                  : "bg-[#101010] border border-[#303030]/60 text-[#a8a29a] hover:text-[#f5f2ea] hover:border-[#7c7266]/30 hover:bg-[#7c7266]/5"
              }`}
            >
              <span className="material-symbols-outlined text-base" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "profilo" && <ProfiloTab qc={qc} toast={toast} session={session} />}
          {activeTab === "account" && <AccountTab qc={qc} toast={toast} session={session} />}
          {activeTab === "orari" && <OrariTab qc={qc} toast={toast} />}
          {activeTab === "festivita" && <FestivitaTab qc={qc} toast={toast} />}
          {activeTab === "servizi" && <ServiziTab qc={qc} toast={toast} />}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Profilo Tab ──────────────────────────────────────────────────────────────
function ProfiloTab({ qc, toast, session }: any) {
  const [displayName, setDisplayName] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: admin } = useQuery<AdminUser>({
    queryKey: ["/api/admin", session?.id],
    queryFn: () => apiRequest("GET", `/api/admin/${session!.id}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    enabled: !!session?.id,
    retry: false,
  });

  useEffect(() => {
    if (admin && !loaded) {
      setDisplayName(admin.displayName);
      setShopName(admin.shopName);
      setShopAddress(admin.shopAddress);
      setLoaded(true);
    }
  }, [admin, loaded]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/admin/${session?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin", session?.id] });
      toast({ title: "Profilo aggiornato" });
    },
  });

  return (
    <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-[#303030]/50">
        <h3 className="text-base font-bold font-headline">Profilo negozio</h3>
        <p className="text-xs text-[#a8a29a] mt-0.5">Modifica il nome di saluto e i dati del negozio</p>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">
            Nome di saluto
            <span className="ml-2 normal-case font-normal text-[#a8a29a]">— appare come "Ciao, [nome]" nella sidebar</span>
          </label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Marco"
            className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nome negozio</label>
          <input
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            placeholder={BRAND_NAME}
            className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Indirizzo negozio</label>
          <input
            value={shopAddress}
            onChange={e => setShopAddress(e.target.value)}
            placeholder={BRAND_ADDRESS}
            className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
          />
          <p className="text-[10px] text-[#a8a29a] mt-1.5">Viene usato nella pagina di conferma prenotazione per la mappa e le indicazioni.</p>
        </div>
        <button
          onClick={() => saveMutation.mutate({ displayName, shopName, shopAddress })}
          disabled={saveMutation.isPending || !displayName.trim() || !shopName.trim()}
          className="w-full py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-40 hover:opacity-90 transition-all"
        >
          {saveMutation.isPending ? "Salvataggio..." : "Salva profilo"}
        </button>
      </div>
    </div>
  );
}

// ─── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab({ qc, toast, session }: any) {
  const [newUsername, setNewUsername] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const { data: admin } = useQuery<AdminUser>({
    queryKey: ["/api/admin", session?.id],
    queryFn: () => apiRequest("GET", `/api/admin/${session!.id}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    enabled: !!session?.id,
    retry: false,
  });

  const saveUsernameMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/admin/${session?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin", session?.id] });
      setNewUsername("");
      toast({ title: "Username aggiornato" });
    },
    onError: () => toast({ title: "Errore", description: "Username già in uso o non valido", variant: "destructive" }),
  });

  const savePwdMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/admin/${session?.id}`, data).then(async r => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r;
    }),
    onSuccess: () => {
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      toast({ title: "Password aggiornata" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err?.message ?? "Password attuale non corretta", variant: "destructive" }),
  });

  function handleChangePwd() {
    if (!currentPwd || !newPwd) return toast({ title: "Compila tutti i campi", variant: "destructive" });
    if (newPwd !== confirmPwd) return toast({ title: "Le password non coincidono", variant: "destructive" });
    if (newPwd.length < 6) return toast({ title: "La nuova password deve avere almeno 6 caratteri", variant: "destructive" });
    savePwdMutation.mutate({ currentPassword: currentPwd, newPassword: newPwd });
  }

  return (
    <div className="space-y-5">
      {/* Username section */}
      <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#303030]/50">
          <h3 className="text-base font-bold font-headline">Username</h3>
          <p className="text-xs text-[#a8a29a] mt-0.5">Username attuale: <span className="font-bold text-[#f5f2ea]">{admin?.username ?? "—"}</span></p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nuovo username</label>
            <input
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder={admin?.username}
              className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
            />
          </div>
          <button
            onClick={() => saveUsernameMutation.mutate({ username: newUsername.trim() })}
            disabled={!newUsername.trim() || saveUsernameMutation.isPending}
            className="w-full py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-40 hover:opacity-90 transition-all"
          >
            {saveUsernameMutation.isPending ? "Salvataggio..." : "Aggiorna username"}
          </button>
        </div>
      </div>

      {/* Password section */}
      <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#303030]/50">
          <h3 className="text-base font-bold font-headline">Cambia password</h3>
          <p className="text-xs text-[#a8a29a] mt-0.5">Per sicurezza, inserisci prima la password attuale</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Password attuale *</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nuova password *</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Conferma nuova password *</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
            />
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-red-500 mt-1">Le password non coincidono</p>
            )}
          </div>
          <button
            onClick={handleChangePwd}
            disabled={!currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd || savePwdMutation.isPending}
            className="w-full py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-40 hover:opacity-90 transition-all"
          >
            {savePwdMutation.isPending ? "Salvataggio..." : "Cambia password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Orari Tab ────────────────────────────────────────────────────────────────
function OrariTab({ qc, toast }: any) {
  const [shopHoursBuffer, setShopHoursBuffer] = useState<ShopHours[] | null>(null);
  // Tracks which [dayOfWeek, panel] is open: panel = "mattina" | "pomeriggio" | null
  const [openPanel, setOpenPanel] = useState<{ day: number; panel: "mattina" | "pomeriggio" } | null>(null);

  const { data: shopHours = [] } = useQuery<ShopHours[]>({ queryKey: ["/api/shop-hours"] });

  const editHours = shopHoursBuffer ?? shopHours;

  const saveShopHoursMutation = useMutation({
    mutationFn: (data: any[]) => apiRequest("PUT", "/api/shop-hours", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/shop-hours"] });
      setShopHoursBuffer(null);
      setOpenPanel(null);
      toast({ title: "Orari salvati" });
    },
  });

  function defaultRow(i: number) {
    const isClosed = i === 0 || i === 1;
    return { id: i, dayOfWeek: i, openTime: isClosed ? null : "08:30", closeTime: isClosed ? null : "20:00", isClosed, lunchStart: null as string | null, lunchEnd: null as string | null };
  }

  function getBase() {
    return editHours.length ? editHours : DAYS.map((_, i) => defaultRow(i));
  }

  function updateHour(dayOfWeek: number, patch: any) {
    setShopHoursBuffer(getBase().map((h: any) => h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h));
  }

  function togglePanel(day: number, panel: "mattina" | "pomeriggio") {
    setOpenPanel(prev =>
      prev?.day === day && prev?.panel === panel ? null : { day, panel }
    );
  }

  const sortedHours = getBase().slice().sort((a: any, b: any) => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
  });

  const timeCls = "py-2.5 px-3 bg-[#161616] rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 w-full font-medium";

  return (
    <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-[#303030]/50">
        <h3 className="text-base font-bold font-headline">Orari di apertura</h3>
        <p className="text-xs text-[#a8a29a] mt-0.5">Tocca Mattina o Pomeriggio per impostare gli orari. La pausa pranzo è il gap tra i due.</p>
      </div>
      <div className="divide-y divide-[#303030]/40">
        {sortedHours.map((h: any) => {
          const buf = (getBase() as any[]).find((e: any) => e.dayOfWeek === h.dayOfWeek) ?? h;
          const isMorningOpen = openPanel?.day === h.dayOfWeek && openPanel?.panel === "mattina";
          const isAfternoonOpen = openPanel?.day === h.dayOfWeek && openPanel?.panel === "pomeriggio";

          return (
            <div key={h.dayOfWeek} className={`transition-colors ${buf.isClosed ? "bg-[#080808]" : "bg-[#101010]"}`}>
              {/* Day row */}
              <div className="flex items-center gap-3 px-5 py-4">
                {/* Day name */}
                <div className="w-24 flex-shrink-0">
                  <p className={`font-bold text-sm ${buf.isClosed ? "text-[#a8a29a]" : "text-[#f5f2ea]"}`}>{DAYS[h.dayOfWeek]}</p>
                </div>

                {/* Open/closed toggle */}
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={!buf.isClosed}
                    onChange={e => {
                      updateHour(h.dayOfWeek, e.target.checked
                        ? { isClosed: false, openTime: buf.openTime ?? "08:30", closeTime: buf.closeTime ?? "20:00", lunchStart: buf.lunchStart ?? null, lunchEnd: buf.lunchEnd ?? null }
                        : { isClosed: true, openTime: null, closeTime: null, lunchStart: null, lunchEnd: null }
                      );
                      if (!e.target.checked) setOpenPanel(null);
                    }}
                    className="sr-only peer" />
                  <div className="w-10 h-5 bg-[#303030] rounded-full peer peer-checked:bg-[#7c7266] transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 bg-[#101010] rounded-full w-4 h-4 transition-all peer-checked:translate-x-5 shadow-sm"></div>
                </label>

                {buf.isClosed ? (
                  <span className="text-xs font-semibold text-[#a8a29a]">Chiuso</span>
                ) : (
                  /* Pills row */
                  <div className="flex gap-2 flex-1">
                    {/* Mattina pill */}
                    <button
                      onClick={() => togglePanel(h.dayOfWeek, "mattina")}
                      className={`flex-1 flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-left transition-all duration-200 ${
                        isMorningOpen
                          ? "bg-[#d7d0c6]/10 border-[#d7d0c6]/40 shadow-sm"
                          : "bg-[#080808] border-[#303030]/60 hover:border-[#d7d0c6]/30 hover:bg-[#d7d0c6]/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                          isMorningOpen ? "text-[#d7d0c6]" : "text-[#a8a29a]"
                        }`}>Mattina</p>
                        <p className="text-xs font-semibold text-[#f5f2ea] truncate">
                          {buf.openTime ?? "08:30"} → {buf.lunchStart ?? buf.closeTime ?? "20:00"}
                        </p>
                      </div>
                      <span className={`material-symbols-outlined text-sm flex-shrink-0 transition-all duration-200 ${
                        isMorningOpen ? "text-[#d7d0c6] rotate-180" : "text-[#a8a29a]"
                      }`}>expand_more</span>
                    </button>

                    {/* Pomeriggio pill */}
                    <button
                      onClick={() => togglePanel(h.dayOfWeek, "pomeriggio")}
                      className={`flex-1 flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-left transition-all duration-200 ${
                        isAfternoonOpen
                          ? "bg-[#a99f92]/10 border-[#a99f92]/40 shadow-sm"
                          : "bg-[#080808] border-[#303030]/60 hover:border-[#a99f92]/30 hover:bg-[#a99f92]/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                          isAfternoonOpen ? "text-[#a99f92]" : "text-[#a8a29a]"
                        }`}>Pomeriggio</p>
                        <p className="text-xs font-semibold text-[#f5f2ea] truncate">
                          {buf.lunchEnd ?? buf.openTime ?? "08:30"} → {buf.closeTime ?? "20:00"}
                        </p>
                      </div>
                      <span className={`material-symbols-outlined text-sm flex-shrink-0 transition-all duration-200 ${
                        isAfternoonOpen ? "text-[#a99f92] rotate-180" : "text-[#a8a29a]"
                      }`}>expand_more</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mattina drilldown */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isMorningOpen ? "200px" : "0px", opacity: isMorningOpen ? 1 : 0 }}
              >
                <div className="mx-5 mb-4 bg-[#d7d0c6]/10 border border-[#d7d0c6]/25 rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#d7d0c6] mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>wb_twilight</span>
                    Orari mattina
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#d7d0c6]/70 block mb-1.5">Apertura</label>
                      <TimeInput value={buf.openTime ?? "08:30"}
                        onChange={v => updateHour(h.dayOfWeek, { openTime: v })}
                        className={timeCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#d7d0c6]/70 block mb-1.5">Fine mattina</label>
                      <TimeInput value={buf.lunchStart ?? "13:00"}
                        onChange={v => updateHour(h.dayOfWeek, { lunchStart: v })}
                        className={timeCls} />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#d7d0c6]/70 mt-2.5">Pausa facoltativa: se non impostata, il salone lavora a orario continuato.</p>
                </div>
              </div>

              {/* Pomeriggio drilldown */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isAfternoonOpen ? "200px" : "0px", opacity: isAfternoonOpen ? 1 : 0 }}
              >
                <div className="mx-5 mb-4 bg-[#a99f92]/10 border border-[#a99f92]/25 rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#a99f92] mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
                    Orari pomeriggio
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#a99f92]/70 block mb-1.5">Inizio pomeriggio</label>
                      <TimeInput value={buf.lunchEnd ?? "14:00"}
                        onChange={v => updateHour(h.dayOfWeek, { lunchEnd: v })}
                        className={timeCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#a99f92]/70 block mb-1.5">Chiusura</label>
                      <TimeInput value={buf.closeTime ?? "20:00"}
                        onChange={v => updateHour(h.dayOfWeek, { closeTime: v })}
                        className={timeCls} />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#a99f92]/70 mt-2.5">Nessuna prenotazione disponibile durante la pausa pranzo.</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-6 py-5 border-t border-[#303030]/50">
        <button
          onClick={() => saveShopHoursMutation.mutate(getBase() as any[])}
          disabled={saveShopHoursMutation.isPending || !shopHoursBuffer}
          className="w-full py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-40 hover:opacity-90 transition-all"
        >
          {saveShopHoursMutation.isPending ? "Salvataggio..." : "Salva orari"}
        </button>
      </div>
    </div>
  );
}

// ─── Festività Tab ────────────────────────────────────────────────────────────
function FestivitaTab({ qc, toast }: any) {
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({ queryKey: ["/api/holidays"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/holidays", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/holidays"] });
      setNewDate(""); setNewName(""); setShowForm(false);
      toast({ title: "Festività aggiunta" });
    },
    onError: () => toast({ title: "Data già presente o non valida", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/holidays/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/holidays"] }); toast({ title: "Festività rimossa" }); },
  });

  const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  function fmtHoliday(d: string) {
    const dt = new Date(d + "T12:00:00");
    return `${dt.getDate()} ${MONTHS_IT[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  // Sort upcoming first
  const today = new Date().toISOString().split("T")[0];
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter(h => h.date >= today);
  const past = sorted.filter(h => h.date < today);

  return (
    <div className="space-y-5">
      <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#303030]/50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-headline">Giorni di chiusura / Festività</h3>
            <p className="text-xs text-[#a8a29a] mt-0.5">Date non prenotabili dai clienti</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 rounded-full bg-[#7c7266]/10 text-[#c9c1b6] text-sm font-bold flex items-center gap-1.5 hover:bg-[#7c7266]/20 transition-all"
          >
            <span className="material-symbols-outlined text-base">{showForm ? "close" : "add"}</span>
            {showForm ? "Annulla" : "Aggiungi"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="px-6 py-5 border-b border-[#303030]/30 bg-[#080808]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Data *</label>
                <DatePickerIT value={newDate} onChange={setNewDate}
                  min={today}
                  inputClassName="w-full bg-[#101010] rounded-xl px-4 py-3 text-sm border border-[#303030]/50 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 text-[#f5f2ea]" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nome (opzionale)</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Es. Natale, Ferie estive..."
                  className="w-full bg-[#101010] rounded-xl px-4 py-3 text-sm border border-[#303030]/50 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20" />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate({ date: newDate, name: newName.trim() || "Festività" })}
              disabled={!newDate || createMutation.isPending}
              className="px-6 py-2.5 bg-[#7c7266] text-white rounded-xl font-bold shadow-md shadow-[#7c7266]/20 disabled:opacity-40 hover:opacity-90 transition-all"
            >
              {createMutation.isPending ? "..." : "Aggiungi festività"}
            </button>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#262626] rounded-xl animate-pulse" />)}
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-[#8c8478] block mb-2">event_busy</span>
            <p className="text-sm text-[#a8a29a]">Nessuna festività configurata</p>
            <p className="text-xs text-[#a8a29a] mt-1">Aggiungi le date in cui il negozio è chiuso</p>
          </div>
        ) : (
          <div>
            {upcoming.length > 0 && (
              <>
                <div className="px-6 py-3 bg-[#080808] border-b border-[#303030]/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a]">Prossime ({upcoming.length})</p>
                </div>
                <div className="divide-y divide-[#303030]/30">
                  {upcoming.map(h => (
                    <HolidayRow key={h.id} holiday={h} onDelete={() => deleteMutation.mutate(h.id)} fmtDate={fmtHoliday} isPast={false} />
                  ))}
                </div>
              </>
            )}
            {past.length > 0 && (
              <>
                <div className="px-6 py-3 bg-[#080808] border-t border-b border-[#303030]/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a]">Passate ({past.length})</p>
                </div>
                <div className="divide-y divide-[#303030]/30">
                  {past.map(h => (
                    <HolidayRow key={h.id} holiday={h} onDelete={() => deleteMutation.mutate(h.id)} fmtDate={fmtHoliday} isPast={true} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HolidayRow({ holiday, onDelete, fmtDate, isPast }: { holiday: Holiday; onDelete: () => void; fmtDate: (d: string) => string; isPast: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-6 py-4 ${isPast ? "opacity-50" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? "bg-[#161616]" : "bg-[#7c7266]/8"}`}>
        <span className={`material-symbols-outlined text-sm ${isPast ? "text-[#a8a29a]" : "text-[#c9c1b6]"}`}>event_busy</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#f5f2ea]">{holiday.name}</p>
        <p className="text-xs text-[#a8a29a]">{fmtDate(holiday.date)}</p>
      </div>
      {!isPast && (
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#a8a29a] hover:text-red-600">
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      )}
    </div>
  );
}

// ─── Servizi Tab ──────────────────────────────────────────────────────────────
function ServiziTab({ qc, toast }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState("30");
  const [newPrice, setNewPrice] = useState("");

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/services", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services"] });
      setNewName(""); setNewDuration("30"); setNewPrice(""); setShowAdd(false);
      toast({ title: "Servizio aggiunto" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/services/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/services"] }); toast({ title: "Aggiornato" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/services"] }); toast({ title: "Eliminato" }); },
  });

  return (
    <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-[#303030]/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-headline">Servizi</h3>
          <p className="text-xs text-[#a8a29a] mt-0.5">{services.length} servizi configurati</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="px-4 py-2 rounded-full bg-[#7c7266]/10 text-[#c9c1b6] text-sm font-bold flex items-center gap-1.5 hover:bg-[#7c7266]/20 transition-all"
        >
          <span className="material-symbols-outlined text-base">{showAdd ? "close" : "add"}</span>
          {showAdd ? "Annulla" : "Aggiungi"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-6 py-5 border-b border-[#303030]/30 bg-[#080808]">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nome servizio *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Es. Taglio Uomo"
                className="w-full bg-[#101010] rounded-xl px-4 py-3 text-sm border border-[#303030]/50 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Durata (min)</label>
                <input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} min="15" step="15"
                  className="w-full bg-[#101010] rounded-xl px-4 py-3 text-sm border border-[#303030]/50 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Prezzo (€)</label>
                <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} min="0"
                  className="w-full bg-[#101010] rounded-xl px-4 py-3 text-sm border border-[#303030]/50 focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20" />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate({ name: newName.trim(), durationMinutes: Number(newDuration), price: Number(newPrice) || 0, active: true })}
              disabled={!newName.trim() || createMutation.isPending}
              className="px-6 py-2.5 bg-[#7c7266] text-white rounded-xl font-bold shadow-md shadow-[#7c7266]/20 disabled:opacity-40"
            >
              {createMutation.isPending ? "..." : "Aggiungi servizio"}
            </button>
          </div>
        </div>
      )}

      {/* Service list */}
      {services.length === 0 ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-[#8c8478] block mb-2">content_cut</span>
          <p className="text-sm text-[#a8a29a]">Nessun servizio configurato</p>
        </div>
      ) : (
        <div className="divide-y divide-[#303030]/30">
          {services.map(svc => (
            <div key={svc.id} className="flex items-center gap-4 px-6 py-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${svc.active ? "bg-[#7c7266]/8" : "bg-[#161616]"}`}>
                <span className={`material-symbols-outlined text-sm ${svc.active ? "text-[#c9c1b6]" : "text-[#a8a29a]"}`}>content_cut</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${svc.active ? "text-[#f5f2ea]" : "text-[#a8a29a] line-through"}`}>{svc.name}</p>
                  {!svc.active && <span className="text-[10px] bg-[#303030] text-[#a8a29a] px-1.5 py-0.5 rounded-full font-bold">inattivo</span>}
                </div>
                <p className="text-xs text-[#a8a29a]">{svc.durationMinutes} min · €{svc.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateMutation.mutate({ id: svc.id, data: { active: !svc.active } })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${svc.active ? "bg-[#d7d0c6]/10 text-[#d7d0c6] hover:bg-[#d7d0c6]/15" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                >
                  {svc.active ? "Disattiva" : "Attiva"}
                </button>
                <button
                  onClick={() => { if (confirm(`Eliminare "${svc.name}"?`)) deleteMutation.mutate(svc.id); }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#a8a29a] hover:text-red-600"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
