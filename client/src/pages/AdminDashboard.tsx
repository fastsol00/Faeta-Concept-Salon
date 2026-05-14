import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { BRAND_ADDRESS, BRAND_HOURS, BRAND_NAME } from "@/lib/brand";
import type { Booking, Service, Hairstylist } from "@shared/schema";

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confermata", cls: "border border-emerald-300/15 bg-emerald-400/10 text-emerald-200" },
  completed: { label: "Completata", cls: "border border-white/10 bg-white/10 text-[#d7d0c6]" },
  cancelled: { label: "Cancellata", cls: "border border-red-300/20 bg-red-400/10 text-red-200" },
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: stats } = useQuery<{ todayCount: number; weekCount: number; topStylist: string; newCount: number; clientCount: number }>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const { data: allBookings = [] } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: hairstylists = [] } = useQuery<Hairstylist[]>({ queryKey: ["/api/hairstylists"] });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bookings/mark-read"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const serviceMap = new Map(services.map(s => [s.id, s]));
  const stylistMap = new Map(hairstylists.map(h => [h.id, h]));
  const todayStr = new Date().toISOString().split("T")[0];
  const todayBookings = allBookings
    .filter(b => b.date === todayStr && b.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 6);
  const newBookings = allBookings.filter(b => b.isNew);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekBookings = allBookings.filter(b => b.date >= weekStartStr && b.status !== "cancelled");
  const stylistCounts = new Map<number, number>();
  weekBookings.forEach(b => stylistCounts.set(b.hairstylistId, (stylistCounts.get(b.hairstylistId) ?? 0) + 1));
  const maxCount = Math.max(...Array.from(stylistCounts.values()), 1);
  const activeStylists = hairstylists.filter(h => h.active);
  const todayLabel = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

  return (
    <AdminLayout>
      <div className="min-h-screen p-5 lg:p-8">
        <section className="marble-panel relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-black/30 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr] xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a8a29a]">Operations Hub</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-[#f5f2ea] font-headline sm:text-5xl">
                {BRAND_NAME}
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <InfoPill icon="location_on" label={BRAND_ADDRESS} />
                <InfoPill icon="schedule" label={BRAND_HOURS} />
                <InfoPill icon="calendar_today" label={todayLabel} />
              </div>
            </div>
            <div className="surface-glass rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8a29a]">Nuove richieste</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-black leading-none text-[#f5f2ea] font-headline">{stats?.newCount ?? 0}</p>
                  <p className="mt-1 text-xs text-[#a8a29a]">da verificare</p>
                </div>
                <button
                  onClick={() => { markReadMutation.mutate(); setLocation("/admin/prenotazioni"); }}
                  className="rounded-full bg-[#f5f2ea] px-4 py-2 text-xs font-black text-[#080808] transition hover:bg-white"
                >
                  Apri
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black tracking-tight text-[#f5f2ea] font-headline">Dashboard</h3>
            <p className="text-sm text-[#a8a29a]">Vista rapida su agenda, clienti e performance settimanale.</p>
          </div>
          <div className="flex gap-3">
            {(stats?.newCount ?? 0) > 0 && (
              <button
                onClick={() => markReadMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#f5f2ea] transition hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-base">done_all</span>
                Segna lette
              </button>
            )}
            <Link href="/admin/prenotazioni">
              <a className="inline-flex items-center gap-2 rounded-full bg-[#7c7266] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-[#8a8175]">
                <span className="material-symbols-outlined text-base">add</span>
                Prenotazioni
              </a>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard icon="event_available" label="Oggi" value={String(stats?.todayCount ?? 0)} meta="prenotazioni" />
          <KPICard icon="date_range" label="Settimana" value={String(stats?.weekCount ?? 0)} meta="ultimi 7 giorni" />
          <KPICard icon="notifications" label="Nuove" value={String(stats?.newCount ?? 0)} meta="non lette" />
          <KPICard icon="people" label="Clienti" value={String(stats?.clientCount ?? 0)} meta="database" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="surface-glass overflow-hidden rounded-2xl border xl:col-span-2">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="font-black text-[#f5f2ea] font-headline">Agenda di oggi</h3>
                <p className="text-xs text-[#a8a29a]">{todayBookings.length} appuntamenti in vista</p>
              </div>
              <Link href="/admin/prenotazioni">
                <a className="inline-flex items-center gap-1 text-xs font-black text-[#d7d0c6] hover:text-white">
                  Vedi tutte <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </Link>
            </div>
            {todayBookings.length === 0 ? (
              <EmptyState icon="event_busy" label="Nessuna prenotazione oggi" />
            ) : (
              <div className="divide-y divide-white/10">
                {todayBookings.map(b => {
                  const svc = serviceMap.get(b.serviceId);
                  const stylist = stylistMap.get(b.hairstylistId);
                  const badge = STATUS_BADGES[b.status] ?? STATUS_BADGES.confirmed;
                  return (
                    <div key={b.id} className={`grid gap-4 px-5 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[88px_1fr_auto] sm:items-center ${b.isNew ? "border-l-4 border-l-[#d7d0c6]" : ""}`}>
                      <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm font-black text-[#f5f2ea]">
                        {b.time}
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#f5f2ea] text-sm font-black text-[#080808]">
                          {b.firstName[0]}{b.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#f5f2ea]">{b.firstName} {b.lastName}</p>
                          <p className="truncate text-xs text-[#a8a29a]">{svc?.name ?? "Servizio"} · {stylist?.name ?? "Stylist"}</p>
                        </div>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${badge.cls}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="surface-glass rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-[#f5f2ea] font-headline">Performance stylist</h3>
                  <p className="text-xs text-[#a8a29a]">Prenotazioni negli ultimi 7 giorni</p>
                </div>
                <span className="material-symbols-outlined text-[#d7d0c6]">bar_chart</span>
              </div>
              {activeStylists.length === 0 ? (
                <EmptyState icon="badge" label="Nessun hairstylist" compact />
              ) : (
                <div className="mt-5 space-y-4">
                  {activeStylists.map(h => {
                    const cnt = stylistCounts.get(h.id) ?? 0;
                    const pct = Math.round((cnt / maxCount) * 100);
                    return (
                      <div key={h.id}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#f5f2ea]">{h.name}</p>
                            <p className="text-xs text-[#a8a29a]">{cnt} prenotazioni</p>
                          </div>
                          <span className="text-sm font-black text-[#d7d0c6]">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#d7d0c6] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="marble-panel rounded-2xl border border-white/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8a29a]">Salon Snapshot</p>
              <div className="mt-4 space-y-3 text-sm">
                <SnapshotRow icon="workspace_premium" label="Top stylist" value={stats?.topStylist ?? "—"} />
                <SnapshotRow icon="storefront" label="Brand" value={BRAND_NAME} />
                <SnapshotRow icon="schedule" label="Orari" value={BRAND_HOURS} />
                <SnapshotRow icon="location_on" label="Sede" value={BRAND_ADDRESS} />
              </div>
            </section>
          </aside>
        </div>

        {newBookings.length > 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#d7d0c6]/20 bg-[#d7d0c6]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f2ea] text-[#080808]">
                <span className="material-symbols-outlined">notifications_active</span>
              </div>
              <div>
                <p className="font-black text-[#f5f2ea]">{newBookings.length} nuova/e prenotazione/i</p>
                <p className="text-xs text-[#a8a29a]">Non ancora visualizzate</p>
              </div>
            </div>
            <button
              onClick={() => { markReadMutation.mutate(); setLocation("/admin/prenotazioni"); }}
              className="rounded-full bg-[#f5f2ea] px-5 py-2.5 text-sm font-black text-[#080808] transition hover:bg-white"
            >
              Visualizza
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function InfoPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#f5f2ea]">
      <span className="material-symbols-outlined text-sm text-[#d7d0c6]">{icon}</span>
      {label}
    </span>
  );
}

function KPICard({ icon, label, value, meta }: { icon: string; label: string; value: string; meta: string }) {
  return (
    <div className="surface-glass rounded-2xl border p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <span className="material-symbols-outlined text-[#d7d0c6]">{icon}</span>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#a8a29a]">Live</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a8a29a]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h3 className="text-4xl font-black leading-none text-[#f5f2ea] font-headline">{value}</h3>
        <p className="pb-1 text-xs text-[#a8a29a]">{meta}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, label, compact = false }: { icon: string; label: string; compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? "py-8" : "py-16"}`}>
      <span className="material-symbols-outlined mb-3 block text-5xl text-white/15">{icon}</span>
      <p className="font-semibold text-[#a8a29a]">{label}</p>
    </div>
  );
}

function SnapshotRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <span className="material-symbols-outlined mt-0.5 text-base text-[#d7d0c6]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a8a29a]">{label}</p>
        <p className="break-words text-sm font-bold text-[#f5f2ea]">{value}</p>
      </div>
    </div>
  );
}
