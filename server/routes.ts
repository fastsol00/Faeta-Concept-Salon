import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertBookingSchema, insertServiceSchema, insertHairstylistSchema, insertHolidaySchema, type Booking } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(httpServer: Server, app: Express) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    const admin = storage.getAdminByUsername(username);
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });
    if (!bcrypt.compareSync(password, admin.passwordHash)) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ id: admin.id, username: admin.username, name: admin.name, displayName: admin.displayName, shopAddress: admin.shopAddress, shopName: admin.shopName });
  });

  app.get("/api/admin/:id", (req, res) => {
    const admin = storage.getAdminById(Number(req.params.id));
    if (!admin) return res.status(404).json({ error: "Not found" });
    const { passwordHash, ...safe } = admin;
    res.json(safe);
  });

  app.patch("/api/admin/:id", (req, res) => {
    const { newPassword, currentPassword, ...rest } = req.body;
    const admin = storage.getAdminById(Number(req.params.id));
    if (!admin) return res.status(404).json({ error: "Not found" });
    const updates: any = { ...rest };
    if (newPassword) {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, admin.passwordHash)) {
        return res.status(401).json({ error: "Password attuale errata" });
      }
      updates.passwordHash = bcrypt.hashSync(newPassword, 10);
    }
    const updated = storage.updateAdmin(Number(req.params.id), updates);
    if (!updated) return res.status(404).json({ error: "Not found" });
    const { passwordHash, ...safe } = updated;
    res.json(safe);
  });

  // ── Services ──────────────────────────────────────────────────────────────
  app.get("/api/services", (_req, res) => res.json(storage.getServices()));
  app.post("/api/services", (req, res) => {
    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createService(parsed.data));
  });
  app.patch("/api/services/:id", (req, res) => {
    const r = storage.updateService(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/services/:id", (req, res) => { storage.deleteService(Number(req.params.id)); res.json({ ok: true }); });

  // ── Hairstylists ──────────────────────────────────────────────────────────
  app.get("/api/hairstylists", (_req, res) => res.json(storage.getHairstylists()));
  app.post("/api/hairstylists", (req, res) => {
    const parsed = insertHairstylistSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createHairstylist(parsed.data));
  });
  app.patch("/api/hairstylists/:id", (req, res) => {
    const r = storage.updateHairstylist(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/hairstylists/:id", (req, res) => { storage.deleteHairstylist(Number(req.params.id)); res.json({ ok: true }); });

  // ── Availability ──────────────────────────────────────────────────────────
  app.get("/api/hairstylists/:id/availability", (req, res) => res.json(storage.getHairstylistAvailability(Number(req.params.id))));
  app.put("/api/hairstylists/:id/availability", (req, res) => {
    const hId = Number(req.params.id);
    const data = Array.isArray(req.body) ? req.body.map((a: any) => ({ ...a, hairstylistId: hId })) : [];
    res.json(storage.upsertHairstylistAvailability(hId, data));
  });

  // ── Shop Hours ────────────────────────────────────────────────────────────
  app.get("/api/shop-hours", (_req, res) => res.json(storage.getShopHours()));
  app.put("/api/shop-hours", (req, res) => res.json(storage.upsertShopHours(Array.isArray(req.body) ? req.body : [])));

  // ── Holidays ──────────────────────────────────────────────────────────────
  app.get("/api/holidays", (_req, res) => res.json(storage.getHolidays()));
  app.post("/api/holidays", (req, res) => {
    const parsed = insertHolidaySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    try { res.json(storage.createHoliday(parsed.data)); } catch { res.status(409).json({ error: "Data già presente" }); }
  });
  app.delete("/api/holidays/:id", (req, res) => { storage.deleteHoliday(Number(req.params.id)); res.json({ ok: true }); });

  // ── Blocked Slots ─────────────────────────────────────────────────────────
  app.get("/api/blocked-slots", (req, res) => res.json(storage.getBlockedSlots(req.query.hairstylistId ? Number(req.query.hairstylistId) : undefined, req.query.date as string)));
  app.post("/api/blocked-slots", (req, res) => res.json(storage.createBlockedSlot(req.body)));
  app.delete("/api/blocked-slots/:id", (req, res) => { storage.deleteBlockedSlot(Number(req.params.id)); res.json({ ok: true }); });

  // ── Available Slots ───────────────────────────────────────────────────────
  app.get("/api/available-slots", (req, res) => {
    const { hairstylistId, date, durationMinutes, excludeBookingId } = req.query;
    if (!hairstylistId || !date || !durationMinutes) return res.status(400).json({ error: "Missing params" });
    res.json(storage.getAvailableSlots(Number(hairstylistId), date as string, Number(durationMinutes), excludeBookingId ? Number(excludeBookingId) : undefined));
  });

  // ── Clients ───────────────────────────────────────────────────────────────
  app.get("/api/clients", (_req, res) => res.json(storage.getClients()));
  app.get("/api/clients/:id", (req, res) => {
    const c = storage.getClientById(Number(req.params.id));
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.patch("/api/clients/:id", (req, res) => {
    const r = storage.updateClient(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/clients/:id", (req, res) => { storage.deleteClient(Number(req.params.id)); res.json({ ok: true }); });

  // ── Bookings ──────────────────────────────────────────────────────────────
  app.get("/api/bookings", (req, res) => {
    const { date, hairstylistId, serviceId, status } = req.query;
    res.json(storage.getBookings({ date: date as string, hairstylistId: hairstylistId ? Number(hairstylistId) : undefined, serviceId: serviceId ? Number(serviceId) : undefined, status: status as string }));
  });
  app.get("/api/bookings/new-count", (_req, res) => res.json({ count: storage.getNewBookingsCount() }));
  app.post("/api/bookings/mark-read", (_req, res) => { storage.markBookingsRead(); res.json({ ok: true }); });

  app.get("/api/bookings/by-code/:code", (req, res) => {
    const b = storage.getBookingByCode(req.params.code);
    if (!b) return res.status(404).json({ error: "Prenotazione non trovata" });
    const service = storage.getServices().find(s => s.id === b.serviceId);
    const hairstylist = storage.getHairstylists().find(h => h.id === b.hairstylistId);
    const adminUser = storage.getAdminById(1);
    const shopAddress = adminUser?.shopAddress ?? "Via Cupa Fosso Del Lupo 136 NA";
    const shopName = adminUser?.shopName ?? "Faeta Concept Salon";
    res.json({ booking: b, service, hairstylist, shopAddress, shopName });
  });

  app.get("/api/bookings/:id", (req, res) => {
    const b = storage.getBookingById(Number(req.params.id));
    if (!b) return res.status(404).json({ error: "Not found" });
    res.json(b);
  });

  app.post("/api/bookings", (req, res) => {
    const schema = insertBookingSchema.extend({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(8, "Telefono obbligatorio"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { hairstylistId, date, time, serviceId } = parsed.data;
    const svc = storage.getServices().find(s => s.id === serviceId);
    if (!svc) return res.status(400).json({ error: "Service not found" });

    const available = storage.getAvailableSlots(hairstylistId, date, svc.durationMinutes);
    if (!available.includes(time)) return res.status(409).json({ error: "Slot non più disponibile" });

    res.status(201).json(storage.createBooking({ ...parsed.data, phone: parsed.data.phone }));
  });

  app.post("/api/bookings/admin-create", (req, res) => {
    // Admin can create bookings for any slot (no double-booking check bypass, but skip availability validation)
    const { firstName, lastName, phone, serviceId, hairstylistId, date, time, notes, status } = req.body;
    if (!firstName || !lastName || !serviceId || !hairstylistId || !date || !time) {
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }
    const booking = storage.createBooking({ firstName, lastName, phone: phone || "", serviceId, hairstylistId, date, time, notes, status: status || "confirmed" });
    res.status(201).json(booking);
  });

  app.patch("/api/bookings/:id", (req, res) => {
    const r = storage.updateBooking(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/bookings/:id", (req, res) => { storage.deleteBooking(Number(req.params.id)); res.json({ ok: true }); });

  // ── Stats ─────────────────────────────────────────────────────────────────
  app.get("/api/stats", (_req, res) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const all: Booking[] = storage.getBookings();
    const today = all.filter(b => b.date === todayStr && b.status !== "cancelled");
    const week = all.filter(b => b.date >= weekStart.toISOString().split("T")[0] && b.status !== "cancelled");
    const countMap = new Map<number, number>();
    week.forEach(b => countMap.set(b.hairstylistId, (countMap.get(b.hairstylistId) ?? 0) + 1));
    let topId = -1, topCount = 0;
    countMap.forEach((cnt, id) => { if (cnt > topCount) { topCount = cnt; topId = id; } });
    const topStylist = storage.getHairstylists().find(h => h.id === topId);
    res.json({ todayCount: today.length, weekCount: week.length, topStylist: topStylist?.name ?? "—", newCount: storage.getNewBookingsCount(), clientCount: storage.getClients().length });
  });
}
