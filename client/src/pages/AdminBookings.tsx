import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Service, Hairstylist } from "@shared/schema";
import DatePickerIT from "@/components/DatePickerIT";

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confermata", cls: "bg-green-100 text-green-700" },
  completed: { label: "Completata", cls: "bg-[#2c2a27] text-[#a8a29a]" },
  cancelled: { label: "Cancellata", cls: "bg-red-100 text-red-700" },
};

const MONTHS_IT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const MONTHS_FULL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
function fmtDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MONTHS_IT[dt.getMonth()]} ${dt.getFullYear()}`;
}
function fmtDateFull(d: string) {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MONTHS_FULL[dt.getMonth()]} ${dt.getFullYear()}`;
}

interface BookingForm {
  firstName: string;
  lastName: string;
  phone: string;
  serviceId: string;
  hairstylistId: string;
  date: string;
  time: string;
  notes: string;
  status: string;
}

const EMPTY_FORM: BookingForm = {
  firstName: "", lastName: "", phone: "",
  serviceId: "", hairstylistId: "",
  date: "", time: "", notes: "", status: "confirmed",
};

// ── Shared input/select class ──────────────────────────────────────────────────
const inputCls = "w-full bg-[#161616] rounded-xl px-4 py-3 text-sm text-[#f5f2ea] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 focus:border-[#7c7266]/30 transition-all";
const selectCls = "w-full bg-[#161616] rounded-xl px-4 py-3 text-sm text-[#f5f2ea] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 focus:border-[#7c7266]/30 transition-all appearance-none cursor-pointer";

// 3-dot dropdown
function ThreeDotMenu({ onEdit, onComplete, onCancel, onDelete, status }: {
  onEdit: () => void; onComplete: () => void; onCancel: () => void; onDelete: () => void; status: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1.5 hover:bg-[#161616] rounded-lg transition-colors text-[#a8a29a] hover:text-[#f5f2ea]"
      >
        <span className="material-symbols-outlined text-base">more_vert</span>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[#101010] rounded-2xl shadow-2xl border border-[#303030]/50 min-w-[190px] py-2 overflow-hidden">
          <MenuItem icon="edit" label="Modifica" onClick={() => { setOpen(false); onEdit(); }} />
          {status !== "completed" && (
            <MenuItem icon="task_alt" label="Segna come completata" onClick={() => { setOpen(false); onComplete(); }} color="text-[#a99f92]" />
          )}
          {status !== "cancelled" && (
            <MenuItem icon="cancel" label="Cancella" onClick={() => { setOpen(false); onCancel(); }} color="text-red-600" />
          )}
          <div className="my-1 border-t border-[#303030]/50" />
          <MenuItem icon="delete" label="Elimina" onClick={() => { setOpen(false); onDelete(); }} color="text-red-600" />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, color = "text-[#f5f2ea]" }: { icon: string; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition-colors ${color}`}
    >
      <span className={`material-symbols-outlined text-base ${color}`}>{icon}</span>
      {label}
    </button>
  );
}

// ── Custom Select wrapper (consistent rounded design) ─────────────────────────
function SelectField({ value, onChange, children, label }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; label?: string;
}) {
  return (
    <div className="relative">
      {label && <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={selectCls}
        >
          {children}
        </select>
        <span className="material-symbols-outlined text-[#a8a29a] text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          expand_more
        </span>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStylist, setFilterStylist] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Detail popup (click on row)
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: hairstylists = [] } = useQuery<Hairstylist[]>({ queryKey: ["/api/hairstylists"] });

  const serviceMap = new Map(services.map(s => [s.id, s]));
  const stylistMap = new Map(hairstylists.map(h => [h.id, h]));

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Prenotazione eliminata" });
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/bookings/${id}`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      const label = vars.status === "completed" ? "completata" : "cancellata";
      toast({ title: `Prenotazione segnata come ${label}` });
      // Update detail popup if open
      setDetailBooking(prev => prev && prev.id === vars.id ? { ...prev, status: vars.status } : prev);
    },
  });

  const saveBookingMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingBooking) {
        return apiRequest("PATCH", `/api/bookings/${editingBooking.id}`, data);
      }
      return apiRequest("POST", "/api/bookings/admin-create", data).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      closeModal();
      toast({ title: editingBooking ? "Prenotazione aggiornata" : "Prenotazione creata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message ?? "Operazione fallita", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bookings/mark-read"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  function openCreate() {
    setEditingBooking(null);
    setForm(EMPTY_FORM);
    setAvailableSlots([]);
    setShowModal(true);
  }

  function openEdit(b: Booking) {
    setDetailBooking(null);
    setEditingBooking(b);
    setForm({
      firstName: b.firstName,
      lastName: b.lastName,
      phone: b.phone ?? "",
      serviceId: String(b.serviceId),
      hairstylistId: String(b.hairstylistId),
      date: b.date,
      time: b.time,
      notes: b.notes ?? "",
      status: b.status,
    });
    setAvailableSlots([b.time]);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingBooking(null);
    setForm(EMPTY_FORM);
    setAvailableSlots([]);
  }

  // Fetch slots when form changes
  useEffect(() => {
    const { hairstylistId, date, serviceId } = form;
    if (!hairstylistId || !date || !serviceId) {
      setAvailableSlots([]);
      return;
    }
    const svc = services.find(s => s.id === Number(serviceId));
    if (!svc) return;
    setLoadingSlots(true);
    const params = new URLSearchParams({ date, hairstylistId, durationMinutes: String(svc.durationMinutes) });
    if (editingBooking) params.set("excludeBookingId", String(editingBooking.id));
    apiRequest("GET", `/api/available-slots?${params}`)
      .then(r => r.json())
      .then((slots: string[]) => {
        if (editingBooking && !slots.includes(editingBooking.time)) {
          setAvailableSlots([editingBooking.time, ...slots]);
        } else {
          setAvailableSlots(slots);
        }
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [form.hairstylistId, form.date, form.serviceId, services]);

  function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.serviceId || !form.hairstylistId || !form.date || !form.time) {
      toast({ title: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    saveBookingMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      serviceId: Number(form.serviceId),
      hairstylistId: Number(form.hairstylistId),
      date: form.date,
      time: form.time,
      notes: form.notes.trim() || null,
      status: form.status,
    });
  }

  const filtered = bookings.filter(b => {
    if (search) {
      const q = search.toLowerCase();
      const fullName = `${b.firstName} ${b.lastName}`.toLowerCase();
      const matchesName = fullName.includes(q);
      const matchesCode = b.bookingCode.toLowerCase().includes(q);
      if (!matchesName && !matchesCode) return false;
    }
    if (filterDate && b.date !== filterDate) return false;
    if (filterStylist && String(b.hairstylistId) !== filterStylist) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    return true;
  });

  const newCount = bookings.filter(b => b.isNew).length;
  const activeServices = services.filter(s => s.active);
  const activeHairstylists = hairstylists.filter(h => h.active);

  // Detail popup data
  const detailSvc = detailBooking ? serviceMap.get(detailBooking.serviceId) : null;
  const detailStylist = detailBooking ? stylistMap.get(detailBooking.hairstylistId) : null;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold font-headline text-[#f5f2ea] tracking-tight">Prenotazioni</h2>
            <p className="text-[#a8a29a] text-sm">{filtered.length} prenotazioni{newCount > 0 ? ` · ${newCount} nuove` : ""}</p>
          </div>
          <div className="flex gap-3">
            {newCount > 0 && (
              <button onClick={() => markReadMutation.mutate()}
                className="px-4 py-2 rounded-full bg-[#7c7266]/10 text-[#c9c1b6] text-sm font-bold flex items-center gap-2 hover:bg-[#7c7266]/20 transition-all">
                <span className="material-symbols-outlined text-base">done_all</span>
                Segna lette
              </button>
            )}
            <button
              data-testid="button-add-booking"
              onClick={openCreate}
              className="px-5 py-2.5 rounded-full bg-[#7c7266] text-white text-sm font-bold shadow-lg shadow-[#7c7266]/20 flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Nuova
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29a] text-sm">search</span>
              <input
                data-testid="search-bookings"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca cliente o codice..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#161616] rounded-xl border border-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 text-[#f5f2ea]"
              />
            </div>
            <DatePickerIT value={filterDate} onChange={setFilterDate}
              placeholder="Filtra per data"
              inputClassName="py-2.5 px-3 bg-[#161616] rounded-xl border border-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 text-[#f5f2ea] w-full" />
            <div className="relative">
              <select value={filterStylist} onChange={e => setFilterStylist(e.target.value)}
                className={selectCls + " pr-8"}>
                <option value="">Tutti gli stylist</option>
                {hairstylists.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <span className="material-symbols-outlined text-[#a8a29a] text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex gap-3 mt-3 flex-wrap items-center">
            {["", "confirmed", "completed", "cancelled"].map(s => (
              <button key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${filterStatus === s ? "bg-[#7c7266] text-white" : "bg-[#161616] text-[#a8a29a] hover:bg-[#262626]"}`}>
                {s === "" ? "Tutti" : s === "confirmed" ? "Confermate" : s === "completed" ? "Completate" : "Cancellate"}
              </button>
            ))}
            {(search || filterDate || filterStylist) && (
              <button onClick={() => { setSearch(""); setFilterDate(""); setFilterStylist(""); }}
                className="ml-auto text-xs font-bold text-[#c9c1b6] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">close</span> Rimuovi filtri
              </button>
            )}
          </div>
        </div>

        {/* Table / Cards */}
        <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#262626] rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-[#8c8478] block mb-3">search_off</span>
              <p className="font-semibold text-[#a8a29a]">Nessuna prenotazione trovata</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#080808] border-b border-[#303030]/50">
                      {["Cliente","Servizio","Hairstylist","Data & Ora","Codice","Stato",""].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-extrabold text-[#a8a29a] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303030]/30">
                    {filtered.map(b => {
                      const svc = serviceMap.get(b.serviceId);
                      const stylist = stylistMap.get(b.hairstylistId);
                      const badge = STATUS_BADGES[b.status] ?? STATUS_BADGES.confirmed;
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setDetailBooking(b)}
                          className={`hover:bg-[#080808] transition-colors cursor-pointer ${b.isNew ? "border-l-4 border-l-[#7c7266]" : ""}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#7c7266]/10 flex items-center justify-center text-[#c9c1b6] font-bold text-xs">
                                {b.firstName[0]}{b.lastName[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{b.firstName} {b.lastName}</p>
                                {b.isNew && <span className="text-[10px] font-bold text-[#c9c1b6]">NUOVA</span>}
                                {b.phone && <p className="text-xs text-[#a8a29a]">{b.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#a8a29a]">{svc?.name ?? "—"}</td>
                          <td className="px-6 py-4 text-sm">{stylist?.name ?? "—"}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium">{fmtDate(b.date)}</p>
                            <p className="text-xs text-[#a8a29a]">{b.time}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-[#a8a29a] bg-[#161616] px-2 py-1 rounded-lg">{b.bookingCode}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <ThreeDotMenu
                              onEdit={() => openEdit(b)}
                              onComplete={() => quickStatusMutation.mutate({ id: b.id, status: "completed" })}
                              onCancel={() => quickStatusMutation.mutate({ id: b.id, status: "cancelled" })}
                              onDelete={() => { if (confirm("Eliminare questa prenotazione?")) deleteMutation.mutate(b.id); }}
                              status={b.status}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-[#303030]/30">
                {filtered.map(b => {
                  const svc = serviceMap.get(b.serviceId);
                  const stylist = stylistMap.get(b.hairstylistId);
                  const badge = STATUS_BADGES[b.status] ?? STATUS_BADGES.confirmed;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setDetailBooking(b)}
                      className={`p-5 cursor-pointer hover:bg-[#080808] transition-colors ${b.isNew ? "border-l-4 border-l-[#7c7266]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#7c7266]/10 flex items-center justify-center text-[#c9c1b6] font-bold">
                            {b.firstName[0]}{b.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold">{b.firstName} {b.lastName}</p>
                            {b.phone && <p className="text-xs text-[#a8a29a]">{b.phone}</p>}
                            {b.isNew && <span className="text-[10px] font-bold text-[#c9c1b6]">NUOVA</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                          <ThreeDotMenu
                            onEdit={() => openEdit(b)}
                            onComplete={() => quickStatusMutation.mutate({ id: b.id, status: "completed" })}
                            onCancel={() => quickStatusMutation.mutate({ id: b.id, status: "cancelled" })}
                            onDelete={() => { if (confirm("Eliminare questa prenotazione?")) deleteMutation.mutate(b.id); }}
                            status={b.status}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-[#a8a29a]">
                        <p><span className="font-medium text-[#f5f2ea]">Servizio:</span> {svc?.name}</p>
                        <p><span className="font-medium text-[#f5f2ea]">Stylist:</span> {stylist?.name}</p>
                        <p><span className="font-medium text-[#f5f2ea]">Data:</span> {fmtDate(b.date)}</p>
                        <p><span className="font-medium text-[#f5f2ea]">Ora:</span> {b.time}</p>
                      </div>
                      <div className="mt-2">
                        <span className="font-mono text-xs text-[#a8a29a] bg-[#161616] px-2 py-1 rounded-lg">{b.bookingCode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 bg-[#080808]/50 border-t border-[#303030]/30">
                <p className="text-xs text-[#a8a29a] font-medium">Totale: {filtered.length} prenotazioni</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Detail popup (click on row) ─────────────────────────────────────── */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailBooking(null)} />
          <div className="relative bg-[#101010] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Dark header */}
            <div className="bg-[#050505] px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7c7266]/30 flex items-center justify-center text-white font-bold font-headline">
                    {detailBooking.firstName[0]}{detailBooking.lastName[0]}
                  </div>
                  <div>
                    <p className="text-white font-bold">{detailBooking.firstName} {detailBooking.lastName}</p>
                    {detailBooking.phone && <p className="text-white/70 text-xs">{detailBooking.phone}</p>}
                  </div>
                </div>
                <button onClick={() => setDetailBooking(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-white/60 text-base">close</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white/10 text-white/80 px-2.5 py-1 rounded-lg tracking-widest">
                  {detailBooking.bookingCode}
                </span>
                {(() => {
                  const badge = STATUS_BADGES[detailBooking.status] ?? STATUS_BADGES.confirmed;
                  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>;
                })()}
              </div>
            </div>

            {/* Detail rows */}
            <div className="divide-y divide-[#303030]/30">
              <DetailRow icon="content_cut" label="Servizio" value={detailSvc?.name ?? "—"} />
              <DetailRow icon="badge" label="Hairstylist" value={detailStylist?.name ?? "—"} />
              <DetailRow icon="calendar_month" label="Data" value={fmtDateFull(detailBooking.date)} />
              <DetailRow icon="schedule" label="Orario" value={detailBooking.time} />
              {detailSvc && detailSvc.price > 0 && (
                <DetailRow icon="payments" label="Prezzo" value={`€${detailSvc.price}`} />
              )}
              {detailBooking.notes && (
                <DetailRow icon="notes" label="Note" value={detailBooking.notes} />
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 flex gap-3 border-t border-[#303030]/30">
              <button
                onClick={() => setDetailBooking(null)}
                className="flex-1 py-3 bg-[#161616] text-[#f5f2ea] rounded-xl font-bold hover:bg-[#262626] transition-colors"
              >
                Chiudi
              </button>
              <button
                onClick={() => openEdit(detailBooking)}
                className="flex-1 py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Modifica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[#101010] rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#303030]/50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold font-headline">
                  {editingBooking ? "Modifica prenotazione" : "Nuova prenotazione"}
                </h3>
                {editingBooking && (
                  <p className="text-xs text-[#a8a29a] font-mono mt-0.5">{editingBooking.bookingCode}</p>
                )}
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-[#161616] rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[#a8a29a]">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nome *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Mario" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Cognome *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Rossi" className={inputCls} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Telefono *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  type="tel" placeholder="+39 333 123 4567" className={inputCls} />
              </div>

              {/* Service */}
              <SelectField
                label="Servizio *"
                value={form.serviceId}
                onChange={v => setForm(f => ({ ...f, serviceId: v, time: "" }))}
              >
                <option value="">Seleziona servizio</option>
                {activeServices.map(s => <option key={s.id} value={s.id}>{s.name} — {s.durationMinutes}min — €{s.price}</option>)}
              </SelectField>

              {/* Hairstylist */}
              <SelectField
                label="Hairstylist *"
                value={form.hairstylistId}
                onChange={v => setForm(f => ({ ...f, hairstylistId: v, time: "" }))}
              >
                <option value="">Seleziona hairstylist</option>
                {activeHairstylists.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </SelectField>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Data *</label>
                <DatePickerIT value={form.date}
                  onChange={v => setForm(f => ({ ...f, date: v, time: "" }))}
                  min={new Date().toISOString().split("T")[0]}
                  inputClassName={inputCls} />
              </div>

              {/* Time slots */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">
                  Orario * {loadingSlots && <span className="text-[#c9c1b6] normal-case font-normal">— caricamento...</span>}
                </label>
                {!form.hairstylistId || !form.date || !form.serviceId ? (
                  <p className="text-xs text-[#a8a29a] bg-[#161616] rounded-xl px-4 py-3">
                    Seleziona servizio, hairstylist e data per vedere gli slot disponibili
                  </p>
                ) : availableSlots.length === 0 && !loadingSlots ? (
                  <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">
                    Nessuno slot disponibile per questa data.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map(slot => (
                      <button key={slot} type="button"
                        onClick={() => setForm(f => ({ ...f, time: slot }))}
                        className={`px-3 py-2 rounded-xl text-sm font-bold transition-all border ${
                          form.time === slot
                            ? "bg-[#7c7266] text-white border-[#7c7266] shadow-md shadow-[#7c7266]/20"
                            : "bg-[#161616] text-[#f5f2ea] border-transparent hover:border-[#7c7266]/30 hover:text-[#c9c1b6]"
                        }`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status (edit only) */}
              {editingBooking && (
                <SelectField
                  label="Stato"
                  value={form.status}
                  onChange={v => setForm(f => ({ ...f, status: v }))}
                >
                  <option value="confirmed">Confermata</option>
                  <option value="completed">Completata</option>
                  <option value="cancelled">Cancellata</option>
                </SelectField>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Note (opzionale)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder=""
                  className={inputCls + " resize-none"} />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-5 border-t border-[#303030]/50 flex gap-3 flex-shrink-0">
              <button onClick={closeModal}
                className="flex-1 py-3 bg-[#161616] text-[#f5f2ea] rounded-xl font-bold hover:bg-[#262626] transition-colors">
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saveBookingMutation.isPending}
                className="flex-1 py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-50 hover:opacity-90 transition-all">
                {saveBookingMutation.isPending ? "Salvataggio..." : editingBooking ? "Salva modifiche" : "Crea prenotazione"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="w-8 h-8 bg-[#7c7266]/8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-[#c9c1b6] text-sm">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a]">{label}</p>
        <p className="text-sm font-semibold text-[#f5f2ea] break-words">{value}</p>
      </div>
    </div>
  );
}
