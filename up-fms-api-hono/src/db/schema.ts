import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * ตารางผู้ใช้งาน (Users)
 * รองรับทั้งแอดมิน (staff) และนิสิตช่วยงาน (person)
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('person'), // 'staff' | 'person'
  studentId: text('student_id').default(''),
  faculty: text('faculty').default(''),
  userCode: text('user_code').unique(),
});

/**
 * ตารางคลังอุปกรณ์ (Equipments)
 * เก็บข้อมูลจำนวนทั้งหมดและจำนวนคงเหลือในสต็อก
 */
export const equipments = sqliteTable('equipments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  total: integer('total').notNull().default(0),
  stock: integer('stock').notNull().default(0),
});

/**
 * ตารางบันทึกการยืม-คืน (Borrow Records)
 * ใช้ร่วมกันทั้งระบบเพื่อเก็บประวัติการทำรายการ
 */
export const borrowRecords = sqliteTable('borrow_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  equipmentId: integer('equipment_id').references(() => equipments.id),
  studentId: text('student_id').notNull(),
  studentName: text('student_name'),
  faculty: text('faculty').notNull(),
  qty: integer('qty').notNull().default(1),
  action: text('action').notNull(), // 'borrow' | 'return'
  occurredAt: text('occurred_at').default(sql`CURRENT_TIMESTAMP`),
});

/**
 * ตารางสถิติการเช็คอินสนาม (Check-in Events)
 */
export const checkinEvents = sqliteTable('checkin_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facility: text('facility').notNull(),
  subFacility: text('sub_facility').default(''),
  action: text('action').default('in'), // 'in' | 'out'
  students: integer('students').default(0),
  staff: integer('staff').default(0),
  occurredAt: text('occurred_at').default(sql`CURRENT_TIMESTAMP`),
});
