import bcrypt from "bcryptjs";
import type {
  AdminUser, BlockedSlot, Booking, Client, Hairstylist, HairstylistAvailability,
  Holiday, InsertAdminUser, InsertBlockedSlot, InsertBooking, InsertClient,
  InsertHairstylist, InsertHairstylistAvailability, InsertHoliday, InsertService,
  InsertShopHours, Service, ShopHours,
} from "@shared/schema";

const BRAND_SHOP_NAME = "Faeta Concept Salon";
const BRAND_SHOP_ADDRESS = "Via Cupa Fosso Del Lupo 136 NA";
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const BRAND_SHOP_HOURS: InsertShopHours[] = [
  { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: true, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 2, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 3, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 4, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 5, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
  { dayOfWeek: 6, openTime: "08:30", closeTime: "20:00", isClosed: false, lunchStart: null, lunchEnd: null },
];

type FilterValue = string | number | boolean | null;

export interface IStorage {
  ensureReady(): Promise<void>;
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminById(id: number): Promise<AdminUser | undefined>;
  updateAdmin(id: number, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined>;
  getServices(): Promise<Service[]>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;
  getHairstylists(): Promise<Hairstylist[]>;
  getHairstylistById(id: number): Promise<Hairstylist | undefined>;
  createHairstylist(data: InsertHairstylist): Promise<Hairstylist>;
  updateHairstylist(id: number, data: Partial<InsertHairstylist>): Promise<Hairstylist | undefined>;
  deleteHairstylist(id: number): Promise<void>;
  getShopHours(): Promise<ShopHours[]>;
  upsertShopHours(data: InsertShopHours[]): Promise<ShopHours[]>;
  getHolidays(): Promise<Holiday[]>;
  createHoliday(data: InsertHoliday): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  getHairstylistAvailability(hairstylistId: number): Promise<HairstylistAvailability[]>;
  upsertHairstylistAvailability(hairstylistId: number, data: InsertHairstylistAvailability[]): Promise<HairstylistAvailability[]>;
  getBlockedSlots(hairstylistId?: number, date?: string): Promise<BlockedSlot[]>;
  createBlockedSlot(data: InsertBlockedSlot): Promise<BlockedSlot>;
  deleteBlockedSlot(id: number): Promise<void>;
  getClients(): Promise<Client[]>;
  getClientById(id: number): Promise<Client | undefined>;
  findClientByPhone(phone: string): Promise<Client | undefined>;
  findClientByEmail(email: string): Promise<Client | undefined>;
  upsertClient(data: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<void>;
  getBookings(filters?: { date?: string; hairstylistId?: number; serviceId?: number; status?: string }): Promise<Booking[]>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingByCode(code: string): Promise<Booking | undefined>;
  createBooking(data: InsertBooking & { phone: string }): Promise<Booking>;
  updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<void>;
  markBookingsRead(): Promise<void>;
  getNewBookingsCount(): Promise<number>;
  getAvailableSlots(hairstylistId: number, date: string, durationMinutes: number, excludeBookingId?: number): Promise<string[]>;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} mancante. Configura Supabase prima di avviare il server.`);
  return value;
}

function toCamel(row: any): any {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    shopAddress: row.shop_address,
    shopName: row.shop_name,
    durationMinutes: row.duration_minutes,
    dayOfWeek: row.day_of_week,
    openTime: row.open_time,
    closeTime: row.close_time,
    isClosed: row.is_closed,
    lunchStart: row.lunch_start,
    lunchEnd: row.lunch_end,
    hairstylistId: row.hairstylist_id,
    startTime: row.start_time,
    endTime: row.end_time,
    isAvailable: row.is_available,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
    totalBookings: row.total_bookings,
    bookingCode: row.booking_code,
    clientId: row.client_id,
    serviceId: row.service_id,
    isNew: row.is_new,
  };
}

function toSnake(data: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    passwordHash: "password_hash",
    displayName: "display_name",
    shopAddress: "shop_address",
    shopName: "shop_name",
    durationMinutes: "duration_minutes",
    dayOfWeek: "day_of_week",
    openTime: "open_time",
    closeTime: "close_time",
    isClosed: "is_closed",
    lunchStart: "lunch_start",
    lunchEnd: "lunch_end",
    hairstylistId: "hairstylist_id",
    startTime: "start_time",
    endTime: "end_time",
    isAvailable: "is_available",
    firstName: "first_name",
    lastName: "last_name",
    createdAt: "created_at",
    totalBookings: "total_bookings",
    bookingCode: "booking_code",
    clientId: "client_id",
    serviceId: "service_id",
    isNew: "is_new",
  };
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [map[key] ?? key, value]),
  );
}

function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

class SupabaseRest {
  private readonly baseUrl: string;
  private readonly key: string;

  constructor() {
    this.baseUrl = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
    this.key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  }

  private url(table: string, params?: URLSearchParams) {
    const query = params?.toString();
    return `${this.baseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`;
  }

  private async request<T>(table: string, init: RequestInit = {}, params?: URLSearchParams): Promise<T> {
    const res = await fetch(this.url(table, params), {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return await res.json() as T;
  }

  async select<T>(table: string, filters: Record<string, FilterValue> = {}, order?: string): Promise<T[]> {
    const params = new URLSearchParams({ select: "*" });
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) params.set(key, "is.null");
      else params.set(key, `eq.${String(value)}`);
    }
    if (order) params.set("order", order);
    const rows = await this.request<any[]>(table, { method: "GET" }, params);
    return rows.map(toCamel) as T[];
  }

  async selectOne<T>(table: string, filters: Record<string, FilterValue>): Promise<T | undefined> {
    const params = new URLSearchParams({ select: "*", limit: "1" });
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) params.set(key, "is.null");
      else params.set(key, `eq.${String(value)}`);
    }
    const rows = await this.request<any[]>(table, { method: "GET" }, params);
    return rows[0] ? toCamel(rows[0]) as T : undefined;
  }

  async insert<T>(table: string, data: Record<string, any>): Promise<T> {
    const rows = await this.request<any[]>(table, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toSnake(data)),
    });
    return toCamel(rows[0]) as T;
  }

  async insertMany<T>(table: string, data: Record<string, any>[]): Promise<T[]> {
    const rows = await this.request<any[]>(table, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(data.map(toSnake)),
    });
    return rows.map(toCamel) as T[];
  }

  async update<T>(table: string, filters: Record<string, FilterValue>, data: Record<string, any>): Promise<T | undefined> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) params.set(key, `eq.${String(value)}`);
    const rows = await this.request<any[]>(table, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toSnake(data)),
    }, params);
    return rows[0] ? toCamel(rows[0]) as T : undefined;
  }

  async delete(table: string, filters: Record<string, FilterValue>): Promise<void> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) params.set(key, `eq.${String(value)}`);
    await this.request<void>(table, { method: "DELETE", headers: { Prefer: "return=minimal" } }, params);
  }

  async deleteAll(table: string): Promise<void> {
    const params = new URLSearchParams({ id: "gte.0" });
    await this.request<void>(table, { method: "DELETE", headers: { Prefer: "return=minimal" } }, params);
  }

  async blocked(hairstylistId?: number, date?: string): Promise<BlockedSlot[]> {
    const params = new URLSearchParams({ select: "*" });
    if (date) params.set("date", `eq.${date}`);
    if (hairstylistId !== undefined) params.set("or", `(hairstylist_id.eq.${hairstylistId},hairstylist_id.is.null)`);
    const rows = await this.request<any[]>("blocked_slots", { method: "GET" }, params);
    return rows.map(toCamel) as BlockedSlot[];
  }
}

export class SupabaseStorage implements IStorage {
  private readonly supabase = new SupabaseRest();

  async ensureReady() {
    const admin = await this.getAdminByUsername(DEFAULT_ADMIN_USERNAME);
    if (!admin) {
      await this.supabase.insert<AdminUser>("admin_users", {
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
        name: "Manager",
        displayName: "Manager",
        shopAddress: BRAND_SHOP_ADDRESS,
        shopName: BRAND_SHOP_NAME,
      });
    }
    if ((await this.getShopHours()).length === 0) {
      await this.supabase.insertMany<ShopHours>("shop_hours", BRAND_SHOP_HOURS);
    }
  }

  getAdminByUsername(username: string) { return this.supabase.selectOne<AdminUser>("admin_users", { username }); }
  getAdminById(id: number) { return this.supabase.selectOne<AdminUser>("admin_users", { id }); }
  updateAdmin(id: number, data: Partial<InsertAdminUser>) { return this.supabase.update<AdminUser>("admin_users", { id }, data); }

  getServices() { return this.supabase.select<Service>("services"); }
  createService(data: InsertService) { return this.supabase.insert<Service>("services", data); }
  updateService(id: number, data: Partial<InsertService>) { return this.supabase.update<Service>("services", { id }, data); }
  deleteService(id: number) { return this.supabase.delete("services", { id }); }

  getHairstylists() { return this.supabase.select<Hairstylist>("hairstylists"); }
  getHairstylistById(id: number) { return this.supabase.selectOne<Hairstylist>("hairstylists", { id }); }
  createHairstylist(data: InsertHairstylist) { return this.supabase.insert<Hairstylist>("hairstylists", data); }
  updateHairstylist(id: number, data: Partial<InsertHairstylist>) { return this.supabase.update<Hairstylist>("hairstylists", { id }, data); }
  deleteHairstylist(id: number) { return this.supabase.delete("hairstylists", { id }); }

  getShopHours() { return this.supabase.select<ShopHours>("shop_hours", {}, "day_of_week.asc"); }
  async upsertShopHours(data: InsertShopHours[]) {
    await this.supabase.deleteAll("shop_hours");
    await this.supabase.insertMany<ShopHours>("shop_hours", data);
    return this.getShopHours();
  }

  getHolidays() { return this.supabase.select<Holiday>("holidays", {}, "date.asc"); }
  createHoliday(data: InsertHoliday) { return this.supabase.insert<Holiday>("holidays", data); }
  deleteHoliday(id: number) { return this.supabase.delete("holidays", { id }); }

  getHairstylistAvailability(hairstylistId: number) {
    return this.supabase.select<HairstylistAvailability>("hairstylist_availability", { hairstylist_id: hairstylistId }, "day_of_week.asc");
  }
  async upsertHairstylistAvailability(hairstylistId: number, data: InsertHairstylistAvailability[]) {
    const existing = await this.getHairstylistAvailability(hairstylistId);
    for (const item of existing) await this.supabase.delete("hairstylist_availability", { id: item.id });
    if (data.length) await this.supabase.insertMany<HairstylistAvailability>("hairstylist_availability", data);
    return this.getHairstylistAvailability(hairstylistId);
  }

  getBlockedSlots(hairstylistId?: number, date?: string) { return this.supabase.blocked(hairstylistId, date); }
  createBlockedSlot(data: InsertBlockedSlot) { return this.supabase.insert<BlockedSlot>("blocked_slots", data); }
  deleteBlockedSlot(id: number) { return this.supabase.delete("blocked_slots", { id }); }

  getClients() { return this.supabase.select<Client>("clients", {}, "created_at.desc"); }
  getClientById(id: number) { return this.supabase.selectOne<Client>("clients", { id }); }
  findClientByPhone(phone: string) { return this.supabase.selectOne<Client>("clients", { phone }); }
  findClientByEmail(email: string) { return this.supabase.selectOne<Client>("clients", { email }); }
  async upsertClient(data: InsertClient): Promise<Client> {
    let existing = await this.findClientByPhone(data.phone);
    if (!existing && data.email) existing = await this.findClientByEmail(data.email);
    if (existing) {
      return await this.supabase.update<Client>("clients", { id: existing.id }, {
        firstName: data.firstName,
        lastName: data.lastName,
        totalBookings: existing.totalBookings + 1,
        email: data.email ?? existing.email,
        notes: data.notes ?? existing.notes,
      }) as Client;
    }
    return this.supabase.insert<Client>("clients", { ...data, createdAt: Date.now(), totalBookings: 1 });
  }
  updateClient(id: number, data: Partial<InsertClient>) { return this.supabase.update<Client>("clients", { id }, data); }
  deleteClient(id: number) { return this.supabase.delete("clients", { id }); }

  async getBookings(filters?: { date?: string; hairstylistId?: number; serviceId?: number; status?: string }) {
    return this.supabase.select<Booking>("bookings", {
      ...(filters?.date ? { date: filters.date } : {}),
      ...(filters?.hairstylistId ? { hairstylist_id: filters.hairstylistId } : {}),
      ...(filters?.serviceId ? { service_id: filters.serviceId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    }, "created_at.desc");
  }
  getBookingById(id: number) { return this.supabase.selectOne<Booking>("bookings", { id }); }
  getBookingByCode(code: string) { return this.supabase.selectOne<Booking>("bookings", { booking_code: code.toUpperCase() }); }

  async createBooking(data: InsertBooking & { phone: string }): Promise<Booking> {
    const client = await this.upsertClient({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: undefined,
      notes: undefined,
    });
    let bookingCode = generateBookingCode();
    for (let i = 0; i < 100 && await this.getBookingByCode(bookingCode); i++) bookingCode = generateBookingCode();
    return this.supabase.insert<Booking>("bookings", {
      ...data,
      bookingCode,
      clientId: client.id,
      createdAt: Date.now(),
      isNew: true,
    });
  }
  updateBooking(id: number, data: Partial<Booking>) { return this.supabase.update<Booking>("bookings", { id }, data); }
  deleteBooking(id: number) { return this.supabase.delete("bookings", { id }); }
  async markBookingsRead() {
    const newBookings = await this.getBookings();
    for (const booking of newBookings.filter(b => b.isNew)) {
      await this.updateBooking(booking.id, { isNew: false });
    }
  }
  async getNewBookingsCount() { return (await this.getBookings()).filter(b => b.isNew).length; }

  async getAvailableSlots(hairstylistId: number, date: string, durationMinutes: number, excludeBookingId?: number): Promise<string[]> {
    const d = new Date(date + "T12:00:00");
    const dow = d.getDay();
    if (dow === 0 || dow === 1) return [];
    if (await this.supabase.selectOne<Holiday>("holidays", { date })) return [];

    const sh = (await this.getShopHours()).find(h => h.dayOfWeek === dow);
    if (!sh || sh.isClosed || !sh.openTime || !sh.closeTime) return [];

    const ha = (await this.getHairstylistAvailability(hairstylistId)).find(a => a.dayOfWeek === dow);
    if (!ha || !ha.isAvailable || !ha.startTime || !ha.endTime) return [];

    const start = Math.max(toMins(sh.openTime), toMins(ha.startTime));
    const end = Math.min(toMins(sh.closeTime), toMins(ha.endTime));
    const lunchStart = sh.lunchStart ? toMins(sh.lunchStart) : null;
    const lunchEnd = sh.lunchEnd ? toMins(sh.lunchEnd) : null;
    const existingBookings = (await this.getBookings({ hairstylistId, date }))
      .filter(b => b.status !== "cancelled" && b.id !== excludeBookingId);
    const allServices = await this.getServices();
    const serviceMap = new Map(allServices.map(s => [s.id, s]));
    const blocked = await this.getBlockedSlots(hairstylistId, date);

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
      if (!conflict && lunchStart !== null && lunchEnd !== null && slotStart < lunchEnd && slotEnd > lunchStart) conflict = true;
      for (const blk of blocked) {
        if (conflict) break;
        if (!blk.startTime && !blk.endTime) { conflict = true; break; }
        if (blk.startTime && blk.endTime && slotStart < toMins(blk.endTime) && slotEnd > toMins(blk.startTime)) conflict = true;
      }
      if (!conflict) slots.push(toTime(slotStart));
    }
    return slots;
  }
}

export const storage = new SupabaseStorage();
