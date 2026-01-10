import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("pending"),
  isApproved: integer("is_approved").default(0),
  studentId: text("student_id").default(""),
  faculty: text("faculty").default(""),
  userCode: text("user_code").unique(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const equipments = sqliteTable("equipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  total: integer("total").notNull().default(0),
  stock: integer("stock").notNull().default(0),
});

export const borrowRecords = sqliteTable("borrow_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  equipmentId: integer("equipment_id").references(() => equipments.id),
  studentId: text("student_id").notNull(),
  studentName: text("student_name"),
  faculty: text("faculty").notNull(),
  qty: integer("qty").notNull().default(1),
  action: text("action").notNull(),
  occurredAt: text("occurred_at").default(sql`CURRENT_TIMESTAMP`),
});
