import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from 'drizzle-orm/d1';
import { sql, desc } from 'drizzle-orm';
import { borrowRecords } from './db/schema';

// Import Sub-Routers
import checkinRoutes from "./checkin/index";


type Bindings = {
  up_fms_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use("*", cors({
  origin: "*", // ยอมรับทุก Domain (หรือใส่ URL ของ Frontend คุณ)
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// --- [Route Management] ---

// ระบบบันทึกการเข้าใช้งานสนาม
app.route('/api/checkin', checkinRoutes);       // สำหรับ User บันทึก
app.route('/api/admin/checkins', checkinRoutes); // สำหรับ Admin ดึงรายงาน (ใช้ router เดียวกันแต่แยก path เพื่อสิทธิ์การเข้าถึงในอนาคต)

// ระบบยืม-คืน (หน้า Ledger)
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

// Default Route
app.get("/", (c) => c.text("UP-FMS API (Hono) is running at Mae Ka, Phayao"));

export default app;
