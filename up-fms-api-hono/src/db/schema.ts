import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 1. ตารางบันทึกการเข้าใช้งานสนาม
export const checkins = sqliteTable('checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_date: text('session_date').notNull(),
  facility: text('facility').notNull(),
  sub_facility: text('sub_facility'),
  student_count: integer('student_count').default(0),
  staff_count: integer('staff_count').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// 2. ตารางคลังอุปกรณ์กีฬา
export const equipment = sqliteTable('equipment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  stock: integer('stock').notNull().default(0), // จำนวนที่เหลืออยู่จริง
  total: integer('total').notNull().default(0), // จำนวนสต็อกทั้งหมด
});

// 3. ยืม-คืนอุปกรณ์
export const borrowRecords = sqliteTable('borrow_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  student_id: text('student_id').notNull(),
  name: text('name'),
  faculty: text('faculty').notNull(),
  equipment: text('equipment').notNull(),
  qty: integer('qty').notNull(),
  action: text('action').notNull(), // 'borrow' | 'return'
  status: text('status').default('pending'), // 'pending' | 'returned'
  created_at: text('created_at').notNull(),
});

// 4. ตารางบันทึกข้อร้องเรียนและฟีดแบค
export const feedbacks = sqliteTable('feedbacks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facility: text('facility').notNull(),
  problems: text('problems'),
  image_url: text('image_url'), // เก็บข้อมูลรูปภาพ (Base64)
  created_at: text('created_at').notNull(),
});

// 5. login / register
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  full_name: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').default('user'),
  avatar_url: text('avatar_url'), 
  assigned_facility: text('assigned_facility').default('none'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
