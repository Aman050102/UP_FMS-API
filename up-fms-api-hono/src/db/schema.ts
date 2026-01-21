import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 1. ตารางอุปกรณ์ (Inventory)
export const equipments = sqliteTable('equipments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  stock: integer('stock').notNull().default(0), // จำนวนคงเหลือที่พร้อมให้ยืม
  total: integer('total').notNull().default(0), // จำนวนทั้งหมดที่หน่วยงานมี
});

// 2. ตารางบันทึกการยืม-คืน (Transaction Records)
export const borrowRecords = sqliteTable('borrow_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  student_id: text('student_id').notNull(),
  fullName: text('full_name'),
  faculty: text('faculty').notNull(),
  equipment: text('equipment').notNull(),
  qty: integer('qty').notNull(),
  action: text('action').notNull(),         // 'borrow' หรือ 'return'
  status: text('status').notNull().default('borrowing'), // 'borrowing' หรือ 'returned'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 3. ตารางฟีดแบ็ก (Feedback)
export const feedbacks = sqliteTable('feedbacks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facility: text('facility').notNull(),
  problems: text('problems'),
  image_url: text('image_url').notNull(), // เก็บ Base64
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// 4. ตารางบันทึกการเข้าใช้สนาม (Check-in)
export const checkinEvents = sqliteTable('checkin_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facility: text('facility').notNull(),
  subFacility: text('sub_facility'),
  studentCount: integer('student_count').default(0),
  staffCount: integer('staff_count').default(0),
  sessionDate: text('session_date').notNull(), // YYYY-MM-DD
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
