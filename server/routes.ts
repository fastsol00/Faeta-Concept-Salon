import type { Express } from "express";
import { storage } from "./storage.js";
import bcrypt from "bcryptjs";
import { insertBookingSchema, insertHairstylistSchema, insertHolidaySchema, insertServiceSchema, type Booking } from "../shared/schema.js";
import { z } from "zod";

export async function registerRoutes(app: Express) {
  await storage.ensureReady();

  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    const admin = await storage.getAdminByUsername(username);
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });
    if (!bcrypt.compareSync(password, admin.passwordHash)) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ id: admin.id, username: admin.username, name: admin.name, displayName: admin.displayName, shopAddress: admin.shopAddress, shopName: admin.shopName });
  });

  app.get("/api/admin/:id", async (req, res) => {
    const admin = await storage.getAdminById(Number(req.params.id));
    if (!admin) return res.status(404).json({ error: "Not found" });
    const { passwordHash, ...safe } = admin;
    res.json(safe);
  });

  app.patch("/api/admin/:id", async (req, res) => {
    const { newPassword, currentPassword, ...rest } = req.body;
    const admin = await storage.getAdminById(Number(req.params.id));
    if (!admin) return res.status(404).json({ error: "Not found" });
    const updates: any = { ...rest };
    if (newPassword) {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, admin.passwordHash)) {
        return res.status(401).json({ error: "Password attuale errata" });
      }
      updates.passwordHash = bcrypt.hashSync(newPassword, 10);
    }
    const updated = await storage.updateAdmin(Number(req.params.id), updates);
    if (!updated) return res.status(404).json({ error: "Not found" });
    const { passwordHash, ...safe } = updated;
    res.json(safe);
  });

  // ── Services ──────────────────────────────────────────────────────────────
  app.get("/api/services", async (_req, res) => res.json(await storage.getServices()));
  app.post("/api/services", async (req, res) => {
    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(await storage.createService(parsed.data));
  });
  app.patch("/api/services/:id", async (req, res) => {
    const r = await storage.updateService(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/services/:id", async (req, res) => { await storage.deleteService(Number(req.params.id)); res.json({ ok: true }); });

  // ── Hairstylists ──────────────────────────────────────────────────────────
  app.get("/api/hairstylists", async (_req, res) => res.json(await storage.getHairstylists()));
  app.post("/api/hairstylists", async (req, res) => {
    const parsed = insertHairstylistSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(await storage.createHairstylist(parsed.data));
  });
  app.patch("/api/hairstylists/:id", async (req, res) => {
    const r = await storage.updateHairstylist(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/hairstylists/:id", async (req, res) => { await storage.deleteHairstylist(Number(req.params.id)); res.json({ ok: true }); });

  // ── Availability ──────────────────────────────────────────────────────────
  app.get("/api/hairstylists/:id/availability", async (req, res) => res.json(await storage.getHairstylistAvailability(Number(req.params.id))));
  app.put("/api/hairstylists/:id/availability", async (req, res) => {
    const hId = Number(req.params.id);
    const data = Array.isArray(req.body) ? req.body.map((a: any) => ({ ...a, hairstylistId: hId })) : [];
    res.json(await storage.upsertHairstylistAvailability(hId, data));
  });

  // ── Shop Hours ────────────────────────────────────────────────────────────
  app.get("/api/shop-hours", async (_req, res) => res.json(await storage.getShopHours()));
  app.put("/api/shop-hours", async (req, res) => res.json(await storage.upsertShopHours(Array.isArray(req.body) ? req.body : [])));

  // ── Holidays ──────────────────────────────────────────────────────────────
  app.get("/api/holidays", async (_req, res) => res.json(await storage.getHolidays()));
  app.post("/api/holidays", async (req, res) => {
    const parsed = insertHolidaySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    try { res.json(await storage.createHoliday(parsed.data)); } catch { res.status(409).json({ error: "Data già presente" }); }
  });
  app.delete("/api/holidays/:id", async (req, res) => { await storage.deleteHoliday(Number(req.params.id)); res.json({ ok: true }); });

  // ── Blocked Slots ─────────────────────────────────────────────────────────
  app.get("/api/blocked-slots", async (req, res) => res.json(await storage.getBlockedSlots(req.query.hairstylistId ? Number(req.query.hairstylistId) : undefined, req.query.date as string)));
  app.post("/api/blocked-slots", async (req, res) => res.json(await storage.createBlockedSlot(req.body)));
  app.delete("/api/blocked-slots/:id", async (req, res) => { await storage.deleteBlockedSlot(Number(req.params.id)); res.json({ ok: true }); });

  // ── Available Slots ───────────────────────────────────────────────────────
  app.get("/api/available-slots", async (req, res) => {
    const { hairstylistId, date, durationMinutes, excludeBookingId } = req.query;
    if (!hairstylistId || !date || !durationMinutes) return res.status(400).json({ error: "Missing params" });
    res.json(await storage.getAvailableSlots(Number(hairstylistId), date as string, Number(durationMinutes), excludeBookingId ? Number(excludeBookingId) : undefined));
  });

  // ── Clients ───────────────────────────────────────────────────────────────
  app.get("/api/clients", async (_req, res) => res.json(await storage.getClients()));
  app.get("/api/clients/:id", async (req, res) => {
    const c = await storage.getClientById(Number(req.params.id));
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.patch("/api/clients/:id", async (req, res) => {
    const r = await storage.updateClient(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/clients/:id", async (req, res) => { await storage.deleteClient(Number(req.params.id)); res.json({ ok: true }); });

  // ── Bookings ──────────────────────────────────────────────────────────────
  app.get("/api/bookings", async (req, res) => {
    const { date, hairstylistId, serviceId, status } = req.query;
    res.json(await storage.getBookings({ date: date as string, hairstylistId: hairstylistId ? Number(hairstylistId) : undefined, serviceId: serviceId ? Number(serviceId) : undefined, status: status as string }));
  });
  app.get("/api/bookings/new-count", async (_req, res) => res.json({ count: await storage.getNewBookingsCount() }));
  app.post("/api/bookings/mark-read", async (_req, res) => { await storage.markBookingsRead(); res.json({ ok: true }); });

  app.get("/api/bookings/by-code/:code", async (req, res) => {
    const b = await storage.getBookingByCode(req.params.code);
    if (!b) return res.status(404).json({ error: "Prenotazione non trovata" });
    const service = (await storage.getServices()).find(s => s.id === b.serviceId);
    const hairstylist = (await storage.getHairstylists()).find(h => h.id === b.hairstylistId);
    const adminUser = await storage.getAdminById(1);
    const shopAddress = adminUser?.shopAddress ?? "Via Cupa Fosso Del Lupo 136 NA";
    const shopName = adminUser?.shopName ?? "Faeta Concept Salon";
    res.json({ booking: b, service, hairstylist, shopAddress, shopName });
  });

  app.get("/api/bookings/:id", async (req, res) => {
    const b = await storage.getBookingById(Number(req.params.id));
    if (!b) return res.status(404).json({ error: "Not found" });
    res.json(b);
  });

  app.post("/api/bookings", async (req, res) => {
    const schema = insertBookingSchema.extend({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(8, "Telefono obbligatorio"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { hairstylistId, date, time, serviceId } = parsed.data;
    const svc = (await storage.getServices()).find(s => s.id === serviceId);
    if (!svc) return res.status(400).json({ error: "Service not found" });

    const available = await storage.getAvailableSlots(hairstylistId, date, svc.durationMinutes);
    if (!available.includes(time)) return res.status(409).json({ error: "Slot non più disponibile" });

    res.status(201).json(await storage.createBooking({ ...parsed.data, phone: parsed.data.phone }));
  });

  app.post("/api/bookings/admin-create", async (req, res) => {
    const { firstName, lastName, phone, serviceId, hairstylistId, date, time, notes, status } = req.body;
    if (!firstName || !lastName || !serviceId || !hairstylistId || !date || !time) {
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }
    const booking = await storage.createBooking({ firstName, lastName, phone: phone || "", serviceId, hairstylistId, date, time, notes, status: status || "confirmed" });
    res.status(201).json(booking);
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    const r = await storage.updateBooking(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });
  app.delete("/api/bookings/:id", async (req, res) => { await storage.deleteBooking(Number(req.params.id)); res.json({ ok: true }); });

  // ── Stats ─────────────────────────────────────────────────────────────────
  app.get("/api/stats", async (_req, res) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const all: Booking[] = await storage.getBookings();
    const today = all.filter(b => b.date === todayStr && b.status !== "cancelled");
    const week = all.filter(b => b.date >= weekStart.toISOString().split("T")[0] && b.status !== "cancelled");
    const countMap = new Map<number, number>();
    week.forEach(b => countMap.set(b.hairstylistId, (countMap.get(b.hairstylistId) ?? 0) + 1));
    let topId = -1, topCount = 0;
    countMap.forEach((cnt, id) => { if (cnt > topCount) { topCount = cnt; topId = id; } });
    const topStylist = (await storage.getHairstylists()).find(h => h.id === topId);
    res.json({ todayCount: today.length, weekCount: week.length, topStylist: topStylist?.name ?? "—", newCount: await storage.getNewBookingsCount(), clientCount: (await storage.getClients()).length });
  });
}
