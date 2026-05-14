import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import TimeInput from "@/components/TimeInput";
import type { Hairstylist, HairstylistAvailability } from "@shared/schema";

const DAYS = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];

export default function AdminHairstylists() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [selectedStylist, setSelectedStylist] = useState<Hairstylist | null>(null);
  const [availability, setAvailability] = useState<HairstylistAvailability[]>([]);

  const { data: hairstylists = [], isLoading } = useQuery<Hairstylist[]>({ queryKey: ["/api/hairstylists"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/hairstylists", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hairstylists"] });
      setNewName(""); setNewSpec(""); setShowAddForm(false);
      toast({ title: "Hairstylist aggiunto" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/hairstylists/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hairstylists"] }); toast({ title: "Aggiornato" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hairstylists/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hairstylists"] }); toast({ title: "Eliminato" }); },
  });

  const { data: stylistAvail = [] } = useQuery<HairstylistAvailability[]>({
    queryKey: ["/api/hairstylists", selectedStylist?.id, "availability"],
    queryFn: () => apiRequest("GET", `/api/hairstylists/${selectedStylist!.id}/availability`).then(r => r.json()),
    enabled: !!selectedStylist,
  });

  const saveAvailMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/hairstylists/${id}/availability`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hairstylists", selectedStylist?.id, "availability"] });
      toast({ title: "Disponibilità salvata" });
    },
  });

  function openAvail(h: Hairstylist) {
    setSelectedStylist(h);
    // Will be populated from query
  }

  const currentAvail = selectedStylist ? (stylistAvail.length ? stylistAvail : buildDefaultAvail(selectedStylist.id)) : [];

  function buildDefaultAvail(hairstylistId: number): HairstylistAvailability[] {
    return DAYS.map((_, i) => ({
      id: 0, hairstylistId, dayOfWeek: i,
      startTime: i === 0 || i === 1 ? null : "08:30",
      endTime: i === 0 || i === 1 ? null : "20:00",
      isAvailable: i !== 0 && i !== 1,
    }));
  }

  function handleAvailChange(dayOfWeek: number, field: string, value: any) {
    const base = stylistAvail.length ? stylistAvail : buildDefaultAvail(selectedStylist!.id);
    const updated = base.map(a => a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a);
    // We update local state via a temporary approach — save triggers mutation
    // Store in local variable for the save
    (window as any).__availBuffer = updated;
  }

  // Use controlled form state for availability editing
  const [availBuffer, setAvailBuffer] = useState<any[] | null>(null);
  const editAvail = availBuffer ?? (selectedStylist ? (stylistAvail.length ? stylistAvail : buildDefaultAvail(selectedStylist.id)) : []);

  function openAvailPanel(h: Hairstylist) {
    setSelectedStylist(h);
    setAvailBuffer(null);
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold font-headline text-[#f5f2ea] tracking-tight">Hairstylist</h2>
            <p className="text-[#a8a29a] text-sm">{hairstylists.length} stylist registrati</p>
          </div>
          <button
            data-testid="btn-add-hairstylist"
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 rounded-full bg-[#7c7266] text-white text-sm font-bold shadow-lg shadow-[#7c7266]/20 flex items-center gap-2 hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Aggiungi Hairstylist
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#101010] rounded-2xl animate-pulse" />)}
          </div>
        ) : hairstylists.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-[#8c8478] block mb-4">badge</span>
            <p className="font-semibold text-[#a8a29a]">Nessun hairstylist</p>
            <button onClick={() => setShowAddForm(true)} className="mt-4 text-[#c9c1b6] font-bold text-sm">+ Aggiungine uno</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hairstylists.map(h => (
              <div key={h.id} className="bg-[#101010] rounded-2xl border border-[#303030]/50 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl font-headline ${["bg-[#7c7266]/10 text-[#c9c1b6]", "bg-[#a99f92]/10 text-[#a99f92]", "bg-[#d7d0c6]/10 text-[#d7d0c6]"][h.id % 3]}`}>
                      {h.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#f5f2ea]">{h.name}</p>
                      <p className="text-sm text-[#a8a29a] truncate">{h.specialization || "Specialista"}</p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${h.active ? "bg-green-400" : "bg-[#303030]"}`} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      data-testid={`avail-btn-${h.id}`}
                      onClick={() => openAvailPanel(h)}
                      className="flex-1 py-2.5 bg-[#161616] text-[#f5f2ea] rounded-xl text-xs font-bold hover:bg-[#262626] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      Disponibilità
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ id: h.id, data: { active: !h.active } })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${h.active ? "bg-[#d7d0c6]/10 text-[#d7d0c6] hover:bg-[#d7d0c6]/15" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                    >
                      {h.active ? "Disattiva" : "Attiva"}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Eliminare ${h.name}?`)) deleteMutation.mutate(h.id); }}
                      className="px-3 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Hairstylist Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
            <div className="relative bg-[#101010] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold font-headline mb-5">Nuovo Hairstylist</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Nome completo *</label>
                  <input
                    data-testid="input-hairstylist-name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Es. Marco Santini"
                    className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 border-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#a8a29a] mb-2">Specializzazione</label>
                  <input
                    value={newSpec}
                    onChange={e => setNewSpec(e.target.value)}
                    placeholder="Es. Taglio Classico & Barba"
                    className="w-full bg-[#161616] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20 border-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 bg-[#161616] text-[#f5f2ea] rounded-xl font-bold">Annulla</button>
                <button
                  onClick={() => newName.trim() && createMutation.mutate({ name: newName.trim(), specialization: newSpec.trim(), active: true })}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="flex-1 py-3 bg-[#7c7266] text-white rounded-xl font-bold shadow-lg shadow-[#7c7266]/20 disabled:opacity-50"
                >
                  {createMutation.isPending ? "..." : "Aggiungi"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Availability Panel */}
        {selectedStylist && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedStylist(null); setAvailBuffer(null); }} />
            <div className="relative bg-[#101010] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-[#101010] px-6 py-5 border-b border-[#303030]/50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-headline">Disponibilità settimanale</h3>
                  <p className="text-sm text-[#a8a29a]">{selectedStylist.name}</p>
                </div>
                <button onClick={() => { setSelectedStylist(null); setAvailBuffer(null); }} className="p-2 hover:bg-[#161616] rounded-xl transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {editAvail.map(a => (
                  <div key={a.dayOfWeek} className={`rounded-2xl border p-4 transition-all ${a.isAvailable ? "border-[#303030]/50 bg-[#101010]" : "border-[#303030]/30 bg-[#080808]"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`font-bold text-sm ${a.dayOfWeek === 1 ? "text-[#a8a29a]" : ""}`}>
                        {DAYS[a.dayOfWeek]}
                        {a.dayOfWeek === 1 && <span className="ml-2 text-xs font-medium text-[#a8a29a]">(chiuso)</span>}
                      </p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={a.isAvailable}
                          onChange={e => setAvailBuffer(editAvail.map(x => x.dayOfWeek === a.dayOfWeek
                            ? e.target.checked
                              ? { ...x, isAvailable: true, startTime: x.startTime ?? "08:30", endTime: x.endTime ?? "20:00" }
                              : { ...x, isAvailable: false, startTime: null, endTime: null }
                            : x))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-[#303030] peer-focus:ring-2 peer-focus:ring-[#7c7266]/20 rounded-full peer peer-checked:bg-[#7c7266] transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 bg-[#101010] rounded-full w-4 h-4 transition-all peer-checked:translate-x-5 shadow-sm"></div>
                      </label>
                    </div>
                    {a.isAvailable && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] block mb-1">Inizio</label>
                          <TimeInput value={a.startTime ?? "08:30"}
                            onChange={v => setAvailBuffer(editAvail.map(x => x.dayOfWeek === a.dayOfWeek ? { ...x, startTime: v } : x))}
                            className="w-full py-2.5 px-3 bg-[#161616] rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] block mb-1">Fine</label>
                          <TimeInput value={a.endTime ?? "20:00"}
                            onChange={v => setAvailBuffer(editAvail.map(x => x.dayOfWeek === a.dayOfWeek ? { ...x, endTime: v } : x))}
                            className="w-full py-2.5 px-3 bg-[#161616] rounded-xl border-none text-sm focus:outline-none focus:ring-2 focus:ring-[#7c7266]/20" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 bg-[#101010] px-6 py-4 border-t border-[#303030]/50">
                <button
                  onClick={() => saveAvailMutation.mutate({ id: selectedStylist.id, data: editAvail.map(a => ({ ...a, hairstylistId: selectedStylist.id })) })}
                  disabled={saveAvailMutation.isPending}
                  className="w-full py-4 bg-[#7c7266] text-white rounded-full font-bold font-headline shadow-lg shadow-[#7c7266]/20 disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {saveAvailMutation.isPending ? "Salvataggio..." : "Salva disponibilità"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
