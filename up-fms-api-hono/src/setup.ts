import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { checkinEvents, equipments } from './db/schema';

const setupApp = new Hono<{ Bindings: { up_fms_db: D1Database } }>();

setupApp.get('/init-all', async (c) => {
  const db = drizzle(c.env.up_fms_db);

  try {
    // 1. ล้างตารางและสร้างใหม่ทั้งหมด (ใช้ SQL Raw)
    await c.env.up_fms_db.batch([
      c.env.up_fms_db.prepare(`DROP TABLE IF EXISTS borrow_records`),
      c.env.up_fms_db.prepare(`DROP TABLE IF EXISTS checkin_events`),
      c.env.up_fms_db.prepare(`DROP TABLE IF EXISTS equipments`),
      c.env.up_fms_db.prepare(`DROP TABLE IF EXISTS feedbacks`),

      c.env.up_fms_db.prepare(`CREATE TABLE equipments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, stock INTEGER DEFAULT 0, total INTEGER DEFAULT 0)`),
      c.env.up_fms_db.prepare(`CREATE TABLE feedbacks (id INTEGER PRIMARY KEY AUTOINCREMENT, facility TEXT NOT NULL, problems TEXT, image_url TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
      c.env.up_fms_db.prepare(`CREATE TABLE borrow_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, full_name TEXT, faculty TEXT NOT NULL, equipment TEXT NOT NULL, qty INTEGER NOT NULL, action TEXT NOT NULL, status TEXT DEFAULT 'borrowing', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
      c.env.up_fms_db.prepare(`
        CREATE TABLE checkin_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          facility TEXT NOT NULL,
          sub_facility TEXT,
          student_count INTEGER DEFAULT 0,
          staff_count INTEGER DEFAULT 0,
          session_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
    ]);

    // 2. ข้อมูลสถิติ ม.ค. 68 (ข้อมูลที่คุณส่งมา)
    const stats68 = [
      { facility: 'pool', student_count: 4, staff_count: 6, session_date: '2025-01-02' },
      { facility: 'track', student_count: 15, staff_count: 1, session_date: '2025-01-02' },
      { facility: 'outdoor', student_count: 11, staff_count: 0, session_date: '2025-01-02' },
      { facility: 'pool', student_count: 1, staff_count: 1, session_date: '2025-01-03' },
      { facility: 'track', student_count: 12, staff_count: 10, session_date: '2025-01-03' },
      { facility: 'outdoor', student_count: 52, staff_count: 2, session_date: '2025-01-03' },
      { facility: 'badminton', student_count: 14, staff_count: 2, session_date: '2025-01-03' },
      { facility: 'pool', student_count: 3, staff_count: 4, session_date: '2025-01-06' },
      { facility: 'track', student_count: 21, staff_count: 10, session_date: '2025-01-06' },
      { facility: 'outdoor', student_count: 108, staff_count: 2, session_date: '2025-01-06' },
      { facility: 'badminton', student_count: 58, staff_count: 2, session_date: '2025-01-06' },
      { facility: 'pool', student_count: 4, staff_count: 2, session_date: '2025-01-07' },
      { facility: 'track', student_count: 52, staff_count: 20, session_date: '2025-01-07' },
      { facility: 'outdoor', student_count: 214, staff_count: 5, session_date: '2025-01-07' },
      { facility: 'badminton', student_count: 28, staff_count: 8, session_date: '2025-01-07' },
      { facility: 'pool', student_count: 4, staff_count: 2, session_date: '2025-01-08' },
      { facility: 'track', student_count: 13, staff_count: 17, session_date: '2025-01-08' },
      { facility: 'outdoor', student_count: 189, staff_count: 4, session_date: '2025-01-08' },
      { facility: 'badminton', student_count: 50, staff_count: 8, session_date: '2025-01-08' },
      { facility: 'pool', student_count: 6, staff_count: 3, session_date: '2025-01-09' },
      { facility: 'track', student_count: 24, staff_count: 48, session_date: '2025-01-09' },
      { facility: 'outdoor', student_count: 202, staff_count: 1, session_date: '2025-01-09' },
      { facility: 'badminton', student_count: 45, staff_count: 1, session_date: '2025-01-09' },
      { facility: 'pool', student_count: 2, staff_count: 1, session_date: '2025-01-10' },
      { facility: 'track', student_count: 29, staff_count: 11, session_date: '2025-01-10' },
      { facility: 'outdoor', student_count: 75, staff_count: 56, session_date: '2025-01-10' },
      { facility: 'pool', student_count: 5, staff_count: 2, session_date: '2025-01-13' },
      { facility: 'track', student_count: 13, staff_count: 10, session_date: '2025-01-13' },
      { facility: 'outdoor', student_count: 169, staff_count: 4, session_date: '2025-01-13' },
      { facility: 'badminton', student_count: 31, staff_count: 1, session_date: '2025-01-13' },
      { facility: 'pool', student_count: 2, staff_count: 50, session_date: '2025-01-14' },
      { facility: 'track', student_count: 30, staff_count: 115, session_date: '2025-01-14' },
      { facility: 'outdoor', student_count: 5, staff_count: 40, session_date: '2025-01-14' },
      { facility: 'pool', student_count: 1, staff_count: 2, session_date: '2025-01-15' },
      { facility: 'track', student_count: 30, staff_count: 60, session_date: '2025-01-15' },
      { facility: 'outdoor', student_count: 120, staff_count: 2, session_date: '2025-01-15' },
      { facility: 'pool', student_count: 2, staff_count: 2, session_date: '2025-01-16' },
      { facility: 'track', student_count: 20, staff_count: 78, session_date: '2025-01-16' },
      { facility: 'outdoor', student_count: 173, staff_count: 9, session_date: '2025-01-16' },
      { facility: 'badminton', student_count: 34, staff_count: 1, session_date: '2025-01-16' }
    ];

    for (const stat of stats68) {
      await db.insert(checkinEvents).values(stat).run();
    }

    return c.json({ ok: true, message: "Reset & Import ม.ค. 68 สำเร็จ!" });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

export default setupApp;
