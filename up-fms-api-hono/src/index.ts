import { Hono } from "hono";
import { cors } from "hono/cors";

// Import Sub-Routers
import checkinRoutes from "./checkin/index";
import equipmentRoutes from "./equipment/index";
import borrowRoutes from "./borrow/index";

type Bindings = {
  up_fms_db: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware - ปรับจูน CORS ให้รองรับการแก้ไขข้อมูล (PATCH, DELETE)
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// --- [Route Management] ---

// 1. ระบบบันทึกการเข้าใช้งานสนาม
app.route('/api/checkin', checkinRoutes);
app.route('/api/admin/checkins', checkinRoutes);

// 2. ระบบจัดการคลังอุปกรณ์กีฬา
app.route("/api/staff/equipment", equipmentRoutes);

// 3. ระบบยืม-คืนอุปกรณ์ (สำหรับนิสิต/Staff)
app.route("/api/equipment", borrowRoutes);

// 4. หน้าประวัติ (History)
app.get('/api/staff/borrow-records', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { borrowRecords } = await import('./db/schema');
  const { desc } = await import('drizzle-orm');
  const db = drizzle(c.env.up_fms_db);

  const data = await db.select().from(borrowRecords).orderBy(desc(borrowRecords.id)).limit(50).all();
  const rows = data.map(r => ({
    ...r,
    time: new Date(r.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }));
  return c.json({ ok: true, days: [{ rows }] });
});

// Default Route
app.get("/", (c) => c.text("UP-FMS API (Hono) is running at Mae Ka, Phayao"));

export default app;
