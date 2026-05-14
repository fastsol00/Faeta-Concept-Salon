import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Admin Users ──────────────────────────────────────────────────────────────
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull().default("Manager"),
  shopAddress: text("shop_address").notNull().default("Via Cupa Fosso Del Lupo 136 NA"),
  shopName: text("shop_name").notNull().default("Faeta Concept Salon"),
});
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// ─── Services ─────────────────────────────────────────────────────────────────
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  price: real("price").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ─── Hairstylists ─────────────────────────────────────────────────────────────
export const hairstylists = sqliteTable("hairstylists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  specialization: text("specialization").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const insertHairstylistSchema = createInsertSchema(hairstylists).omit({ id: true });
export type InsertHairstylist = z.infer<typeof insertHairstylistSchema>;
export type Hairstylist = typeof hairstylists.$inferSelect;

// ─── Shop Hours ───────────────────────────────────────────────────────────────
export const shopHours = sqliteTable("shop_hours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayOfWeek: integer("day_of_week").notNull(),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(false),
  // Pausa pranzo (null = nessuna pausa)
  lunchStart: text("lunch_start"),
  lunchEnd: text("lunch_end"),
});
export const insertShopHoursSchema = createInsertSchema(shopHours).omit({ id: true });
export type InsertShopHours = z.infer<typeof insertShopHoursSchema>;
export type ShopHours = typeof shopHours.$inferSelect;

// ─── Holiday Dates ────────────────────────────────────────────────────────────
export const holidays = sqliteTable("holidays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // "2025-12-25"
  name: text("name").notNull().default("Festività"),
});
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

// ─── Hairstylist Availability ─────────────────────────────────────────────────
export const hairstylistAvailability = sqliteTable("hairstylist_availability", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hairstylistId: integer("hairstylist_id").notNull().references(() => hairstylists.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
});
export const insertHairstylistAvailabilitySchema = createInsertSchema(hairstylistAvailability).omit({ id: true });
export type InsertHairstylistAvailability = z.infer<typeof insertHairstylistAvailabilitySchema>;
export type HairstylistAvailability = typeof hairstylistAvailability.$inferSelect;

// ─── Blocked Slots ────────────────────────────────────────────────────────────
export const blockedSlots = sqliteTable("blocked_slots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hairstylistId: integer("hairstylist_id"),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reason: text("reason"),
});
export const insertBlockedSlotSchema = createInsertSchema(blockedSlots).omit({ id: true });
export type InsertBlockedSlot = z.infer<typeof insertBlockedSlotSchema>;
export type BlockedSlot = typeof blockedSlots.$inferSelect;

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  totalBookings: integer("total_bookings").notNull().default(0),
});
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, totalBookings: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookingCode: text("booking_code").notNull().unique(), // 6 uppercase letters e.g. "ABCXYZ"
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull().default(""),
  clientId: integer("client_id"),
  serviceId: integer("service_id").notNull().references(() => services.id),
  hairstylistId: integer("hairstylist_id").notNull().references(() => hairstylists.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  isNew: integer("is_new", { mode: "boolean" }).notNull().default(true),
});
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, isNew: true, bookingCode: true, clientId: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
