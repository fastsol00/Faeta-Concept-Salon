import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BRAND_ADDRESS, BRAND_NAME } from "@/lib/brand";
import type { Booking, Service, Hairstylist } from "@shared/schema";
import mapCityImg from "@assets/map-city.jpg";

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
function fmtFull(s: string) { const d = new Date(s+"T12:00:00"); return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`; }

export default function ConfirmationPage() {
  const { id } = useParams<{id:string}>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: shopInfo } = useQuery<any>({ queryKey: ["/api/admin/1"], queryFn: () => apiRequest("GET", "/api/admin/1").then(r=>r.json()) });
  const { data: booking, isLoading } = useQuery<Booking>({ queryKey:["/api/bookings",id], queryFn:()=>apiRequest("GET",`/api/bookings/${id}`).then(r=>r.json()) });
  const { data: services=[] } = useQuery<Service[]>({ queryKey:["/api/services"] });
  const { data: hairstylists=[] } = useQuery<Hairstylist[]>({ queryKey:["/api/hairstylists"] });

  const service = services.find(s=>s.id===booking?.serviceId);
  const stylist = hairstylists.find(h=>h.id===booking?.hairstylistId);
  const shopAddress = shopInfo?.shopAddress ?? BRAND_ADDRESS;
  const shopName = shopInfo?.shopName ?? BRAND_NAME;

  function handleCopyCode() {
    if (!booking?.bookingCode) return;
    navigator.clipboard.writeText(booking.bookingCode).then(() => {
      setCopied(true);
      toast({ title: "Codice copiato!" });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for browsers that don't support clipboard
      toast({ title: "Codice: " + booking.bookingCode });
    });
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-marble"><div className="w-12 h-12 border-4 border-[#7c7266]/20 border-t-[#7c7266] rounded-full animate-spin" /></div>;
  if (!booking) return <div className="min-h-screen flex flex-col items-center justify-center bg-marble px-6 text-center"><span className="material-symbols-outlined text-5xl text-[#8c8478] mb-4">error</span><p className="font-semibold">Prenotazione non trovata</p><button onClick={()=>setLocation("/")} className="mt-4 text-[#c9c1b6] font-bold">← Home</button></div>;
  const confirmedBooking = booking;

  const mapsQuery = encodeURIComponent(shopAddress);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  function handleAddToCalendar() {
    const d = new Date(`${confirmedBooking.date}T${confirmedBooking.time}:00`);
    const end = new Date(d.getTime() + (service?.durationMinutes ?? 30) * 60000);
    const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(service?.name??"Appuntamento")}&dates=${fmt(d)}/${fmt(end)}&location=${mapsQuery}&details=${encodeURIComponent(`Hairstylist: ${stylist?.name}\nCodice: ${confirmedBooking.bookingCode}`)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-marble">
      {/* Header */}
      <header className="bg-[#101010] shadow-sm shadow-black/5 sticky top-0 z-30">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={()=>setLocation("/")} className="p-2 hover:bg-[#1b1b1b] rounded-full transition-all"><span className="material-symbols-outlined text-[#f5f2ea]">close</span></button>
          <h1 className="text-base font-black font-headline text-[#f5f2ea]">{shopName}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8 pb-24">
        {/* Success hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-[#d7d0c6] rounded-full flex items-center justify-center mb-5 shadow-xl shadow-[#a99f92]/15">
            <span className="material-symbols-outlined text-[#a99f92] text-4xl" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          </div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-[#f5f2ea] mb-2">Prenotazione confermata!</h2>
          <p className="text-[#a8a29a] leading-relaxed">Ottimo, <strong>{booking.firstName}</strong>! Ti aspettiamo.</p>
        </div>

        {/* Booking card */}
        <div className="bg-[#101010] rounded-3xl shadow-sm overflow-hidden mb-4">
          {/* Stylist header */}
          <div className="px-6 pt-6 pb-5 border-b border-[#303030]/40 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl font-headline ${["bg-[#7c7266]/10 text-[#c9c1b6]","bg-[#a99f92]/10 text-[#a99f92]","bg-[#d7d0c6]/10 text-[#d7d0c6]"][(stylist?.id??0)%3]}`}>
              {stylist?.name.split(" ").map(n=>n[0]).join("").slice(0,2)??"?"}
            </div>
            <div>
              <span className="text-xs font-extrabold text-[#c9c1b6] uppercase tracking-wider block">{service?.name}</span>
              <p className="text-lg font-bold font-headline text-[#f5f2ea]">{stylist?.name}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-6 py-5 grid grid-cols-2 gap-5">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] mb-1">DATA</p><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[#c9c1b6] text-sm">calendar_month</span><p className="text-sm font-semibold">{fmtFull(booking.date)}</p></div></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] mb-1">ORARIO</p><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[#c9c1b6] text-sm">schedule</span><p className="text-sm font-semibold">{booking.time}</p></div></div>
          </div>

          {/* Address */}
          <div className="px-6 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] mb-1">SEDE</p>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#c9c1b6] text-sm mt-0.5">location_on</span>
              <p className="text-sm font-medium text-[#f5f2ea] leading-snug">{shopAddress}</p>
            </div>
          </div>

          {/* Map thumbnail — city atmosphere image */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative h-44 bg-[#171717]">
            <img
              src={mapCityImg}
              alt="Napoli"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark overlay for legibility */}
            <div className="absolute inset-0 bg-[#050505]/55" />
            {/* Pin */}
            <div className="absolute inset-0 flex items-center justify-center pb-6">
              <div className="w-8 h-8 bg-[#7c7266] rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                <span className="material-symbols-outlined text-white text-sm" style={{fontVariationSettings:"'FILL' 1"}}>location_on</span>
              </div>
            </div>
            {/* "Ottieni indicazioni" pill */}
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                className="bg-[#101010] text-[#f5f2ea] px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-transform"
                onClick={e=>e.stopPropagation()}>
                <span className="material-symbols-outlined text-[#c9c1b6] text-base">navigation</span>
                Ottieni indicazioni
              </a>
            </div>
          </div>

          {/* Booking code + copy button */}
          <div className="mx-4 mb-5 bg-[#161616] rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a]">Codice prenotazione</p>
              <p className="font-mono font-black text-[#c9c1b6] text-lg tracking-[0.2em]">{booking.bookingCode}</p>
            </div>
            <button
              onClick={handleCopyCode}
              title="Copia codice"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                copied
                  ? "bg-[#a99f92]/10 text-[#a99f92]"
                  : "bg-[#101010] border border-[#303030] text-[#a8a29a] hover:border-[#7c7266]/40 hover:text-[#c9c1b6] hover:bg-[#7c7266]/5"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copiato!" : "Copia"}
            </button>
          </div>
        </div>

        {/* Add to calendar */}
        <button onClick={handleAddToCalendar}
          className="w-full py-4 px-6 bg-gradient-to-r from-[#7c7266] to-[#3b3732] text-white rounded-2xl font-bold shadow-xl shadow-[#7c7266]/20 flex items-center justify-center gap-2 mb-3 hover:opacity-90 active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined">event_available</span>
          Aggiungi al calendario
        </button>

        {/* Home */}
        <button onClick={()=>setLocation("/")}
          className="w-full py-4 px-6 bg-[#262626] text-[#f5f2ea] rounded-2xl font-bold hover:bg-[#303030] active:scale-[0.98] transition-all mb-5">
          Torna alla Home
        </button>

        {/* Manage link */}
        <p className="text-center text-sm text-[#a8a29a]">Hai bisogno di modificare la prenotazione?</p>
        <button onClick={()=>setLocation(`/gestisci?id=${booking.id}`)} className="w-full text-center text-[#c9c1b6] font-bold text-sm underline-offset-2 hover:underline mt-1">
          Gestisci appuntamento
        </button>
      </main>
    </div>
  );
}
