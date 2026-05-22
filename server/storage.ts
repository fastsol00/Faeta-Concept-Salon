import bcrypt from "bcryptjs";
import pg from "pg";
import type {
  AdminUser, BlockedSlot, Booking, Client, Hairstylist, HairstylistAvailability,
  Holiday, InsertAdminUser, InsertBlockedSlot, InsertBooking, InsertClient,
  InsertHairstylist, InsertHairstylistAvailability, InsertHoliday, InsertService,
  InsertShopHours, Service, ShopHours,
} from "../shared/schema.js";

const { Pool } = pg;

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
  const mapped = {
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
  for (const key of ["id", "durationMinutes", "dayOfWeek", "hairstylistId", "createdAt", "totalBookings", "clientId", "serviceId"]) {
    if (mapped[key] !== null && mapped[key] !== undefined) mapped[key] = Number(mapped[key]);
  }
  if (mapped.price !== null && mapped.price !== undefined) mapped.price = Number(mapped.price);
  return mapped;
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

function buildDefaultAvailability(hairstylistId: number): HairstylistAvailability[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: 0,
    hairstylistId,
    dayOfWeek,
    startTime: dayOfWeek === 0 || dayOfWeek === 1 ? null : "08:30",
    endTime: dayOfWeek === 0 || dayOfWeek === 1 ? null : "20:00",
    isAvailable: dayOfWeek !== 0 && dayOfWeek !== 1,
  }));
}

class PostgresDb {
  private readonly pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: requiredEnv("DATABASE_URL"),
      ssl: { rejectUnauthorized: false },
    });
  }

  private where(filters: Record<string, FilterValue>, startIndex = 1) {
    const values: FilterValue[] = [];
    const clauses = Object.entries(filters).map(([key, value], index) => {
      if (value === null) return `${key} is null`;
      values.push(value);
      return `${key} = $${startIndex + index}`;
    });
    return {
      clause: clauses.length ? ` where ${clauses.join(" and ")}` : "",
      values,
    };
  }

  private async query<T>(sql: string, values: any[] = []) {
    const result = await this.pool.query(sql, values);
    return result.rows.map(toCamel) as T[];
  }

  async select<T>(table: string, filters: Record<string, FilterValue> = {}, order?: string): Promise<T[]> {
    const { clause, values } = this.where(filters);
    return this.query<T>(`select * from ${table}${clause}${order ? ` order by ${order.replace(".", " ")}` : ""}`, values);
  }

  async selectOne<T>(table: string, filters: Record<string, FilterValue>): Promise<T | undefined> {
    const { clause, values } = this.where(filters);
    const rows = await this.query<T>(`select * from ${table}${clause} limit 1`, values);
    return rows[0];
  }

  async insert<T>(table: string, data: Record<string, any>): Promise<T> {
    const row = toSnake(data);
    const keys = Object.keys(row);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
    const columns = keys.join(", ");
    const rows = await this.query<T>(`insert into ${table} (${columns}) values (${placeholders}) returning *`, Object.values(row));
    return rows[0];
  }

  async insertMany<T>(table: string, data: Record<string, any>[]): Promise<T[]> {
    const inserted: T[] = [];
    for (const item of data) inserted.push(await this.insert<T>(table, item));
    return inserted;
  }

  async update<T>(table: string, filters: Record<string, FilterValue>, data: Record<string, any>): Promise<T | undefined> {
    const row = toSnake(data);
    const keys = Object.keys(row);
    if (!keys.length) return this.selectOne<T>(table, filters);
    const sets = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
    const where = this.where(filters, keys.length + 1);
    const rows = await this.query<T>(`update ${table} set ${sets}${where.clause} returning *`, [...Object.values(row), ...where.values]);
    return rows[0];
  }

  async delete(table: string, filters: Record<string, FilterValue>): Promise<void> {
    const { clause, values } = this.where(filters);
    await this.pool.query(`delete from ${table}${clause}`, values);
  }

  async deleteAll(table: string): Promise<void> {
    await this.pool.query(`delete from ${table}`);
  }

  async blocked(hairstylistId?: number, date?: string): Promise<BlockedSlot[]> {
    const clauses: string[] = [];
    const values: any[] = [];
    if (date) {
      values.push(date);
      clauses.push(`date = $${values.length}`);
    }
    if (hairstylistId !== undefined) {
      values.push(hairstylistId);
      clauses.push(`(hairstylist_id = $${values.length} or hairstylist_id is null)`);
    }
    return this.query<BlockedSlot>(`select * from blocked_slots${clauses.length ? ` where ${clauses.join(" and ")}` : ""}`, values);
  }
}

export class SupabaseStorage implements IStorage {
  private readonly supabase = new PostgresDb();

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
  async createHairstylist(data: InsertHairstylist) {
    const hairstylist = await this.supabase.insert<Hairstylist>("hairstylists", data);
    await this.supabase.insertMany<HairstylistAvailability>(
      "hairstylist_availability",
      buildDefaultAvailability(hairstylist.id).map(({ id: _id, ...row }) => row),
    );
    return hairstylist;
  }
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

  async getHairstylistAvailability(hairstylistId: number) {
    const rows = await this.supabase.select<HairstylistAvailability>("hairstylist_availability", { hairstylist_id: hairstylistId }, "day_of_week.asc");
    const defaults = buildDefaultAvailability(hairstylistId);
    return defaults.map((fallback, index) => {
      const saved = rows.find((row) => row.dayOfWeek === fallback.dayOfWeek);
      return saved ?? { ...fallback, id: -(index + 1) };
    });
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
