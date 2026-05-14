import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

const MONTHS_IT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
}

const COLORS = [
  "bg-[#7c7266]/10 text-[#c9c1b6]",
  "bg-[#a99f92]/10 text-[#a99f92]",
  "bg-[#d7d0c6]/10 text-[#d7d0c6]",
  "bg-[#a99f92]/10 text-[#a99f92]",
  "bg-[#f5f2ea]/10 text-[#f5f2ea]",
];

export default function AdminClients() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      apiRequest("PATCH", `/api/clients/${id}`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowDetail(false);
      toast({ title: "Note aggiornate" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      setShowDetail(false);
      setSelectedClient(null);
      toast({ title: "Cliente eliminato" });
    },
  });

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  function openDetail(c: Client) {
    setSelectedClient(c);
    setEditNotes(c.notes ?? "");
    setShowDetail(true);
  }

  // Stats
  const totalVisits = clients.reduce((s, c) => s + c.totalBookings, 0);
  const topClient = clients.reduce<Client | null>((top, c) => (!top || c.totalBookings > top.totalBookings) ? c : top, null);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold font-headline text-[#f5f2ea] tracking-tight">Clienti</h2>
            <p className="text-[#a8a29a] text-sm">{clients.length} clienti registrati · {totalVisits} visite totali</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm p-5">
            <div className="w-10 h-10 bg-[#7c7266]/8 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[#c9c1b6]">people</span>
            </div>
            <p className="text-xs text-[#a8a29a] font-medium mb-1">Clienti totali</p>
            <h3 className="text-2xl font-black font-headline text-[#f5f2ea]">{clients.length}</h3>
          </div>
          <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm p-5">
            <div className="w-10 h-10 bg-[#a99f92]/8 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[#a99f92]">event_available</span>
            </div>
            <p className="text-xs text-[#a8a29a] font-medium mb-1">Visite totali</p>
            <h3 className="text-2xl font-black font-headline text-[#f5f2ea]">{totalVisits}</h3>
          </div>
          <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm p-5 col-span-2 lg:col-span-1">
            <div className="w-10 h-10 bg-[#d7d0c6]/10 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[#d7d0c6]">star_rate</span>
            </div>
            <p className="text-xs text-[#a8a29a] font-medium mb-1">Cliente più fedele</p>
            <h3 className="text-lg font-black font-headline text-[#f5f2ea] leading-tight">
              {topClient ? `${topClient.firstName} ${topClient.lastName}` : "—"}
            </h3>
            {topClient && <p className="text-xs text-[#a8a29a]">{topClient.totalBookings} visite</p>}
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 p-4 mb-5 shadow-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29a] text-sm">search</span>
            <input
              data-testid="search-clients"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per nome, telefono o email..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#161616] rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20"
            />
          </div>
        </div>

        {/* Client list */}
        <div className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#262626] rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-[#8c8478] block mb-3">
                {clients.length === 0 ? "people_outline" : "search_off"}
              </span>
              <p className="font-semibold text-[#a8a29a]">
                {clients.length === 0 ? "Nessun cliente ancora" : "Nessun cliente trovato"}
              </p>
              {clients.length === 0 && (
                <p className="text-sm text-[#a8a29a] mt-2 max-w-xs mx-auto">
                  I clienti vengono registrati automaticamente quando effettuano una prenotazione.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#080808] border-b border-[#303030]/50">
                      {["Cliente","Contatti","Visite","Iscritto il","Note",""].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-extrabold text-[#a8a29a] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303030]/30">
                    {filtered.map((c, i) => (
                      <tr key={c.id} data-testid={`row-client-${c.id}`} className="hover:bg-[#080808] transition-colors cursor-pointer" onClick={() => openDetail(c)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${COLORS[i % COLORS.length]}`}>
                              {c.firstName[0]}{c.lastName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#f5f2ea]">{c.firstName} {c.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-[#f5f2ea]">{c.phone}</p>
                          {c.email && <p className="text-xs text-[#a8a29a]">{c.email}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black font-headline text-xl text-[#f5f2ea]">{c.totalBookings}</span>
                            <div className="flex gap-0.5">
                              {[...Array(Math.min(c.totalBookings, 5))].map((_, j) => (
                                <div key={j} className="w-1.5 h-1.5 rounded-full bg-[#7c7266]" />
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#a8a29a]">{fmtDate(c.createdAt)}</td>
                        <td className="px-6 py-4 max-w-[200px]">
                          {c.notes ? (
                            <p className="text-xs text-[#a8a29a] truncate">{c.notes}</p>
                          ) : (
                            <span className="text-xs text-[#8c8478]">Nessuna nota</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-1.5 hover:bg-[#161616] rounded-lg transition-colors text-[#a8a29a]"
                            onClick={e => { e.stopPropagation(); openDetail(c); }}>
                            <span className="material-symbols-outlined text-base">edit_note</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-[#303030]/30">
                {filtered.map((c, i) => (
                  <div key={c.id} className="p-5 hover:bg-[#080808] transition-colors" onClick={() => openDetail(c)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${COLORS[i % COLORS.length]}`}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#f5f2ea]">{c.firstName} {c.lastName}</p>
                        <p className="text-sm text-[#a8a29a]">{c.phone}</p>
                        {c.email && <p className="text-xs text-[#a8a29a] truncate">{c.email}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black font-headline text-[#c9c1b6]">{c.totalBookings}</p>
                        <p className="text-[10px] text-[#a8a29a]">visite</p>
                      </div>
                    </div>
                    {c.notes && (
                      <p className="mt-3 text-xs text-[#a8a29a] bg-[#080808] rounded-xl px-3 py-2 truncate">{c.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 bg-[#080808]/50 border-t border-[#303030]/30">
                <p className="text-xs text-[#a8a29a] font-medium">
                  {filtered.length} clienti {search ? "trovati" : "totali"}
                  {" "}· Deduplicazione automatica per telefono/email
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Client detail modal */}
      {showDetail && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
          <div className="relative bg-[#101010] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#050505] px-6 py-6 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black font-headline text-xl ${COLORS[0]}`}>
                {selectedClient.firstName[0]}{selectedClient.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg">{selectedClient.firstName} {selectedClient.lastName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold bg-[#7c7266]/20 text-[#d7d0c6] px-2 py-0.5 rounded-full">
                    {selectedClient.totalBookings} {selectedClient.totalBookings === 1 ? "visita" : "visite"}
                  </span>
                  <span className="text-white/70 text-[10px]">dal {fmtDate(selectedClient.createdAt)}</span>
                </div>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-white/60">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <InfoRow icon="phone" label="Telefono" value={selectedClient.phone} />
                {selectedClient.email && <InfoRow icon="email" label="Email" value={selectedClient.email} />}
                <InfoRow icon="event" label="Cliente dal" value={fmtDate(selectedClient.createdAt)} />
                <InfoRow icon="book_online" label="Prenotazioni totali" value={String(selectedClient.totalBookings)} />
              </div>

              {/* Notes editor */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Note interne</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Preferenze, allergie, note stylist..."
                  className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => updateNotesMutation.mutate({ id: selectedClient.id, notes: editNotes })}
                  disabled={updateNotesMutation.isPending}
                  className="flex-1 py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {updateNotesMutation.isPending ? "..." : "Salva note"}
                </button>
              </div>

              <button
                onClick={() => { if (confirm(`Eliminare ${selectedClient.firstName} ${selectedClient.lastName} dai clienti?`)) deleteClientMutation.mutate(selectedClient.id); }}
                className="w-full py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                Elimina cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-[#161616] rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[#a8a29a] text-sm">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a]">{label}</p>
        <p className="text-sm font-semibold text-[#f5f2ea] truncate">{value}</p>
      </div>
    </div>
  );
}
