import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/toaster";
import { createContext, useContext, useEffect, useState } from "react";
import HomePage from "@/pages/HomePage";
import BookingPage from "@/pages/BookingPage";
import ConfirmationPage from "@/pages/ConfirmationPage";
import ManageBookingPage from "@/pages/ManageBookingPage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminBookings from "@/pages/AdminBookings";
import AdminHairstylists from "@/pages/AdminHairstylists";
import AdminSettings from "@/pages/AdminSettings";
import AdminClients from "@/pages/AdminClients";
import NotFound from "@/pages/not-found";
import type { AdminSessionData } from "@/lib/adminAuth";

// ── Admin session context ────────────────────────────────────────────────────
// React state (not window/storage) — reactive and survives SPA navigation.
// Cleared on full page reload (correct security behavior for a static site).
interface AdminSessionCtx {
  session: AdminSessionData | null;
  setSession: (s: AdminSessionData | null) => void;
}

type ThemeMode = "dark-marble" | "light-marble";

interface ThemeCtx {
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const AdminSessionContext = createContext<AdminSessionCtx>({
  session: null,
  setSession: () => {},
});

export const ThemeContext = createContext<ThemeCtx>({
  theme: "dark-marble",
  toggleTheme: () => {},
});

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default function App() {
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark-marble";
    return window.localStorage.getItem("faeta-theme") === "light-marble" ? "light-marble" : "dark-marble";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", theme === "light-marble");
    document.documentElement.classList.toggle("theme-dark", theme === "dark-marble");
    window.localStorage.setItem("faeta-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(current => current === "dark-marble" ? "light-marble" : "dark-marble");
  }

  return (
    <AdminSessionContext.Provider value={{ session, setSession }}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/prenota" component={BookingPage} />
            <Route path="/conferma/:id" component={ConfirmationPage} />
            <Route path="/gestisci" component={ManageBookingPage} />
            <Route path="/admin" component={AdminLogin} />
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/admin/prenotazioni" component={AdminBookings} />
            <Route path="/admin/hairstylist" component={AdminHairstylists} />
            <Route path="/admin/clienti" component={AdminClients} />
            <Route path="/admin/impostazioni" component={AdminSettings} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </Router>
      </ThemeContext.Provider>
    </AdminSessionContext.Provider>
  );
}
