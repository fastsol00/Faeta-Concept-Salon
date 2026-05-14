import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BRAND_NAME } from "@/lib/brand";
import type { Service, Hairstylist } from "@shared/schema";

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const DAYS_IT = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
function fmtDateIT(s: string) { const d = new Date(s+"T12:00:00"); return `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`; }
function getDateString(d: Date) { return d.toISOString().split("T")[0]; }

export default function BookingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStylist, setSelectedStylist] = useState<Hairstylist | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: hairstylists = [] } = useQuery<Hairstylist[]>({ queryKey: ["/api/hairstylists"] });
  const { data: holidays = [] } = useQuery<any[]>({ queryKey: ["/api/holidays"] });

  const activeServices = services.filter(s => s.active);
  const activeHairstylists = hairstylists.filter(h => h.active);
  const holidayDates = new Set(holidays.map((h: any) => h.date));

  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery<string[]>({
    queryKey: ["/api/available-slots", selectedStylist?.id, selectedDate, selectedService?.durationMinutes],
    queryFn: () => apiRequest("GET", `/api/available-slots?hairstylistId=${selectedStylist!.id}&date=${selectedDate}&durationMinutes=${selectedService!.durationMinutes}`).then(r => r.json()),
    enabled: !!(selectedStylist && selectedDate && selectedService),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/bookings", data).then(r => r.json()),
    onSuccess: (b) => setLocation(`/conferma/${b.id}`),
    onError: () => toast({ title: "Errore", description: "Slot non disponibile", variant: "destructive" }),
  });

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
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
  const canContinue = firstName.trim() && lastName.trim() && phone.trim().length >= 8 && email.trim().length >= 5;

  const STEP_LABELS = ["1. Servizio","2. Data","3. Stylist","4. Orario","5. Dati","6. Conferma"];

  return (
    <div className="min-h-screen bg-marble text-[#f5f2ea] pb-36">
      {/* Header */}
      <header className="bg-[#101010]/90 backdrop-blur-xl fixed top-0 w-full z-50 max-w-md mx-auto left-0 right-0 shadow-sm shadow-black/5">
        <div className="flex items-center justify-between px-5 py-4">
          {step > 1
            ? <button onClick={() => setStep(s => Math.max(1, s-1) as Step)} className="p-2 hover:bg-[#1b1b1b] rounded-full active:scale-95 transition-all"><span className="material-symbols-outlined text-[#a8a29a]">arrow_back</span></button>
            : <button onClick={() => setLocation("/")} className="p-2 hover:bg-[#1b1b1b] rounded-full"><span className="material-symbols-outlined text-[#a8a29a]">home</span></button>
          }
          <div className="text-center">
            <h1 className="text-base font-black font-headline text-[#f5f2ea] leading-none">{BRAND_NAME}</h1>
            <span className="text-[10px] text-[#a8a29a] font-medium">Prenotazione Online</span>
          </div>
          <div className="w-10" />
        </div>
        {/* Progress */}
        <div className="px-5 pb-3">
          <div className="flex gap-1.5 mb-1.5">
            {([1,2,3,4,5,6] as Step[]).map(s => <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step >= s ? "bg-[#7c7266]" : "bg-[#303030]"}`} />)}
          </div>
          <p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-widest">{STEP_LABELS[step-1]}</p>
        </div>
      </header>

      <main className="pt-32 px-5 max-w-md mx-auto">
        {/* STEP 1 */}
        {step === 1 && (
          <section>
            <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-1">Scegli un servizio</h2>
            <p className="text-[#a8a29a] text-sm mb-5">Seleziona il trattamento desiderato.</p>
            <div className="bg-[#101010] rounded-2xl overflow-hidden divide-y divide-[#303030]/50 shadow-sm">
              {activeServices.map(svc => (
                <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(2); }}
                  className="w-full flex items-center justify-between p-5 hover:bg-[#161616] transition-colors text-left">
                  <div>
                    <p className="font-bold text-[#f5f2ea]">{svc.name}</p>
                    <p className="text-sm text-[#a8a29a] mt-0.5">{svc.durationMinutes} min</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{svc.price > 0 ? `€${svc.price}` : "—"}</span>
                    <span className="material-symbols-outlined text-[#8c8478]">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section>
            <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-5">Scegli una data</h2>
            <div className="bg-[#7c7266]/5 border border-[#7c7266]/20 rounded-xl p-4 flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined text-[#c9c1b6]">content_cut</span>
              <div><p className="font-bold text-sm">{selectedService?.name}</p><p className="text-xs text-[#a8a29a]">{selectedService?.durationMinutes} min · €{selectedService?.price}</p></div>
            </div>
            <div className="bg-[#101010] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[#c9c1b6] font-headline">{MONTHS_IT[calendarMonth.month]} {calendarMonth.year}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCalendarMonth(p => { const m = p.month-1; return m<0 ? {year:p.year-1,month:11} : {...p,month:m}; })} className="p-1.5 bg-[#161616] rounded-full hover:bg-[#262626]"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                  <button onClick={() => setCalendarMonth(p => { const m = p.month+1; return m>11 ? {year:p.year+1,month:0} : {...p,month:m}; })} className="p-1.5 bg-[#161616] rounded-full hover:bg-[#262626]"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center mb-3">
                {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(d => <span key={d} className="text-[10px] font-bold text-[#a8a29a] uppercase">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-y-2 text-center">
                {calendarDays.map((cell, i) => {
                  if (cell.day === -1) return <div key={`e-${i}`} />;
                  const isSel = selectedDate === cell.dateStr;
                  return (
                    <button key={cell.dateStr} disabled={cell.isDisabled} onClick={() => { setSelectedDate(cell.dateStr); setStep(3); }}
                      className={`w-9 h-9 mx-auto text-sm font-semibold rounded-full transition-all
                        ${cell.isDisabled ? "text-[#8c8478] cursor-not-allowed" : "hover:bg-[#161616] cursor-pointer"}
                        ${isSel ? "bg-[#7c7266] text-white font-bold shadow-md shadow-[#7c7266]/20" : ""}
                        ${cell.isToday && !isSel ? "ring-2 ring-[#7c7266]/40" : ""}
                        ${cell.isHoliday && !cell.isDisabled ? "text-[#c9c1b6] line-through" : ""}
                      `}>{cell.day}</button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#a8a29a] mt-3 text-center">Domenica, lunedì e festività non prenotabili</p>
            </div>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section>
            <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-1">Scegli lo stylist</h2>
            <p className="text-[#a8a29a] text-sm mb-5">Per {fmtDateIT(selectedDate)}</p>
            <div className="space-y-3">
              {activeHairstylists.map(h => (
                <button key={h.id} onClick={() => { setSelectedStylist(h); setSelectedTime(""); setStep(4); }}
                  className={`w-full bg-[#101010] rounded-2xl p-5 flex items-center gap-4 shadow-sm border-2 transition-all text-left ${selectedStylist?.id===h.id ? "border-[#7c7266]" : "border-transparent hover:border-[#303030]"}`}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl font-headline ${["bg-[#7c7266]/10 text-[#c9c1b6]","bg-[#a99f92]/10 text-[#a99f92]","bg-[#d7d0c6]/10 text-[#d7d0c6]"][h.id%3]}`}>
                    {h.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1"><p className="font-bold">{h.name}</p><p className="text-sm text-[#a8a29a]">{h.specialization||"Specialista"}</p></div>
                  <span className="material-symbols-outlined text-[#8c8478]">chevron_right</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <section>
            <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-1">Scegli l'orario</h2>
            <p className="text-[#a8a29a] text-sm mb-5">{fmtDateIT(selectedDate)} · {selectedStylist?.name}</p>
            {slotsLoading ? (
              <div className="space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="h-12 bg-[#262626] rounded-xl animate-pulse" />)}</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-5xl text-[#8c8478] block mb-3">schedule</span>
                <p className="font-semibold">Nessuno slot disponibile</p>
                <p className="text-sm text-[#a8a29a] mt-1">Prova un'altra data o stylist</p>
                <button onClick={() => setStep(2)} className="mt-4 text-[#c9c1b6] font-bold text-sm">← Cambia data</button>
              </div>
            ) : (
              <>
                {morningSlots.length > 0 && <><p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-widest flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-sm">wb_twilight</span>Mattina</p><div className="grid grid-cols-3 gap-3 mb-5">{morningSlots.map(slot=><button key={slot} onClick={()=>{setSelectedTime(slot);setStep(5);}} className={`py-3 rounded-xl text-sm font-semibold transition-all border ${selectedTime===slot?"bg-[#7c7266] text-white border-[#7c7266]":"border-[#4a433c]/50 hover:border-[#7c7266] hover:text-[#c9c1b6]"}`}>{slot}</button>)}</div></>}
                {afternoonSlots.length > 0 && <><p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-widest flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-sm">light_mode</span>Pomeriggio</p><div className="grid grid-cols-3 gap-3">{afternoonSlots.map(slot=><button key={slot} onClick={()=>{setSelectedTime(slot);setStep(5);}} className={`py-3 rounded-xl text-sm font-semibold transition-all border ${selectedTime===slot?"bg-[#7c7266] text-white border-[#7c7266]":"border-[#4a433c]/50 hover:border-[#7c7266] hover:text-[#c9c1b6]"}`}>{slot}</button>)}</div></>}
              </>
            )}
          </section>
        )}

        {/* STEP 5 — I tuoi dati (email + note aggiunti) */}
        {step === 5 && (
          <section>
            <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-1">I tuoi dati</h2>
            <p className="text-[#a8a29a] text-sm mb-6">Nessuna registrazione richiesta.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nome *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Es. Marco"
                  className="w-full bg-[#101010] border border-[#4a433c]/50 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#7c7266]/30 focus:border-[#7c7266] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Cognome *</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Es. Rossi"
                  className="w-full bg-[#101010] border border-[#4a433c]/50 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#7c7266]/30 focus:border-[#7c7266] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Numero di cellulare *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Es. 333 1234567"
                  className="w-full bg-[#101010] border border-[#4a433c]/50 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#7c7266]/30 focus:border-[#7c7266] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Es. marco.rossi@email.com"
                  className="w-full bg-[#101010] border border-[#4a433c]/50 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#7c7266]/30 focus:border-[#7c7266] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">
                  Note <span className="normal-case font-normal text-[#a8a29a]">(opzionale)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder=""
                  rows={3}
                  className="w-full bg-[#101010] border border-[#4a433c]/50 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#7c7266]/30 focus:border-[#7c7266] transition-all resize-none" />
              </div>
            </div>
          </section>
        )}

        {/* STEP 6 — Riepilogo (scrollabile, no fixed overflow) */}
        {step === 6 && (
          <section className="pb-36">
            <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-5">Riepilogo</h2>
            <div className="bg-[#101010] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#303030]/40">
              {[
                {icon:"person", label:"Cliente", value:`${firstName} ${lastName}`},
                {icon:"phone", label:"Telefono", value:phone},
                ...(email ? [{icon:"email", label:"Email", value:email}] : []),
                {icon:"content_cut", label:"Servizio", value:selectedService?.name??""},
                {icon:"badge", label:"Hairstylist", value:selectedStylist?.name??""},
                {icon:"calendar_month", label:"Data", value:fmtDateIT(selectedDate)},
                {icon:"schedule", label:"Orario", value:selectedTime},
                ...(selectedService && selectedService.price>0 ? [{icon:"payments", label:"Prezzo", value:`€${selectedService.price}`}] : []),
                ...(notes.trim() ? [{icon:"notes", label:"Note", value:notes}] : []),
              ].map(({icon,label,value}) => (
                <div key={label} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-9 h-9 bg-[#7c7266]/8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#c9c1b6] text-base">{icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a]">{label}</p>
                    <p className="font-semibold text-[#f5f2ea] break-words">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky CTA — only shown from step 5 onward */}
      {step >= 5 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
          <div className="bg-[#101010]/90 backdrop-blur-xl px-5 pt-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] rounded-t-[2rem]">
            {step === 6 && (
              <div className="flex items-center justify-between mb-3 px-1">
                <div><p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-wider">Orario scelto</p><p className="text-sm font-bold text-[#c9c1b6]">{fmtDateIT(selectedDate)}, {selectedTime}</p></div>
                {selectedService && selectedService.price>0 && <div className="text-right"><p className="text-[10px] font-bold text-[#a8a29a] uppercase tracking-wider">Totale</p><p className="text-xl font-black font-headline">€{selectedService.price}</p></div>}
              </div>
            )}
            <button
              onClick={step === 6
                ? () => createMutation.mutate({ firstName, lastName, phone, notes: notes.trim() || null, serviceId: selectedService!.id, hairstylistId: selectedStylist!.id, date: selectedDate, time: selectedTime, status: "confirmed" })
                : () => setStep(s => (s+1) as Step)}
              disabled={createMutation.isPending || (step === 5 && !canContinue)}
              className="w-full py-5 bg-gradient-to-r from-[#7c7266] to-[#3b3732] text-white rounded-full font-bold font-headline text-lg shadow-xl shadow-[#7c7266]/25 flex items-center justify-center gap-3 disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              {createMutation.isPending ? <><span className="material-symbols-outlined animate-spin">refresh</span>Prenotazione...</> : step === 6 ? <><span className="material-symbols-outlined">check_circle</span>Conferma prenotazione</> : <>Continua<span className="material-symbols-outlined">arrow_forward</span></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
