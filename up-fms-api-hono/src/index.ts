import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from 'drizzle-orm/d1';
import { sql, desc } from 'drizzle-orm';
// แก้ไขจาก '../db/schema' เป็น './db/schema'
import { borrowRecords } from './db/schema';

// Import Routers
import equipmentRoutes from './equipment/index';
import borrowRoutes from './borrow/index';
import checkinRoutes from "./checkin/index";
import feedbackRoutes from "./feedback/index";

type Bindings = {
  up_fms_db: D1Database
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// --- [Route Management] ---

// 3. ระบบจัดการคลังอุปกรณ์
app.route("/api/staff/equipment", equipmentRoutes);

// 4. ระบบการยืม-คืนและสถิติ
app.route('/api/equipment', borrowRoutes);

// บันทึกประวัติรายวันสำหรับหน้า Ledger
app.get('/api/staff/borrow-records', async (c) => {
  const db = drizzle(c.env.up_fms_db);
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10);

  const data = await db.select().from(borrowRecords)
    .where(sql`date(${borrowRecords.createdAt}) = ${date}`)
    .orderBy(desc(borrowRecords.id))
    .all();

  return c.json({
    ok: true,
    days: [{ date, rows: data }]
  });
});

// 5. ระบบบันทึกการเข้าใช้งานสนาม
app.route('/api/checkin', checkinRoutes);
app.route('/api/staff/checkins', checkinRoutes);

// 6. ระบบรับข้อมูลฟีดแบ็ก
app.route('/api/feedback', feedbackRoutes);
app.route('/api/staff/feedbacks', feedbackRoutes);

app.get("/", (c) => c.text("UP-FMS API (Hono) is running at Mae Ka, Phayao"));

export default app;
