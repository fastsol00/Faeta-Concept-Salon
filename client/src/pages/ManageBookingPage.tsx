import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BRAND_ADDRESS, BRAND_NAME } from "@/lib/brand";
import type { Booking, Service, Hairstylist } from "@shared/schema";
import mapCityImg from "@assets/map-city.jpg";

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_IT_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const DAYS_IT = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const DAYS_SHORT = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];

function fmtDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return `${DAYS_IT[dt.getDay()]}, ${dt.getDate()} ${MONTHS_IT[dt.getMonth()]} ${dt.getFullYear()}`;
}
function fmtDateIT(s: string) {
  const d = new Date(s + "T12:00:00");
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_IT_SHORT[d.getMonth()]}`;
}
function getDateString(d: Date) { return d.toISOString().split("T")[0]; }

const STATUS_LABELS: Record<string, { label: string; cls: string; icon: string }> = {
  confirmed: { label: "Confermata", cls: "bg-green-100 text-green-700", icon: "check_circle" },
  completed: { label: "Completata", cls: "bg-[#2c2a27] text-[#a8a29a]", icon: "task_alt" },
  cancelled: { label: "Cancellata", cls: "bg-red-100 text-red-600", icon: "cancel" },
};

type EditStep = 1 | 2 | 3 | 4; // service → date → stylist → time

export default function ManageBookingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Read code from URL query param ─────────────────────────────────────────
  // With hash routing the URL is: /#/gestisci?code=ABCXYZ
  // useSearch() from wouter/useHashLocation reads the search portion of the hash
  // but can be unreliable — safer to read window.location.hash directly.
  function getCodeFromHash() {
    const hash = window.location.hash; // e.g. "#/gestisci?code=ABCXYZ"
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return "";
    return new URLSearchParams(hash.slice(qIndex + 1)).get("code") ?? "";
  }
  const urlCode = getCodeFromHash();

  // ── Lookup state ────────────────────────────────────────────────────────────
  const [code, setCode] = useState(urlCode);
  const [submittedCode, setSubmittedCode] = useState<string | null>(urlCode || null);

  // On mount, read code from hash and also listen for hash changes
  useEffect(() => {
    const fromHash = getCodeFromHash();
    if (fromHash) {
      setCode(fromHash);
      setSubmittedCode(fromHash);
    }
    function onHashChange() {
      const c = getCodeFromHash();
      if (c) { setCode(c); setSubmittedCode(c); }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // ── Edit mode state ─────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editStep, setEditStep] = useState<EditStep>(1);
  const [editService, setEditService] = useState<Service | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStylist, setEditStylist] = useState<Hairstylist | null>(null);
  const [editTime, setEditTime] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: bookingData, isLoading, isError } = useQuery<{
    booking: Booking; service: Service; hairstylist: Hairstylist; shopAddress: string; shopName?: string;
  }>({
    queryKey: ["/api/bookings/by-code", submittedCode],
    queryFn: () => apiRequest("GET", `/api/bookings/by-code/${submittedCode}`).then(r => r.json()),
    enabled: !!submittedCode,
    retry: false,
  });

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: hairstylists = [] } = useQuery<Hairstylist[]>({ queryKey: ["/api/hairstylists"] });
  const { data: holidays = [] } = useQuery<any[]>({ queryKey: ["/api/holidays"] });

  const activeServices = services.filter(s => s.active);
  const activeHairstylists = hairstylists.filter(h => h.active);
  const holidayDates = new Set(holidays.map((h: any) => h.date));

  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery<string[]>({
    queryKey: ["/api/available-slots", editStylist?.id, editDate, editService?.durationMinutes, bookingData?.booking?.id],
    queryFn: () => apiRequest("GET", `/api/available-slots?hairstylistId=${editStylist!.id}&date=${editDate}&durationMinutes=${editService!.durationMinutes}&excludeBookingId=${bookingData!.booking.id}`).then(r => r.json()),
    enabled: !!(editStylist && editDate && editService && editMode),
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/bookings/${id}`, { status: "cancelled" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bookings/by-code", submittedCode] });
      setShowConfirmCancel(false);
      toast({ title: "Prenotazione cancellata" });
    },
  });

  const modifyMutation = useMutation({
    mutationFn: async ({ oldId, newData }: { oldId: number; newData: any }) => {
      // 1. Create the new booking
      const created = await apiRequest("POST", "/api/bookings", newData).then(r => r.json());
      // 2. Cancel the old booking
      await apiRequest("PATCH", `/api/bookings/${oldId}`, { status: "cancelled" });
      return created;
    },
    onSuccess: (newBooking) => {
      toast({ title: "Prenotazione modificata!", description: "Il tuo nuovo codice è " + newBooking.bookingCode });
      setLocation(`/conferma/${newBooking.id}`);
    },
    onError: () => {
      toast({ title: "Errore", description: "Slot non più disponibile, riprova", variant: "destructive" });
    },
  });

  // ── Calendar days ────────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startOffset = (firstDay + 6) % 7;
    const days: any[] = [];
    for (let i = 0; i < startOffset; i++) days.push({ day: -1, dateStr: "", isDisabled: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const dow = dt.getDay();
      const dateStr = getDateString(dt);
      const isPast = dt < today;
      const isClosedDay = dow === 0 || dow === 1;
      const isHoliday = holidayDates.has(dateStr);
      days.push({ day: d, dateStr, isDisabled: isClosedDay || isPast || isHoliday, isToday: dateStr === getDateString(today), isHoliday });
    }
    return days;
  }, [calendarMonth, holidayDates]);

  const morningSlots = availableSlots.filter(s => parseInt(s) < 13);
  const afternoonSlots = availableSlots.filter(s => parseInt(s) >= 13);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast({ title: "Codice non valido", description: "Inserisci le 6 lettere del codice prenotazione", variant: "destructive" });
      return;
    }
    setSubmittedCode(trimmed);
    setEditMode(false);
  }

  function enterEditMode() {
    if (!bookingData) return;
    const { booking, service, hairstylist } = bookingData;
    // Pre-populate with current booking data
    setEditService(service);
    setEditStylist(hairstylist);
    const dt = new Date(booking.date + "T12:00:00");
    setCalendarMonth({ year: dt.getFullYear(), month: dt.getMonth() });
    setEditDate(booking.date);
    setEditTime(booking.time);
    setEditStep(1);
    setEditMode(true);
  }

  function confirmModify() {
    if (!bookingData || !editService || !editStylist || !editDate || !editTime) return;
    const b = bookingData.booking;
    modifyMutation.mutate({
      oldId: b.id,
      newData: {
        firstName: b.firstName,
        lastName: b.lastName,
        phone: b.phone,
        notes: b.notes,
        serviceId: editService.id,
        hairstylistId: editStylist.id,
        date: editDate,
        time: editTime,
        status: "confirmed",
      },
    });
    setShowConfirmEdit(false);
  }

  const b = bookingData?.booking;
  const svc = bookingData?.service;
  const stylist = bookingData?.hairstylist;
  const shopAddress = bookingData?.shopAddress ?? BRAND_ADDRESS;
  const shopName = bookingData?.shopName ?? BRAND_NAME;
  const isCancelled = b?.status === "cancelled";
  const isCompleted = b?.status === "completed";
  const statusInfo = b ? (STATUS_LABELS[b.status] ?? STATUS_LABELS.confirmed) : null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shopAddress)}`;

  const EDIT_STEP_LABELS = ["1. Servizio", "2. Data", "3. Stylist", "4. Orario"];

  // ── Edit flow (modal-like overlay) ──────────────────────────────────────────
  if (editMode && b) {
    return (
      <div className="min-h-screen bg-marble text-[#f5f2ea] pb-32">
        {/* Edit header */}
        <header className="sticky top-0 z-50 bg-[#101010]/90 backdrop-blur-xl shadow-sm">
          <div className="max-w-md mx-auto flex items-center justify-between px-5 py-4">
            <button
              onClick={() => editStep > 1 ? setEditStep(s => (s - 1) as EditStep) : setEditMode(false)}
              className="p-2 hover:bg-[#1b1b1b] rounded-full active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[#a8a29a]">arrow_back</span>
            </button>
            <div className="text-center">
              <h1 className="text-base font-black font-headline text-[#f5f2ea] leading-none">Modifica prenotazione</h1>
              <span className="text-[10px] text-[#a8a29a] font-medium">Codice {b.bookingCode}</span>
            </div>
            <button onClick={() => setEditMode(false)} className="p-2 hover:bg-[#1b1b1b] rounded-full">
              <span className="material-symbols-outlined text-[#a8a29a]">close</span>
            </button>
          </div>
          {/* Progress bar */}
          <div className="px-5 pb-3">
            <div className="flex gap-1.5 mb-1.5">
              {([1, 2, 3, 4] as EditStep[]).map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${editStep >= s ? "bg-[#7c7266]" : "bg-[#303030]"}`} />
              ))}
            </div>
            <p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-widest">{EDIT_STEP_LABELS[editStep - 1]}</p>
          </div>
        </header>

        <main className="pt-6 px-5 max-w-md mx-auto">
          {/* Current booking summary pill */}
          <div className="bg-[#f5f2ea]/5 border border-[#f5f2ea]/10 rounded-xl p-3 flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-[#a8a29a] text-base">info</span>
            <p className="text-xs text-[#a8a29a]">Stai modificando: <strong className="text-[#f5f2ea]">{svc?.name}</strong> il <strong className="text-[#f5f2ea]">{fmtDate(b.date)}</strong> alle <strong className="text-[#f5f2ea]">{b.time}</strong></p>
          </div>

          {/* Step 1 — Servizio */}
          {editStep === 1 && (
            <section>
              <h2 className="text-xl font-extrabold font-headline tracking-tight mb-1">Scegli il servizio</h2>
              <p className="text-[#a8a29a] text-sm mb-5">Puoi cambiare servizio oppure mantenere quello attuale.</p>
              <div className="bg-[#101010] rounded-2xl overflow-hidden divide-y divide-[#303030]/50 shadow-sm">
                {activeServices.map(sv => {
                  const isCurrent = editService?.id === sv.id;
                  return (
                    <button
                      key={sv.id}
                      onClick={() => { setEditService(sv); setEditStep(2); }}
                      className={`w-full flex items-center justify-between p-5 transition-colors text-left ${isCurrent ? "bg-[#7c7266]/5" : "hover:bg-[#161616]"}`}
                    >
                      <div className="flex items-center gap-3">
                        {isCurrent && <span className="material-symbols-outlined text-[#c9c1b6] text-sm">check_circle</span>}
                        <div>
                          <p className={`font-bold ${isCurrent ? "text-[#c9c1b6]" : "text-[#f5f2ea]"}`}>{sv.name}</p>
                          <p className="text-sm text-[#a8a29a] mt-0.5">{sv.durationMinutes} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{sv.price > 0 ? `€${sv.price}` : "—"}</span>
                        <span className="material-symbols-outlined text-[#8c8478]">chevron_right</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 2 — Data */}
          {editStep === 2 && (
            <section>
              <h2 className="text-xl font-extrabold font-headline tracking-tight mb-5">Scegli la data</h2>
              <div className="bg-[#7c7266]/5 border border-[#7c7266]/20 rounded-xl p-4 flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-[#c9c1b6]">content_cut</span>
                <div>
                  <p className="font-bold text-sm">{editService?.name}</p>
                  <p className="text-xs text-[#a8a29a]">{editService?.durationMinutes} min · €{editService?.price}</p>
                </div>
              </div>
              <div className="bg-[#101010] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-[#c9c1b6] font-headline">{MONTHS_IT[calendarMonth.month]} {calendarMonth.year}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setCalendarMonth(p => { const m = p.month - 1; return m < 0 ? { year: p.year - 1, month: 11 } : { ...p, month: m }; })} className="p-1.5 bg-[#161616] rounded-full hover:bg-[#262626]">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button onClick={() => setCalendarMonth(p => { const m = p.month + 1; return m > 11 ? { year: p.year + 1, month: 0 } : { ...p, month: m }; })} className="p-1.5 bg-[#161616] rounded-full hover:bg-[#262626]">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center mb-3">
                  {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(d => (
                    <span key={d} className="text-[10px] font-bold text-[#a8a29a] uppercase">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {calendarDays.map((cell, i) => {
                    if (cell.day === -1) return <div key={`e-${i}`} />;
                    const isSel = editDate === cell.dateStr;
                    return (
                      <button
                        key={cell.dateStr}
                        disabled={cell.isDisabled}
                        onClick={() => { setEditDate(cell.dateStr); setEditTime(""); setEditStep(3); }}
                        className={`w-9 h-9 mx-auto text-sm font-semibold rounded-full transition-all
                          ${cell.isDisabled ? "text-[#8c8478] cursor-not-allowed" : "hover:bg-[#161616] cursor-pointer"}
                          ${isSel ? "bg-[#7c7266] text-white font-bold shadow-md shadow-[#7c7266]/20" : ""}
                          ${cell.isToday && !isSel ? "ring-2 ring-[#7c7266]/40" : ""}
                        `}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#a8a29a] mt-3 text-center">Domenica, lunedì e festività non prenotabili</p>
              </div>
            </section>
          )}

          {/* Step 3 — Stylist */}
          {editStep === 3 && (
            <section>
              <h2 className="text-xl font-extrabold font-headline tracking-tight mb-1">Scegli lo stylist</h2>
              <p className="text-[#a8a29a] text-sm mb-5">Per {fmtDateIT(editDate)}</p>
              <div className="space-y-3">
                {activeHairstylists.map(h => {
                  const isCurrent = editStylist?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => { setEditStylist(h); setEditTime(""); setEditStep(4); }}
                      className={`w-full bg-[#101010] rounded-2xl p-5 flex items-center gap-4 shadow-sm border-2 transition-all text-left ${isCurrent ? "border-[#7c7266]" : "border-transparent hover:border-[#303030]"}`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl font-headline ${["bg-[#7c7266]/10 text-[#c9c1b6]", "bg-[#a99f92]/10 text-[#a99f92]", "bg-[#d7d0c6]/10 text-[#d7d0c6]"][h.id % 3]}`}>
                        {h.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{h.name}</p>
                        <p className="text-sm text-[#a8a29a]">{h.specialization || "Specialista"}</p>
                      </div>
                      {isCurrent && <span className="material-symbols-outlined text-[#c9c1b6]">check_circle</span>}
                      <span className="material-symbols-outlined text-[#8c8478]">chevron_right</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 4 — Orario */}
          {editStep === 4 && (
            <section>
              <h2 className="text-xl font-extrabold font-headline tracking-tight mb-1">Scegli l'orario</h2>
              <p className="text-[#a8a29a] text-sm mb-5">{fmtDateIT(editDate)} · {editStylist?.name}</p>
              {slotsLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[#262626] rounded-xl animate-pulse" />)}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-5xl text-[#8c8478] block mb-3">schedule</span>
                  <p className="font-semibold">Nessuno slot disponibile</p>
                  <p className="text-sm text-[#a8a29a] mt-1">Prova un'altra data o stylist</p>
                  <button onClick={() => setEditStep(2)} className="mt-4 text-[#c9c1b6] font-bold text-sm">← Cambia data</button>
                </div>
              ) : (
                <>
                  {morningSlots.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-widest flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-sm">wb_twilight</span>Mattina
                      </p>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {morningSlots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => { setEditTime(slot); setShowConfirmEdit(true); }}
                            className={`py-3 rounded-xl text-sm font-semibold transition-all border ${editTime === slot ? "bg-[#7c7266] text-white border-[#7c7266]" : "border-[#4a433c]/50 hover:border-[#7c7266] hover:text-[#c9c1b6]"}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {afternoonSlots.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-widest flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-sm">light_mode</span>Pomeriggio
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {afternoonSlots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => { setEditTime(slot); setShowConfirmEdit(true); }}
                            className={`py-3 rounded-xl text-sm font-semibold transition-all border ${editTime === slot ? "bg-[#7c7266] text-white border-[#7c7266]" : "border-[#4a433c]/50 hover:border-[#7c7266] hover:text-[#c9c1b6]"}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          )}
        </main>

        {/* Confirm edit modal */}
        {showConfirmEdit && b && editService && editStylist && editDate && editTime && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmEdit(false)} />
            <div className="relative bg-[#101010] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="w-12 h-12 bg-[#7c7266]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[#c9c1b6] text-2xl">edit_calendar</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-center mb-4">Conferma modifica</h3>

              {/* Confronto vecchio → nuovo */}
              <div className="space-y-3 mb-6">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Prenotazione attuale (verrà cancellata)</p>
                  <p className="text-sm font-semibold text-[#f5f2ea]">{svc?.name} · {stylist?.name}</p>
                  <p className="text-sm text-[#a8a29a]">{fmtDate(b.date)} alle {b.time}</p>
                </div>
                <div className="flex justify-center">
                  <span className="material-symbols-outlined text-[#c9c1b6]">arrow_downward</span>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-1">Nuova prenotazione</p>
                  <p className="text-sm font-semibold text-[#f5f2ea]">{editService.name} · {editStylist.name}</p>
                  <p className="text-sm text-[#a8a29a]">{fmtDate(editDate)} alle {editTime}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowConfirmEdit(false); setEditTime(""); }}
                  className="flex-1 py-3 bg-[#161616] text-[#f5f2ea] rounded-xl font-bold hover:bg-[#262626] transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmModify}
                  disabled={modifyMutation.isPending}
                  className="flex-1 py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {modifyMutation.isPending ? "..." : "Conferma"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Normal view (lookup + booking card) ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-marble">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#101010]/90 backdrop-blur-md border-b border-[#303030]/50">
        <div className="max-w-md mx-auto flex items-center justify-between px-5 py-4">
          <Link href="/">
            <a className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#7c7266] rounded-xl flex items-center justify-center shadow-md shadow-[#7c7266]/20">
                <span className="material-symbols-outlined text-white text-sm">content_cut</span>
              </div>
              <span className="font-black font-headline text-[#f5f2ea] text-base tracking-tight">{shopName}</span>
            </a>
          </Link>
          <Link href="/">
            <a className="text-xs font-bold text-[#a8a29a] flex items-center gap-1 hover:text-[#f5f2ea] transition-colors">
              <span className="material-symbols-outlined text-sm">home</span>
              Home
            </a>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-black font-headline text-[#f5f2ea] tracking-tight mb-1">Gestisci prenotazione</h1>
          <p className="text-[#a8a29a] text-sm">Inserisci il codice ricevuto per visualizzare, modificare o cancellare la tua prenotazione.</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm p-5 mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">
            Codice prenotazione
          </label>
          <div className="flex gap-2 items-stretch">
            <input
              data-testid="input-booking-code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6))}
              placeholder="ABCXYZ"
              maxLength={6}
              className="flex-1 bg-[#161616] rounded-xl px-4 py-3 text-base font-bold font-mono tracking-widest uppercase border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 text-[#f5f2ea] placeholder:font-normal placeholder:tracking-normal"
              autoCapitalize="characters"
            />
            <button
              type="submit"
              data-testid="button-search-code"
              className="px-5 py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-md shadow-[#7c7266]/20 hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">search</span>
              Cerca
            </button>
          </div>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm p-8 text-center">
            <div className="w-10 h-10 border-2 border-[#7c7266]/20 border-t-[#7c7266] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#a8a29a] text-sm">Ricerca in corso...</p>
          </div>
        )}

        {/* Error / Not found */}
        {isError && submittedCode && (
          <div className="bg-[#101010] rounded-2xl border border-red-100 shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-red-400 text-2xl">search_off</span>
            </div>
            <h3 className="font-bold text-[#f5f2ea] mb-1">Prenotazione non trovata</h3>
            <p className="text-sm text-[#a8a29a]">Nessuna prenotazione trovata con il codice <span className="font-mono font-bold">{submittedCode}</span>. Controlla il codice e riprova.</p>
          </div>
        )}

        {/* Booking card */}
        {b && svc && stylist && (
          <div className="space-y-4">
            {/* Status banner */}
            {isCancelled && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">cancel</span>
                <div>
                  <p className="font-bold text-red-700 text-sm">Prenotazione cancellata</p>
                  <p className="text-xs text-red-500">Questa prenotazione è stata cancellata e non è più valida.</p>
                </div>
              </div>
            )}
            {isCompleted && (
              <div className="bg-[#a99f92]/5 border border-[#a99f92]/10 rounded-2xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#a99f92]">task_alt</span>
                <div>
                  <p className="font-bold text-[#a99f92] text-sm">Appuntamento completato</p>
                  <p className="text-xs text-[#a99f92]/70">Grazie per essere venuto da noi!</p>
                </div>
              </div>
            )}

            {/* Main card */}
            <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
              {/* Stylist header */}
              <div className="bg-[#050505] p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#7c7266]/20 border-2 border-[#7c7266]/40 flex items-center justify-center text-white font-black font-headline text-xl">
                  {stylist.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-xs font-medium mb-0.5">Hairstylist</p>
                  <p className="text-white font-bold text-base">{stylist.name}</p>
                  <span className="text-[10px] font-bold bg-[#7c7266]/20 text-[#d7d0c6] px-2 py-0.5 rounded-full inline-block mt-1">{svc.name}</span>
                </div>
                {statusInfo && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>

              {/* Booking code */}
              <div className="px-6 py-4 bg-[#080808] border-b border-[#303030]/30 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-[#a8a29a]">Codice prenotazione</p>
                <span className="font-mono font-black text-[#c9c1b6] text-base tracking-widest bg-[#7c7266]/8 px-3 py-1 rounded-lg">
                  {b.bookingCode}
                </span>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoBlock icon="person" label="Cliente" value={`${b.firstName} ${b.lastName}`} />
                  <InfoBlock icon="phone" label="Telefono" value={b.phone || "—"} />
                  <InfoBlock icon="event" label="Data" value={fmtDate(b.date)} />
                  <InfoBlock icon="schedule" label="Orario" value={b.time} />
                  <InfoBlock icon="content_cut" label="Servizio" value={svc.name} />
                  <InfoBlock icon="payments" label="Prezzo" value={`€${svc.price}`} />
                </div>
                {b.notes && (
                  <div className="pt-2 border-t border-[#303030]/30">
                    <InfoBlock icon="notes" label="Note" value={b.notes} />
                  </div>
                )}
              </div>

              {/* Map */}
              <div className="mx-5 mb-5">
                <div className="relative rounded-2xl overflow-hidden h-36">
                  <img src={mapCityImg} alt="Napoli" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#050505]/55" />
                  <div className="absolute inset-0 flex items-center justify-center pb-5">
                    <div className="w-7 h-7 bg-[#7c7266] rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                      <span className="material-symbols-outlined text-white text-xs" style={{fontVariationSettings:"'FILL' 1"}}>location_on</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-3 flex justify-center">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#101010] text-[#f5f2ea] font-bold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 hover:shadow-xl transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[#c9c1b6] text-sm">directions</span>
                      Ottieni indicazioni
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isCancelled && !isCompleted && (
              <>
                {/* Modify button */}
                <button
                  data-testid="button-modify-booking"
                  onClick={enterEditMode}
                  className="w-full py-3.5 rounded-2xl bg-[#7c7266] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#7c7266]/20 hover:opacity-90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">edit_calendar</span>
                  Modifica prenotazione
                </button>

                {/* Cancel button */}
                <button
                  data-testid="button-cancel-booking"
                  onClick={() => setShowConfirmCancel(true)}
                  className="w-full py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all"
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  Cancella prenotazione
                </button>
              </>
            )}

            <Link href="/prenota">
              <a className="w-full py-3.5 rounded-2xl bg-[#161616] text-[#f5f2ea] font-bold flex items-center justify-center gap-2 hover:bg-[#262626] transition-all">
                <span className="material-symbols-outlined text-base">add</span>
                Nuova prenotazione
              </a>
            </Link>

            <Link href="/">
              <a className="w-full py-3.5 rounded-2xl bg-[#161616] text-[#f5f2ea] font-bold flex items-center justify-center gap-2 hover:bg-[#262626] transition-all">
                <span className="material-symbols-outlined text-base">home</span>
                Torna alla Home
              </a>
            </Link>
          </div>
        )}
      </div>

      {/* Cancel confirm modal */}
      {showConfirmCancel && b && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmCancel(false)} />
          <div className="relative bg-[#101010] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
            </div>
            <h3 className="text-lg font-bold font-headline text-center mb-2">Cancella prenotazione?</h3>
            <p className="text-sm text-[#a8a29a] text-center mb-6">
              Stai per cancellare l'appuntamento del <strong>{fmtDate(b.date)}</strong> alle <strong>{b.time}</strong>. Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 py-3 bg-[#161616] text-[#f5f2ea] rounded-xl font-bold hover:bg-[#262626] transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => cancelMutation.mutate(b.id)}
                disabled={cancelMutation.isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                {cancelMutation.isPending ? "..." : "Sì, cancella"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] mb-1 flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">{icon}</span>
        {label}
      </p>
      <p className="font-semibold text-sm text-[#f5f2ea]">{value}</p>
    </div>
  );
}
