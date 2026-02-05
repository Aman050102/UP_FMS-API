import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
