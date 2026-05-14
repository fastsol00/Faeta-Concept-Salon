import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, or, isNull, like } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  adminUsers, services, hairstylists, shopHours, holidays,
  hairstylistAvailability, blockedSlots, bookings, clients,
  InsertAdminUser, InsertService, InsertHairstylist,
  InsertShopHours, InsertHoliday, InsertHairstylistAvailability,
  InsertBlockedSlot, InsertBooking, InsertClient,
  AdminUser, Service, Hairstylist, ShopHours, Holiday,
  HairstylistAvailability, BlockedSlot, Booking, Client,
} from "@shared/schema";

const sqlite = new Database("barbershop.db");
const db = drizzle(sqlite);

const BRAND_SHOP_NAME = "Faeta Concept Salon";
const BRAND_SHOP_ADDRESS = "Via Cupa Fosso Del Lupo 136 NA";
const BRAND_SHOP_HOURS: InsertShopHours[] = [
  { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: true, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 2, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 3, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 4, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 5, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 6, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
];

// ─── Migrations ───────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Manager',
    shop_address TEXT NOT NULL DEFAULT 'Via Cupa Fosso Del Lupo 136 NA',
    shop_name TEXT NOT NULL DEFAULT 'Faeta Concept Salon'
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS hairstylists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS shop_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week INTEGER NOT NULL,
    open_time TEXT,
    close_time TEXT,
    is_closed INTEGER NOT NULL DEFAULT 0,
    lunch_start TEXT,
    lunch_end TEXT
  );
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Festività'
  );
  CREATE TABLE IF NOT EXISTS hairstylist_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hairstylist_id INTEGER NOT NULL REFERENCES hairstylists(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT,
    end_time TEXT,
    is_available INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS blocked_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hairstylist_id INTEGER,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    reason TEXT
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    total_bookings INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    client_id INTEGER,
    service_id INTEGER NOT NULL REFERENCES services(id),
    hairstylist_id INTEGER NOT NULL REFERENCES hairstylists(id),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at INTEGER NOT NULL,
    is_new INTEGER NOT NULL DEFAULT 1
  );
`);

// ─── Alter existing tables (add new columns if missing) ───────────────────────
const tryAlter = (sql: string) => { try { sqlite.exec(sql); } catch (_) {} };
tryAlter("ALTER TABLE admin_users ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Manager'");
tryAlter("ALTER TABLE admin_users ADD COLUMN shop_address TEXT NOT NULL DEFAULT 'Via Cupa Fosso Del Lupo 136 NA'");
tryAlter("ALTER TABLE admin_users ADD COLUMN shop_name TEXT NOT NULL DEFAULT 'Faeta Concept Salon'");
tryAlter("ALTER TABLE shop_hours ADD COLUMN lunch_start TEXT");
tryAlter("ALTER TABLE shop_hours ADD COLUMN lunch_end TEXT");
tryAlter("ALTER TABLE bookings ADD COLUMN booking_code TEXT");
tryAlter("ALTER TABLE bookings ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
tryAlter("ALTER TABLE bookings ADD COLUMN client_id INTEGER");

// ─── Booking code generator ───────────────────────────────────────────────────
function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // skip I and O to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function uniqueBookingCode(): string {
  let code = generateBookingCode();
  let attempts = 0;
  while (attempts < 100) {
    const existing = db.select().from(bookings).where(eq(bookings.bookingCode, code)).get();
    if (!existing) return code;
    code = generateBookingCode();
    attempts++;
  }
  // Fallback: prefix + random 4
  return "G" + Date.now().toString(36).slice(-5).toUpperCase();
}

// Backfill existing bookings without codes
const noCodeBookings = db.select().from(bookings).all().filter(b => !b.bookingCode);
for (const b of noCodeBookings) {
  db.update(bookings).set({ bookingCode: uniqueBookingCode() }).where(eq(bookings.id, b.id)).run();
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
function seed() {
  const existingAdmin = db.select().from(adminUsers).get();
  if (existingAdmin) return;

  const hash = bcrypt.hashSync("admin123", 10);
  db.insert(adminUsers).values({
    username: "admin", passwordHash: hash, name: "Manager",
    displayName: "Manager", shopAddress: BRAND_SHOP_ADDRESS,
    shopName: BRAND_SHOP_NAME,
  }).run();

  db.insert(services).values([
    { name: "Taglio", durationMinutes: 30, price: 25, active: true },
    { name: "Barba", durationMinutes: 20, price: 15, active: true },
    { name: "Taglio + Barba", durationMinutes: 50, price: 35, active: true },
    { name: "Rasatura", durationMinutes: 30, price: 20, active: true },
    { name: "Styling", durationMinutes: 20, price: 15, active: true },
    { name: "Altro", durationMinutes: 30, price: 20, active: true },
  ]).run();

  db.insert(hairstylists).values([
    { name: "Marco Santini", specialization: "Taglio Classico & Barba", avatar: "", active: true },
    { name: "Luca Ferrari", specialization: "Styling Moderno", avatar: "", active: true },
    { name: "Sara Longhi", specialization: "Colorazione & Trattamenti", avatar: "", active: true },
  ]).run();

  const shopDefaults = BRAND_SHOP_HOURS;
  for (const h of shopDefaults) db.insert(shopHours).values(h).run();

  const stylistIds = db.select().from(hairstylists).all().map(s => s.id);
  for (const sid of stylistIds) {
    for (const h of shopDefaults) {
      db.insert(hairstylistAvailability).values({
        hairstylistId: sid, dayOfWeek: h.dayOfWeek,
        startTime: h.openTime, endTime: h.closeTime, isAvailable: !h.isClosed,
      }).run();
    }
  }

  // Sample clients
  db.insert(clients).values([
    { firstName: "Giulia", lastName: "Rossi", phone: "3331234567", email: "giulia@email.com", createdAt: Date.now() - 86400000 * 10, totalBookings: 2 },
    { firstName: "Alessandro", lastName: "Bianchi", phone: "3337654321", email: "alex@email.com", createdAt: Date.now() - 86400000 * 5, totalBookings: 1 },
    { firstName: "Matteo", lastName: "Neri", phone: "3339876543", email: null, createdAt: Date.now() - 86400000 * 3, totalBookings: 1 },
  ]).run();

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const todayStr = fmt(today);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = fmt(tomorrow);

  db.insert(bookings).values([
    { bookingCode: uniqueBookingCode(), firstName: "Giulia", lastName: "Rossi", phone: "3331234567", clientId: 1, serviceId: 3, hairstylistId: 1, date: todayStr, time: "10:00", status: "confirmed", createdAt: Date.now() - 3600000, isNew: true },
    { bookingCode: uniqueBookingCode(), firstName: "Alessandro", lastName: "Bianchi", phone: "3337654321", clientId: 2, serviceId: 2, hairstylistId: 2, date: todayStr, time: "11:30", status: "confirmed", createdAt: Date.now() - 7200000, isNew: false },
    { bookingCode: uniqueBookingCode(), firstName: "Matteo", lastName: "Neri", phone: "3339876543", clientId: 3, serviceId: 1, hairstylistId: 1, date: todayStr, time: "14:00", status: "completed", createdAt: Date.now() - 86400000, isNew: false },
    { bookingCode: uniqueBookingCode(), firstName: "Chiara", lastName: "Verdi", phone: "3335551234", serviceId: 5, hairstylistId: 3, date: tomorrowStr, time: "09:30", status: "confirmed", createdAt: Date.now() - 1800000, isNew: true },
    { bookingCode: uniqueBookingCode(), firstName: "Roberto", lastName: "Mancini", phone: "3334441234", serviceId: 1, hairstylistId: 2, date: tomorrowStr, time: "15:00", status: "confirmed", createdAt: Date.now() - 900000, isNew: false },
  ]).run();
}
seed();

function applyBrandDefaults() {
  sqlite.prepare(`
    UPDATE admin_users
    SET shop_name = ?,
        shop_address = ?
  `).run(BRAND_SHOP_NAME, BRAND_SHOP_ADDRESS);

  const currentHours = db.select().from(shopHours).all();
  const hasLegacyHours = currentHours.length !== 7 || currentHours.some(h =>
    h.openTime === "09:00" ||
    h.closeTime === "19:00" ||
    (h.dayOfWeek === 0 && !h.isClosed) ||
    (h.dayOfWeek >= 2 && h.dayOfWeek <= 6 && (h.isClosed || h.openTime !== "08:30" || h.closeTime !== "20:00"))
  );
  if (hasLegacyHours) {
    db.delete(shopHours).run();
    for (const h of BRAND_SHOP_HOURS) db.insert(shopHours).values(h).run();
  }

  const availability = db.select().from(hairstylistAvailability).all();
  const hasLegacyAvailability = availability.length === 0 || availability.some(a =>
    a.startTime === "09:00" ||
    a.endTime === "19:00" ||
    (a.dayOfWeek === 0 && a.isAvailable) ||
    (a.dayOfWeek >= 2 && a.dayOfWeek <= 6 && (!a.isAvailable || a.startTime !== "08:30" || a.endTime !== "20:00"))
  );
  if (hasLegacyAvailability) {
    const stylistIds = db.select().from(hairstylists).all().map(s => s.id);
    db.delete(hairstylistAvailability).run();
    for (const sid of stylistIds) {
      for (const h of BRAND_SHOP_HOURS) {
        db.insert(hairstylistAvailability).values({
          hairstylistId: sid,
          dayOfWeek: h.dayOfWeek,
          startTime: h.openTime,
          endTime: h.closeTime,
          isAvailable: !h.isClosed,
        }).run();
      }
    }
  }
}
applyBrandDefaults();

// ─── Storage Interface ────────────────────────────────────────────────────────
export interface IStorage {
  // Auth
  getAdminByUsername(username: string): AdminUser | undefined;
  getAdminById(id: number): AdminUser | undefined;
  updateAdmin(id: number, data: Partial<InsertAdminUser>): AdminUser | undefined;
  // Services
  getServices(): Service[];
  createService(data: InsertService): Service;
  updateService(id: number, data: Partial<InsertService>): Service | undefined;
  deleteService(id: number): void;
  // Hairstylists
  getHairstylists(): Hairstylist[];
  getHairstylistById(id: number): Hairstylist | undefined;
  createHairstylist(data: InsertHairstylist): Hairstylist;
  updateHairstylist(id: number, data: Partial<InsertHairstylist>): Hairstylist | undefined;
  deleteHairstylist(id: number): void;
  // Shop hours
  getShopHours(): ShopHours[];
  upsertShopHours(data: InsertShopHours[]): ShopHours[];
  // Holidays
  getHolidays(): Holiday[];
  createHoliday(data: InsertHoliday): Holiday;
  deleteHoliday(id: number): void;
  // Hairstylist availability
  getHairstylistAvailability(hairstylistId: number): HairstylistAvailability[];
  upsertHairstylistAvailability(hairstylistId: number, data: InsertHairstylistAvailability[]): HairstylistAvailability[];
  // Blocked slots
  getBlockedSlots(hairstylistId?: number, date?: string): BlockedSlot[];
  createBlockedSlot(data: InsertBlockedSlot): BlockedSlot;
  deleteBlockedSlot(id: number): void;
  // Clients
  getClients(): Client[];
  getClientById(id: number): Client | undefined;
  findClientByPhone(phone: string): Client | undefined;
  findClientByEmail(email: string): Client | undefined;
  upsertClient(data: InsertClient): Client;
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined;
  deleteClient(id: number): void;
  // Bookings
  getBookings(filters?: { date?: string; hairstylistId?: number; serviceId?: number; status?: string }): Booking[];
  getBookingById(id: number): Booking | undefined;
  getBookingByCode(code: string): Booking | undefined;
  createBooking(data: InsertBooking & { phone: string }): Booking;
  updateBooking(id: number, data: Partial<Booking>): Booking | undefined;
  deleteBooking(id: number): void;
  markBookingsRead(): void;
  getNewBookingsCount(): number;
  // Available slots
  getAvailableSlots(hairstylistId: number, date: string, durationMinutes: number, excludeBookingId?: number): string[];
}

export class SqliteStorage implements IStorage {
  getAdminByUsername(username: string) {
    return db.select().from(adminUsers).where(eq(adminUsers.username, username)).get();
  }
  getAdminById(id: number) {
    return db.select().from(adminUsers).where(eq(adminUsers.id, id)).get();
  }
  updateAdmin(id: number, data: Partial<InsertAdminUser>) {
    return db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning().get();
  }

  getServices() { return db.select().from(services).all(); }
  createService(data: InsertService) { return db.insert(services).values(data).returning().get()!; }
  updateService(id: number, data: Partial<InsertService>) {
    return db.update(services).set(data).where(eq(services.id, id)).returning().get();
  }
  deleteService(id: number) { db.delete(services).where(eq(services.id, id)).run(); }

  getHairstylists() { return db.select().from(hairstylists).all(); }
  getHairstylistById(id: number) { return db.select().from(hairstylists).where(eq(hairstylists.id, id)).get(); }
  createHairstylist(data: InsertHairstylist) { return db.insert(hairstylists).values(data).returning().get()!; }
  updateHairstylist(id: number, data: Partial<InsertHairstylist>) {
    return db.update(hairstylists).set(data).where(eq(hairstylists.id, id)).returning().get();
  }
  deleteHairstylist(id: number) { db.delete(hairstylists).where(eq(hairstylists.id, id)).run(); }

  getShopHours() { return db.select().from(shopHours).all(); }
  upsertShopHours(data: InsertShopHours[]) {
    db.delete(shopHours).run();
    for (const h of data) db.insert(shopHours).values(h).run();
    return db.select().from(shopHours).all();
  }

  getHolidays() { return db.select().from(holidays).all(); }
  createHoliday(data: InsertHoliday) { return db.insert(holidays).values(data).returning().get()!; }
  deleteHoliday(id: number) { db.delete(holidays).where(eq(holidays.id, id)).run(); }

  getHairstylistAvailability(hairstylistId: number) {
    return db.select().from(hairstylistAvailability)
      .where(eq(hairstylistAvailability.hairstylistId, hairstylistId)).all();
  }
  upsertHairstylistAvailability(hairstylistId: number, data: InsertHairstylistAvailability[]) {
    db.delete(hairstylistAvailability).where(eq(hairstylistAvailability.hairstylistId, hairstylistId)).run();
    for (const a of data) db.insert(hairstylistAvailability).values(a).run();
    return this.getHairstylistAvailability(hairstylistId);
  }

  getBlockedSlots(hairstylistId?: number, date?: string) {
    let q = db.select().from(blockedSlots) as any;
    const conditions: any[] = [];
    if (hairstylistId !== undefined) conditions.push(or(eq(blockedSlots.hairstylistId, hairstylistId), isNull(blockedSlots.hairstylistId)));
    if (date) conditions.push(eq(blockedSlots.date, date));
    if (conditions.length > 0) q = q.where(and(...conditions));
    return q.all();
  }
  createBlockedSlot(data: InsertBlockedSlot) { return db.insert(blockedSlots).values(data).returning().get()!; }
  deleteBlockedSlot(id: number) { db.delete(blockedSlots).where(eq(blockedSlots.id, id)).run(); }

  getClients() { return db.select().from(clients).orderBy(desc(clients.createdAt)).all(); }
  getClientById(id: number) { return db.select().from(clients).where(eq(clients.id, id)).get(); }
  findClientByPhone(phone: string) { return db.select().from(clients).where(eq(clients.phone, phone)).get(); }
  findClientByEmail(email: string) { return db.select().from(clients).where(eq(clients.email, email)).get(); }
  upsertClient(data: InsertClient): Client {
    // Dedup by phone first, then email
    let existing = this.findClientByPhone(data.phone);
    if (!existing && data.email) existing = this.findClientByEmail(data.email);
    if (existing) {
      // Update name if changed, increment bookings
      const updated = db.update(clients).set({
        firstName: data.firstName,
        lastName: data.lastName,
        totalBookings: existing.totalBookings + 1,
        email: data.email ?? existing.email,
      }).where(eq(clients.id, existing.id)).returning().get()!;
      return updated;
    }
    return db.insert(clients).values({ ...data, createdAt: Date.now(), totalBookings: 1 }).returning().get()!;
  }
  updateClient(id: number, data: Partial<InsertClient>) {
    return db.update(clients).set(data).where(eq(clients.id, id)).returning().get();
  }
  deleteClient(id: number) { db.delete(clients).where(eq(clients.id, id)).run(); }

  getBookings(filters?: { date?: string; hairstylistId?: number; serviceId?: number; status?: string }) {
    let q = db.select().from(bookings) as any;
    const conditions: any[] = [];
    if (filters?.date) conditions.push(eq(bookings.date, filters.date));
    if (filters?.hairstylistId) conditions.push(eq(bookings.hairstylistId, filters.hairstylistId));
    if (filters?.serviceId) conditions.push(eq(bookings.serviceId, filters.serviceId));
    if (filters?.status) conditions.push(eq(bookings.status, filters.status));
    if (conditions.length > 0) q = q.where(and(...conditions));
    return q.orderBy(desc(bookings.createdAt)).all();
  }
  getBookingById(id: number) { return db.select().from(bookings).where(eq(bookings.id, id)).get(); }
  getBookingByCode(code: string) { return db.select().from(bookings).where(eq(bookings.bookingCode, code.toUpperCase())).get(); }

  createBooking(data: InsertBooking & { phone: string }): Booking {
    const code = uniqueBookingCode();
    // Upsert client
    const client = this.upsertClient({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: undefined,
    });
    return db.insert(bookings).values({
      ...data,
      bookingCode: code,
      clientId: client.id,
      createdAt: Date.now(),
      isNew: true,
    }).returning().get()!;
  }

  updateBooking(id: number, data: Partial<Booking>) {
    return db.update(bookings).set(data).where(eq(bookings.id, id)).returning().get();
  }
  deleteBooking(id: number) { db.delete(bookings).where(eq(bookings.id, id)).run(); }
  markBookingsRead() { db.update(bookings).set({ isNew: false }).run(); }
  getNewBookingsCount() { return db.select().from(bookings).all().filter(b => b.isNew).length; }

  getAvailableSlots(hairstylistId: number, date: string, durationMinutes: number, excludeBookingId?: number): string[] {
    const d = new Date(date + "T12:00:00");
    const dow = d.getDay();
    if (dow === 1) return [];

    // Check holiday
    const holiday = db.select().from(holidays).where(eq(holidays.date, date)).get();
    if (holiday) return [];

    const sh = db.select().from(shopHours).where(eq(shopHours.dayOfWeek, dow)).get();
    if (!sh || sh.isClosed || !sh.openTime || !sh.closeTime) return [];

    const ha = db.select().from(hairstylistAvailability)
      .where(and(
        eq(hairstylistAvailability.hairstylistId, hairstylistId),
        eq(hairstylistAvailability.dayOfWeek, dow)
      )).get();
    if (!ha || !ha.isAvailable || !ha.startTime || !ha.endTime) return [];

    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    const start = Math.max(toMins(sh.openTime), toMins(ha.startTime));
    const end = Math.min(toMins(sh.closeTime), toMins(ha.endTime));

    // Pausa pranzo (se configurata per questo giorno)
    const lunchStart = sh.lunchStart ? toMins(sh.lunchStart) : null;
    const lunchEnd = sh.lunchEnd ? toMins(sh.lunchEnd) : null;

    const existingBookings = db.select().from(bookings)
      .where(and(eq(bookings.hairstylistId, hairstylistId), eq(bookings.date, date))).all()
      .filter(b => b.status !== "cancelled" && b.id !== excludeBookingId);

    const allServices = db.select().from(services).all();
    const serviceMap = new Map(allServices.map(s => [s.id, s]));
    const blocked = this.getBlockedSlots(hairstylistId, date);

    const slots: string[] = [];
    for (let t = start; t + durationMinutes <= end; t += 30) {
      const slotStart = t;
      const slotEnd = t + durationMinutes;
      let conflict = false;

      for (const booking of existingBookings) {
        const dur = serviceMap.get(booking.serviceId)?.durationMinutes ?? 30;
        const bs = toMins(booking.time);
        if (slotStart < bs + dur && slotEnd > bs) { conflict = true; break; }
      }
      if (conflict) continue;

      // Pausa pranzo: salta se lo slot si sovrappone con la pausa
      if (!conflict && lunchStart !== null && lunchEnd !== null) {
        if (slotStart < lunchEnd && slotEnd > lunchStart) conflict = true;
      }

      for (const blk of blocked) {
        if (conflict) break;
        if (!blk.startTime && !blk.endTime) { conflict = true; break; }
        if (blk.startTime && blk.endTime) {
          const bs = toMins(blk.startTime);
          const be = toMins(blk.endTime);
          if (slotStart < be && slotEnd > bs) { conflict = true; break; }
        }
      }
      if (!conflict) slots.push(toTime(slotStart));
    }
    return slots;
  }
}

export const storage = new SqliteStorage();
