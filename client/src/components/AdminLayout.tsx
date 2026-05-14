import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAdminSession } from "@/App";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AdminUser } from "@shared/schema";
import { BRAND_ADDRESS, BRAND_HOURS, BRAND_NAME } from "@/lib/brand";
import faetaLogo from "@assets/faeta-logo.png";

const navItems = [
  { href: "/admin/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/admin/prenotazioni", icon: "book_online", label: "Prenotazioni" },
  { href: "/admin/clienti", icon: "people", label: "Clienti" },
  { href: "/admin/hairstylist", icon: "badge", label: "Hairstylist" },
  { href: "/admin/impostazioni", icon: "settings", label: "Impostazioni" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read session from React Context (reactive, no storage APIs)
  const { session, setSession } = useAdminSession();

  // ALL hooks must be called unconditionally (before any conditional return)
  const { data: stats } = useQuery<{ newCount: number }>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
    enabled: !!session,
  });

  const { data: adminProfile } = useQuery<AdminUser>({
    queryKey: ["/api/admin", session?.id],
    queryFn: () => apiRequest("GET", `/api/admin/${session?.id}`).then(r => r.json()),
    enabled: !!session?.id,
  });

  useEffect(() => {
    if (!session) setLocation("/admin");
  }, [session]);

  // If no session, show redirect screen (never blank white)
  if (!session) {
    return (
      <div className="min-h-screen bg-marble flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7c7266]/20 border-t-[#7c7266] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#a8a29a] font-medium">Accesso richiesto…</p>
        </div>
      </div>
    );
  }

  const newCount = stats?.newCount ?? 0;
  const displayName = adminProfile?.displayName || session?.name || "Admin";
  const shopName = adminProfile?.shopName || session?.shopName || BRAND_NAME;
  const shopAddress = adminProfile?.shopAddress || session?.shopAddress || BRAND_ADDRESS;

  function handleLogout() {
    setSession(null);
    setLocation("/admin");
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-marble border-r border-white/10">
      {/* Logo + Greeting */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40">
          <img src={faetaLogo} alt={shopName} className="h-24 w-full object-cover" />
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-[#f5f2ea] rounded-xl flex items-center justify-center shadow-md shadow-black/30">
            <span className="material-symbols-outlined text-[#080808] text-lg">content_cut</span>
          </div>
          <div>
            <h1 className="text-base font-black font-headline tracking-tight text-[#f5f2ea] leading-tight">{shopName}</h1>
            <p className="text-[10px] text-[#a8a29a] font-medium mt-1">Admin Dashboard</p>
          </div>
        </div>
        {/* Ciao greeting */}
        <div className="surface-glass rounded-2xl px-4 py-3">
          <p className="text-[10px] text-[#a8a29a] font-bold uppercase tracking-[0.18em] mb-1">Benvenuto</p>
          <p className="text-base font-black font-headline text-[#f5f2ea] leading-tight">Ciao, {displayName}</p>
          <p className="mt-2 text-[11px] leading-snug text-[#a8a29a]">{BRAND_HOURS}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-1">
        {navItems.map(item => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                  isActive
                    ? "bg-white/10 text-[#f5f2ea] font-semibold shadow-inner shadow-white/5"
                    : "text-[#a8a29a] hover:bg-white/5 hover:text-[#f5f2ea]"
                }`}
              >
                <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
                {item.href === "/admin/prenotazioni" && newCount > 0 && (
                  <span className="ml-auto bg-[#f5f2ea] text-[#080808] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {newCount > 9 ? "9+" : newCount}
                  </span>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-xl bg-[#f5f2ea] flex items-center justify-center text-[#080808] font-black font-headline">
            {displayName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-[#f5f2ea]">{displayName}</p>
            <p className="text-[10px] text-[#a8a29a] truncate">{shopAddress}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Logout">
            <span className="material-symbols-outlined text-[#a8a29a] text-sm">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-marble flex text-[#f5f2ea]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#101010]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-[#161616] rounded-xl transition-all">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 bg-black">
            <img src={faetaLogo} alt="" className="h-full w-full object-cover" />
          </div>
          <span className="font-black font-headline text-sm text-[#f5f2ea]">{shopName}</span>
        </div>
        {newCount > 0 && (
          <div className="bg-[#f5f2ea] text-[#080808] text-xs font-bold rounded-full px-2 py-0.5">{newCount}</div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 lg:pt-0 pt-14">
        {children}
      </div>
    </div>
  );
}
