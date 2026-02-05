import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ตารางบันทึกการเข้าใช้งานสนาม (ที่คุยกันก่อนหน้า)
export const checkins = sqliteTable('checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  session_date: text('session_date').notNull(),
  facility: text('facility').notNull(),
  sub_facility: text('sub_facility'),
  student_count: integer('student_count').default(0),
  staff_count: integer('staff_count').default(0),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// ตารางอื่นๆ (ตัวอย่างสำหรับอุปกรณ์และยืมคืน)
export const equipment = sqliteTable('equipment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  stock: integer('stock').default(0),
});

export const borrowRecords = sqliteTable('borrow_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  item_id: integer('item_id'),
  user_name: text('user_name').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
