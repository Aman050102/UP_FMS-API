import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. ตารางผู้ใช้งาน
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("pending"), // 'staff', 'student'
  isApproved: integer("is_approved").default(0),
  studentId: text("student_id").default(""),
  faculty: text("faculty").default(""),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 2. ตารางอุปกรณ์กีฬา
export const equipments = sqliteTable("equipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  total: integer("total").notNull().default(0),
  stock: integer("stock").notNull().default(0),
});

// 3. ตารางการยืม-คืน
export const borrowRecords = sqliteTable("borrow_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  equipmentId: integer("equipment_id").references(() => equipments.id),
  studentId: text("student_id").notNull(),
  studentName: text("student_name"),
  faculty: text("faculty"),
  qty: integer("qty").notNull().default(1),
  action: text("action"), // 'borrow', 'return'
  status: text("status").default("borrowed"), // 'borrowed', 'returned'
  borrowedAt: text("borrowed_at").default(sql`CURRENT_TIMESTAMP`),
  returnedAt: text("returned_at"),
  occurredAt: text("occurred_at").default(sql`CURRENT_TIMESTAMP`),
});

// 4. ตารางบันทึกการใช้สนาม
export const checkinEvents = sqliteTable("checkin_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facility: text("facility").notNull(),
  action: text("action").default("in"),
  count: integer("count").default(0),
  occurredAt: text("occurred_at").default(sql`CURRENT_TIMESTAMP`),
});

// 5. ตารางความคิดเห็น/ฟีดแบ็ก
export const feedbacks = sqliteTable("feedbacks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  rating: integer("rating").default(5),
  username: text("username"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
